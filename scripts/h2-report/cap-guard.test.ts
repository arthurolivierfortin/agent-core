import { test } from "node:test";
import assert from "node:assert/strict";
import { LLMError } from "../../dist/index.js";
import type { LLMProvider, LLMResponse, Message, ModelInfo, RateTable, Usage } from "../../dist/index.js";
import { capGuard } from "./cap-guard.ts";
import type { CutReason } from "./cap-guard.ts";

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

const cutMessage = (model: string, reason: string) =>
  `capGuard refused a call to '${model}': the matrix is cut (${reason})`;

const UNPRICED_TABLES: ReadonlyArray<readonly [string, RateTable]> = [
  ["no entry", {}],
  ["a null rate", { [MODEL]: null }],
  ["an input price of 0", { [MODEL]: { ...HOSTED_RATE, usdPerMillionTokensIn: 0 } }],
  ["an output price of 0", { [MODEL]: { ...HOSTED_RATE, usdPerMillionTokensOut: 0 } }],
  ["a price of -1", { [MODEL]: { ...HOSTED_RATE, usdPerMillionTokensIn: -1 } }],
  ["a NaN price", { [MODEL]: { ...HOSTED_RATE, usdPerMillionTokensOut: NaN } }],
];

for (const [title, rates] of UNPRICED_TABLES) {
  test(`TEST-5 (issue 35) ${title} cuts the matrix before the provider is called (unpriced_model)`, async () => {
    const double = scripted([PRICED]);
    const guard = capGuard(double.provider, rates, 10);
    await assert.rejects(guard.complete(HI, OPTS), { message: cutMessage(MODEL, "unpriced_model") });
    assert.equal(double.count(), 0);
    assert.equal(guard.cutReason(), "unpriced_model");
    assert.equal(guard.refused(), 1);
    assert.equal(guard.spentUsd(), 0);
  });
}

test("TEST-5 (issue 35) once cut on an unpriced model, a call to a priced model is refused too", async () => {
  const double = scripted([PRICED]);
  const guard = capGuard(double.provider, { [MODEL]: null, "priced-model": HOSTED_RATE }, 10);
  await assert.rejects(guard.complete(HI, OPTS), { message: cutMessage(MODEL, "unpriced_model") });
  const priced = { message: cutMessage("priced-model", "unpriced_model") };
  await assert.rejects(guard.complete(HI, { model: "priced-model" }), priced);
  assert.equal(double.count(), 0);
  assert.equal(guard.refused(), 2);
  assert.equal(guard.cutReason(), "unpriced_model");
});

// A rejected call cuts the matrix on LLMError.status only: several messages below say 429 on purpose.
const REJECTIONS: ReadonlyArray<readonly [string, unknown, CutReason]> = [
  ["status 429", new LLMError("API_ERROR", "quota", { status: 429 }), "rate_limited"],
  ["status 429, retryAfterMs", new LLMError("API_ERROR", "quota", { status: 429, retryAfterMs: 30000 }), "rate_limited"],
  ["status 503, retryAfterMs", new LLMError("API_ERROR", "busy", { status: 503, retryAfterMs: 30000 }), "http_503"],
  ["status 404, MODEL_NOT_FOUND", new LLMError("MODEL_NOT_FOUND", "no model", { status: 404 }), "http_404"],
  ["status 500 saying 429", new LLMError("API_ERROR", "429 Too Many Requests", { status: 500 }), "http_500"],
  ["no status, saying 429", new LLMError("API_ERROR", "Gemini 429 RESOURCE_EXHAUSTED"), "network"],
  ["no status, fetch failed", new LLMError("API_ERROR", "fetch failed"), "network"],
  ["status 0", new LLMError("API_ERROR", "zero", { status: 0 }), "unclassified"],
  ["status 429.5", new LLMError("API_ERROR", "fraction", { status: 429.5 }), "unclassified"],
  ["an Error saying 429", new Error("429"), "unclassified"],
  ["a TypeError", new TypeError("x"), "unclassified"],
  ["a string", "boom", "unclassified"],
  ["an object { status: 429 }", { status: 429 }, "unclassified"],
];

