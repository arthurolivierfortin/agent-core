// Runner of the H2 report (#33, C2a): docs/specs/2026-09-30-h2-report-runner-design.md.
// Nothing here can spend: no provider is built and no network is called, whatever the path (P-5).
import { GeminiLLMProvider, OllamaLLMProvider } from "../../dist/index.js";
import type { LLMProvider } from "../../dist/index.js";
import { loadRateEntries, loadRateFile } from "./rates.ts";
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

/**
 * Checks the arguments, the two models, the rate text and the start guard, in this order; never throws.
 * The first defect goes to stderr and returns 1, nothing on stdout. All checks passed, it returns 1 too:
 * nothing is launched. The provider factory is never called.
 */
export async function runReport(io: ReportIO): Promise<number> {
  try {
    const args = parseReportArgs(io.argv, io.today);
    if (args.ollamaModel === args.geminiModel) {
      throw new Error(`--ollama-model and --gemini-model must differ, got '${args.ollamaModel}' for both`);
    }
    // loadRateEntries throws first, with the message loadRateFile would throw on the same defect.
    loadRateEntries(io.ratesText);
    assertReadyToStart(args, loadRateFile(io.ratesText), io.env);
  } catch (error) {
    io.stderr.write(`${messageOf(error)}\n`);
    return 1;
  }
  return 1;
}
