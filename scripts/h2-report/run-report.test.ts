import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GeminiLLMProvider, OllamaLLMProvider } from "../../dist/index.js";
import type { LLMProvider, LLMResponse, Usage } from "../../dist/index.js";
import * as runner from "./run-report.ts";

// Runner of the H2 report (#33, #42): docs/specs/2026-09-30-h2-report-runner-design.md and
// docs/specs/2026-09-30-h2-report-launch-design.md. No real provider is built, no network reached, no .env
// read: the real run gets the doubles of `scripted`, fetch replaced by a counter; env and rates are literals,
// never data/rates.json. The namespace import lets an export added later fail its own test, not the file.

test("TEST-2 (issue 33) defaultProviders declares the given models on Ollama and Gemini", () => {
  const { local, hosted } = runner.defaultProviders({ ollamaModel: "local-x", geminiModel: "hosted-x" });
  assert.ok(local instanceof OllamaLLMProvider);
  assert.ok(hosted instanceof GeminiLLMProvider);
  assert.deepEqual([local.id, local.models()], ["ollama", [{ id: "local-x", supportsTools: true }]]);
  assert.deepEqual([hosted.id, hosted.models()], ["gemini", [{ id: "hosted-x", supportsTools: true }]]);
});

const KEY = "sentinel-value-not-a-key";
const ENV = { GEMINI_API_KEY: KEY };
const MODELS = ["--ollama-model", "local-x", "--gemini-model", "hosted-x"];
const BASE = ["--cap-usd", "1", ...MODELS];
// TODAY dates the default --out, NOW is the clock of the real run (durations, TRUNCATED.txt): no test reads the clock.
const TODAY = new Date(2026, 8, 30);
const NOW = new Date("2026-09-30T12:00:00.000Z");
const LOCAL_RATE = { usdPerMillionTokensIn: 0, usdPerMillionTokensOut: 0 };
const HOSTED_RATE = { usdPerMillionTokensIn: 0.3, usdPerMillionTokensOut: 2.5 };

/** The rate text of the tests, local-x then hosted-x; either rate may be replaced, by null too. */
function ratesText(local: object | null = LOCAL_RATE, hosted: object | null = HOSTED_RATE): string {
  return JSON.stringify({
    "local-x": { rate: local, effectiveFrom: "2026-09-30", source: "local" },
    "hosted-x": { rate: hosted, effectiveFrom: "2026-10-01", source: "https://example.test/pricing" },
  });
}
const RATES_TEXT = ratesText();

/** Replaces the rate text, the env, the factory or home; `setup` prepares the temporary repo, `after` reads it. */
type Overrides = {
  readonly ratesText?: string; readonly env?: Record<string, string>; readonly setup?: (repo: string) => void;
  readonly providers?: (repo: string) => runner.ReportProviders; readonly home?: (repo: string) => string;
  readonly after?: (repo: string) => void;
};
type Outcome = { code: number; stdout: string; stderr: string; factoryCalls: number };

