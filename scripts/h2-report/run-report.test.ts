import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GeminiLLMProvider, OllamaLLMProvider } from "../../dist/index.js";
import * as runner from "./run-report.ts";

// Runner of the H2 report (#33): docs/specs/2026-09-30-h2-report-runner-design.md. No factory is called, no
// network reached, no .env read: env and rates are literals, never data/rates.json. The namespace import
// lets an export added by a later commit fail its own test, not the whole file.

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
// Dates the default --out: no test reads the clock.
const TODAY = new Date(2026, 8, 30);
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

/** Replaces the rate text or the env; `setup` prepares the temporary repo before the run. */
type Overrides = { readonly ratesText?: string; readonly env?: Record<string, string>; readonly setup?: (repo: string) => void };
type Outcome = { code: number; stdout: string; stderr: string; factoryCalls: number };

/** runReport on a new temporary repo, removed after, streams captured; the factory counts its calls and throws. */
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
      home: repo,
      stdout: { write: (text: string) => (outcome.stdout += text) },
      stderr: { write: (text: string) => (outcome.stderr += text) },
      today: TODAY,
      providers: () => { throw new Error(`#33 must not call the provider factory (call ${++outcome.factoryCalls})`); },
    });
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
