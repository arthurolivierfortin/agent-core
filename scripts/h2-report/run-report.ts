// Runner of the H2 report: docs/specs/2026-09-30-h2-report-runner-design.md (#33, the announcement) and
// docs/specs/2026-09-30-h2-report-launch-design.md (#42, the real run). Spending goes only through the
// providers of io.providers (or defaultProviders), the hosted one under one capGuard; never through fetch.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { GeminiLLMProvider, HeuristicTokenCounter, OllamaLLMProvider, SlidingWindowStrategy, defineAgent } from "../../dist/index.js";
import type { LLMProvider, RateTable } from "../../dist/index.js";
// The harness comes from the ./testing subpath, as a consumer imports it: `.` does not serve it (D1).
import { defineScenario, fakeApp, runMatrix } from "../../dist/testing/index.js";
import type { FakeAppState } from "../../dist/testing/index.js";
import { capGuard } from "./cap-guard.ts";
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
  /** Absolute home directory of the machine: replaced by <home> in every file the real run writes. */
  readonly home: string;
  readonly stdout: Sink;
  readonly stderr: Sink;
  /** Dates the default --out; defaults to the current date (parseReportArgs). */
  readonly today?: Date;
  /** Clock of every duration and of the TRUNCATED.txt timestamp; defaults to the current time. */
  readonly now?: () => Date;
  /** Builds the providers: called once by the real run, never by --dry-run. Defaults to defaultProviders. */
  readonly providers?: (args: ReportArgs) => ReportProviders;
};

/** The files the real run writes into --out with flag 'wx': a complete report, or a truncated one and its mark. */
export const REPORT_FILES = ["summary.csv", "runs.csv", "summary.truncated.csv", "runs.truncated.csv", "TRUNCATED.txt"] as const;
const [SUMMARY, RUNS] = REPORT_FILES;

/** budget.maxIterations of every run, set by #42 (P-4); a run makes at most one call more, to land (step.ts). */
export const REPORT_MAX_ITERATIONS = 10;

// The H1 scenario and agent, copied from tests/agent/testing/matrix-demo.test.ts; docs/demo/ stays untouched.
const H1_SCENARIO = defineScenario({
  name: "aller aux reglages",
  env: () => fakeApp({ pages: ["accueil", "reglages", "profil"], current: "accueil" }),
  input: "amene-moi aux reglages",
  expect: { toolsUsed: ["navigate"], finalState: (s: FakeAppState) => s.current === "reglages", stopReason: "completed" },
});
const H1_AGENT = defineAgent({ name: "navigateur", prompt: "Tu aides a naviguer.", tools: [] });

// The default of OllamaLLMProvider (ollama-llm-provider.ts), not exported by the package.
const DEFAULT_OLLAMA_HOST = "http://localhost:11434";

/**
 * Default provider factory of the real run, called once when io.providers is not given. The models come from
 * `args`, never from PROVIDERS: OLLAMA_MODEL and GEMINI_MODEL change nothing; OLLAMA_HOST stays honoured (R-2).
 * Building calls no network.
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
  // Lower-cased before relative, on every platform (R-3): a doubt refuses, another --out repairs it.
  const segments = relative(repo.toLowerCase(), target.toLowerCase()).split(/[\\/]/);
  if (segments[0] === "docs" && segments[1] === "demo") {
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
function announcement(args: ReportArgs, entries: Readonly<Record<string, RateEntry>>, env: ReportIO["env"]): string {
  const perRun = REPORT_MAX_ITERATIONS + 1;
  const model = (label: string, id: string): string => {
    const entry = entries[id];
    return `${label} model: ${id}; ${rateText(entry)}; effective ${entry.effectiveFrom}; source ${entry.source}`;
  };
  return [
    "H2 report: announcement, before any network call",
    `scenario: ${H1_SCENARIO.name}`,
    `runs per model (N): ${args.runs}`,
    model("local", args.ollamaModel),
    // Taken as is, an empty value too: OllamaLLMProvider reads OLLAMA_HOST with ??.
    env.OLLAMA_HOST === undefined
      ? `local host: ${DEFAULT_OLLAMA_HOST} (default, OLLAMA_HOST unset)`
      : `local host: ${env.OLLAMA_HOST} (from OLLAMA_HOST)`,
    model("hosted", args.geminiModel),
    `max calls: ${2 * args.runs * perRun}, of which ${args.runs * perRun} hosted` +
      ` (at most ${perRun} per run: maxIterations ${REPORT_MAX_ITERATIONS} plus the landing call)`,
    `cap: ${args.capUsd} USD on the hosted model`,
    `out: ${args.out}`,
    "",
  ].join("\n");
}

/** <repo> then <home>, each in its slash and its backslash spelling: the repo usually sits under home. */
function scrubMachinePaths(text: string, repo: string, home: string): string {
  for (const [root, label] of [[repo, "<repo>"], [home, "<home>"]]) {
    // An empty root, or a filesystem root such as C:\ or /, would replace far too much.
    if (root === "" || dirname(root) === root) continue;
    text = text.replaceAll(root.replaceAll("\\", "/"), label).replaceAll(root.replaceAll("/", "\\"), label);
  }
  return text;
}

