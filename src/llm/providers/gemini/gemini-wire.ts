// Gemini generateContent wire format (#18): the pure translation between the port types
// (Message, ToolDefinition, LLMResponse) and the REST body, so that the provider (#19) only
// transports. No fetch, no process.env, served by no barrel: #19 imports it as ./gemini-wire.js.
// Design: docs/specs/2026-09-30-gemini-wire-design.md.
//
// Format hypotheses not yet verified against the real API. Each one is locked by a test on the
// double in tests/llm/providers/gemini/gemini-wire.test.ts, so that a contradiction observed in
// #19 or #20 names the test to change:
// - H1: generateContent is served under v1beta, not v1.
//   Locked by "hypothesis H1: generateContent is served under v1beta".
// - H2: tool results travel in a content of role user (neither function nor tool).
//   Locked by "hypothesis H2: tool results travel in a user content".
// - H3: a functionCall id is optional in a response, synthesized call_<i> when absent; no id is
//   sent back in a request, so correlation goes by name and order.
//   Locked by "hypothesis H3: functionCall ids are optional".
// - H4: thoughtsTokenCount is not part of candidatesTokenCount; thinking is billed as output.
//   Locked by "hypothesis H4: thoughtsTokenCount counts as output".

import type { Message, ToolDefinition } from "../../models/index.js";

export type GeminiFunctionCall = { id?: string; name: string; args?: Record<string, unknown> };
export type GeminiFunctionResponse = { name: string; response: { content: string } };
export type GeminiPart = {
  text?: string;
  functionCall?: GeminiFunctionCall;
  functionResponse?: GeminiFunctionResponse;
};
export type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };
export type GeminiFunctionDeclaration = {
  name: string;
  description: string;
  parameters?: ToolDefinition["parameters"];
};
export type GeminiRequest = {
  contents: GeminiContent[];
  systemInstruction?: { parts: { text: string }[] };
  tools?: { functionDeclarations: GeminiFunctionDeclaration[] }[];
};
export type GeminiResponse = {
  candidates?: { content?: { role?: string; parts?: GeminiPart[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
};

export const GEMINI_DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com";

/**
 * The generateContent endpoint of a model (H1). Both values are inserted as they are, with no
 * encoding and no trailing-slash normalization: the consumer declares the model (ADR-AGENT-0017),
 * and configuring the base URL belongs to the provider (#19).
 */
export function geminiGenerateContentUrl(model: string, baseURL: string = GEMINI_DEFAULT_BASE_URL): string {
  return baseURL + "/v1beta/models/" + model + ":generateContent";
}

/**
 * The generateContent body for a conversation. Synchronous and pure: #19 builds it before any
 * fetch. Every system message, wherever it sits, goes to systemInstruction, joined by a blank line.
 */
export function toGeminiRequest(messages: Message[], tools?: ToolDefinition[]): GeminiRequest {
  const systemTexts: string[] = [];
  const contents: GeminiContent[] = [];
  for (const message of messages) {
    if (message.role === "system") {
      systemTexts.push(message.content);
    } else if (message.role === "user") {
      contents.push({ role: "user", parts: [{ text: message.content }] });
    }
  }
  const request: GeminiRequest = { contents };
  if (systemTexts.length > 0) request.systemInstruction = { parts: [{ text: systemTexts.join("\n\n") }] };
  return request;
}
