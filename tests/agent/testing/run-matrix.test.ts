import { test } from "node:test";
import assert from "node:assert/strict";
import { defineAgent } from "../../../dist/agent/index.js";
import type { AgentDeps } from "../../../dist/agent/index.js";
import { defineScenario, fakeApp } from "../../../dist/agent/testing/index.js";
import type { FakeApp, FakeAppState } from "../../../dist/agent/testing/index.js";
import { runMatrix } from "../../../dist/agent/testing/run-matrix.js";
import type { MatrixOptions } from "../../../dist/agent/testing/run-matrix.js";
import { HeuristicTokenCounter, SlidingWindowStrategy } from "../../../dist/context/index.js";
import type { LLMProvider, LLMResponse, Usage } from "../../../dist/llm/index.js";
import { FakeLLMProvider } from "../../../dist/testing/index.js";

type Wiring = Omit<AgentDeps, "tools">;
type Options = MatrixOptions<FakeAppState, Record<string, readonly unknown[]>>;

const PAGES = ["accueil", "reglages", "profil"];
const USAGE: Usage = { tokensIn: 500_000, tokensOut: 250_000 };
const RATE = { usdPerMillionTokensIn: 2, usdPerMillionTokensOut: 8 };

const app = (): FakeApp => fakeApp({ pages: PAGES, current: "accueil" });
const text = (content: string, usage?: Usage): LLMResponse => ({ content, toolCalls: [], usage });
const call = (name: string, args: Record<string, unknown>, usage?: Usage): LLMResponse => ({
  content: "",
  toolCalls: [{ id: `call-${name}`, name, arguments: args }],
  usage,
});
const navigate = (usage?: Usage): LLMResponse => call("navigate", { page: "reglages" }, usage);

function scenario(name: string, target: string, env: () => FakeApp = app) {
  const expect = { finalState: (state: FakeAppState) => state.current === target };
  return defineScenario({ name, env, input: `amene-moi a la page ${target}`, expect });
}

function wiring(llm: LLMProvider, extra: Partial<Wiring> = {}): Wiring {
  const agent = defineAgent({ name: "navigateur", prompt: "Tu aides a naviguer.", tools: [] });
  const context = new SlidingWindowStrategy({ maxTokens: 100_000, counter: new HeuristicTokenCounter() });
  return { agent, llm, context, ...extra };
}

/** A `deps` that hands every run a fresh fake, scripted with `responses`. */
const script = (...responses: LLMResponse[]) => () => wiring(new FakeLLMProvider({ responses }));

/** « aller aux reglages », no axis, one run, scripted to succeed, unless `options` says otherwise. */
function matrix(options: Partial<Options>) {
  const scenarios = [scenario("aller aux reglages", "reglages")];
  const deps = script(navigate(), text("tu y es"));
  return runMatrix<FakeAppState, Options["axes"]>({ scenarios, axes: {}, runs: 1, deps, ...options });
}

/** Hands out `values` in order, then throws: a test can tell exactly how often it was read. */
function scriptedClock(values: number[]): () => number {
  let readings = 0;
  return () => {
    if (readings === values.length) throw new Error(`scripted clock exhausted after ${readings} readings`);
    return values[readings++];
  };
}

