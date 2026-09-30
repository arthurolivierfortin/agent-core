import { test } from "node:test";
import assert from "node:assert/strict";
import { GeminiLLMProvider } from "../../../../dist/llm/providers/gemini/gemini-llm-provider.js";
import { toGeminiRequest } from "../../../../dist/llm/providers/gemini/gemini-wire.js";
import { checkProviderContract } from "../../../../dist/testing/index.js";

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

/** A fetch double that must never be called: it counts the call, then throws. */
function unreachableFetch(): { fetch: typeof fetch; count: () => number } {
  let calls = 0;
  const fetchFn = (async () => {
    calls++;
    throw new Error("fetch must not be called");
  }) as unknown as typeof fetch;
  return { fetch: fetchFn, count: () => calls };
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

test("complete() refuses an undeclared model before reading the key or calling fetch", async () => {
  const double = unreachableFetch();
  const provider = new GeminiLLMProvider({
    models: [
      { id: "gemini-2.5-flash", supportsTools: true },
      { id: "gemini-2.5-flash-lite", supportsTools: false },
    ],
    apiKeyVar: KEY_VAR,
    fetch: double.fetch,
  });
  const call = () => provider.complete([{ role: "user", content: "hi" }], { model: "gemini-1.5-pro" });
  await withEnv({ [KEY_VAR]: undefined }, async () => {
    await assert.rejects(call, llmError("MODEL_NOT_FOUND", [/gemini-1\.5-pro/, /gemini-2\.5-flash, gemini-2\.5-flash-lite/]));
  });
  assert.equal(double.count(), 0);
  await withEnv({ [KEY_VAR]: "cle-factice-ne-pas-afficher" }, async () => {
    await assert.rejects(call, llmError("MODEL_NOT_FOUND", [], [/cle-factice-ne-pas-afficher/]));
  });
  assert.equal(double.count(), 0);
});

test("checkProviderContract passes on a fetch double, with no streaming check", async () => {
  await withEnv({ [KEY_VAR]: "cle-factice-1" }, async () => {
    const provider = new GeminiLLMProvider({ models: DECLARED, apiKeyVar: KEY_VAR, fetch: capturingFetch().fetch });
    const report = await checkProviderContract(provider);
    assert.equal(report.ok, true, JSON.stringify(report.checks));
    assert.deepStrictEqual(
      report.checks.filter((check) => /stream|chunk/.test(check.name)),
      [],
    );
    assert.deepStrictEqual(
      report.checks.find((check) => check.name === "complete() refuses a model the provider does not declare"),
      { name: "complete() refuses a model the provider does not declare", ok: true },
    );
  });
});

test("complete() refuses a missing key and names the default variable, before calling fetch", async () => {
  const double = unreachableFetch();
  const provider = new GeminiLLMProvider({ models: DECLARED, fetch: double.fetch });
  const call = () => provider.complete([{ role: "user", content: "hi" }], { model: MODEL });
  await withEnv({ GEMINI_API_KEY: undefined }, async () => {
    await assert.rejects(call, llmError("MISSING_API_KEY", [/GEMINI_API_KEY/]));
  });
  await withEnv({ GEMINI_API_KEY: "" }, async () => {
    await assert.rejects(call, llmError("MISSING_API_KEY", [/GEMINI_API_KEY/]));
  });
  assert.equal(double.count(), 0);
});

test("complete() refuses a missing key and names the configured variable, never a value", async () => {
  const double = unreachableFetch();
  const provider = new GeminiLLMProvider({ models: DECLARED, apiKeyVar: KEY_VAR, fetch: double.fetch });
  const call = () => provider.complete([{ role: "user", content: "hi" }], { model: MODEL });
  await withEnv({ [KEY_VAR]: undefined, GEMINI_API_KEY: "cle-factice-ne-pas-afficher" }, async () => {
    await assert.rejects(
      call,
      llmError("MISSING_API_KEY", [/AGENT_CORE_TEST_GEMINI_KEY/], [/GEMINI_API_KEY/, /cle-factice-ne-pas-afficher/]),
    );
  });
  await withEnv({ [KEY_VAR]: "" }, async () => {
    await assert.rejects(call, llmError("MISSING_API_KEY", [/AGENT_CORE_TEST_GEMINI_KEY/]));
  });
  assert.equal(double.count(), 0);
});

// Transport errors (#25). Each case calls complete() on "hi" for MODEL, with a fetch double.

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

/** A fetch double that answers this status and body, and counts its calls. */
function respondingFetch(status: number, body: string): { fetch: typeof fetch; count: () => number } {
  let calls = 0;
  const fetchFn = (async () => {
    calls++;
    return new Response(body, { status });
  }) as unknown as typeof fetch;
  return { fetch: fetchFn, count: () => calls };
}

/** A fetch double whose response has this status and a body that cannot be read: text() rejects. */
function unreadableFetch(status: number, error: unknown): typeof fetch {
  const res = {
    ok: status >= 200 && status < 300,
    status,
    text: async () => {
      throw error;
    },
  };
  return (async () => res as unknown as Response) as unknown as typeof fetch;
}

type TransportError = Error & { code: string };

/** complete() under this key rejects with an LLMError of exactly this code and message, returned. */
async function expectFailure(fetchFn: typeof fetch, code: string, message: string, key = "cle-factice-1") {
  let failure: unknown;
  await withEnv({ [KEY_VAR]: key }, async () => {
    const provider = new GeminiLLMProvider({ models: DECLARED, apiKeyVar: KEY_VAR, fetch: fetchFn });
    await assert.rejects(provider.complete([{ role: "user", content: "hi" }], { model: MODEL }), (error: unknown) => {
      failure = error;
      return true;
    });
  });
  const error = failure as TransportError;
  assert.equal(error.name, "LLMError");
  assert.equal(error.code, code);
  assert.equal(error.message, message);
  return error;
}

test("hypothesis H8: an API error body is { error: { code, message, status } }", async () => {
  const body = { error: { code: 400, message: "Invalid JSON payload received.", status: "INVALID_ARGUMENT" } };
  const double = respondingFetch(400, JSON.stringify(body));
  await expectFailure(
    double.fetch,
    "API_ERROR",
    `Gemini 400 INVALID_ARGUMENT from ${ENDPOINT}: Invalid JSON payload received.`,
  );
  assert.equal(double.count(), 1);
});

test("a non-ok response quotes its status and a bounded excerpt of its body, never the whole body", async () => {
  const html = respondingFetch(503, "<html>" + "x".repeat(300) + "FIN</html>");
  await expectFailure(html.fetch, "API_ERROR", `Gemini 503 from ${ENDPOINT}: <html>${"x".repeat(194)}...`);
  assert.equal(html.count(), 1);
  const empty = respondingFetch(500, "");
  await expectFailure(empty.fetch, "API_ERROR", `Gemini 500 from ${ENDPOINT}: (empty body)`);
  assert.equal(empty.count(), 1);
});

test("a 404 that carries no Gemini error points at baseURL", async () => {
  const double = respondingFetch(404, "<html>Not Found</html>");
  await expectFailure(
    double.fetch,
    "API_ERROR",
    `Gemini 404 from ${ENDPOINT} (check baseURL: host root, without /v1beta): <html>Not Found</html>`,
  );
  assert.equal(double.count(), 1);
});

test("an error body that cannot be read is an API_ERROR with the status", async () => {
  await expectFailure(
    unreadableFetch(500, new Error("socket closed")),
    "API_ERROR",
    "Gemini 500 response body could not be read: Error: socket closed",
  );
});

test("hypothesis H7: an unknown model answers 404 with error.status NOT_FOUND", async () => {
  const message = "models/gemini-2.5-flash is not found for API version v1beta, or is not supported for generateContent.";
  const double = respondingFetch(404, JSON.stringify({ error: { code: 404, message, status: "NOT_FOUND" } }));
  await expectFailure(
    double.fetch,
    "MODEL_NOT_FOUND",
    `Gemini has no model 'gemini-2.5-flash' (404 NOT_FOUND from ${ENDPOINT}): ${message}`,
  );
  assert.equal(double.count(), 1);
});

test("only a 404 whose error.status is NOT_FOUND is MODEL_NOT_FOUND", async () => {
  const unimplemented = { error: { code: 404, message: "Method not found.", status: "UNIMPLEMENTED" } };
  await expectFailure(
    respondingFetch(404, JSON.stringify(unimplemented)).fetch,
    "API_ERROR",
    `Gemini 404 UNIMPLEMENTED from ${ENDPOINT} (check baseURL: host root, without /v1beta): Method not found.`,
  );
  const notFoundOn400 = { error: { code: 400, message: "x", status: "NOT_FOUND" } };
  await expectFailure(
    respondingFetch(400, JSON.stringify(notFoundOn400)).fetch,
    "API_ERROR",
    `Gemini 400 NOT_FOUND from ${ENDPOINT}: x`,
  );
});
