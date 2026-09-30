import { test } from "node:test";
import assert from "node:assert/strict";
import { PROVIDERS } from "../../dist/llm/index.js";
import { checkProviderContract } from "../../dist/testing/index.js";

// Opt-in only: it calls the hosted Gemini API, so the default suite skips it. Launching it is a
// manual step of a person, never of a test suite or an agent loop. The provider reads the key from
// GEMINI_API_KEY at call time; this file never reads, prints nor stores it.
const OPT_IN = process.env.GEMINI_INTEGRATION === "1";

test(
  "GeminiLLMProvider conforms to the port against the live Gemini API",
  { skip: OPT_IN ? false : "set GEMINI_INTEGRATION=1 with GEMINI_API_KEY in the environment" },
  async () => {
    // Declares GEMINI_MODEL, else DEFAULT_GEMINI_MODEL; supportsStreaming() is false, so no stream check runs.
    const provider = PROVIDERS.gemini();
    const report = await checkProviderContract(provider);
    assert.ok(report.ok, JSON.stringify(report.checks, null, 2));
  },
);
