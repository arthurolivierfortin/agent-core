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

import { LLMError } from "../../models/index.js";
import type { LLMResponse, Message, ToolCall, ToolDefinition } from "../../models/index.js";

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
 * Consecutive tool results share one user content (H2). A tool message whose toolCallId no earlier
 * assistant toolCall carries throws API_ERROR, before any network call.
 */
export function toGeminiRequest(messages: Message[], tools?: ToolDefinition[]): GeminiRequest {
  const systemTexts: string[] = [];
  const contents: GeminiContent[] = [];
  // The last content added, as long as a tool message added it: the next tool result joins it.
  let toolContent: GeminiContent | undefined;
  for (const [index, message] of messages.entries()) {
    if (message.role === "system") {
      systemTexts.push(message.content);
    } else if (message.role === "user") {
      contents.push({ role: "user", parts: [{ text: message.content }] });
      toolContent = undefined;
    } else if (message.role === "assistant") {
      const parts = modelParts(message.content, message.toolCalls);
      if (parts.length === 0) continue;
      contents.push({ role: "model", parts });
      toolContent = undefined;
    } else {
      const name = toolCallName(messages, index, message.toolCallId);
      if (name === undefined) {
        throw new LLMError(
          "API_ERROR",
          `Gemini request: tool message references toolCallId '${message.toolCallId}' but no preceding assistant toolCall has that id`,
        );
      }
      const part: GeminiPart = { functionResponse: { name, response: { content: message.content } } };
      if (toolContent === undefined) {
        toolContent = { role: "user", parts: [part] };
        contents.push(toolContent);
      } else {
        toolContent.parts.push(part);
      }
    }
  }
  const request: GeminiRequest = { contents };
  if (systemTexts.length > 0) request.systemInstruction = { parts: [{ text: systemTexts.join("\n\n") }] };
  if (tools !== undefined && tools.length > 0) {
    request.tools = [{ functionDeclarations: tools.map(toFunctionDeclaration) }];
  }
  return request;
}

/**
 * The parts of an assistant turn: its text unless empty, then one functionCall per toolCall in
 * order, with no id (H3). An empty result makes the caller omit the turn rather than send an
 * empty content the API might refuse.
 */
function modelParts(content: string, toolCalls: ToolCall[] = []): GeminiPart[] {
  const parts: GeminiPart[] = content === "" ? [] : [{ text: content }];
  for (const call of toolCalls) parts.push({ functionCall: { name: call.name, args: call.arguments } });
  return parts;
}

/**
 * The name of the toolCall a tool message answers, read in the nearest assistant message before it
 * that carries that id: synthesized ids (call_0) repeat from one turn to the next, so the most
 * recent wins. No id is sent back (H3), so the name is what ties the result to its call.
 */
function toolCallName(messages: Message[], index: number, toolCallId: string): string | undefined {
  for (let i = index - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "assistant") continue;
    const call = message.toolCalls?.find((candidate) => candidate.id === toolCallId);
    if (call !== undefined) return call.name;
  }
  return undefined;
}

/**
 * A tool as Gemini declares it. The schema is passed as it is, lowercase JSON Schema types
 * included (no conversion to OpenAPI uppercase), and omitted when it has no property: Gemini is
 * assumed to refuse an object schema without properties. Neither point is verified yet.
 */
function toFunctionDeclaration(tool: ToolDefinition): GeminiFunctionDeclaration {
  const declaration: GeminiFunctionDeclaration = { name: tool.name, description: tool.description };
  if (Object.keys(tool.parameters.properties).length > 0) declaration.parameters = tool.parameters;
  return declaration;
}

/**
 * Read a generateContent body. Synchronous and pure. Only the first candidate counts: its text
 * parts joined with nothing between them, since Gemini may split one text across several parts,
 * and one toolCall per functionCall part, in order.
 */
export function fromGeminiResponse(body: GeminiResponse): LLMResponse {
  const parts = body.candidates?.[0]?.content?.parts ?? [];
  let content = "";
  const toolCalls: ToolCall[] = [];
  for (const part of parts) {
    if (typeof part.text === "string") content += part.text;
    if (part.functionCall === undefined) continue;
    const call = part.functionCall;
    // i is the rank among functionCall parts, so call_0 is the first call whatever text precedes it.
    toolCalls.push({ id: call.id ?? `call_${toolCalls.length}`, name: call.name, arguments: call.args ?? {} });
  }
  return { content, toolCalls };
}
