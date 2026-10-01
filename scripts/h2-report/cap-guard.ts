// Cap guard of the H2 report (#35): docs/specs/2026-09-30-cap-guard-design.md.
// Reads no argument, writes nothing, shows nothing: the runner of #33 reads what the guard exposes.
import { LLMError, aggregate } from "../../dist/index.js";
import type { CompletionOptions, LLMProvider, LLMResponse, Message, ModelInfo } from "../../dist/index.js";
import type { Rate, RateTable } from "../../dist/index.js";

/** Why the spending became unknown, or would have (unpriced_model). Reaching the cap is not a cut. */
export type CutReason = "rate_limited" | `http_${number}` | "network" | "unclassified" | "unpriced_model";

export type CapGuard = LLMProvider & {
  /** US dollars of the calls that resolved and could be priced; a number, never null. */
  spentUsd(): number;
  /** How many calls were refused without reaching the provider. */
  refused(): number;
  /** Null while the spending is known; once the cost became unknown, why. Set once, never changed. */
  cutReason(): CutReason | null;
};

/** Rule R3 (R1 is in rates.ts, R2 in start-guard.ts): both prices of a counted rate are finite and > 0. */
function isPositiveRate(rate: Rate | null): boolean {
  if (rate === null) return false;
  const prices = [rate.usdPerMillionTokensIn, rate.usdPerMillionTokensOut];
  return prices.every((price) => Number.isFinite(price) && price > 0);
}

/**
 * The cut a rejected call leaves, read from LLMError.status only: never message, name, code nor
 * retryAfterMs, so that a text saying 429 classifies nothing.
 */
function classifyCut(error: unknown): CutReason {
  if (!(error instanceof LLMError)) return "unclassified";
  const { status } = error;
  if (status === undefined) return "network";
  if (status === 429) return "rate_limited";
  if (Number.isInteger(status) && status >= 100 && status <= 599) return `http_${status}`;
  return "unclassified";
}

/** #41: a usage counter is an integer >= 0 (so finite); anything else makes the call's cost unknown. */
function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/** The two counters of a response, each read once; null when usage is absent or either is not a count. */
function usageCounters(response: LLMResponse): { tokensIn: number; tokensOut: number } | null {
  const usage = response.usage;
  const tokensIn = usage?.tokensIn;
  const tokensOut = usage?.tokensOut;
  return isCount(tokensIn) && isCount(tokensOut) ? { tokensIn, tokensOut } : null;
}

/**
 * Wraps the only hosted provider of the H2 matrix. One instance, built by the runner (#33) around
 * that provider and shared by every run, placed under withMetrics, which records no refused call.
 * An object literal of closures, never a class, a spread nor a proxy; the provider is always called
 * as a method. It never streams, whatever the provider declares: a stream would escape the cap.
 *
 * A call's cost is aggregate() of its one record, the arithmetic of the report's total. spentUsd
 * adds up the finite, non-negative costs only: a cost that is null, not finite or negative is
 * unknown, and cuts the matrix (unclassified) without entering it. #41: each usage counter, read
 * once, must be an integer >= 0, else the cost is unknown and cuts the matrix (unclassified) too.
 * #41 too: a response that cannot be read (undefined, null, an accessor that throws) cuts the
 * matrix (unclassified), whatever it throws, and the call rejects with that same error.
 *
 * The first rejected call cuts the matrix, classified on LLMError.status only. Its reason network
 * means an LLMError without status: with GeminiLLMProvider a rejected fetch, but also an ok
 * response whose body is unreadable, not JSON or refused, a missing key or an undeclared model.
 */
export function capGuard(provider: LLMProvider, rates: RateTable, capUsd: number): CapGuard {
  // Before anything else: "1" passed as a number, NaN or Infinity would make every check below lie.
  if (typeof capUsd !== "number" || !Number.isFinite(capUsd) || capUsd <= 0) {
    throw new RangeError(`capGuard: capUsd must be a finite number > 0, got ${String(capUsd)}`);
  }
  let spent = 0;
  let refusals = 0;
  let cut: CutReason | null = null;
  let tail: Promise<unknown> = Promise.resolve();

  // A refusal never reaches the provider, and counts one.
  function refuse(model: string, why: string): never {
    refusals++;
    throw new Error(`capGuard refused a call to '${model}': ${why}`);
  }

  async function guarded(messages: Message[], opts: CompletionOptions): Promise<LLMResponse> {
    // A cut, then the cap, then the rate. Checked before the call only: an admitted call may cross
    // the cap by its own cost, never more.
    if (cut !== null) refuse(opts.model, `the matrix is cut (${cut})`);
    if (spent >= capUsd) refuse(opts.model, `${spent} USD spent reached the cap of ${capUsd} USD`);
    if (!isPositiveRate(Object.hasOwn(rates, opts.model) ? rates[opts.model] : null)) {
      cut = "unpriced_model";
      refuse(opts.model, `the matrix is cut (${cut})`);
    }
    let response: LLMResponse;
    try {
      response = await provider.complete(messages, opts);
    } catch (error) {
      // The same error goes on, unwrapped; its cost is unknown, never counted as 0 nor as null.
      cut ??= classifyCut(error);
      throw error;
    }
    let counters: { tokensIn: number; tokensOut: number } | null;
    try {
      counters = usageCounters(response);
    } catch (error) {
      // #41: the call took place but its response cannot be read: its cost is unknown, whatever the
      // error says, since classifyCut is for rejected calls only. The same error goes on.
      cut ??= "unclassified";
      throw error;
    }
    const cost = counters === null ? null : aggregate([{ model: opts.model, ...counters, durationMs: 0 }], rates).costUsd;
    // Returned all the same, since the call took place; a cost that became unknown cuts the matrix.
    // #39: a NaN, infinite or negative cost is unknown too; added up, it would blind the cap.
    if (cost === null || !Number.isFinite(cost) || cost < 0) cut ??= "unclassified";
    else spent += cost;
    return response;
  }

  return {
    id: provider.id,
    supportsStreaming: (): boolean => false,
    models: (): ModelInfo[] => provider.models(),
    // Each call waits for the previous one to settle before its checks: two calls in flight together
    // would each pass under the cap, and cross it by more than one call.
    complete: (messages: Message[], opts: CompletionOptions): Promise<LLMResponse> => {
      const call = tail.then(() => guarded(messages, opts));
      tail = call.catch(() => undefined);
      return call;
    },
    spentUsd: (): number => spent,
    refused: (): number => refusals,
    cutReason: (): CutReason | null => cut,
  };
}
