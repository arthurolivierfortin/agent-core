import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadRateEntries, loadRateFile } from "./rates.ts";

// Rate file of the H2 report (#20): docs/specs/2026-09-30-h2-report-guards-design.md.

const PRICED = { usdPerMillionTokensIn: 0.3, usdPerMillionTokensOut: 2.5 };
const ENTRY = { rate: PRICED, effectiveFrom: "2026-09-30", source: "pricing page" };
// JSON.stringify drops a key whose value is undefined: { source: undefined } removes the field.
const withEntry = (patch: object) => JSON.stringify({ m: { ...ENTRY, ...patch } });
const INFINITE_IN = `{"m":{"rate":{"usdPerMillionTokensIn":1e999,"usdPerMillionTokensOut":1},"effectiveFrom":"2026-09-30","source":"x"}}`;
// The SyntaxError message depends on the V8 version: read it rather than copy it.
const SYNTAX_ERROR = (() => { try { JSON.parse("{"); } catch (error) { return (error as SyntaxError).message; } })();

test("TEST-2 (issue 20) a two-entry file gives the expected table", () => {
  const text = JSON.stringify({ "local-model": { ...ENTRY, rate: null }, "hosted-model": ENTRY });
  assert.deepEqual(loadRateFile(text), { "local-model": null, "hosted-model": PRICED });
});

test("TEST-2 (issue 20) a __proto__ key stays an own entry, never a prototype", () => {
  const table = loadRateFile(`{"__proto__":${JSON.stringify(ENTRY)}}`);
  assert.equal(Object.hasOwn(table, "__proto__"), true);
  assert.equal(Object.getPrototypeOf(table), Object.prototype);
  assert.deepEqual(Object.getOwnPropertyDescriptor(table, "__proto__")?.value, PRICED);
});

const DEFECTS: ReadonlyArray<readonly [string, string, string]> = [
  ["unreadable JSON", "{", `rates: not valid JSON: ${SYNTAX_ERROR}`],
  ["an array root", "[]", "rates: the root must be an object keyed by model id"],
  ["a null root", "null", "rates: the root must be an object keyed by model id"],
  ["an empty model id", JSON.stringify({ "": ENTRY }), "rates: a model id must not be empty"],
  ["an entry that is not an object", JSON.stringify({ m: [] }), "rates['m']: must be an object"],
  ["a missing field", withEntry({ source: undefined }), "rates['m']: missing field 'source'"],
  ["an unexpected field", withEntry({ currency: "USD" }), "rates['m']: unexpected field 'currency'"],
  ["a date that does not exist", withEntry({ effectiveFrom: "2026-02-30" }), "rates['m'].effectiveFrom: must be a real YYYY-MM-DD date"],
  ["a date not in YYYY-MM-DD", withEntry({ effectiveFrom: "2026-9-30" }), "rates['m'].effectiveFrom: must be a real YYYY-MM-DD date"],
  ["a blank source", withEntry({ source: "  " }), "rates['m'].source: must be a non-empty string"],
  ["a rate neither null nor an object", withEntry({ rate: 1 }), "rates['m'].rate: must be null or an object"],
  ["a missing rate field", withEntry({ rate: { usdPerMillionTokensIn: 1 } }), "rates['m'].rate: missing field 'usdPerMillionTokensOut'"],
  ["an unexpected rate field", withEntry({ rate: { ...PRICED, currency: "USD" } }), "rates['m'].rate: unexpected field 'currency'"],
  ["a negative price", withEntry({ rate: { ...PRICED, usdPerMillionTokensOut: -1 } }), "rates['m'].rate.usdPerMillionTokensOut: must be a finite number >= 0"],
  ["a price that is not a number", withEntry({ rate: { ...PRICED, usdPerMillionTokensIn: "1" } }), "rates['m'].rate.usdPerMillionTokensIn: must be a finite number >= 0"],
  ["an infinite price", INFINITE_IN, "rates['m'].rate.usdPerMillionTokensIn: must be a finite number >= 0"],
];

