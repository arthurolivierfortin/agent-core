import { test } from "node:test";
import assert from "node:assert/strict";
import { defineAgent } from "../../../dist/agent/index.js";
import type { AgentDeps } from "../../../dist/agent/index.js";
import { defineScenario, fakeApp } from "../../../dist/agent/testing/index.js";
import type { FakeApp, FakeAppState, MatrixSummaryRow } from "../../../dist/agent/testing/index.js";
import { runMatrix } from "../../../dist/agent/testing/run-matrix.js";
import type { MatrixOptions } from "../../../dist/agent/testing/run-matrix.js";
import { HeuristicTokenCounter, SlidingWindowStrategy } from "../../../dist/context/index.js";
import { LLMError } from "../../../dist/llm/index.js";
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

test("runMatrix keeps each run's trace: the very responses, the dispatched calls, the final state", async () => {
  const created: FakeApp[] = [];
  const env = () => { const made = app(); created.push(made); return made; };
  const [r1, r2] = [navigate(), text("tu y es")];
  const { trace } = (await matrix({ scenarios: [scenario("aller aux reglages", "reglages", env)], deps: script(r1, r2) })).runs[0];

  assert.equal(trace.responses.length, 2);
  [r1, r2].forEach((response, i) => assert.equal(trace.responses[i], response));
  assert.deepEqual(trace.toolCalls, r1.toolCalls);
  assert.equal(trace.finalState, created[0].state);
  assert.deepEqual([trace.finalState?.current, trace.stopReason, trace.content], ["reglages", "completed", "tu y es"]);
});

test("a landing's calls are in the trace's responses, not in its dispatched toolCalls", async () => {
  const fake = () => new FakeLLMProvider({ responses: [navigate(), call("getCurrentPage", {})] });
  const { trace } = (await matrix({ deps: () => wiring(fake(), { budget: { maxIterations: 1 } }) })).runs[0];

  assert.equal(trace.stopReason, "budget");
  assert.equal(trace.responses.length, 2);
  assert.deepEqual(trace.toolCalls.map((c) => c.name), ["navigate"]);
});

test("a provider that rejects mid-run fails that run with a partial trace, and the matrix goes on", async () => {
  const r1 = navigate(USAGE);
  let completions = 0;
  const failing: LLMProvider = {
    id: "literal",
    supportsStreaming: () => false,
    models: () => [{ id: "m-a", supportsTools: true }],
    complete: async () => {
      if (++completions === 1) return r1;
      throw new LLMError("API_ERROR", "provider down");
    },
  };
  let wirings = 0;
  let t = 0;
  const deps = () => (++wirings === 1 ? wiring(failing) : script(navigate(), text("tu y es"))());
  const [first, second] = (await matrix({ runs: 2, deps, rates: { "m-a": RATE }, now: () => (t += 10) })).runs;

  const { trace, ...measured } = first;
  assert.deepEqual(measured, {
    scenario: "aller aux reglages", combination: {}, run: 1, passed: false, failures: [],
    error: "provider down", durationMs: 40, tokensUsed: 750_000, costUsd: 3,
  });
  const finalState = { pages: PAGES, current: "reglages" };
  assert.deepEqual(trace, { toolCalls: r1.toolCalls, finalState, stopReason: null, content: null, responses: [r1] });
  assert.equal(trace.responses[0], r1);
  assert.deepEqual([second.passed, second.error], [true, null]);
});

test("a deps or an env that throws becomes that run's error, with what was recorded before", async () => {
  let envCalls = 0;
  const counted = [scenario("aller aux reglages", "reglages", () => { envCalls++; return app(); })];
  const [lost] = (await matrix({ scenarios: counted, deps: () => { throw "no wiring"; } })).runs;
  const { finalState, responses, toolCalls } = lost.trace;
  assert.deepEqual(
    [lost.error, finalState, responses, toolCalls, lost.tokensUsed, lost.costUsd, envCalls],
    ["no wiring", null, [], [], 0, null, 0],
  );

  const provider = new FakeLLMProvider({ responses: [text("tu y es")] });
  const broken = [scenario("aller aux reglages", "reglages", () => { throw new Error("env broke"); })];
  const [run] = (await matrix({ scenarios: broken, deps: () => wiring(provider) })).runs;
  assert.deepEqual([run.error, run.trace.finalState, run.trace.responses, provider.calls.length], ["env broke", null, [], 0]);
});