for (const [title, error, reason] of REJECTIONS) {
  test(`TEST-6 (issue 35) ${title}, rejected after a priced call, cuts the matrix as ${reason}`, async () => {
    const double = scripted([PRICED, { error }]);
    const guard = capGuard(double.provider, RATES, 10);
    await guard.complete(HI, OPTS);
    await assert.rejects(guard.complete(HI, OPTS), (thrown) => thrown === error);
    assert.deepEqual([guard.cutReason(), guard.spentUsd(), guard.refused()], [reason, 0.5, 0]);
    await assert.rejects(guard.complete(HI, OPTS), { message: cutMessage(MODEL, reason) });
    assert.equal(double.count(), 2);
    assert.deepEqual([guard.cutReason(), guard.refused()], [reason, 1]);
  });
}

test("TEST-7 (issue 35) a resolved call without usage is returned, then cuts the matrix (unclassified)", async () => {
  const bare: LLMResponse = { content: "no usage", toolCalls: [] };
  const double = scripted([PRICED, { response: bare }]);
  const guard = capGuard(double.provider, RATES, 10);
  await guard.complete(HI, OPTS);
  assert.equal(await guard.complete(HI, OPTS), bare);
  assert.deepEqual([guard.cutReason(), guard.spentUsd()], ["unclassified", 0.5]);
  await assert.rejects(guard.complete(HI, OPTS), { message: cutMessage(MODEL, "unclassified") });
  assert.equal(double.count(), 2);
  assert.equal(guard.refused(), 1);
});

// Issue 39 (docs/specs/2026-09-30-cap-guard-finite-cost-design.md): a cost that is not finite, or
// negative, is unknown like a null one; it cuts the matrix and never enters spentUsd.
const INVALID_USAGES: ReadonlyArray<readonly [string, LLMResponse["usage"]]> = [
  ["a NaN cost", { tokensIn: 1, tokensOut: NaN }],
  ["an infinite cost", { tokensIn: Infinity, tokensOut: 0 }],
  ["a negative cost", { tokensIn: 0, tokensOut: -1_000_000 }],
];

for (const [title, usage] of INVALID_USAGES) {
  test(`TEST-1 (issue 39) ${title} is returned, then cuts the matrix (unclassified) outside spentUsd`, async () => {
    const response: LLMResponse = { content: title, toolCalls: [], usage };
    const double = scripted([PRICED, { response }]);
    const guard = capGuard(double.provider, RATES, 10);
    await guard.complete(HI, OPTS);
    assert.equal(await guard.complete(HI, OPTS), response);
    assert.deepEqual([guard.cutReason(), guard.spentUsd(), guard.refused()], ["unclassified", 0.5, 0]);
    await assert.rejects(guard.complete(HI, OPTS), { message: cutMessage(MODEL, "unclassified") });
    assert.equal(double.count(), 2);
    assert.equal(guard.refused(), 1);
  });
}

/** How a call settles: "resolved", or the message it is rejected with. */
const settle = (call: Promise<LLMResponse>): Promise<string> =>
  call.then(() => "resolved", (error: Error) => error.message);

test("TEST-1 (issue 39) the review probe of PR 38: a NaN cost at a cap of 0.000001 lets one call through", async () => {
  const response: LLMResponse = { content: "nan", toolCalls: [], usage: { tokensIn: 1, tokensOut: NaN } };
  const double = scripted([{ response }]);
  const guard = capGuard(double.provider, RATES, 0.000001);
  assert.equal(await guard.complete(HI, OPTS), response);
  const next = [await settle(guard.complete(HI, OPTS)), await settle(guard.complete(HI, OPTS))];
  assert.deepEqual([double.count(), guard.spentUsd(), guard.cutReason(), guard.refused()], [1, 0, "unclassified", 2]);
  assert.deepEqual(next, [cutMessage(MODEL, "unclassified"), cutMessage(MODEL, "unclassified")]);
});

