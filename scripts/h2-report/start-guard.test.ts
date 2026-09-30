import { test } from "node:test";
import assert from "node:assert/strict";
import type { RateTable } from "../../dist/index.js";
import { loadRateFile } from "./rates.ts";
import { parseReportArgs } from "./report-args.ts";
import { assertReadyToStart } from "./start-guard.ts";

// Start guard of the H2 report (#20): docs/specs/2026-09-30-h2-report-guards-design.md.
// The environment is an object literal: no variable is set, no .env is read, no key is real.
// The rate text is a fixture, not data/rates.json: entering the Gemini price there changes no test here.

const DEFAULTS = parseReportArgs(["--cap-usd", "1"]);
const UNPRICED = loadRateFile(`{
  "gemini-2.5-flash": { "rate": null, "effectiveFrom": "2026-09-30", "source": "not entered yet" },
  "qwen2.5:0.5b": { "rate": { "usdPerMillionTokensIn": 0, "usdPerMillionTokensOut": 0 }, "effectiveFrom": "2026-09-30", "source": "local" }
}`);
const KEY = { GEMINI_API_KEY: "sentinel-value-not-a-key" };
const READY: RateTable = { ...UNPRICED, "gemini-2.5-flash": { usdPerMillionTokensIn: 0.3, usdPerMillionTokensOut: 2.5 } };
const PREFIX = "refusing to start before any network call:";
const NULL_RATE =
  "data/rates.json: 'gemini-2.5-flash'.rate is null; enter a verified { usdPerMillionTokensIn, usdPerMillionTokensOut } with its effectiveFrom and source";

// The message assertReadyToStart refuses with, or undefined when it lets the report start.
function refusal(rates: RateTable, env: Readonly<Record<string, string | undefined>>): string | undefined {
  try {
    assertReadyToStart(DEFAULTS, rates, env);
  } catch (error) {
    return (error as Error).message;
  }
  return undefined;
}

test("TEST-8 (issue 20) a hosted rate still null refuses to start and names data/rates.json", () => {
  assert.equal(refusal(UNPRICED, KEY), `${PREFIX}\n- ${NULL_RATE}`);
});

test("TEST-8 (issue 20) missing Ollama and Gemini entries are both named", () => {
  assert.equal(
    refusal({}, KEY),
    `${PREFIX}\n- data/rates.json has no entry for 'qwen2.5:0.5b' (--ollama-model)` +
      `\n- data/rates.json has no entry for 'gemini-2.5-flash' (--gemini-model)`,
  );
});

test("TEST-8 (issue 20) a hosted price of 0 is refused even with source local (R2)", () => {
  const hosted = { rate: { usdPerMillionTokensIn: 0, usdPerMillionTokensOut: 1 }, effectiveFrom: "2026-09-30", source: "local" };
  const rates = loadRateFile(JSON.stringify({ "qwen2.5:0.5b": { ...hosted, rate: null }, "gemini-2.5-flash": hosted }));
  assert.equal(
    refusal(rates, KEY),
    `${PREFIX}\n- data/rates.json: 'gemini-2.5-flash'.rate.usdPerMillionTokensIn must be > 0 for the hosted model`,
  );
});

test("TEST-8 (issue 20) a complete, positive table with a key lets the report start", () => {
  assert.equal(refusal(READY, KEY), undefined);
});

test("TEST-9 (issue 20) an unset, empty or blank GEMINI_API_KEY is refused by name, after the rate lines", () => {
  const keyLine = "environment variable GEMINI_API_KEY is unset or empty";
  for (const env of [{}, { GEMINI_API_KEY: "" }, { GEMINI_API_KEY: "   " }]) {
    assert.equal(refusal(READY, env), `${PREFIX}\n- ${keyLine}`);
  }
  assert.equal(refusal(UNPRICED, {}), `${PREFIX}\n- ${NULL_RATE}\n- ${keyLine}`);
});

test("TEST-9 (issue 20) the key value never enters the message", () => {
  const message = refusal(UNPRICED, KEY);
  assert.ok(message !== undefined && !message.includes("sentinel-value-not-a-key"), message);
});
