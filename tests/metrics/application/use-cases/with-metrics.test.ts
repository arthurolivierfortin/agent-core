import { test } from "node:test";
import assert from "node:assert/strict";
import { withMetrics } from "../../../../dist/metrics/application/use-cases/with-metrics.js";
import { MetricsCollector } from "../../../../dist/metrics/index.js";
import { FakeLLMProvider, checkProviderContract } from "../../../../dist/testing/index.js";
import { LLMError } from "../../../../dist/llm/index.js";
import type { CompletionOptions, LLMProvider } from "../../../../dist/llm/interfaces/index.js";
import type { LLMResponse, Message, Usage } from "../../../../dist/llm/models/index.js";
import type { RateTable } from "../../../../dist/metrics/index.js";

// Design: docs/specs/2026-09-30-with-metrics-design.md (#11). Every provider below is scripted,
// the fake or a literal written in this file: no hosted provider is ever called.

const messages: Message[] = [{ role: "user", content: "hi" }];

/**
 * A clock that hands out `values` in order and throws once they are used up: a decorator that
 * read the time more often than expected fails loudly instead of measuring garbage.
 */
function scriptedClock(values: number[]): () => number {
  let next = 0;
  return () => {
    if (next >= values.length) {
      throw new Error(`scripted clock exhausted after ${values.length} readings`);
    }
    return values[next++];
  };
}

test("withMetrics delegates to the provider and records each resolved call", async () => {
  const r1: LLMResponse = { content: "a", toolCalls: [], usage: { tokensIn: 7, tokensOut: 5 } };
  const r2: LLMResponse = { content: "b", toolCalls: [] };
  const fake = new FakeLLMProvider({ responses: [r1, r2] });
  const collector = new MetricsCollector();
  const clock = scriptedClock([1000, 1250, 2000, 2040]);
  const decorated = withMetrics(fake, collector, clock);
  const opts: CompletionOptions = { model: FakeLLMProvider.MODEL_ID };

  assert.strictEqual(decorated.id, "fake");
  assert.deepEqual(decorated.models(), fake.models());
  assert.strictEqual(await decorated.complete(messages, opts), r1);
  assert.strictEqual(await decorated.complete(messages, opts), r2);
  assert.strictEqual(fake.calls[0].messages, messages);
  assert.strictEqual(fake.calls[0].opts, opts);
  assert.deepEqual(collector.records(), [
    { model: "fake-model", tokensIn: 7, tokensOut: 5, durationMs: 250 },
    { model: "fake-model", tokensIn: null, tokensOut: null, durationMs: 40 },
  ]);
  // Four readings exactly: a fifth would have made a complete() reject, three would leave one.
  assert.throws(clock, /scripted clock exhausted after 4 readings/);
});

test("withMetrics reads Date.now when no clock is given", async () => {
  const collector = new MetricsCollector();
  const decorated = withMetrics(
    new FakeLLMProvider({ responses: [{ content: "ok", toolCalls: [] }] }),
    collector,
  );

  await decorated.complete(messages, { model: FakeLLMProvider.MODEL_ID });

  const records = collector.records();
  assert.strictEqual(records.length, 1);
  assert.strictEqual(Number.isFinite(records[0].durationMs), true);
});

test("a call the provider refuses records nothing and rejects with the provider's error", async () => {
  const collector = new MetricsCollector();
  const decorated = withMetrics(new FakeLLMProvider({ responses: [] }), collector);

  await assert.rejects(
    decorated.complete(messages, { model: "other-model" }),
    (err: unknown) => err instanceof LLMError && err.code === "MODEL_NOT_FOUND",
  );
  assert.deepEqual(collector.records(), []);
});

test("a provider error comes back as the very same reference, unwrapped", async () => {
  const boom = new LLMError("API_ERROR", "provider down");
  const failing: LLMProvider = {
    id: "failing",
    supportsStreaming: () => false,
    models: () => [{ id: "failing-model", supportsTools: false }],
    complete: async () => {
      throw boom;
    },
  };
  const collector = new MetricsCollector();

  await assert.rejects(
    withMetrics(failing, collector).complete(messages, { model: "failing-model" }),
    (err: unknown) => err === boom,
  );
  assert.deepEqual(collector.records(), []);
});

test("a failed call after a resolved one leaves the resolved one's record only", async () => {
  const collector = new MetricsCollector();
  const decorated = withMetrics(
    new FakeLLMProvider({ responses: [{ content: "only", toolCalls: [] }] }),
    collector,
  );
  const opts: CompletionOptions = { model: FakeLLMProvider.MODEL_ID };

  await decorated.complete(messages, opts);
  await assert.rejects(
    decorated.complete(messages, opts),
    (err: unknown) =>
      err instanceof Error && err.message.includes("no scripted response for call #2"),
  );
  assert.strictEqual(collector.records().length, 1);
});