test("runMatrix sums each (scenario, combination) pair into one summary line, in the order the pairs ran", async () => {
  const scripts = [
    [navigate(USAGE), text("tu y es", USAGE)],
    [text("non", USAGE)],
    [navigate(USAGE), text("tu y es", USAGE)],
    [navigate(), text("tu y es")],
  ];
  let built = 0;
  let t = 0;
  const report = await runMatrix({
    scenarios: [scenario("aller aux reglages", "reglages")],
    axes: { model: ["a", "b"] },
    runs: 2,
    deps: () => wiring(new FakeLLMProvider({ responses: scripts[built++] })),
    rates: { "fake-model": RATE },
    now: () => (t += 10),
  });

  const summary: readonly MatrixSummaryRow<{ model: string[] }>[] = report.summary;
  assert.deepEqual(summary, [
    {
      scenario: "aller aux reglages", combination: { model: "a" }, runs: 2, passed: 1,
      successRate: 0.5, meanDurationMs: 40, tokensUsed: 2_250_000, costUsd: 9,
    },
    {
      scenario: "aller aux reglages", combination: { model: "b" }, runs: 2, passed: 2,
      successRate: 1, meanDurationMs: 50, tokensUsed: null, costUsd: null,
    },
  ]);
  assert.equal(summary[0].combination, report.runs[0].combination);
  assert.equal(summary[1].combination, report.runs[2].combination);

  const two = [scenario("aller aux reglages", "reglages"), scenario("aller au profil", "profil")];
  const { summary: lines } = await matrix({ scenarios: two });
  const rows = lines.map((r) => [r.scenario, r.runs, r.passed, r.successRate]);
  assert.deepEqual(rows, [["aller aux reglages", 1, 1, 1], ["aller au profil", 1, 0, 0]]);
});

test("report.toJSON() hands back fresh plain data, keys in the order of the types, null kept null", async () => {
  let t = 0;
  const report = await matrix({
    axes: { model: ["a", "b"] },
    deps: ({ model }) => {
      const landing: LLMResponse = { content: "tu y es", toolCalls: [] };
      const responses = model === "a" ? [navigate(USAGE), text("tu y es", USAGE)] : [landing];
      return wiring(new FakeLLMProvider({ responses }));
    },
    rates: { "fake-model": RATE },
    now: () => (t += 10),
  });

  const json = report.toJSON();
  assert.deepEqual(Object.keys(json), ["runs", "summary"]);
  assert.notEqual(json.runs, report.runs);
  assert.notEqual(json.summary, report.summary);
  assert.notEqual(json.runs[0], report.runs[0]);
  assert.notEqual(json.summary[0], report.summary[0]);
  assert.notEqual(report.toJSON().runs, json.runs);
  assert.deepEqual(json.runs, report.runs);
  assert.deepEqual(json.summary, report.summary);
  const runKeys = ["scenario", "combination", "run", "passed", "failures", "error", "durationMs", "tokensUsed", "costUsd", "trace"];
  assert.deepEqual(Object.keys(json.runs[0]), runKeys);
  assert.deepEqual(Object.keys(json.runs[0].trace), ["toolCalls", "finalState", "stopReason", "content", "responses"]);
  const rowKeys = ["scenario", "combination", "runs", "passed", "successRate", "meanDurationMs", "tokensUsed", "costUsd"];
  assert.deepEqual(Object.keys(json.summary[0]), rowKeys);

  const parsed = JSON.parse(JSON.stringify(report));
  assert.deepEqual(parsed, json);
  assert.deepEqual([parsed.runs[0].costUsd, parsed.summary[0].costUsd], [6, 6]);
  assert.deepEqual([parsed.runs[1].costUsd, parsed.runs[1].tokensUsed], [null, null]);
  assert.deepEqual([parsed.summary[1].costUsd, parsed.summary[1].tokensUsed], [null, null]);
});

test("a finalState predicate that throws fails its run with the error, and the matrix goes on", async () => {
  const [r1, r2] = [navigate(), text("tu y es")];
  const expect = { finalState: (): boolean => { throw new Error("predicate broke"); } };
  const throwing = defineScenario({ name: "predicat qui leve", env: app, input: "amene-moi a la page reglages", expect });
  const report = await matrix({ scenarios: [throwing, scenario("aller aux reglages", "reglages")], deps: script(r1, r2) });

  const [thrown, next] = report.runs;
  assert.deepEqual([thrown.passed, thrown.failures, thrown.error], [false, [], "predicate broke"]);
  assert.equal(thrown.trace.finalState?.current, "reglages");
  assert.equal(thrown.trace.responses.length, 2);
  [r1, r2].forEach((response, i) => assert.equal(thrown.trace.responses[i], response));
  assert.deepEqual(thrown.trace.toolCalls, r1.toolCalls);
  assert.deepEqual([thrown.trace.stopReason, thrown.trace.content], [null, null]);
  assert.deepEqual([next.passed, next.error], [true, null]);
  assert.deepEqual(report.summary.map((r) => [r.passed, r.successRate]), [[0, 0], [1, 1]]);
});

