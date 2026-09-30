import { test } from "node:test";
import assert from "node:assert/strict";
import { MetricsCollector } from "../../../../dist/metrics/index.js";
import type { UsageRecord } from "../../../../dist/metrics/index.js";

// A fresh object on each call, so no test can leak a mutation into another.
function recordA(): UsageRecord {
  return { model: "m-a", tokensIn: 500_000, tokensOut: 250_000, durationMs: 10 };
}

function recordB(): UsageRecord {
  return { model: "m-b", tokensIn: 1_000_000, tokensOut: 1_000_000, durationMs: 20 };
}

test("a new collector has recorded nothing", () => {
  assert.deepEqual(new MetricsCollector().records(), []);
});

test("records() gives back what was recorded, in recording order", () => {
  const collector = new MetricsCollector();
  const a = recordA();
  const b = recordB();

  collector.record(a);
  collector.record(b);

  assert.deepEqual(collector.records(), [a, b]);
});

test("nothing a caller holds can change what was recorded", () => {
  const collector = new MetricsCollector();
  const a = recordA();
  const b = recordB();
  const aAsRecorded = { ...a };
  collector.record(a);
  collector.record(b);

  const handedOut = collector.records();
  handedOut.push(recordA());
  handedOut[0].tokensIn = 0;
  a.tokensIn = 1;

  assert.deepEqual(collector.records(), [aAsRecorded, b]);
});

test("two collectors share nothing", () => {
  const used = new MetricsCollector();
  const untouched = new MetricsCollector();

  used.record(recordA());

  assert.deepEqual(untouched.records(), []);
});
