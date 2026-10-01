// LLM framework models.
// Pure types: no runtime dependency, no SDK import (placement rule, CLAUDE.md).
// The shared parameter schema lives in the neutral core kernel (ADR-AGENT-0012).

import type { ToolSchema } from "../../core/models/index.js";

/** Role of a message in the conversation sent to the model. */
export type Role = "system" | "user" | "assistant" | "tool";

/**
 * A message in the conversation. The role fixes which fields are valid,
 * so illegal combinations (a `user` carrying `toolCalls`, a `tool` without
 * its `toolCallId`) do not typecheck.
 */
export type Message =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: ToolCall[] }
  | { role: "tool"; content: string; toolCallId: string };

/** The model requests a tool execution. `arguments` is already parsed into an object. */
export type ToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

/**
 * A tool as presented to the model: name + description + parameter schema.
 * llm owns this face-to-model contract (ADR-AGENT-0012); the agent builds it from a Tool.
 */
export type ToolDefinition = {
  name: string;
  description: string;
  parameters: ToolSchema;
};

/**
 * Token count for a call. Absent (not zero) when the provider does not supply it.
 * Each counter is an integer >= 0: the shipped adapters leave usage absent rather than report a
 * counter that is not (#51).
 */
export type Usage = {
  tokensIn: number;
  tokensOut: number;
};

/**
 * Model response to a call.
 * An empty `toolCalls` IS the loop's stop signal (ADR-AGENT-0003).
 * `usage` carries the cost; filled in as soon as a provider supplies it (ADR-AGENT-0007).
 */
export type LLMResponse = {
  content: string;
  toolCalls: ToolCall[];
  usage?: Usage;
};

/**
 * One chunk of a streamed response (ADR-AGENT-0013). Low-level shape, validated against
 * the real Ollama endpoint: a text delta, and usage on the terminal `done` chunk.
 * Streaming tool-calls is a V4 concern; this type may gain fields additively then.
 */
export type LLMChunk = {
  contentDelta: string;
  done: boolean;
  usage?: Usage;
};

/**
 * A model a provider offers. Declared in configuration, never queried (ADR-AGENT-0017):
 * vendors expose their capabilities in incompatible shapes, and the consumer who installs
 * the models is the one who can keep the list honest.
 */
export type ModelInfo = {
  /** What goes into the request body: "qwen2.5:7b". */
  id: string;
  /** Required: whoever declares a model answers for it. */
  supportsTools: boolean;
  maxInputTokens?: number;
};

/** Error codes surfaced by a provider. Closed union: a string key must be typed. */
export type LLMErrorCode =
  | "MISSING_API_KEY"
  | "API_ERROR"
  | "UNKNOWN_PROVIDER"
  | "STREAMING_UNSUPPORTED"
  | "MODEL_NOT_FOUND";

/**
 * Provider error. Unlike a tool failure, it propagates up (CLAUDE.md).
 * The `code` lets you distinguish cases without parsing the message.
 *
 * `status` and `retryAfterMs` are numbers, never strings, and own properties only when given.
 * `status` is set only by a provider that reports it: today GeminiLLMProvider, on every error of a
 * non-ok response. Its absence does not say the failure was not HTTP, only that no status was reported.
 */
export class LLMError extends Error {
  readonly code: LLMErrorCode;
  // declare, never a plain field: under useDefineForClassFields (true for ES2022) a plain optional
  // field would define an own property worth undefined on every LLMError (#34, D2).
  /** HTTP status of the response that failed, when the provider reports one. */
  declare readonly status?: number;
  /** Delay the server asked for before a new attempt, in milliseconds, read from Retry-After. */
  declare readonly retryAfterMs?: number;

  constructor(
    code: LLMErrorCode,
    message: string,
    options?: { cause?: unknown; status?: number; retryAfterMs?: number },
  ) {
    // Error reads the cause key only: status and retryAfterMs are ignored there.
    super(message, options);
    this.name = "LLMError";
    this.code = code;
    if (options?.status !== undefined) this.status = options.status;
    if (options?.retryAfterMs !== undefined) this.retryAfterMs = options.retryAfterMs;
  }
}