test("report.toCSV() writes one RFC 4180 line per summary row, CRLF, an empty cell for null", async () => {
  let t = 0;
  const report = await runMatrix({
    scenarios: [scenario("aller\naux reglages", "reglages")],
    axes: { model: ["fake,a", 'fake"b'], "max,tokens": [8] },
    runs: 1,
    deps: ({ model }) => {
      const responses = model === "fake,a" ? [navigate(USAGE), text("tu y es", USAGE)] : [navigate(), text("tu y es")];
      return wiring(new FakeLLMProvider({ responses }));
    },
    rates: { "fake-model": RATE },
    now: () => (t += 10),
  });

  assert.equal(
    report.toCSV(),
    'scenario,model,"max,tokens",runs,passed,successRate,meanDurationMs,tokensUsed,costUsd\r\n' +
      '"aller\naux reglages","fake,a",8,1,1,1,50,1500000,6\r\n"aller\naux reglages","fake""b",8,1,1,1,50,,\r\n',
  );
  const noAxis = (await matrix({})).toCSV();
  assert.equal(noAxis.split("\r\n")[0], "scenario,runs,passed,successRate,meanDurationMs,tokensUsed,costUsd");
});

test("report.toRunsCSV() writes one line per run: failures joined, a thrown error quoted, null empty", async () => {
  const strict = defineScenario({
    name: "aller aux reglages",
    env: app,
    input: "amene-moi aux reglages",
    expect: { toolsUsed: ["navigate"], finalState: (s: FakeAppState) => s.current === "reglages", stopReason: "completed" },
  });
  let t = 0;
  const report = await matrix({
    scenarios: [strict],
    axes: { model: ["a", "b"], memory: [null] },
    deps: ({ model }) => {
      if (model === "b") throw new Error('no "b", sorry');
      return script(text("non", USAGE))();
    },
    now: () => (t += 10),
  });

  assert.equal(
    report.toRunsCSV(),
    "scenario,model,memory,run,passed,failures,error,durationMs,tokensUsed,costUsd,stopReason\r\n" +
      "aller aux reglages,a,,1,false,toolsUsed: missing navigate; finalState: predicate returned false,,30,750000,,completed\r\n" +
      'aller aux reglages,b,,1,false,,"no ""b"", sorry",10,0,,\r\n',
  );
});

test("report.toCSV() quotes a field that holds a lone CR (RFC 4180)", async () => {
  let t = 0;
  const report = await matrix({ axes: { model: ["a\rb"] }, now: () => (t += 10) });

  assert.equal(
    report.toCSV(),
    'scenario,model,runs,passed,successRate,meanDurationMs,tokensUsed,costUsd\r\n' +
      'aller aux reglages,"a\rb",1,1,1,50,,\r\n',
  );
});

test("report.toJSON() copies each run's combination, failures and trace, and each line's combination", async () => {
  const report = await matrix({ axes: { model: ["a"] }, deps: script(text("non")) });
  const json = report.toJSON();
  const [run, copy] = [report.runs[0], json.runs[0]];
  const pairs = [
    [copy.combination, run.combination],
    [copy.failures, run.failures],
    [copy.trace, run.trace],
    [copy.trace.toolCalls, run.trace.toolCalls],
    [copy.trace.responses, run.trace.responses],
    [json.summary[0].combination, report.summary[0].combination],
  ];
  for (const [fresh, original] of pairs) {
    assert.notEqual(fresh, original);
    assert.deepEqual(fresh, original);
  }
  assert.deepEqual([copy.combination, copy.failures], [{ model: "a" }, ["finalState: predicate returned false"]]);
});

test("report.toJSON() keeps a thrown run's finalState, stopReason and content as null keys, through JSON too", async () => {
  const report = await matrix({ deps: () => { throw new Error("no wiring"); } });
  const { trace } = report.toJSON().runs[0];
  assert.deepEqual(Object.keys(trace), ["toolCalls", "finalState", "stopReason", "content", "responses"]);
  assert.deepEqual([trace.finalState, trace.stopReason, trace.content], [null, null, null]);

  const read = JSON.parse(JSON.stringify(report)).runs[0].trace;
  for (const key of ["finalState", "stopReason", "content"]) {
    assert.ok(Object.hasOwn(read, key), `${key} dropped by JSON.stringify`);
    assert.equal(read[key], null);
  }
});
