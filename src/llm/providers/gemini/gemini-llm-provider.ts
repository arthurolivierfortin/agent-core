// Gemini provider (#19): transports to generateContent the request that toGeminiRequest builds,
// and returns what fromGeminiResponse reads. Design: docs/specs/2026-09-30-gemini-provider-design.md.
// Transport errors (#25): docs/specs/2026-09-30-gemini-errors-design.md. No LLMError of this module
// chains a cause, and an external string (body, exception) enters a message only as a bounded excerpt.
// The registry and the barrel exports belong to #26, so no barrel serves this module yet.
//
// Hypotheses not yet verified against the real API, each locked by a test on a fetch double in
// tests/llm/providers/gemini/gemini-llm-provider.test.ts:
// - H5: the API key travels in the x-goog-api-key header, never in the URL.
//   Locked by "hypothesis H5: the API key travels in the x-goog-api-key header".
// - H8: an API error body is { error: { code, message, status } }.
//   Locked by "hypothesis H8: an API error body is { error: { code, message, status } }".

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
/** Longest external string a message quotes: a Gemini error sentence fits, an HTML page is cut (D3). */
const MAX_EXCERPT_LENGTH = 200;

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
    const apiKey = process.env[this.apiKeyVar];
    if (apiKey === undefined || apiKey === "") {
      // The name of the variable only: its value never enters a message.
      throw new LLMError(
        "MISSING_API_KEY",
        `Gemini API key missing: environment variable ${this.apiKeyVar} is unset or empty`,
      );
    }
    const body = toGeminiRequest(messages, opts.tools);
    const url = geminiGenerateContentUrl(opts.model, this.baseURL);
    const res = await this.fetchFn(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
    });
    // Status first: an error body never reaches fromGeminiResponse, whose "no candidate" would mislead.
    if (!res.ok) throw await httpError(res, url);
    return fromGeminiResponse((await res.json()) as GeminiResponse);
  }

  /** First of all: MODEL_NOT_FOUND whatever the environment holds, and never a network call. */
  private assertDeclared(model: string): void {
    if (this.declaredModels.some((declared) => declared.id === model)) return;
    const offered = this.declaredModels.map((declared) => declared.id).join(", ");
    throw new LLMError("MODEL_NOT_FOUND", `Model '${model}' is not declared on this provider. Declared: ${offered}`);
  }
}

/**
 * The LLMError of a non-ok response. The message quotes Gemini's error.message when the body
 * carries one (H8), else the body text, always as a bounded excerpt and never the raw body (D2).
 * A 404 points at baseURL (D8).
 */
async function httpError(res: Response, url: string): Promise<LLMError> {
  const text = await readBody(res);
  const gemini = geminiErrorOf(text);
  const detail = gemini?.message ?? text;
  const extract = detail === "" ? "(empty body)" : excerpt(detail);
  const errorStatus = gemini?.status === undefined ? "" : " " + excerpt(gemini.status);
  if (res.status === 404) {
    return new LLMError(
      "API_ERROR",
      `Gemini 404${errorStatus} from ${url} (check baseURL: host root, without /v1beta): ${extract}`,
    );
  }
  return new LLMError("API_ERROR", `Gemini ${res.status}${errorStatus} from ${url}: ${extract}`);
}

/** The string status and message of the error object of a JSON body, or undefined without one (H8). */
function geminiErrorOf(text: string): { status?: string; message?: string } | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return undefined;
  }
  const error: unknown = (parsed as { error?: unknown } | null)?.error;
  if (typeof error !== "object" || error === null) return undefined;
  const { status, message } = error as { status?: unknown; message?: unknown };
  return {
    status: typeof status === "string" ? status : undefined,
    message: typeof message === "string" ? message : undefined,
  };
}

/** The body text. A body that cannot be read is an API_ERROR with the status, not an escaping exception. */
async function readBody(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch (cause) {
    const reason = excerpt(String(cause));
    throw new LLMError("API_ERROR", `Gemini ${res.status} response body could not be read: ${reason}`);
  }
}

/** At most MAX_EXCERPT_LENGTH characters, then "..." when the text was cut. */
function excerpt(text: string): string {
  return text.length <= MAX_EXCERPT_LENGTH ? text : text.slice(0, MAX_EXCERPT_LENGTH) + "...";
}
