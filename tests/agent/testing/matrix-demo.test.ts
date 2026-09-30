import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { defineAgent } from "../../../dist/agent/index.js";
import { defineScenario, fakeApp } from "../../../dist/agent/testing/index.js";
import type { FakeAppState } from "../../../dist/agent/testing/index.js";
import { replayRun } from "../../../dist/agent/testing/replay-run.js";
import { runMatrix } from "../../../dist/agent/testing/run-matrix.js";
import { HeuristicTokenCounter, SlidingWindowStrategy } from "../../../dist/context/index.js";
import type { LLMProvider, LLMResponse, Usage } from "../../../dist/llm/index.js";
import { FakeLLMProvider } from "../../../dist/testing/index.js";

// The H1 milestone demo: 2 fake models x 1 context x 5 runs. Its JSON report and both CSV exports
// are versioned under docs/demo/h1-matrix/ and compared byte for byte on every run of the suite.
// AGENT_CORE_WRITE_DEMO=1 rewrites them first; without it, the suite writes nothing.
const DEMO = new URL("../../../docs/demo/h1-matrix/", import.meta.url);
const USAGE: Usage = { tokensIn: 500_000, tokensOut: 250_000 };

const script = (page: string, content: string): LLMResponse[] => [
  { content: "", toolCalls: [{ id: "call-navigate", name: "navigate", arguments: { page } }], usage: USAGE },
  { content, toolCalls: [], usage: USAGE },
];

/** Declares the one model `id` and answers it from a fresh `FakeLLMProvider`, which knows only its own. */
function namedFake(id: string, responses: LLMResponse[]): LLMProvider {
  const fake = new FakeLLMProvider({ responses });
  return {
    id: "named-fake",
    supportsStreaming: () => false,
    models: () => [{ id, supportsTools: true }],
    complete: (messages, opts) => fake.complete(messages, { ...opts, model: FakeLLMProvider.MODEL_ID }),
  };
}

const scenario = defineScenario({
  name: "aller aux reglages",
  env: () => fakeApp({ pages: ["accueil", "reglages", "profil"], current: "accueil" }),
  input: "amene-moi aux reglages",
  expect: { toolsUsed: ["navigate"], finalState: (s: FakeAppState) => s.current === "reglages", stopReason: "completed" },
});
const agent = defineAgent({ name: "navigateur", prompt: "Tu aides a naviguer.", tools: [] });
const context = () => new SlidingWindowStrategy({ maxTokens: 100_000, counter: new HeuristicTokenCounter() });

test("H1 demo: fake-a and fake-b over 5 runs, one priced and one not, a failure replayed, files up to date", async () => {
  let t = 0;
  let fakeBRuns = 0;
  const report = await runMatrix({
    scenarios: [scenario],
    axes: { model: ["fake-a", "fake-b"], context: ["fenetre-100k"] },
    runs: 5,
    deps: ({ model }) => {
      const lost = model === "fake-b" && ++fakeBRuns % 2 === 0;
      const responses = lost ? script("profil", "Vous etes au profil.") : script("reglages", "Vous etes aux reglages.");
      return { agent, llm: namedFake(model, responses), context: context(), model };
    },
    rates: { "fake-a": { usdPerMillionTokensIn: 2, usdPerMillionTokensOut: 8 }, "fake-b": null },
    now: () => (t += 10),
  });

  const rows = report.summary.map((r) => [r.combination.model, r.runs, r.passed, r.successRate, r.tokensUsed, r.costUsd]);
  assert.deepEqual(rows, [["fake-a", 5, 5, 1, 7_500_000, 30], ["fake-b", 5, 3, 0.6, 7_500_000, null]]);
  assert.deepEqual(report.toCSV().split("\r\n"), [
    "scenario,model,context,runs,passed,successRate,meanDurationMs,tokensUsed,costUsd",
    "aller aux reglages,fake-a,fenetre-100k,5,5,1,50,7500000,30",
    "aller aux reglages,fake-b,fenetre-100k,5,3,0.6,50,7500000,",
    "",
  ]);
  const lines = report.toRunsCSV().split("\r\n");
  assert.equal(lines.length, 12);
  assert.equal(lines[1], "aller aux reglages,fake-a,fenetre-100k,1,true,,,50,1500000,6,completed");
  assert.equal(lines[7], "aller aux reglages,fake-b,fenetre-100k,2,false,finalState: predicate returned false,,50,1500000,,completed");

  const failed = report.runs.filter((run) => !run.passed);
  assert.deepEqual(failed.map((run) => [run.combination.model, run.run]), [["fake-b", 2], ["fake-b", 4]]);
  const replay = await replayRun(scenario, failed[0], { agent, context: context() });
  const { toolCalls, finalState, stopReason } = failed[0].trace;
  assert.deepEqual(
    [replay.toolCalls, replay.finalState, replay.stopReason, replay.passed, replay.failures],
    [toolCalls, finalState, stopReason, failed[0].passed, failed[0].failures],
  );

  const files = { "report.json": JSON.stringify(report, null, 2) + "\n", "summary.csv": report.toCSV(), "runs.csv": report.toRunsCSV() };
  if (process.env.AGENT_CORE_WRITE_DEMO === "1") {
    mkdirSync(DEMO, { recursive: true });
    for (const [name, content] of Object.entries(files)) writeFileSync(new URL(name, DEMO), content);
  }
  for (const [name, content] of Object.entries(files)) {
    const file = new URL(name, DEMO);
    const saved = existsSync(file) ? readFileSync(file, "utf8") : "(missing)";
    assert.equal(saved, content, `docs/demo/h1-matrix/${name} is out of date: rerun with AGENT_CORE_WRITE_DEMO=1`);
  }
});