test("runMatrix runs every scenario on every combination, runs times, in order; no axis is one combination", async () => {
  const envCalls = { reglages: 0, profil: 0 };
  const counted = (page: "reglages" | "profil") => () => { envCalls[page]++; return app(); };
  const seen: object[] = [];
  const before: (number | undefined)[] = [];
  let previous: FakeLLMProvider | undefined;

  const { runs } = await runMatrix({
    scenarios: [
      scenario("aller aux reglages", "reglages", counted("reglages")),
      scenario("aller au profil", "profil", counted("profil")),
    ],
    axes: { model: ["a", "b"], memory: [8, 20] },
    runs: 2,
    deps: (combination) => {
      const model: string = combination.model;
      const memory: number = combination.memory;
      // @ts-expect-error `temperature` is not one of the axes.
      void [model, memory, combination.temperature];
      seen.push(combination);
      before.push(previous?.calls.length);
      previous = new FakeLLMProvider({ responses: [navigate(), text("tu y es")] });
      return wiring(previous);
    },
  });

  const expected = ["aller aux reglages", "aller au profil"].flatMap((name) =>
    ["a|8", "a|20", "b|8", "b|20"].flatMap((values) => [`${name}|${values}|1`, `${name}|${values}|2`]),
  );
  assert.deepEqual(runs.map((r) => `${r.scenario}|${r.combination.model}|${r.combination.memory}|${r.run}`), expected);
  const failed = ["finalState: predicate returned false"];
  assert.deepEqual(runs.map((r) => [r.passed, r.failures]), [...Array(8).fill([true, []]), ...Array(8).fill([false, failed])]);
  assert.equal(seen.length, 16);
  runs.forEach((r, i) => assert.equal(seen[i], r.combination));
  assert.deepEqual(before, [undefined, ...Array(15).fill(2)]);
  assert.deepEqual(envCalls, { reglages: 8, profil: 8 });

  const empty: object[] = [];
  const alone = await matrix({ deps: (combination) => { empty.push(combination); return script(text("ok"))(); } });
  assert.deepEqual(alone.runs.map((r) => r.combination), [{}]);
  assert.deepEqual(empty, [{}]);
});

test("runMatrix refuses options that would yield an empty or truncated report, before any run", async () => {
  const cases: [Partial<Options>, string][] = [
    [{ runs: 0 }, "runMatrix: runs must be an integer >= 1, got 0"],
    [{ runs: 1.5 }, "runMatrix: runs must be an integer >= 1, got 1.5"],
    [{ runs: NaN }, "runMatrix: runs must be an integer >= 1, got NaN"],
    [{ scenarios: [] }, "runMatrix: scenarios must not be empty"],
    [{ axes: { model: ["a"], memory: [] } }, "runMatrix: axis 'memory' has no value"],
  ];
  for (const [override, message] of cases) {
    const calls = { deps: 0, env: 0 };
    const env = () => { calls.env++; return app(); };
    const deps = () => { calls.deps++; return script(text("ok"))(); };
    const options = { scenarios: [scenario("aller aux reglages", "reglages", env)], axes: { model: ["a"] }, deps };

    await assert.rejects(matrix({ ...options, ...override }), { name: "RangeError", message });
    assert.deepEqual(calls, { deps: 0, env: 0 }, message);
  }
});

test("runMatrix measures each run's duration, tokens and cost on the injected clock", async () => {
  const clock = scriptedClock([1000, 1010, 1030, 1040, 1100, 1500]);
  const deps = script(navigate(USAGE), text("tu y es", USAGE));
  const [run] = (await matrix({ deps, rates: { "fake-model": RATE }, now: clock })).runs;

  assert.deepEqual([run.durationMs, run.tokensUsed, run.costUsd], [500, 1_500_000, 6]);
  assert.throws(clock, /scripted clock exhausted after 6 readings/);
});

test("runMatrix reports null, never 0, for a missing usage or rate, with a fresh collector per run", async () => {
  const measure = async (usage: Usage | undefined, options: Partial<Options>) => {
    const { runs } = await matrix({ deps: script(navigate(usage), text("tu y es", usage)), ...options });
    return runs.map((r) => [r.tokensUsed, r.costUsd]);
  };

  assert.deepEqual(await measure(undefined, { rates: { "fake-model": RATE } }), [[null, null]]);
  assert.deepEqual(await measure(USAGE, { runs: 2 }), [[1_500_000, null], [1_500_000, null]]);
  assert.deepEqual(await measure(USAGE, { rates: { "other-model": RATE } }), [[1_500_000, null]]);
});

test("runMatrix measures on Date.now when no clock is given", async (t) => {
  const dateNow = t.mock.method(Date, "now", scriptedClock([100, 110, 150, 400]));
  const deps = () => wiring(new FakeLLMProvider({ responses: [text("tu y es")] }), { now: () => 0 });
  const [run] = (await matrix({ deps })).runs;

  assert.equal(run.durationMs, 300);
  assert.equal(dateNow.mock.callCount(), 4);
});
