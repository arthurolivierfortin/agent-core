import { test } from "node:test";
import assert from "node:assert/strict";
import type { LLMProvider, LLMResponse, Message, ModelInfo, RateTable } from "../../dist/index.js";
import { capGuard } from "./cap-guard.ts";

// Cap guard of the H2 report (#35): docs/specs/2026-09-30-cap-guard-design.md.
// Every provider here is a double: no network, no hosted provider, no key, no environment read.
// The rates are literals, never data/rates.json: entering a real price there changes no test here.

const MODEL = "hosted-model";
const HOSTED_RATE = { usdPerMillionTokensIn: 1, usdPerMillionTokensOut: 2 };
const RATES: RateTable = { [MODEL]: HOSTED_RATE };
const MODELS: ModelInfo[] = [{ id: MODEL, supportsTools: true }];
const HI: Message[] = [{ role: "user", content: "hi" }];
const OPTS = { model: MODEL };
// 250 000 tokens in at 1 USD and 125 000 out at 2 USD per million: 0.5 USD exactly, so sums compare with equal.
const PRICED_RESPONSE: LLMResponse = { content: "ok", toolCalls: [], usage: { tokensIn: 250_000, tokensOut: 125_000 } };

type Step = { response: LLMResponse } | { error: unknown };
const PRICED: Step = { response: PRICED_RESPONSE };

/** A provider double that plays `steps` one per call, then repeats the last one, and counts its calls. */
function scripted(steps: readonly Step[], streaming = false): { provider: LLMProvider; count: () => number } {
  let calls = 0;
  const provider: LLMProvider = {
    id: "hosted-double",
    supportsStreaming: () => streaming,
    models: () => MODELS,
    complete: async () => {
      const step = steps[Math.min(calls, steps.length - 1)];
      calls++;
      if ("error" in step) throw step.error;
      return step.response;
    },
  };
  return { provider, count: () => calls };
}

test("TEST-1 (issue 35) seven own keys, no stream, and each priced call added to spentUsd", async () => {
  const double = scripted([PRICED], true);
  const guard = capGuard(double.provider, RATES, 10);
  const keys = ["complete", "cutReason", "id", "models", "refused", "spentUsd", "supportsStreaming"];
  assert.deepEqual(Object.keys(guard).sort(), keys);
  assert.equal(Object.hasOwn(guard, "stream"), false);
  assert.equal(guard.supportsStreaming(), false);
  assert.equal(guard.id, "hosted-double");
  assert.equal(guard.models(), MODELS);
  assert.deepEqual([guard.spentUsd(), guard.refused(), guard.cutReason()], [0, 0, null]);
  assert.equal(await guard.complete(HI, OPTS), PRICED_RESPONSE);
  assert.equal(guard.spentUsd(), 0.5);
  assert.equal(await guard.complete(HI, OPTS), PRICED_RESPONSE);
  assert.equal(guard.spentUsd(), 1);
  assert.equal(double.count(), 2);
});

test("TEST-2 (issue 35) a capUsd that is not a finite number > 0 throws a RangeError before any call", () => {
  const double = scripted([PRICED]);
  for (const capUsd of [0, -1, NaN, Infinity, "1" as unknown as number]) {
    assert.throws(() => capGuard(double.provider, RATES, capUsd), {
      name: "RangeError",
      message: `capGuard: capUsd must be a finite number > 0, got ${String(capUsd)}`,
    });
  }
  assert.doesNotThrow(() => capGuard(double.provider, RATES, 0.01));
  assert.equal(double.count(), 0);
});

const capMessage = (spent: number, cap: number) =>
  `capGuard refused a call to '${MODEL}': ${spent} USD spent reached the cap of ${cap} USD`;

test("TEST-3 (issue 35) once spentUsd reaches the cap, the next call is refused and cutReason stays null", async () => {
  const double = scripted([PRICED]);
  const guard = capGuard(double.provider, RATES, 1);
  await guard.complete(HI, OPTS);
  await guard.complete(HI, OPTS);
  await assert.rejects(guard.complete(HI, OPTS), { message: capMessage(1, 1) });
  assert.equal(double.count(), 2);
  assert.equal(guard.refused(), 1);
  assert.equal(guard.cutReason(), null);
});

test("TEST-3 (issue 35) a call admitted under the cap crosses it by its own cost at most", async () => {
  const double = scripted([PRICED]);
  const guard = capGuard(double.provider, RATES, 0.75);
  await guard.complete(HI, OPTS);
  await guard.complete(HI, OPTS);
  assert.equal(guard.spentUsd(), 1);
  await assert.rejects(guard.complete(HI, OPTS), { message: capMessage(1, 0.75) });
  await assert.rejects(guard.complete(HI, OPTS), { message: capMessage(1, 0.75) });
  assert.equal(double.count(), 2);
  assert.equal(guard.refused(), 2);
  assert.equal(guard.cutReason(), null);
});

/** A provider double whose calls wait until the test resolves the first one; it counts its calls. */
function deferred(): { provider: LLMProvider; count: () => number; resolveFirst: (response: LLMResponse) => void } {
  const pending: Array<(response: LLMResponse) => void> = [];
  const provider: LLMProvider = {
    id: "hosted-double",
    supportsStreaming: () => false,
    models: () => MODELS,
    complete: () => new Promise<LLMResponse>((resolve) => pending.push(resolve)),
  };
  return { provider, count: () => pending.length, resolveFirst: (response) => pending[0](response) };
}

test("TEST-4 (issue 35) two calls launched together reach the provider one after the other", async () => {
  const double = deferred();
  const guard = capGuard(double.provider, RATES, 0.5);
  const first = guard.complete(HI, OPTS);
  const second = guard.complete(HI, OPTS);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(double.count(), 1);
  double.resolveFirst(PRICED_RESPONSE);
  assert.equal(await first, PRICED_RESPONSE);
  await assert.rejects(second, { message: capMessage(0.5, 0.5) });
  assert.equal(double.count(), 1);
  assert.equal(guard.refused(), 1);
});
