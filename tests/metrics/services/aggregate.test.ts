import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregate } from "../../../dist/metrics/index.js";
import type { RateTable, UsageRecord } from "../../../dist/metrics/index.js";

// Two measured calls to two different models.
const first: UsageRecord = { model: "m-a", tokensIn: 10, tokensOut: 4, durationMs: 100 };
const second: UsageRecord = { model: "m-b", tokensIn: 20, tokensOut: 6, durationMs: 50 };

test("aggregate of no record counts nothing, and prices nothing without a rate table", () => {
  assert.deepEqual(aggregate([]), {
    calls: 0,
    tokensIn: 0,
    tokensOut: 0,
    durationMs: 0,
    costUsd: null,
  });
});

test("aggregate sums the calls, the tokens and the durations of its records", () => {
  assert.deepEqual(aggregate([first, second]), {
    calls: 2,
    tokensIn: 30,
    tokensOut: 10,
    durationMs: 150,
    costUsd: null,
  });
});

test("one record without usage makes the token sums null rather than partial", () => {
  const total = aggregate([first, { ...second, tokensIn: null, tokensOut: null }]);

  assert.strictEqual(total.tokensIn, null);
  assert.strictEqual(total.tokensOut, null);
  assert.strictEqual(total.calls, 2);
  assert.strictEqual(total.durationMs, 150);
});

test("aggregate leaves the records it was given untouched", () => {
  const records: UsageRecord[] = [{ ...first }, { ...second, tokensIn: null, tokensOut: null }];
  const before = structuredClone(records);

  aggregate(records);

  assert.deepEqual(records, before);
});

// Rates and token counts chosen so that every cost is exact in floating point.
const rates: RateTable = {
  "m-a": { usdPerMillionTokensIn: 2, usdPerMillionTokensOut: 8 },
  "m-b": { usdPerMillionTokensIn: 1, usdPerMillionTokensOut: 1 },
  "m-local": null,
};
// 500 000 tokens in at 2 $/M plus 250 000 out at 8 $/M: 3 $.
const priced: UsageRecord = { model: "m-a", tokensIn: 500_000, tokensOut: 250_000, durationMs: 10 };
// 1 000 000 tokens each way at 1 $/M: 2 $.
const pricedToo: UsageRecord = {
  model: "m-b",
  tokensIn: 1_000_000,
  tokensOut: 1_000_000,
  durationMs: 20,
};

test("a record costs its tokens at its model's rate per million, and costs add up", () => {
  assert.strictEqual(aggregate([priced], rates).costUsd, 3);
  assert.strictEqual(aggregate([priced, pricedToo], rates).costUsd, 5);
});

test("the cost is null, never 0, as soon as a rate or a usage is missing", () => {
  const unpriceable: [string, UsageRecord[], RateTable | undefined][] = [
    ["no rate table", [priced], undefined],
    ["a model absent from the table", [{ ...priced, model: "m-absent" }], rates],
    ["a model named after an Object.prototype key", [{ ...priced, model: "toString" }], rates],
    ["a model with a null rate", [{ ...priced, model: "m-local" }], rates],
    ["a record without usage", [{ ...priced, tokensIn: null, tokensOut: null }], rates],
    [
      "one unpriceable record after a priced one",
      [priced, { model: "m-absent", tokensIn: 1, tokensOut: 1, durationMs: 1 }],
      rates,
    ],
  ];
  for (const [why, records, table] of unpriceable) {
    assert.strictEqual(aggregate(records, table).costUsd, null, why);
  }
});

test("with a rate table and no record, nothing was spent", () => {
  assert.strictEqual(aggregate([], rates).costUsd, 0);
});
