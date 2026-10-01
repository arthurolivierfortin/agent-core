// Runner of the H2 report (#33, C2a): docs/specs/2026-09-30-h2-report-runner-design.md.
// Nothing here can spend: no provider is built and no network is called, whatever the path (P-5).
import { GeminiLLMProvider, OllamaLLMProvider } from "../../dist/index.js";
import type { LLMProvider } from "../../dist/index.js";
import type { ReportArgs } from "./report-args.ts";

/** The two providers of the report: Ollama for the local model, Gemini for the hosted one. */
export type ReportProviders = { readonly local: LLMProvider; readonly hosted: LLMProvider };

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