test("TEST-1 (issue 39) a cost of 0 is known: added to spentUsd, without a cut", async () => {
  const zero: LLMResponse = { content: "zero", toolCalls: [], usage: { tokensIn: 0, tokensOut: 0 } };
  const double = scripted([PRICED, { response: zero }, PRICED]);
  const guard = capGuard(double.provider, RATES, 10);
  await guard.complete(HI, OPTS);
  assert.equal(await guard.complete(HI, OPTS), zero);
  assert.deepEqual([guard.cutReason(), guard.spentUsd()], [null, 0.5]);
  assert.equal(await guard.complete(HI, OPTS), PRICED_RESPONSE);
  assert.deepEqual([double.count(), guard.spentUsd(), guard.refused()], [3, 1, 0]);
});

test("TEST-3 (issue 39) a status of 600, above the HTTP range, cuts the matrix as unclassified", async () => {
  const error = new LLMError("API_ERROR", "above range", { status: 600 });
  const double = scripted([PRICED, { error }]);
  const guard = capGuard(double.provider, RATES, 10);
  await guard.complete(HI, OPTS);
  await assert.rejects(guard.complete(HI, OPTS), (thrown) => thrown === error);
  assert.deepEqual([guard.cutReason(), guard.spentUsd(), guard.refused()], ["unclassified", 0.5, 0]);
  await assert.rejects(guard.complete(HI, OPTS), { message: cutMessage(MODEL, "unclassified") });
  assert.equal(double.count(), 2);
  assert.equal(guard.refused(), 1);
});

const INFINITE_RATES: ReadonlyArray<readonly [string, RateTable]> = [
  ["an input price of Infinity", { [MODEL]: { ...HOSTED_RATE, usdPerMillionTokensIn: Infinity } }],
  ["an output price of Infinity", { [MODEL]: { ...HOSTED_RATE, usdPerMillionTokensOut: Infinity } }],
];

for (const [title, rates] of INFINITE_RATES) {
  test(`TEST-4 (issue 39) ${title} cuts the matrix before the provider is called (unpriced_model)`, async () => {
    const double = scripted([PRICED]);
    const guard = capGuard(double.provider, rates, 10);
    const outcome = await settle(guard.complete(HI, OPTS));
    assert.deepEqual(
      [outcome, double.count(), guard.cutReason(), guard.refused(), guard.spentUsd()],
      [cutMessage(MODEL, "unpriced_model"), 0, "unpriced_model", 1, 0],
    );
  });
}

// The cut/cap pair has no reachable state where both hold, so no test can order it (SPEC-5, R-2 of
// docs/specs/2026-09-30-cap-guard-finite-cost-design.md); the two pairs below put the rate last.
test("TEST-5 (issue 39) the checks run in the order cut, cap, rate", async () => {
  const UNPRICED = { model: "unpriced-model" };
  // The cap before the rate: 0.5 USD spent at a cap of 0.5, then a model absent from RATES.
  const capped = scripted([PRICED]);
  const atCap = capGuard(capped.provider, RATES, 0.5);
  await atCap.complete(HI, OPTS);
  const capFirst = [await settle(atCap.complete(HI, UNPRICED)), atCap.cutReason(), atCap.refused(), capped.count()];
  // The cut before the rate: cut by a status 429, then a model absent from RATES.
  const error = new LLMError("API_ERROR", "quota", { status: 429 });
  const limited = scripted([PRICED, { error }]);
  const cut = capGuard(limited.provider, RATES, 10);
  await cut.complete(HI, OPTS);
  await assert.rejects(cut.complete(HI, OPTS), (thrown) => thrown === error);
  const cutFirst = [await settle(cut.complete(HI, UNPRICED)), cut.cutReason(), cut.refused(), limited.count()];
  assert.deepEqual(
    { capFirst, cutFirst },
    {
      capFirst: ["capGuard refused a call to 'unpriced-model': 0.5 USD spent reached the cap of 0.5 USD", null, 1, 1],
      cutFirst: [cutMessage("unpriced-model", "rate_limited"), "rate_limited", 1, 2],
    },
  );
});

