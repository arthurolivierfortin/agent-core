import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultReportOut, parseReportArgs } from "./report-args.ts";

// Arguments of the H2 report (#20): docs/specs/2026-09-30-h2-report-guards-design.md.

test("TEST-5 (issue 20) only --cap-usd given: five runs, default models, out dated on the local day", () => {
  const defaults = { runs: 5, ollamaModel: "qwen2.5:0.5b", geminiModel: "gemini-2.5-flash", dryRun: false };
  const args = parseReportArgs(["--cap-usd", "2.5"], new Date(2026, 8, 30, 23, 30));
  assert.deepEqual(args, { capUsd: 2.5, ...defaults, out: "docs/reports/h2-2026-09-30/" });
  assert.equal(defaultReportOut(new Date(2026, 0, 5)), "docs/reports/h2-2026-01-05/");
  const out = parseReportArgs(["--cap-usd", "1"]).out;
  assert.ok(out.startsWith("docs/reports/h2-") && !out.startsWith("docs/demo/"), out);
});

test("TEST-5 (issue 20) every option set, --opt=value form included, explicit --out kept as is", () => {
  const argv = ["--cap-usd=0.75", "--runs", "3", "--ollama-model=llama3.2:1b", "--gemini-model", "gemini-2.5-pro"];
  const models = { ollamaModel: "llama3.2:1b", geminiModel: "gemini-2.5-pro" };
  const args = parseReportArgs([...argv, "--out", "reports/custom", "--dry-run"]);
  assert.deepEqual(args, { capUsd: 0.75, runs: 3, ...models, out: "reports/custom", dryRun: true });
});

const badCap = (value: string) => ({ message: `--cap-usd must be a decimal number > 0, got '${value}'` });
const REFUSED: ReadonlyArray<readonly [readonly string[], object]> = [
  [[], { message: "--cap-usd is required" }],
  [["--cap-usd", "0"], badCap("0")],
  [["--cap-usd", "0.00"], badCap("0.00")],
  [["--cap-usd=-1"], badCap("-1")],
  [["--cap-usd", "1e3"], badCap("1e3")],
  [["--cap-usd", ".5"], badCap(".5")],
  [["--cap-usd", "abc"], badCap("abc")],
  [["--cap-usd", "1", "--runs", "0"], { message: "--runs must be an integer >= 1, got '0'" }],
  [["--cap-usd", "1", "--runs", "1.5"], { message: "--runs must be an integer >= 1, got '1.5'" }],
  [["--cap-usd", "1", "--out", ""], { message: "--out must not be empty" }],
  [["--cap-usd", "1", "--model", "x"], { code: "ERR_PARSE_ARGS_UNKNOWN_OPTION" }],
  [["--cap-usd", "1", "extra"], { code: "ERR_PARSE_ARGS_UNEXPECTED_POSITIONAL" }],
];

for (const [argv, expected] of REFUSED) {
  test(`TEST-5 (issue 20) refuses ${JSON.stringify(argv)}`, () => {
    assert.throws(() => parseReportArgs(argv), expected);
  });
}
