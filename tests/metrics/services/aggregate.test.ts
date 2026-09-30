import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregate } from "../../../dist/metrics/index.js";
import type { UsageRecord } from "../../../dist/metrics/index.js";

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
