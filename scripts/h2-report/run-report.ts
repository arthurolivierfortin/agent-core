// Runner of the H2 report (#33, C2a): docs/specs/2026-09-30-h2-report-runner-design.md.
// Nothing here can spend: no provider is built and no network is called, whatever the path (P-5).
import { existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { GeminiLLMProvider, OllamaLLMProvider } from "../../dist/index.js";
import type { LLMProvider } from "../../dist/index.js";
import { loadRateEntries, loadRateFile } from "./rates.ts";
import type { RateEntry } from "./rates.ts";
import { parseReportArgs } from "./report-args.ts";
import type { ReportArgs } from "./report-args.ts";
import { assertReadyToStart } from "./start-guard.ts";

/** Where runReport writes: process.stdout and process.stderr in cli.ts, a collector in the tests. */
export type Sink = { write(text: string): unknown };

/** The two providers of the report: Ollama for the local model, Gemini for the hosted one. */
export type ReportProviders = { readonly local: LLMProvider; readonly hosted: LLMProvider };

/** What runReport reads and writes; it reads no process.* itself (cli.ts passes them). */
export type ReportIO = {
  readonly argv: readonly string[];
  readonly env: Readonly<Record<string, string | undefined>>;
  /** The text of data/rates.json, read by the caller. */
  readonly ratesText: string;
  /** Absolute root of the repository: --out is resolved against it. */
  readonly repo: string;
  /** Absolute home directory of the machine; unused by #33, read by #42 to replace machine paths. */
  readonly home: string;
  readonly stdout: Sink;
  readonly stderr: Sink;
  /** Dates the default --out; defaults to the current date (parseReportArgs). */
  readonly today?: Date;
  /** Builds the providers; never called by #33, whatever the path (P-5). #42 defaults it to defaultProviders. */
  readonly providers?: (args: ReportArgs) => ReportProviders;
};

/** The files #42 writes into --out with flag 'wx': a complete report, or a truncated one and its mark (P-3, P-6). */
export const REPORT_FILES = ["summary.csv", "runs.csv", "summary.truncated.csv", "runs.truncated.csv", "TRUNCATED.txt"] as const;

/** budget.maxIterations of every run, set by #42 (P-4); a run makes at most one call more, to land (step.ts). */
export const REPORT_MAX_ITERATIONS = 10;

// The H1 scenario #42 runs; #33 only names it.
const SCENARIO = "aller aux reglages";

/**
 * Default provider factory for #42, never called by #33 (P-5). The models come from `args`, never from PROVIDERS:
 * OLLAMA_MODEL and GEMINI_MODEL change nothing; OLLAMA_HOST stays honoured (R-2). Building calls no network.
 */
export function defaultProviders(args: Pick<ReportArgs, "ollamaModel" | "geminiModel">): ReportProviders {
  return {
    local: new OllamaLLMProvider({ models: [{ id: args.ollamaModel, supportsTools: true }] }),
    hosted: new GeminiLLMProvider({ models: [{ id: args.geminiModel, supportsTools: true }] }),
  };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Refuses --out under docs/demo/, any case (P-2), then one holding a REPORT_FILES name (P-3); only reads. */
function assertOutFree(out: string, repo: string): void {
  const target = resolve(repo, out);
  const segments = relative(repo, target).split(/[\\/]/);
  if (segments[0]?.toLowerCase() === "docs" && segments[1]?.toLowerCase() === "demo") {
    throw new Error(`--out must not be under docs/demo/ (the H1 proof there is compared byte for byte), got '${out}'`);
  }
  const taken = REPORT_FILES.filter((name) => existsSync(join(target, name)));
  if (taken.length > 0) {
    throw new Error(`--out already holds ${taken.join(", ")}; choose another --out or move them away`);
  }
}

function rateText(entry: RateEntry): string {
  if (entry.rate === null) return "rate null";
  return `rate ${entry.rate.usdPerMillionTokensIn} USD in, ${entry.rate.usdPerMillionTokensOut} USD out per million tokens`;
}

/** The announcement, a line each, ended by a newline; the rates' presence is checked by assertReadyToStart. */
function announcement(args: ReportArgs, entries: Readonly<Record<string, RateEntry>>): string {
  const perRun = REPORT_MAX_ITERATIONS + 1;
  const model = (label: string, id: string): string => {
    const entry = entries[id];
    return `${label} model: ${id}; ${rateText(entry)}; effective ${entry.effectiveFrom}; source ${entry.source}`;
  };
  return [
    "H2 report: announcement, before any network call",
    `scenario: ${SCENARIO}`,
    `runs per model (N): ${args.runs}`,
    model("local", args.ollamaModel),
    model("hosted", args.geminiModel),
    `max calls: ${2 * args.runs * perRun}, of which ${args.runs * perRun} hosted` +
      ` (at most ${perRun} per run: maxIterations ${REPORT_MAX_ITERATIONS} plus the landing call)`,
    `cap: ${args.capUsd} USD on the hosted model`,
    `out: ${args.out}`,
    "",
  ].join("\n");
}

/**
 * Checks the arguments, the two models, the rate text, the start guard and --out, in this order; never
 * throws. The first defect goes to stderr and returns 1, nothing on stdout. Then the announcement goes
 * to stdout in one write, and it returns 1: nothing is launched. The provider factory is never called.
 */
export async function runReport(io: ReportIO): Promise<number> {
  let args: ReportArgs;
  let entries: Readonly<Record<string, RateEntry>>;
  try {
    args = parseReportArgs(io.argv, io.today);
    if (args.ollamaModel === args.geminiModel) {
      throw new Error(`--ollama-model and --gemini-model must differ, got '${args.ollamaModel}' for both`);
    }
    // loadRateEntries throws first, with the message loadRateFile would throw on the same defect.
    entries = loadRateEntries(io.ratesText);
    assertReadyToStart(args, loadRateFile(io.ratesText), io.env);
    assertOutFree(args.out, io.repo);
  } catch (error) {
    io.stderr.write(`${messageOf(error)}\n`);
    return 1;
  }
  io.stdout.write(announcement(args, entries));
  return 1;
}