test("the decorated fake passes the provider contract, and only its resolved call is recorded", async () => {
  const collector = new MetricsCollector();
  const decorated = withMetrics(
    new FakeLLMProvider({
      responses: [{ content: "hi", toolCalls: [], usage: { tokensIn: 1, tokensOut: 1 } }],
    }),
    collector,
  );

  const report = await checkProviderContract(decorated);

  assert.strictEqual(report.ok, true, JSON.stringify(report.checks, null, 2));
  const records = collector.records();
  assert.strictEqual(records.length, 1);
  assert.strictEqual(records[0].model, "fake-model");
  assert.strictEqual(records[0].tokensIn, 1);
  assert.strictEqual(records[0].tokensOut, 1);
});

test("a decorated provider never streams, even when the provider it wraps does", () => {
  const streaming: LLMProvider = {
    id: "streaming",
    supportsStreaming: () => true,
    models: () => [{ id: "streaming-model", supportsTools: false }],
    complete: async () => ({ content: "", toolCalls: [] }),
    async *stream() {
      yield { contentDelta: "", done: true };
    },
  };

  const decorated = withMetrics(streaming, new MetricsCollector());

  assert.strictEqual(decorated.supportsStreaming(), false);
  assert.strictEqual("stream" in decorated, false);
  assert.deepEqual(Object.keys(decorated).sort(), ["complete", "id", "models", "supportsStreaming"]);
});

// Issue 46 (docs/specs/2026-10-01-metrics-invalid-usage-design.md): a usage counter that is not an
// integer >= 0 leaves both counters null, so the total never prices it. Literal rates, 1 and 2 USD
// per million tokens, never data/rates.json.
const RATES: RateTable = { "fake-model": { usdPerMillionTokensIn: 1, usdPerMillionTokensOut: 2 } };

/** One resolved call through withMetrics, clock read at 0 then 5: the collector it fed. */
async function recordOne(response: LLMResponse): Promise<MetricsCollector> {
  const collector = new MetricsCollector();
  const fake = new FakeLLMProvider({ responses: [response] });
  const decorated = withMetrics(fake, collector, scriptedClock([0, 5]));
  const opts: CompletionOptions = { model: FakeLLMProvider.MODEL_ID };
  assert.strictEqual(await decorated.complete(messages, opts), response);
  return collector;
}

const INVALID_USAGES: ReadonlyArray<readonly [string, Usage]> = [
  ["a negative tokensIn offset by tokensOut", { tokensIn: -1, tokensOut: 1_000_000 }],
  ["a negative tokensOut offset by tokensIn", { tokensIn: 1_000_000, tokensOut: -1 }],
  ["a fractional tokensIn", { tokensIn: 0.5, tokensOut: 125_000 }],
  ["a NaN tokensIn", { tokensIn: NaN, tokensOut: 1 }],
  ["an infinite tokensOut", { tokensIn: 1, tokensOut: Infinity }],
  ["a numeric string tokensOut", { tokensIn: 250_000, tokensOut: "125000" as unknown as number }],
  ["a partial usage (tokensOut null)", { tokensIn: 7, tokensOut: null as unknown as number }],
];

for (const [why, usage] of INVALID_USAGES) {
  test(`TEST-1 (issue 46) ${why} is recorded as no usage and left unpriced`, async () => {
    const collector = await recordOne({ content: why, toolCalls: [], usage });

    assert.deepEqual(collector.records(), [
      { model: "fake-model", tokensIn: null, tokensOut: null, durationMs: 5 },
    ]);
    assert.deepEqual(collector.total(RATES), {
      calls: 1,
      tokensIn: null,
      tokensOut: null,
      durationMs: 5,
      costUsd: null,
    });
  });
}

const VALID_USAGES: ReadonlyArray<readonly [string, Usage, number]> = [
  ["zero counters", { tokensIn: 0, tokensOut: 0 }, 0],
  ["positive integer counters", { tokensIn: 500_000, tokensOut: 250_000 }, 1],
];

for (const [why, usage, costUsd] of VALID_USAGES) {
  test(`TEST-1 (issue 46) ${why} are recorded as reported, and priced`, async () => {
    const collector = await recordOne({ content: why, toolCalls: [], usage });

    assert.deepEqual(collector.records(), [{ model: "fake-model", ...usage, durationMs: 5 }]);
    assert.deepEqual(collector.total(RATES), { calls: 1, ...usage, durationMs: 5, costUsd });
  });
}

test("TEST-1 (issue 46) usage and its counters are read once each", async () => {
  const reads = { usage: 0, tokensIn: 0, tokensOut: 0 };
  // A second read of tokensIn sees -1: recording another value than the one checked would show.
  const usage: Usage = {
    get tokensIn(): number {
      reads.tokensIn += 1;
      return reads.tokensIn === 1 ? 3 : -1;
    },
    get tokensOut(): number {
      reads.tokensOut += 1;
      return 4;
    },
  };
  const response: LLMResponse = {
    content: "read once",
    toolCalls: [],
    get usage(): Usage {
      reads.usage += 1;
      return usage;
    },
  };

  const collector = await recordOne(response);

  assert.deepEqual(collector.records(), [
    { model: "fake-model", tokensIn: 3, tokensOut: 4, durationMs: 5 },
  ]);
  assert.deepEqual(reads, { usage: 1, tokensIn: 1, tokensOut: 1 });
});
