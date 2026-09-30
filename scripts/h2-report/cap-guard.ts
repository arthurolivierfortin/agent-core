// Cap guard of the H2 report (#35): docs/specs/2026-09-30-cap-guard-design.md.
// Reads no argument, writes nothing, shows nothing: the runner of #33 reads what the guard exposes.
import { aggregate } from "../../dist/index.js";
import type { CompletionOptions, LLMProvider, LLMResponse, Message, ModelInfo } from "../../dist/index.js";
import type { RateTable } from "../../dist/index.js";

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

/**
 * Wraps the only hosted provider of the H2 matrix. One instance, built by the runner (#33) around
 * that provider and shared by every run, placed under withMetrics, which records no refused call.
 * An object literal of closures, never a class, a spread nor a proxy; the provider is always called
 * as a method. It never streams, whatever the provider declares: a stream would escape the cap.
 *
 * A call's cost is aggregate() of its one record, the arithmetic of the report's total. spentUsd
 * adds up the numeric costs only, so that one unknown cost never masks it with null.
 */
export function capGuard(provider: LLMProvider, rates: RateTable, capUsd: number): CapGuard {
  let spent = 0;
  let refusals = 0;
  let cut: CutReason | null = null;

  async function guarded(messages: Message[], opts: CompletionOptions): Promise<LLMResponse> {
    const response = await provider.complete(messages, opts);
    const usage = { tokensIn: response.usage?.tokensIn ?? null, tokensOut: response.usage?.tokensOut ?? null };
    const cost = aggregate([{ model: opts.model, ...usage, durationMs: 0 }], rates).costUsd;
    if (cost !== null) spent += cost;
    return response;
  }

  return {
    id: provider.id,
    supportsStreaming: (): boolean => false,
    models: (): ModelInfo[] => provider.models(),
    complete: guarded,
    spentUsd: (): number => spent,
    refused: (): number => refusals,
    cutReason: (): CutReason | null => cut,
  };
}
