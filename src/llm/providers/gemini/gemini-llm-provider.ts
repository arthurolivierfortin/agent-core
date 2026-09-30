// Gemini provider (#19): transports to generateContent the request that toGeminiRequest builds,
// and returns what fromGeminiResponse reads. Design: docs/specs/2026-09-30-gemini-provider-design.md.
// Transport errors (#25): docs/specs/2026-09-30-gemini-errors-design.md. No LLMError of this module
// chains a cause, and an external string (body, exception) enters a message only with the key
// redacted first, then as a bounded excerpt, so that a cut never leaves a prefix of the key (D3).
// HTTP status (#34): docs/specs/2026-09-30-llm-error-status-design.md. Every LLMError of a non-ok
// response carries status, even when its body cannot be read; a network failure or an ok response
// carries none.
// retryAfterMs comes from a Retry-After in delay-seconds form only (H9).
// Served by ./llm and . through src/llm/providers/index.ts, which re-exports GeminiLLMProvider and GeminiConfig only.
//
// Hypotheses not yet verified against the real API, each locked by a test on a fetch double in
// tests/llm/providers/gemini/gemini-llm-provider.test.ts:
// - H5: the API key travels in the x-goog-api-key header, never in the URL.
//   Locked by "hypothesis H5: the API key travels in the x-goog-api-key header".
// - H7: an unknown model answers 404 with error.status NOT_FOUND, which a wrong baseURL does not.
//   Locked by "hypothesis H7: an unknown model answers 404 with error.status NOT_FOUND".
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

/** The variable read when the configuration names none. Not exported: GeminiConfig.apiKeyVar documents it. */
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
    let res: Response;
    try {
      res = await this.fetchFn(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify(body),
      });
    } catch (cause) {
      // No chained cause (D4): its text enters the message, the object itself never travels.
      const reason = excerpt(redactKey(String(cause), apiKey));
      throw new LLMError("API_ERROR", `Gemini request to ${redactKey(url, apiKey)} failed: ${reason}`);
    }
    // Status first: an error body never reaches fromGeminiResponse, whose "no candidate" would mislead.
    if (!res.ok) throw await httpError(res, url, opts.model, apiKey);
    // Parsed here rather than by res.json(): the excerpt of a bad body is ours, not a V8 fragment (D6).
    const text = await readBody(res, apiKey);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new LLMError("API_ERROR", `Gemini ${res.status} response is not JSON: ${excerpt(redactKey(text, apiKey))}`);
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      const quoted = excerpt(redactKey(text, apiKey));
      throw new LLMError("API_ERROR", `Gemini ${res.status} response is not a JSON object: ${quoted}`);
    }
    try {
      return fromGeminiResponse(parsed as GeminiResponse);
    } catch (error) {
      // Its messages quote blockReason and finishReason, strings from the server (D7).
      if (error instanceof LLMError) throw new LLMError(error.code, redactKey(error.message, apiKey));
      throw error;
    }
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
 * A 404 whose error.status is NOT_FOUND is MODEL_NOT_FOUND (H7); any other 404 points at baseURL (D8).
 * Every one carries the status of the response, and retryAfterMs when Retry-After is valid (#34).
 */
async function httpError(res: Response, url: string, model: string, apiKey: string): Promise<LLMError> {
  // Read from the response before its body: an error body that cannot be read keeps both (#34).
  const http = { status: res.status, retryAfterMs: retryAfterMsOf(res) };
  const text = await readBody(res, apiKey, http);
  const gemini = geminiErrorOf(text);
  const detail = gemini?.message ?? text;
  const extract = detail === "" ? "(empty body)" : excerpt(redactKey(detail, apiKey));
  const errorStatus = gemini?.status === undefined ? "" : " " + excerpt(redactKey(gemini.status, apiKey));
  const safeUrl = redactKey(url, apiKey);
  // Only Gemini's own NOT_FOUND names a missing model: a 404 from a wrong baseURL does not carry it.
  if (res.status === 404 && gemini?.status === "NOT_FOUND") {
    return new LLMError(
      "MODEL_NOT_FOUND",
      `Gemini has no model '${model}' (404 NOT_FOUND from ${safeUrl}): ${extract}`,
      http,
    );
  }
  if (res.status === 404) {
    return new LLMError(
      "API_ERROR",
      `Gemini 404${errorStatus} from ${safeUrl} (check baseURL: host root, without /v1beta): ${extract}`,
      http,
    );
  }
  return new LLMError("API_ERROR", `Gemini ${res.status}${errorStatus} from ${safeUrl}: ${extract}`, http);
}

/**
 * Retry-After in delay-seconds form, as milliseconds; undefined when absent, in any other form, or
 * when the response has no headers: an injected fetch may answer an object without them (#35).
 */
function retryAfterMsOf(res: Response): number | undefined {
  if (typeof res.headers?.get !== "function") return undefined;
  const raw = res.headers.get("retry-after");
  if (raw === null) return undefined;
  // delay-seconds of RFC 9110 section 10.2.3 only: an HTTP-date would need a clock (#34, D4).
  // Never throws, and the raw value never enters a message or a field: only its conversion does.
  const value = raw.trim();
  if (!/^\d+$/.test(value)) return undefined;
  const ms = Number(value) * 1000;
  return Number.isSafeInteger(ms) ? ms : undefined;
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

/**
 * The body text. A body that cannot be read is an API_ERROR with the status, not an escaping exception.
 * Its LLMError takes http as options when httpError passes it; the ok path passes nothing (#34).
 */
async function readBody(
  res: Response,
  apiKey: string,
  http?: { status: number; retryAfterMs?: number },
): Promise<string> {
  try {
    return await res.text();
  } catch (cause) {
    const reason = excerpt(redactKey(String(cause), apiKey));
    throw new LLMError("API_ERROR", `Gemini ${res.status} response body could not be read: ${reason}`, http);
  }
}

/** Every occurrence of the key replaced by [redacted]. Applied before excerpt, never after (D3). */
function redactKey(text: string, apiKey: string): string {
  return text.replaceAll(apiKey, "[redacted]");
}

/** At most MAX_EXCERPT_LENGTH characters, then "..." when the text was cut. */
function excerpt(text: string): string {
  return text.length <= MAX_EXCERPT_LENGTH ? text : text.slice(0, MAX_EXCERPT_LENGTH) + "...";
}