for (const [label, text, message] of DEFECTS) {
  test(`TEST-2 (issue 20) refuses ${label}`, () => {
    assert.throws(() => loadRateFile(text), { message });
  });
}

test("TEST-3 (issue 20) a zero price needs source local; a local price may be positive", () => {
  const zero = { usdPerMillionTokensIn: 0, usdPerMillionTokensOut: 0 };
  assert.deepEqual(loadRateFile(withEntry({ rate: zero, source: "local" })), { m: zero });
  assert.deepEqual(loadRateFile(withEntry({ rate: PRICED, source: "local" })), { m: PRICED });
  assert.throws(() => loadRateFile(withEntry({ rate: { ...PRICED, usdPerMillionTokensOut: 0 } })), {
    message: `rates['m'].rate.usdPerMillionTokensOut: a zero price requires source "local"`,
  });
});

test("TEST-4 (issue 20) data/rates.json loads: dated, sourced, local model at 0, hosted model null or > 0", () => {
  const text = readFileSync(new URL("../../data/rates.json", import.meta.url), "utf8");
  const table = loadRateFile(text);
  const entries: Record<string, { effectiveFrom: string; source: string }> = JSON.parse(text);
  for (const [id, entry] of Object.entries(entries)) assert.ok(entry.effectiveFrom !== "" && entry.source.trim() !== "", id);
  assert.equal(entries["qwen2.5:0.5b"].source, "local");
  assert.deepEqual(table["qwen2.5:0.5b"], { usdPerMillionTokensIn: 0, usdPerMillionTokensOut: 0 });
  assert.ok(Object.hasOwn(table, "gemini-2.5-flash"), "data/rates.json has no gemini-2.5-flash entry");
  const hosted = table["gemini-2.5-flash"];
  assert.ok(hosted === null || (hosted.usdPerMillionTokensIn > 0 && hosted.usdPerMillionTokensOut > 0), JSON.stringify(hosted));
  assert.doesNotMatch(text, /AIza[0-9A-Za-z_-]{35}/);
});

// Rate entries of the H2 report (#33): docs/specs/2026-09-30-h2-report-runner-design.md.
const LOCAL_ENTRY = { rate: null, effectiveFrom: "2026-09-29", source: "local" };

test("TEST-1 (issue 33) loadRateEntries keeps effectiveFrom and source; loadRateFile still drops them", () => {
  const text = JSON.stringify({ "local-model": LOCAL_ENTRY, "hosted-model": ENTRY });
  assert.deepEqual(loadRateEntries(text), { "local-model": LOCAL_ENTRY, "hosted-model": ENTRY });
  assert.deepEqual(loadRateFile(text), { "local-model": null, "hosted-model": PRICED });
});

test("TEST-1 (issue 33) both functions refuse an entry without source with the same message", () => {
  for (const load of [loadRateEntries, loadRateFile]) {
    assert.throws(() => load(withEntry({ source: undefined })), { message: "rates['m']: missing field 'source'" });
  }
});

test("TEST-1 (issue 33) a __proto__ key stays an own entry of loadRateEntries", () => {
  const entries = loadRateEntries(`{"__proto__":${JSON.stringify(ENTRY)}}`);
  assert.equal(Object.hasOwn(entries, "__proto__"), true);
  assert.equal(Object.getPrototypeOf(entries), Object.prototype);
  assert.deepEqual(Object.getOwnPropertyDescriptor(entries, "__proto__")?.value, ENTRY);
});

// Rate entries of the H2 report (#42): docs/specs/2026-09-30-h2-report-launch-design.md.

test("TEST-1 (issue 42) both functions refuse a source that holds a line break", () => {
  for (const source of ["https://a.test/\nnext", "a\rb"]) {
    for (const load of [loadRateFile, loadRateEntries]) {
      assert.throws(() => load(withEntry({ source })), { message: "rates['m'].source: must hold no line break" });
    }
  }
});