// Issue 41 (docs/specs/2026-09-30-cap-guard-usage-counters-design.md): each usage counter must be an
// integer >= 0, else the cost is unknown, even when the other counter makes it look finite.
const INVALID_COUNTERS: ReadonlyArray<readonly [string, Usage]> = [
  ["a negative tokensIn offset by tokensOut", { tokensIn: -1, tokensOut: 1_000_000 }],
  ["a negative tokensOut offset by tokensIn", { tokensIn: 1_000_000, tokensOut: -1 }],
  ["a fractional tokensIn", { tokensIn: 0.5, tokensOut: 125_000 }],
  ["a numeric string tokensOut", { tokensIn: 250_000, tokensOut: "125000" as unknown as number }],
];

for (const [title, usage] of INVALID_COUNTERS) {
  test(`TEST-1 (issue 41) ${title} is returned, then cuts the matrix (unclassified) outside spentUsd`, async () => {
    const response: LLMResponse = { content: title, toolCalls: [], usage };
    const double = scripted([PRICED, { response }]);
    const guard = capGuard(double.provider, RATES, 10);
    await guard.complete(HI, OPTS);
    assert.equal(await guard.complete(HI, OPTS), response);
    assert.deepEqual([guard.cutReason(), guard.spentUsd(), guard.refused()], ["unclassified", 0.5, 0]);
    await assert.rejects(guard.complete(HI, OPTS), { message: cutMessage(MODEL, "unclassified") });
    assert.equal(double.count(), 2);
    assert.equal(guard.refused(), 1);
  });
}

test("TEST-1 (issue 41) two counters of 1e308 overflow the cost to Infinity, which cuts the matrix", async () => {
  // Locks the cost check of issue 39: valid counters can still overflow, which isCount does not cover.
  const huge: LLMResponse = { content: "huge", toolCalls: [], usage: { tokensIn: 1e308, tokensOut: 1e308 } };
  const double = scripted([PRICED, { response: huge }]);
  const guard = capGuard(double.provider, RATES, 10);
  await guard.complete(HI, OPTS);
  assert.equal(await guard.complete(HI, OPTS), huge);
  assert.deepEqual([guard.cutReason(), guard.spentUsd(), guard.refused()], ["unclassified", 0.5, 0]);
  await assert.rejects(guard.complete(HI, OPTS), { message: cutMessage(MODEL, "unclassified") });
  assert.equal(double.count(), 2);
  assert.equal(guard.refused(), 1);
});

// Issue 41: a resolved response that cannot be read rejects the call with the same error, and cuts
// the matrix (unclassified) whatever that error is; classifyCut is for rejected calls only.
const USAGE_ERROR = new LLMError("API_ERROR", "unreadable usage", { status: 429 });
const UNREADABLE_RESPONSES: ReadonlyArray<readonly [string, LLMResponse, object]> = [
  ["an undefined response", undefined as unknown as LLMResponse, { name: "TypeError" }],
  ["a null response", null as unknown as LLMResponse, { name: "TypeError" }],
  [
    "a usage accessor throwing an LLMError of status 429",
    { content: "getter", toolCalls: [], get usage(): Usage { throw USAGE_ERROR; } },
    (thrown: unknown) => thrown === USAGE_ERROR,
  ],
];

for (const [title, response, rejection] of UNREADABLE_RESPONSES) {
  test(`TEST-2 (issue 41) ${title} rejects the call, then cuts the matrix (unclassified)`, async () => {
    const double = scripted([PRICED, { response }]);
    const guard = capGuard(double.provider, RATES, 10);
    await guard.complete(HI, OPTS);
    await assert.rejects(guard.complete(HI, OPTS), rejection);
    assert.deepEqual([guard.cutReason(), guard.spentUsd(), guard.refused()], ["unclassified", 0.5, 0]);
    await assert.rejects(guard.complete(HI, OPTS), { message: cutMessage(MODEL, "unclassified") });
    assert.equal(double.count(), 2);
    assert.equal(guard.refused(), 1);
  });
}
