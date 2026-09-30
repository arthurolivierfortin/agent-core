// Arguments of the H2 report (#20): docs/specs/2026-09-30-h2-report-guards-design.md.
// Reads the argv it is given, never process.argv: the runner of #33 passes process.argv.slice(2).
import { parseArgs } from "node:util";
import { DEFAULT_GEMINI_MODEL, DEFAULT_OLLAMA_MODEL } from "../../dist/index.js";

export type ReportArgs = {
  readonly capUsd: number; readonly runs: number; readonly ollamaModel: string;
  readonly geminiModel: string; readonly out: string; readonly dryRun: boolean;
};

export const DEFAULT_RUNS = 5;

// Never under docs/demo/: the H1 proof there is compared byte for byte.
const REPORT_OUT_PREFIX = "docs/reports/h2-";

function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

/** docs/reports/h2-<YYYY>-<MM>-<DD>/ on the local date of `today`: the day of the person who launches. */
export function defaultReportOut(today: Date): string {
  return `${REPORT_OUT_PREFIX}${today.getFullYear()}-${twoDigits(today.getMonth() + 1)}-${twoDigits(today.getDate())}/`;
}

function orDefault(option: string, value: string | undefined, fallback: string): string {
  if (value === "") throw new Error(`--${option} must not be empty`);
  return value ?? fallback;
}

/**
 * Parses the report's options with node:util parseArgs, strict: an unknown option, a positional or a
 * missing value throws parseArgs' own error. `today` only dates the default --out; --dry-run acts in #33.
 */
export function parseReportArgs(argv: readonly string[], today: Date = new Date()): ReportArgs {
  const { values } = parseArgs({
    args: argv,
    strict: true,
    allowPositionals: false,
    options: {
      "cap-usd": { type: "string" },
      runs: { type: "string" },
      "ollama-model": { type: "string" },
      "gemini-model": { type: "string" },
      out: { type: "string" },
      "dry-run": { type: "boolean" },
    },
  });
  const cap = values["cap-usd"];
  if (cap === undefined) throw new Error("--cap-usd is required");
  // Finite too: some 309 digits or more pass the pattern and read as Infinity (#35).
  if (!/^\d+(\.\d+)?$/.test(cap) || Number(cap) === 0 || !Number.isFinite(Number(cap))) {
    throw new Error(`--cap-usd must be a decimal number > 0, got '${cap}'`);
  }
  const runs = values.runs ?? String(DEFAULT_RUNS);
  if (!/^[1-9]\d*$/.test(runs) || !Number.isFinite(Number(runs))) {
    throw new Error(`--runs must be an integer >= 1, got '${runs}'`);
  }
  return {
    capUsd: Number(cap),
    runs: Number(runs),
    ollamaModel: orDefault("ollama-model", values["ollama-model"], DEFAULT_OLLAMA_MODEL),
    geminiModel: orDefault("gemini-model", values["gemini-model"], DEFAULT_GEMINI_MODEL),
    out: orDefault("out", values.out, defaultReportOut(today)),
    dryRun: values["dry-run"] ?? false,
  };
}
