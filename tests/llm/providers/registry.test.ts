import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_GEMINI_MODEL, DEFAULT_OLLAMA_MODEL, PROVIDERS, resolveProvider } from "../../../dist/llm/index.js";

test("PROVIDERS.ollama builds an LLMProvider", () => {
  const p = PROVIDERS.ollama();
  assert.equal(typeof p.complete, "function");
  assert.equal(p.supportsStreaming(), true);
});

test("PROVIDERS.ollama declares the environment's model, read at call time", () => {
  const previous = process.env.OLLAMA_MODEL;
  try {
    delete process.env.OLLAMA_MODEL;
    assert.deepEqual(PROVIDERS.ollama().models(), [{ id: DEFAULT_OLLAMA_MODEL, supportsTools: true }]);

    // Set after the module was imported: the factory must read process.env now, not at load.
    process.env.OLLAMA_MODEL = "llama3.2:3b";
    assert.deepEqual(PROVIDERS.ollama().models(), [{ id: "llama3.2:3b", supportsTools: true }]);
  } finally {
    if (previous === undefined) delete process.env.OLLAMA_MODEL;
    else process.env.OLLAMA_MODEL = previous;
  }
});

test("resolveProvider returns a provider for a known id", () => {
  assert.equal(typeof resolveProvider("ollama").complete, "function");
});

test("resolveProvider throws UNKNOWN_PROVIDER for a bad id", () => {
  assert.throws(() => resolveProvider("gpt-9000"), (e: unknown) => {
    assert.equal((e as { name: string }).name, "LLMError");
    assert.equal((e as { code: string }).code, "UNKNOWN_PROVIDER");
    return true;
  });
});

test("PROVIDERS.gemini builds a Gemini provider that does not stream", () => {
  const p = PROVIDERS.gemini();
  assert.equal(p.id, "gemini");
  assert.equal(p.supportsStreaming(), false);
  assert.equal(typeof p.complete, "function");
});

test("PROVIDERS.gemini declares the environment's model, read at call time", () => {
  assert.equal(DEFAULT_GEMINI_MODEL, "gemini-2.5-flash");
  const previous = process.env.GEMINI_MODEL;
  try {
    delete process.env.GEMINI_MODEL;
    assert.deepEqual(PROVIDERS.gemini().models(), [{ id: DEFAULT_GEMINI_MODEL, supportsTools: true }]);

    // Set after the module was imported: the factory must read process.env now, not at load.
    process.env.GEMINI_MODEL = "gemini-2.5-flash-lite";
    assert.deepEqual(PROVIDERS.gemini().models(), [{ id: "gemini-2.5-flash-lite", supportsTools: true }]);
  } finally {
    if (previous === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = previous;
  }
});

test("PROVIDERS lists ollama then gemini, and resolveProvider resolves gemini", () => {
  assert.deepEqual(Object.keys(PROVIDERS), ["ollama", "gemini"]);
  assert.equal(resolveProvider("gemini").id, "gemini");
});

test("PROVIDERS.gemini refuses a missing key before any fetch", async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  let calls = 0;
  try {
    delete process.env.GEMINI_API_KEY;
    // Replaced before the factory runs: the provider binds the global fetch at construction.
    globalThis.fetch = (async () => {
      calls++;
      throw new Error("fetch must not be called");
    }) as unknown as typeof fetch;
    const provider = PROVIDERS.gemini();
    await assert.rejects(provider.complete([{ role: "user", content: "hi" }], { model: provider.models()[0].id }), (e: unknown) => {
      assert.equal((e as { name: string }).name, "LLMError");
      assert.equal((e as { code: string }).code, "MISSING_API_KEY");
      assert.match((e as Error).message, /GEMINI_API_KEY/);
      return true;
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  }
  assert.equal(calls, 0);
});
