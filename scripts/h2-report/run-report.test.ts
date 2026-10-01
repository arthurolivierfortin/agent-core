import { test } from "node:test";
import assert from "node:assert/strict";
import { GeminiLLMProvider, OllamaLLMProvider } from "../../dist/index.js";
import * as runner from "./run-report.ts";

// Runner of the H2 report (#33): docs/specs/2026-09-30-h2-report-runner-design.md. No factory is called, no
// network reached, no .env read: env and rates are literals, never data/rates.json. The namespace import
// lets an export added by a later commit fail its own test, not the whole file.

test("TEST-2 (issue 33) defaultProviders declares the given models on Ollama and Gemini", () => {
  const { local, hosted } = runner.defaultProviders({ ollamaModel: "local-x", geminiModel: "hosted-x" });
  assert.ok(local instanceof OllamaLLMProvider);
  assert.ok(hosted instanceof GeminiLLMProvider);
  assert.deepEqual([local.id, local.models()], ["ollama", [{ id: "local-x", supportsTools: true }]]);
  assert.deepEqual([hosted.id, hosted.models()], ["gemini", [{ id: "hosted-x", supportsTools: true }]]);
});
