import { test } from "node:test";
import assert from "node:assert/strict";
import { GeminiLLMProvider } from "../../../../dist/llm/providers/gemini/gemini-llm-provider.js";
import { toGeminiRequest } from "../../../../dist/llm/providers/gemini/gemini-wire.js";

// Every fetch in this file is a double: no network, no hosted provider. Key values are fake
// (cle-factice-*), and process.env is only touched through withEnv, which restores it.

const MODEL = "gemini-2.5-flash";
/** What most providers in this file declare; the model then travels per call (ADR-AGENT-0017). */
const DECLARED = [{ id: MODEL, supportsTools: true }];
/** A variable no machine sets, so that the default GEMINI_API_KEY stays out of the way. */
const KEY_VAR = "AGENT_CORE_TEST_GEMINI_KEY";

const ANSWER = {
  candidates: [
    {
      content: {
        role: "model",
        parts: [{ text: "Bon" }, { text: "jour" }, { functionCall: { name: "navigate", args: { page: "reglages" } } }],
      },
      finishReason: "STOP",
    },
  ],
  usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 4 },
};

const NAVIGATE = {
  name: "navigate",
  description: "Navigate to a page.",
  parameters: { type: "object" as const, properties: { page: { type: "string" as const } }, required: ["page"] },
};

const CONVERSATION = [
  { role: "system" as const, content: "Tu aides." },
  { role: "user" as const, content: "va aux reglages" },
];

/**
 * Run body with each variable set, or deleted when its value is undefined, then restore the
 * initial state in finally, whatever body does.
 */
async function withEnv(values: Record<string, string | undefined>, body: () => Promise<void>): Promise<void> {
  const initial = new Map<string, string | undefined>();
  for (const name of Object.keys(values)) initial.set(name, process.env[name]);
  try {
    for (const [name, value] of Object.entries(values)) setEnv(name, value);
    await body();
  } finally {
    for (const [name, value] of initial) setEnv(name, value);
  }
}

/** Absence is a delete: assigning undefined to process.env would write the string "undefined". */
function setEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

type CapturedCall = { url: string; init: RequestInit };

/** A fetch double that records every call and answers ANSWER. */
function capturingFetch(): { fetch: typeof fetch; calls: CapturedCall[] } {
  const calls: CapturedCall[] = [];
  const fetchFn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(ANSWER), { status: 200 });
  }) as unknown as typeof fetch;
  return { fetch: fetchFn, calls };
}

/** An expected LLMError with this code: its message matches every present pattern, no absent one. */
function llmError(code: string, present: RegExp[], absent: RegExp[] = []) {
  return (error: unknown) => {
    assert.equal((error as { name: string }).name, "LLMError");
    assert.equal((error as { code: string }).code, code);
    for (const pattern of present) assert.match((error as Error).message, pattern);
    for (const pattern of absent) assert.doesNotMatch((error as Error).message, pattern);
    return true;
  };
}

test("construction reads no environment and declares the models, without streaming", async () => {
  await withEnv({ [KEY_VAR]: undefined }, async () => {
    const provider = new GeminiLLMProvider({ models: DECLARED, apiKeyVar: KEY_VAR, fetch: capturingFetch().fetch });
    assert.equal(provider.id, "gemini");
    assert.deepStrictEqual(provider.models(), DECLARED);
    assert.equal(provider.supportsStreaming(), false);
    assert.equal("stream" in provider, false, "a provider that does not stream omits stream (ADR-AGENT-0013)");
  });
});

test("hypothesis H5: the API key travels in the x-goog-api-key header", async () => {
  await withEnv({ [KEY_VAR]: "cle-factice-1" }, async () => {
    const double = capturingFetch();
    const provider = new GeminiLLMProvider({ models: DECLARED, apiKeyVar: KEY_VAR, fetch: double.fetch });
    const response = await provider.complete(CONVERSATION, { model: MODEL, tools: [NAVIGATE] });
    assert.deepStrictEqual(response, {
      content: "Bonjour",
      toolCalls: [{ id: "call_0", name: "navigate", arguments: { page: "reglages" } }],
      usage: { tokensIn: 12, tokensOut: 4 },
    });
    assert.equal(double.calls.length, 1);
    const [call] = double.calls;
    assert.equal(call.url, "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent");
    assert.equal(call.init.method, "POST");
    assert.deepStrictEqual(call.init.headers, { "content-type": "application/json", "x-goog-api-key": "cle-factice-1" });
    assert.deepStrictEqual(JSON.parse(call.init.body as string), toGeminiRequest(CONVERSATION, [NAVIGATE]));
  });
});

test("the key is read on every call and never kept on the instance", async () => {
  const double = capturingFetch();
  const provider = new GeminiLLMProvider({ models: DECLARED, apiKeyVar: KEY_VAR, fetch: double.fetch });
  await withEnv({ [KEY_VAR]: "cle-factice-1" }, async () => {
    await provider.complete([{ role: "user", content: "hi" }], { model: MODEL });
  });
  await withEnv({ [KEY_VAR]: "cle-factice-2" }, async () => {
    await provider.complete([{ role: "user", content: "hi" }], { model: MODEL });
  });
  assert.equal(double.calls.length, 2);
  assert.equal((double.calls[0].init.headers as Record<string, string>)["x-goog-api-key"], "cle-factice-1");
  assert.equal((double.calls[1].init.headers as Record<string, string>)["x-goog-api-key"], "cle-factice-2");
  assert.doesNotMatch(JSON.stringify(provider), /cle-factice/);
});

test("baseURL is a host root, extended with /v1beta by geminiGenerateContentUrl", async () => {
  await withEnv({ [KEY_VAR]: "cle-factice-1" }, async () => {
    const double = capturingFetch();
    const provider = new GeminiLLMProvider({
      models: DECLARED,
      baseURL: "http://localhost:8080",
      apiKeyVar: KEY_VAR,
      fetch: double.fetch,
    });
    await provider.complete([{ role: "user", content: "hi" }], { model: MODEL });
    assert.equal(double.calls[0].url, "http://localhost:8080/v1beta/models/gemini-2.5-flash:generateContent");
  });
});

test("a request toGeminiRequest refuses never reaches fetch", async () => {
  await withEnv({ [KEY_VAR]: "cle-factice-1" }, async () => {
    const double = capturingFetch();
    const provider = new GeminiLLMProvider({ models: DECLARED, apiKeyVar: KEY_VAR, fetch: double.fetch });
    await assert.rejects(
      () =>
        provider.complete(
          [
            { role: "user", content: "go" },
            { role: "tool", toolCallId: "call_9", content: "x" },
          ],
          { model: MODEL },
        ),
      llmError("API_ERROR", [/call_9/]),
    );
    assert.equal(double.calls.length, 0);
  });
});

test("the default fetch (no config.fetch given) is the global one, bound to globalThis", async () => {
  // Replacing the global with a spy makes the receiver observable without a browser, where an
  // unbound fetch throws "Illegal invocation" (same test as the Ollama provider's).
  const original = globalThis.fetch;
  let receiver: unknown;
  globalThis.fetch = function (this: unknown) {
    receiver = this;
    return Promise.resolve(new Response(JSON.stringify(ANSWER), { status: 200 }));
  } as unknown as typeof fetch;
  try {
    await withEnv({ [KEY_VAR]: "cle-factice-1" }, async () => {
      const provider = new GeminiLLMProvider({ models: DECLARED, apiKeyVar: KEY_VAR });
      await provider.complete([{ role: "user", content: "hi" }], { model: MODEL });
    });
  } finally {
    globalThis.fetch = original;
  }
  assert.equal(receiver, globalThis);
});
