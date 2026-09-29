import { test } from "node:test";
import assert from "node:assert/strict";
import { SlidingWindowStrategy, HeuristicTokenCounter } from "../../../../dist/context/index.js";
import type { TokenCounter, SlidingWindowReport } from "../../../../dist/context/index.js";
import type { Message } from "../../../../dist/llm/index.js";

// One token per message, so a budget in this file reads directly as "how many messages fit".
// A stub, not the heuristic: these tests are about the selection rule, not about counting.
const oneTokenPerMessage: TokenCounter = { count: (messages) => messages.length };

const SYSTEM: Message = { role: "system", content: "tu es NATHAN" };
const USER_1: Message = { role: "user", content: "amene-moi aux reglages" };
const CALL: Message = {
  role: "assistant",
  content: "",
  toolCalls: [{ id: "c1", name: "navigate", arguments: { page: "reglages" } }],
};
const RESULT: Message = { role: "tool", content: "page = reglages", toolCallId: "c1" };
const ANSWER: Message = { role: "assistant", content: "tu es dans les reglages" };
const USER_2: Message = { role: "user", content: "mets le theme sombre" };

/** Build a strategy whose budget is expressed in messages, via the stub counter. */
function windowOf(maxTokens: number, onBuild?: (report: SlidingWindowReport) => void): SlidingWindowStrategy {
  return new SlidingWindowStrategy({ maxTokens, counter: oneTokenPerMessage, onBuild });
}

/** No `tool` message may appear without the `assistant` call it answers, earlier in the list. */
function hasOrphanToolMessage(messages: Message[]): boolean {
  const seenCallIds = new Set<string>();
  for (const message of messages) {
    if (message.role === "assistant" && message.toolCalls !== undefined) {
      for (const call of message.toolCalls) seenCallIds.add(call.id);
    }
    if (message.role === "tool" && !seenCallIds.has(message.toolCallId)) return true;
  }
  return false;
}

test("maxTokens is exposed as given", () => {
  const context = new SlidingWindowStrategy({ maxTokens: 512, counter: new HeuristicTokenCounter() });
  assert.equal(context.maxTokens, 512);
});

test("build() of an empty history yields an empty list", async () => {
  const built = await windowOf(10).build([]);
  assert.deepEqual(built, []);
});

test("build() returns a history that fits untouched, in order", async () => {
  const history = [SYSTEM, USER_1, ANSWER];
  const built = await windowOf(10).build(history);
  assert.deepEqual(built, history);
});

test("build() drops the oldest messages and keeps the newest on overflow", async () => {
  const built = await windowOf(2).build([USER_1, ANSWER, USER_2]);
  assert.deepEqual(built, [ANSWER, USER_2]);
});

test("build() keeps the system message through a cut that would have dropped it", async () => {
  const built = await windowOf(3).build([SYSTEM, USER_1, ANSWER, USER_2]);
  assert.deepEqual(built, [SYSTEM, ANSWER, USER_2]);
});

test("build() drops a call and its result together when the pair does not fit", async () => {
  const built = await windowOf(3).build([SYSTEM, USER_1, CALL, RESULT, USER_2]);
  assert.deepEqual(built, [SYSTEM, USER_2]);
  assert.equal(hasOrphanToolMessage(built), false);
});

test("build() keeps a call and its result together when the pair fits", async () => {
  const built = await windowOf(4).build([SYSTEM, USER_1, CALL, RESULT, USER_2]);
  assert.deepEqual(built, [SYSTEM, CALL, RESULT, USER_2]);
  assert.equal(hasOrphanToolMessage(built), false);
});

test("build() never produces an orphan tool message, at any budget", async () => {
  const history = [SYSTEM, USER_1, CALL, RESULT, ANSWER, USER_2];
  for (let maxTokens = 0; maxTokens <= history.length + 1; maxTokens += 1) {
    const built = await windowOf(maxTokens).build(history);
    assert.equal(hasOrphanToolMessage(built), false, `orphan tool at maxTokens=${maxTokens}`);
  }
});

test("build() keeps the newest message even when nothing fits, rather than an unanswerable list", async () => {
  const built = await windowOf(0).build([SYSTEM, USER_1]);
  assert.deepEqual(built, [SYSTEM, USER_1]);
});

