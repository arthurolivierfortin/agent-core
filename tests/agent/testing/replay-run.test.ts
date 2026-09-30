import { test } from "node:test";
import assert from "node:assert/strict";
import { defineAgent } from "../../../dist/agent/index.js";
import { defineScenario, fakeApp } from "../../../dist/agent/testing/index.js";
import type { FakeAppState } from "../../../dist/agent/testing/index.js";
import { replayRun } from "../../../dist/agent/testing/replay-run.js";
import { runMatrix } from "../../../dist/agent/testing/run-matrix.js";
import { HeuristicTokenCounter, SlidingWindowStrategy } from "../../../dist/context/index.js";
import { LLMError } from "../../../dist/llm/index.js";
import type { LLMProvider, LLMResponse } from "../../../dist/llm/index.js";
import { FakeLLMProvider } from "../../../dist/testing/index.js";

const text = (content: string): LLMResponse => ({ content, toolCalls: [] });
const navigate = (page: string): LLMResponse => ({
  content: "",
  toolCalls: [{ id: "call-navigate", name: "navigate", arguments: { page } }],
});
const scenario = defineScenario({
  name: "aller aux reglages",
  env: () => fakeApp({ pages: ["accueil", "reglages", "profil"], current: "accueil" }),
  input: "amene-moi aux reglages",
  expect: { toolsUsed: ["navigate"], finalState: (s: FakeAppState) => s.current === "reglages", stopReason: "completed" },
});
const agent = { name: "navigateur", prompt: "Tu aides a naviguer.", tools: [] };
const context = () => new SlidingWindowStrategy({ maxTokens: 100_000, counter: new HeuristicTokenCounter() });
/** What the matrix ran with, but for a model the fake does not declare: `replayRun` must not read it. */
const replayDeps = () => ({ agent: defineAgent({ ...agent, recommendedModel: "absent-model" }), context: context() });

function matrix(llm: () => LLMProvider, runs: number) {
  const deps = () => ({ agent: defineAgent(agent), llm: llm(), context: context() });
  return runMatrix({ scenarios: [scenario], axes: {}, runs, deps });
}

test("replayRun replays a passed and a failed run from their trace, also once read back from JSON", async () => {
  const scripts = [[navigate("reglages"), text("tu y es")], [navigate("profil"), text("tu es au profil")]];
  let built = 0;
  const report = await matrix(() => new FakeLLMProvider({ responses: scripts[built++] }), 2);
  assert.deepEqual(report.runs.map((run) => run.passed), [true, false]);

  for (const run of report.runs) {
    const replay = await replayRun(scenario, run, replayDeps());
    const { toolCalls, finalState, stopReason, content } = run.trace;
    assert.deepEqual(
      [replay.toolCalls, replay.finalState, replay.stopReason, replay.content, replay.passed, replay.failures],
      [toolCalls, finalState, stopReason, content, run.passed, run.failures],
    );
  }

  const read = JSON.parse(JSON.stringify(report)).runs[1];
  const again = await replayRun(scenario, read, replayDeps());
  assert.deepEqual(
    [again.toolCalls, again.finalState, again.stopReason],
    [read.trace.toolCalls, read.trace.finalState, read.trace.stopReason],
  );
});

test("replayRun rejects with the fake's end-of-script error on the trace of a run whose provider threw", async () => {
  let completions = 0;
  const failing: LLMProvider = {
    id: "literal",
    supportsStreaming: () => false,
    models: () => [{ id: "m-a", supportsTools: true }],
    complete: async () => {
      if (++completions === 1) return navigate("reglages");
      throw new LLMError("API_ERROR", "provider down");
    },
  };
  const [run] = (await matrix(() => failing, 1)).runs;
  assert.equal(run.error, "provider down");

  await assert.rejects(replayRun(scenario, run, replayDeps()), {
    message: "FakeLLMProvider: no scripted response for call #2",
  });
});
