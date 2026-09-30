import { test } from "node:test";
import assert from "node:assert/strict";
import { LLMError } from "../../../dist/llm/models/index.js";

// LLMError carries status and retryAfterMs only when they are defined (#34, D2): an absent field is
// no own property at all, so Object.keys and JSON.stringify of existing errors do not change.

test("an LLMError built without options has no status, retryAfterMs nor cause", () => {
  const error = new LLMError("API_ERROR", "provider down");
  assert.equal(error.name, "LLMError");
  assert.equal(error.code, "API_ERROR");
  assert.equal(error.message, "provider down");
  assert.ok(error instanceof Error);
  assert.equal(Object.hasOwn(error, "status"), false);
  assert.equal(Object.hasOwn(error, "retryAfterMs"), false);
  assert.equal(Object.hasOwn(error, "cause"), false);
  assert.deepStrictEqual(Object.keys(error).sort(), ["code", "name"]);
});

test("status and retryAfterMs given in options are own, enumerable and serialized", () => {
  const error = new LLMError("API_ERROR", "rate limited", { status: 429, retryAfterMs: 30000 });
  assert.equal(error.status, 429);
  assert.equal(error.retryAfterMs, 30000);
  assert.deepStrictEqual(Object.keys(error).sort(), ["code", "name", "retryAfterMs", "status"]);
  assert.equal(Object.hasOwn(error, "cause"), false);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(error)), {
    name: "LLMError",
    code: "API_ERROR",
    status: 429,
    retryAfterMs: 30000,
  });
});

test("a cause travels next to status, and an absent retryAfterMs stays absent", () => {
  const cause = new Error("root");
  const error = new LLMError("API_ERROR", "wrapped", { cause, status: 503 });
  assert.equal(error.cause, cause);
  assert.equal(error.status, 503);
  assert.equal(Object.hasOwn(error, "retryAfterMs"), false);
});

test("retryAfterMs: undefined defines nothing, retryAfterMs: 0 is kept", () => {
  const gone = new LLMError("MODEL_NOT_FOUND", "gone", { status: 404, retryAfterMs: undefined });
  assert.equal(gone.status, 404);
  assert.equal(Object.hasOwn(gone, "retryAfterMs"), false);
  const now = new LLMError("API_ERROR", "now", { retryAfterMs: 0 });
  assert.equal(Object.hasOwn(now, "retryAfterMs"), true);
  assert.equal(now.retryAfterMs, 0);
  assert.equal(Object.hasOwn(now, "status"), false);
});