test("build() tolerates an orphan tool message already present in the input", async () => {
  const history = [RESULT, USER_2];
  const built = await windowOf(10).build(history);
  assert.deepEqual(built, history);
});

test("build() pins only the leading system messages", async () => {
  const lateSystem: Message = { role: "system", content: "regle ajoutee en cours de route" };
  const built = await windowOf(3).build([SYSTEM, USER_1, lateSystem, USER_2]);
  assert.deepEqual(built, [SYSTEM, lateSystem, USER_2]);
});

test("build() does not mutate the history it was given", async () => {
  const history = [SYSTEM, USER_1, ANSWER, USER_2];
  // A deep clone, so the assertion also catches a message mutated in place, not only
  // a spliced or reordered array.
  const before = structuredClone(history);
  await windowOf(2).build(history);
  assert.deepEqual(history, before);
});

test("observe() resolves and changes nothing observable", async () => {
  const context = windowOf(10);
  const history = [SYSTEM, USER_1];
  const beforeObserve = await context.build(history);
  const observed = await context.observe([ANSWER]);
  const afterObserve = await context.build(history);
  assert.equal(observed, undefined);
  assert.deepEqual(afterObserve, beforeObserve);
});

test("build() works the same with or without onBuild wired", async () => {
  // Not just "does not crash": the strategy's own output is identical either way, config built
  // by hand with config.onBuild left undefined against the same call through windowOf().
  const bare = new SlidingWindowStrategy({ maxTokens: 10, counter: oneTokenPerMessage });
  const built = await bare.build([SYSTEM, USER_1]);
  assert.deepEqual(built, await windowOf(10).build([SYSTEM, USER_1]));
  assert.deepEqual(built, [SYSTEM, USER_1]);
});

test("a throwing onBuild does not fail build(), and still returns the kept messages", async () => {
  const context = windowOf(10, () => {
    throw new Error("boom");
  });
  const built = await context.build([SYSTEM, USER_1]);
  assert.deepEqual(built, [SYSTEM, USER_1]);
});

test("onBuild reports what was kept and what was dropped", async () => {
  const reports: SlidingWindowReport[] = [];
  const built = await windowOf(2, (report) => reports.push(report)).build([USER_1, ANSWER, USER_2]);

  assert.equal(reports.length, 1);
  const [report] = reports;
  assert.deepEqual(report.kept, built);
  assert.deepEqual(report.kept, [ANSWER, USER_2]);
  assert.deepEqual(report.dropped, [USER_1]);
  assert.deepEqual(report.pinned, []);
  assert.deepEqual(report.input, [USER_1, ANSWER, USER_2]);
});

test("onBuild separates pinned system messages from the rest of what was kept", async () => {
  const reports: SlidingWindowReport[] = [];
  await windowOf(3, (report) => reports.push(report)).build([SYSTEM, USER_1, ANSWER, USER_2]);

  const [report] = reports;
  assert.deepEqual(report.pinned, [SYSTEM]);
  assert.deepEqual(report.kept, [SYSTEM, ANSWER, USER_2]);
  assert.deepEqual(report.dropped, [USER_1]);
});

test("onBuild reports tokensUsed against the strategy's own counter, and maxTokens as configured", async () => {
  const reports: SlidingWindowReport[] = [];
  // oneTokenPerMessage: two kept messages cost 2, whatever the configured budget was.
  await windowOf(10, (report) => reports.push(report)).build([USER_1, ANSWER]);

  const [report] = reports;
  assert.equal(report.tokensUsed, 2);
  assert.equal(report.maxTokens, 10);
});

test("onBuild counts calls from 1, once per build()", async () => {
  const reports: SlidingWindowReport[] = [];
  const context = windowOf(10, (report) => reports.push(report));
  await context.build([USER_1]);
  await context.build([USER_1, ANSWER]);
  await context.build([USER_1, ANSWER, USER_2]);

  assert.deepEqual(reports.map((report) => report.callNumber), [1, 2, 3]);
});

test("onBuild still fires, with empty lists, when the input history is empty", async () => {
  const reports: SlidingWindowReport[] = [];
  await windowOf(10, (report) => reports.push(report)).build([]);

  assert.equal(reports.length, 1);
  const [report] = reports;
  assert.deepEqual(report, { callNumber: 1, input: [], pinned: [], kept: [], dropped: [], tokensUsed: 0, maxTokens: 10 });
});
