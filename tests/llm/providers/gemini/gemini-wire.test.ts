import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GEMINI_DEFAULT_BASE_URL,
  geminiGenerateContentUrl,
  toGeminiRequest,
} from "../../../../dist/llm/providers/gemini/gemini-wire.js";
import { toToolDefinition } from "../../../../dist/index.js";
import { fakeApp } from "../../../../dist/testing/index.js";

// The double of this file is the response bodies written below as literals: no network, no hosted
// provider. The model named in them is gemini-2.5-flash.

function user(content: string) {
  return { role: "user" as const, content };
}

/** An expected error: the port's LLMError, code API_ERROR, its message matching every pattern. */
function apiError(...patterns: RegExp[]) {
  return (error: unknown) => {
    assert.equal((error as { name: string }).name, "LLMError");
    assert.equal((error as { code: string }).code, "API_ERROR");
    for (const pattern of patterns) assert.match((error as Error).message, pattern);
    return true;
  };
}

test("hypothesis H1: generateContent is served under v1beta", () => {
  assert.equal(
    geminiGenerateContentUrl("gemini-2.5-flash"),
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
  );
  assert.equal(GEMINI_DEFAULT_BASE_URL, "https://generativelanguage.googleapis.com");
  assert.equal(
    geminiGenerateContentUrl("gemini-2.5-flash", "http://localhost:8080"),
    "http://localhost:8080/v1beta/models/gemini-2.5-flash:generateContent",
  );
});

test("toGeminiRequest joins every system message into systemInstruction and maps user messages", () => {
  const request = toGeminiRequest([
    { role: "system", content: "A" },
    user("bonjour"),
    { role: "system", content: "B" },
    user(""),
  ]);

  assert.deepStrictEqual(request, {
    systemInstruction: { parts: [{ text: "A\n\nB" }] },
    contents: [
      { role: "user", parts: [{ text: "bonjour" }] },
      { role: "user", parts: [{ text: "" }] },
    ],
  });
  const bare = toGeminiRequest([user("x")]);
  assert.equal("systemInstruction" in bare, false);
  assert.equal("tools" in bare, false);
});

test("toGeminiRequest maps assistant messages to model contents with functionCall parts, and omits an empty one", () => {
  const { contents } = toGeminiRequest([
    user("go"),
    {
      role: "assistant",
      content: "Je regarde.",
      toolCalls: [
        { id: "call_0", name: "getCurrentPage", arguments: {} },
        { id: "call_1", name: "navigate", arguments: { page: "reglages" } },
      ],
    },
    { role: "assistant", content: "", toolCalls: [{ id: "x", name: "getCurrentPage", arguments: {} }] },
    { role: "assistant", content: "" },
    user("ok"),
  ]);

  // Strict equality also proves that no functionCall carries an id (H3).
  assert.deepStrictEqual(contents, [
    { role: "user", parts: [{ text: "go" }] },
    {
      role: "model",
      parts: [
        { text: "Je regarde." },
        { functionCall: { name: "getCurrentPage", args: {} } },
        { functionCall: { name: "navigate", args: { page: "reglages" } } },
      ],
    },
    { role: "model", parts: [{ functionCall: { name: "getCurrentPage", args: {} } }] },
    { role: "user", parts: [{ text: "ok" }] },
  ]);
});

test("hypothesis H2: tool results travel in a user content", () => {
  const { contents } = toGeminiRequest([
    user("go"),
    { role: "assistant", content: "", toolCalls: [{ id: "call_0", name: "navigate", arguments: { page: "reglages" } }] },
    { role: "tool", toolCallId: "call_0", content: "Navigated to 'reglages'." },
    {
      role: "assistant",
      content: "",
      toolCalls: [
        { id: "call_0", name: "getCurrentPage", arguments: {} },
        { id: "call_1", name: "navigate", arguments: { page: "accueil" } },
      ],
    },
    { role: "tool", toolCallId: "call_0", content: "reglages" },
    { role: "tool", toolCallId: "call_1", content: "Navigated to 'accueil'." },
  ]);

  assert.equal(contents.length, 5);
  assert.deepStrictEqual(contents[2], {
    role: "user",
    parts: [{ functionResponse: { name: "navigate", response: { content: "Navigated to 'reglages'." } } }],
  });
  // The second call_0 resolves to getCurrentPage: the nearest assistant turn wins, since
  // synthesized ids repeat from one turn to the next.
  assert.deepStrictEqual(contents[4], {
    role: "user",
    parts: [
      { functionResponse: { name: "getCurrentPage", response: { content: "reglages" } } },
      { functionResponse: { name: "navigate", response: { content: "Navigated to 'accueil'." } } },
    ],
  });
});

test("toGeminiRequest throws API_ERROR, synchronously, on a toolCallId no preceding assistant toolCall carries", () => {
  assert.throws(
    () => toGeminiRequest([user("go"), { role: "tool", toolCallId: "call_9", content: "x" }]),
    apiError(/call_9/),
  );
  // An id that only a later assistant turn carries is still an orphan.
  assert.throws(
    () =>
      toGeminiRequest([
        user("go"),
        { role: "tool", toolCallId: "call_0", content: "x" },
        { role: "assistant", content: "", toolCalls: [{ id: "call_0", name: "navigate", arguments: { page: "reglages" } }] },
      ]),
    apiError(/call_0/),
  );
});

test("toGeminiRequest declares tools as functionDeclarations, parameters omitted when the schema has no property", () => {
  const defs = fakeApp({ pages: ["accueil", "reglages"], current: "accueil" }).tools.map(toToolDefinition);

  const { tools } = toGeminiRequest([user("go")], defs);

  assert.deepStrictEqual(tools, [
    {
      functionDeclarations: [
        { name: "navigate", description: "Navigate to a page of the application by name.", parameters: defs[0].parameters },
        { name: "getCurrentPage", description: "Return the name of the page currently displayed." },
      ],
    },
  ]);
  assert.equal("parameters" in tools![0].functionDeclarations[1], false);
  assert.equal("tools" in toGeminiRequest([user("go")]), false);
  assert.equal("tools" in toGeminiRequest([user("go")], []), false);
});
