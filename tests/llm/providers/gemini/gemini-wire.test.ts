import { test } from "node:test";
import assert from "node:assert/strict";
import { GEMINI_DEFAULT_BASE_URL, geminiGenerateContentUrl } from "../../../../dist/llm/providers/gemini/gemini-wire.js";

// The double of this file is the response bodies written below as literals: no network, no hosted
// provider. The model named in them is gemini-2.5-flash.

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