/**
 * The real run (D2): one factory call, one capGuard shared by every hosted run, the local provider unguarded
 * (its rate of 0 would cut the matrix, unpriced_model). Writes every text with flag 'wx'. Never throws: an
 * error goes to stderr and returns 1.
 */
async function launch(io: ReportIO, args: ReportArgs, rates: RateTable): Promise<number> {
  try {
    const providers = (io.providers ?? defaultProviders)(args);
    const guard = capGuard(providers.hosted, rates, args.capUsd);
    const clock = io.now ?? (() => new Date());
    const report = await runMatrix({
      scenarios: [H1_SCENARIO],
      axes: { model: [args.ollamaModel, args.geminiModel] },
      runs: args.runs,
      // Called once per run: a new context strategy each time.
      deps: ({ model }) => ({
        agent: H1_AGENT,
        llm: model === args.geminiModel ? guard : providers.local,
        model,
        context: new SlidingWindowStrategy({ maxTokens: 100_000, counter: new HeuristicTokenCounter() }),
        budget: { maxIterations: REPORT_MAX_ITERATIONS },
      }),
      rates,
      now: () => clock().getTime(),
    });
    const texts: Array<readonly [string, string]> = [[SUMMARY, report.toCSV()], [RUNS, report.toRunsCSV()]];
    // Before any check and any write: the texts as they will be written.
    const files = texts.map(([name, text]) => [name, scrubMachinePaths(text, io.repo, io.home)] as const);
    const target = resolve(io.repo, args.out);
    mkdirSync(target, { recursive: true });
    for (const [name, text] of files) writeFileSync(join(target, name), text, { flag: "wx" });
    io.stdout.write(`H2 report written: ${SUMMARY}, ${RUNS} in ${args.out}\n`);
    return 0;
  } catch (error) {
    io.stderr.write(`${messageOf(error)}\n`);
    return 1;
  }
}

/**
 * Runs the report; never throws. The first defect (arguments, models, rate text, start guard, --out) goes to
 * stderr and returns 1, nothing on stdout. Then the announcement, in one write: --dry-run returns 0 and builds
 * no provider; otherwise launch runs the matrix and writes the report.
 */
export async function runReport(io: ReportIO): Promise<number> {
  let args: ReportArgs;
  let entries: Readonly<Record<string, RateEntry>>;
  let rates: RateTable;
  try {
    args = parseReportArgs(io.argv, io.today);
    if (args.ollamaModel === args.geminiModel) {
      throw new Error(`--ollama-model and --gemini-model must differ, got '${args.ollamaModel}' for both`);
    }
    // loadRateEntries throws first, with the message loadRateFile would throw on the same defect.
    entries = loadRateEntries(io.ratesText);
    rates = loadRateFile(io.ratesText);
    assertReadyToStart(args, rates, io.env);
    assertOutFree(args.out, io.repo);
  } catch (error) {
    io.stderr.write(`${messageOf(error)}\n`);
    return 1;
  }
  io.stdout.write(announcement(args, entries, io.env));
  if (args.dryRun) {
    io.stdout.write("dry run: no provider built, no call made\n");
    return 0;
  }
  return launch(io, args, rates);
}