/** runReport on a new temporary repo, removed after, streams captured; the factory counts its calls, then delegates or throws. */
async function report(argv: readonly string[] | ((repo: string) => readonly string[]), overrides: Overrides = {}): Promise<Outcome> {
  const repo = mkdtempSync(join(tmpdir(), "h2-report-"));
  const outcome: Outcome = { code: -1, stdout: "", stderr: "", factoryCalls: 0 };
  try {
    overrides.setup?.(repo);
    outcome.code = await runner.runReport({
      argv: typeof argv === "function" ? argv(repo) : argv,
      env: overrides.env ?? ENV,
      ratesText: overrides.ratesText ?? RATES_TEXT,
      repo,
      home: overrides.home?.(repo) ?? repo,
      stdout: { write: (text: string) => (outcome.stdout += text) },
      stderr: { write: (text: string) => (outcome.stderr += text) },
      today: TODAY,
      now: () => NOW,
      providers: () => {
        outcome.factoryCalls++;
        if (overrides.providers === undefined) throw new Error("this test gives no provider factory");
        return overrides.providers(repo);
      },
    });
    overrides.after?.(repo);
    return outcome;
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
}

const PREFIX = "refusing to start before any network call:";
// The SyntaxError message depends on the V8 version: read it rather than copy it.
const NOT_JSON = (() => { try { JSON.parse("not json"); } catch (error) { return (error as SyntaxError).message; } })();

const REFUSALS: ReadonlyArray<readonly [string, readonly string[], Overrides, string | RegExp]> = [
  ["no argument", [], {}, "--cap-usd is required\n"],
  ["two identical models", ["--cap-usd", "1", "--ollama-model", "hosted-x", "--gemini-model", "hosted-x"], {},
    "--ollama-model and --gemini-model must differ, got 'hosted-x' for both\n"],
  ["a rate text that is not JSON", BASE, { ratesText: "not json" }, `rates: not valid JSON: ${NOT_JSON}\n`],
  ["a hosted rate still null", BASE, { ratesText: ratesText(LOCAL_RATE, null) }, /^refusing to start before any network call:\n- data\/rates\.json: 'hosted-x'\.rate is null; .*\n$/],
  ["an env without GEMINI_API_KEY", BASE, { env: {} }, `${PREFIX}\n- environment variable GEMINI_API_KEY is unset or empty\n`],
];

for (const [label, argv, overrides, expected] of REFUSALS) {
  test(`TEST-3 (issue 33) refuses to start on ${label}: stderr, code 1, nothing on stdout`, async () => {
    const result = await report(argv, overrides);
    assert.deepEqual([result.code, result.stdout, result.factoryCalls], [1, "", 0]);
    if (typeof expected === "string") assert.equal(result.stderr, expected);
    else assert.match(result.stderr, expected);
    assert.ok(!result.stderr.includes(KEY), result.stderr);
  });
}

const demoRefusal = (out: string) =>
  `--out must not be under docs/demo/ (the H1 proof there is compared byte for byte), got '${out}'\n`;
const heldRefusal = (names: string) => `--out already holds ${names}; choose another --out or move them away\n`;
/** A setup that drops an empty file per name into <repo>/out/. */
const holding = (...names: string[]) => (repo: string) => {
  mkdirSync(join(repo, "out"));
  for (const name of names) writeFileSync(join(repo, "out", name), "");
};

test("TEST-4 (issue 33) refuses an --out under docs/demo, whatever its case or its form", async () => {
  for (const out of ["docs/demo", "docs/demo/h1-matrix/", "Docs/DEMO/x", "./docs/../docs/demo"]) {
    const result = await report([...BASE, "--out", out]);
    assert.deepEqual(result, { code: 1, stdout: "", stderr: demoRefusal(out), factoryCalls: 0 });
  }
  let absolute = "";
  const result = await report((repo) => [...BASE, "--out", (absolute = join(repo, "docs", "demo"))]);
  assert.deepEqual(result, { code: 1, stdout: "", stderr: demoRefusal(absolute), factoryCalls: 0 });
});

test("TEST-4 (issue 33) refuses an --out that already holds a file the report writes", async () => {
  assert.deepEqual(runner.REPORT_FILES, ["summary.csv", "runs.csv", "summary.truncated.csv", "runs.truncated.csv", "TRUNCATED.txt"]);
  for (const name of runner.REPORT_FILES) {
    const result = await report([...BASE, "--out", "out/"], { setup: holding(name) });
    assert.deepEqual(result, { code: 1, stdout: "", stderr: heldRefusal(name), factoryCalls: 0 });
  }
  const both = await report([...BASE, "--out", "out/"], { setup: holding("TRUNCATED.txt", "summary.csv") });
  assert.deepEqual(both, { code: 1, stdout: "", stderr: heldRefusal("summary.csv, TRUNCATED.txt"), factoryCalls: 0 });
});

test("TEST-4 (issue 33) docs/demonstration/ and the default --out raise no --out refusal", async () => {
  for (const argv of [[...BASE, "--out", "docs/demonstration/", "--dry-run"], [...BASE, "--dry-run"]]) {
    const result = await report(argv);
    assert.ok(!result.stderr.includes("--out"), result.stderr);
    assert.equal(result.factoryCalls, 0);
  }
});

const ANNOUNCED = ["--cap-usd", "2.5", "--runs", "3", ...MODELS, "--out", "docs/reports/h2-test/"];
const ANNOUNCEMENT = [
  "H2 report: announcement, before any network call",
  "scenario: aller aux reglages",
  "runs per model (N): 3",
  "local model: local-x; rate 0 USD in, 0 USD out per million tokens; effective 2026-09-30; source local",
  "local host: http://localhost:11434 (default, OLLAMA_HOST unset)",
  "hosted model: hosted-x; rate 0.3 USD in, 2.5 USD out per million tokens; effective 2026-10-01; source https://example.test/pricing",
  "max calls: 66, of which 33 hosted (at most 11 per run: maxIterations 10 plus the landing call)",
  "cap: 2.5 USD on the hosted model",
  "out: docs/reports/h2-test/",
  "",
].join("\n");

test("TEST-5 (issue 33) stdout opens with the exact announcement, rates dated and sourced", async () => {
  const result = await report([...ANNOUNCED, "--dry-run"]);
  assert.equal(result.stdout.slice(0, ANNOUNCEMENT.length), ANNOUNCEMENT);
  assert.equal(runner.REPORT_MAX_ITERATIONS, 10);
});

test("TEST-5 (issue 33) a local rate that is null is announced as rate null", async () => {
  const result = await report([...ANNOUNCED, "--dry-run"], { ratesText: ratesText(null) });
  const line = "local model: local-x; rate null; effective 2026-09-30; source local";
  assert.ok(result.stdout.split("\n").includes(line), result.stdout);
});

/** report(argv, overrides) with globalThis.fetch replaced by a counter that throws, restored in a finally. */
async function reportWithoutNetwork(argv: readonly string[], overrides: Overrides = {}): Promise<Outcome & { fetchCalls: number }> {
  const original = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = (async () => { throw new Error(`no network in these tests (call ${++fetchCalls})`); }) as unknown as typeof fetch;
  try {
    return { ...(await report(argv, overrides)), fetchCalls };
  } finally {
    globalThis.fetch = original;
  }
}

test("TEST-6 (issue 33) --dry-run: the announcement, the dry run line, code 0, no factory, no fetch", async () => {
  const result = await reportWithoutNetwork([...ANNOUNCED, "--dry-run"]);
  const stdout = `${ANNOUNCEMENT}dry run: no provider built, no call made\n`;
  assert.deepEqual(result, { code: 0, stdout, stderr: "", factoryCalls: 0, fetchCalls: 0 });
  assert.ok(!(result.stdout + result.stderr).includes(KEY));
});

// Launch of the H2 report (#42): docs/specs/2026-09-30-h2-report-launch-design.md.

test("TEST-2 (issue 42) an --out under docs/demo is refused when only the case of the repo differs", async () => {
  let out = "";
  const result = await report((repo) => [...BASE, "--out", (out = join(repo.toUpperCase(), "docs", "demo"))]);
  assert.deepEqual(result, { code: 1, stdout: "", stderr: demoRefusal(out), factoryCalls: 0 });
});

test("TEST-3 (issue 42) the announcement names the Ollama host, from OLLAMA_HOST or the default", async () => {
  const result = await report([...ANNOUNCED, "--dry-run"], { env: { ...ENV, OLLAMA_HOST: "http://ollama.test:11434" } });
  assert.ok(result.stdout.split("\n").includes("local host: http://ollama.test:11434 (from OLLAMA_HOST)"), result.stdout);
});

const COMPLETE = ["--cap-usd", "5", "--runs", "2", ...MODELS, "--out", "out/"];
const LOCAL_USAGE: Usage = { tokensIn: 10, tokensOut: 5 };
// 0.5 USD exactly per call at the rate of hosted-x (2.5 USD per million tokens out).
const HOSTED_USAGE: Usage = { tokensIn: 0, tokensOut: 200_000 };

/** Declares the one model `id`, never streams: navigate to reglages on an odd call, land on an even one; throws what `fail` returns. */
function scripted(id: string, usage: Usage, fail: (call: number) => unknown = () => undefined): LLMProvider {
  let calls = 0;
  return {
    id: "scripted",
    supportsStreaming: () => false,
    models: () => [{ id, supportsTools: true }],
    complete: async (): Promise<LLMResponse> => {
      const error = fail(++calls);
      if (error !== undefined) throw error;
      if (calls % 2 === 0) return { content: "Vous etes aux reglages.", toolCalls: [], usage };
      return { content: "", toolCalls: [{ id: `call-${calls}`, name: "navigate", arguments: { page: "reglages" } }], usage };
    },
  };
}
/** The factory of one test: local-x then hosted-x, built once, never a real provider. */
const doubles = (local = scripted("local-x", LOCAL_USAGE), hosted = scripted("hosted-x", HOSTED_USAGE)) =>
  (): runner.ReportProviders => ({ local, hosted });

/** { name: text } of the files in <repo>/<out>, or null when that folder does not exist. */
function written(repo: string, out: string): Record<string, string> | null {
  const dir = join(repo, out);
  if (!existsSync(dir)) return null;
  return Object.fromEntries(readdirSync(dir).map((name) => [name, readFileSync(join(dir, name), "utf8")]));
}

/** reportWithoutNetwork, plus the files the run left in its --out, read before the repo is removed. */
async function launched(argv: readonly string[], overrides: Overrides = {}) {
  let files: Record<string, string> | null = null;
  const out = argv[argv.indexOf("--out") + 1];
  const result = await reportWithoutNetwork(argv, { ...overrides, after: (repo) => { files = written(repo, out); } });
  return { ...result, files: files as Record<string, string> | null };
}

test("TEST-4 (issue 42) the real run calls the given factory once, never fetch, and writes both CSV", async () => {
  const result = await launched(COMPLETE, { providers: doubles() });
  assert.deepEqual([result.code, result.stderr, result.factoryCalls, result.fetchCalls], [0, "", 1, 0]);
  assert.ok(result.stdout.endsWith("H2 report written: summary.csv, runs.csv in out/\n"), result.stdout);
  assert.deepEqual(Object.keys(result.files ?? {}).sort(), ["runs.csv", "summary.csv"]);
  assert.equal(result.files?.["summary.csv"], "scenario,model,runs,passed,successRate,meanDurationMs,tokensUsed,costUsd\r\n" +
    "aller aux reglages,local-x,2,2,1,0,60,0\r\naller aux reglages,hosted-x,2,2,1,0,800000,2\r\n");
  assert.match(result.files?.["runs.csv"] ?? "", /^(?:[^\r\n]*\r\n){5}$/);
  const announced = await launched(ANNOUNCED, { providers: doubles() });
  assert.deepEqual([announced.stdout.slice(0, ANNOUNCEMENT.length), announced.factoryCalls], [ANNOUNCEMENT, 1]);
});

test("TEST-4 (issue 42) 'wx': a summary.csv created during the run is kept, EEXIST, code 1", async () => {
  const hold = (repo: string) => scripted("local-x", LOCAL_USAGE, (call) => {
    if (call === 1) { mkdirSync(join(repo, "out")); writeFileSync(join(repo, "out", "summary.csv"), "held"); }
  });
  const result = await launched(COMPLETE, { providers: (repo) => ({ local: hold(repo), hosted: scripted("hosted-x", HOSTED_USAGE) }) });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /EEXIST/);
  assert.deepEqual(result.files, { "summary.csv": "held" });
});
