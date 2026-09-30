// Gemini provider (#19): transports to generateContent the request that toGeminiRequest builds,
// and returns what fromGeminiResponse reads. Design: docs/specs/2026-09-30-gemini-provider-design.md.
// Transport errors (non-ok response, fetch rejection, unreadable JSON) and key redaction belong to
// #25; the registry and the barrel exports belong to #26, so no barrel serves this module yet.
//
// Hypothesis not yet verified against the real API, locked by a test on a fetch double in
// tests/llm/providers/gemini/gemini-llm-provider.test.ts:
// - H5: the API key travels in the x-goog-api-key header, never in the URL.
//   Locked by "hypothesis H5: the API key travels in the x-goog-api-key header".

import { LLMError } from "../../models/index.js";
import type { LLMResponse, Message, ModelInfo } from "../../models/index.js";
import type { CompletionOptions, LLMProvider } from "../../interfaces/index.js";
import {
  GEMINI_DEFAULT_BASE_URL,
  fromGeminiResponse,
  geminiGenerateContentUrl,
  toGeminiRequest,
} from "./gemini-wire.js";
import type { GeminiResponse } from "./gemini-wire.js";

/** The variable read when the configuration names none. Not exported: the public surface is #26's. */
const DEFAULT_API_KEY_VAR = "GEMINI_API_KEY";

export type GeminiConfig = {
  /** The models this provider offers, declared rather than queried (ADR-AGENT-0017). */
  models: ModelInfo[];
  /**
   * Host root, without version or trailing slash. Defaults to GEMINI_DEFAULT_BASE_URL.
   * Do not pass /v1beta: geminiGenerateContentUrl appends it (H1).
   */
  baseURL?: string;
  /** Name of the environment variable holding the API key, never the key itself. Defaults to GEMINI_API_KEY. */
  apiKeyVar?: string;
  /** Injectable for tests; defaults to the global fetch bound to globalThis. */
  fetch?: typeof fetch;
};

export class GeminiLLMProvider implements LLMProvider {
  readonly id = "gemini";
  private readonly declaredModels: ModelInfo[];
  private readonly baseURL: string;
  private readonly apiKeyVar: string;
  private readonly fetchFn: typeof fetch;

  // Reads no environment and never throws for a missing key: the key is a per-call concern.
  constructor(config: GeminiConfig) {
    this.declaredModels = config.models;
    // Taken as it is: a silent fix would hide a wrong configuration, which the 404 reveals (#25).
    this.baseURL = config.baseURL ?? GEMINI_DEFAULT_BASE_URL;
    this.apiKeyVar = config.apiKeyVar ?? DEFAULT_API_KEY_VAR;
    // Bound: a browser's global fetch called as this.fetchFn(...) throws "Illegal invocation".
    this.fetchFn = config.fetch ?? fetch.bind(globalThis);
  }

  models(): ModelInfo[] {
    return this.declaredModels;
  }

  // generateContent only: streamGenerateContent is out of scope, so no stream member (ADR-AGENT-0013).
  supportsStreaming(): boolean {
    return false;
  }

  async complete(messages: Message[], opts: CompletionOptions): Promise<LLMResponse> {
    this.assertDeclared(opts.model);
    // Read on every call and kept in a local, never in a field: a change of process.env between
    // two calls is honoured, and no serialization of the instance carries the key.
    const apiKey = process.env[this.apiKeyVar] ?? "";
    const body = toGeminiRequest(messages, opts.tools);
    const res = await this.fetchFn(geminiGenerateContentUrl(opts.model, this.baseURL), {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
    });
    return fromGeminiResponse((await res.json()) as GeminiResponse);
  }

  /** First of all: MODEL_NOT_FOUND whatever the environment holds, and never a network call. */
  private assertDeclared(model: string): void {
    if (this.declaredModels.some((declared) => declared.id === model)) return;
    const offered = this.declaredModels.map((declared) => declared.id).join(", ");
    throw new LLMError("MODEL_NOT_FOUND", `Model '${model}' is not declared on this provider. Declared: ${offered}`);
  }
}
