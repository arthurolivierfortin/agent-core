import { test } from "node:test";
import assert from "node:assert/strict";
import { withMetrics } from "../../../../dist/metrics/application/use-cases/with-metrics.js";
import { MetricsCollector } from "../../../../dist/metrics/index.js";
import { FakeLLMProvider } from "../../../../dist/testing/index.js";
import { LLMError } from "../../../../dist/llm/index.js";
import type { CompletionOptions, LLMProvider } from "../../../../dist/llm/interfaces/index.js";
import type { LLMResponse, Message } from "../../../../dist/llm/models/index.js";

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
