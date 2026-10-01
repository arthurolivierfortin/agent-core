// Rate file of the H2 report (#20): docs/specs/2026-09-30-h2-report-guards-design.md.
// Checks data/rates.json before any network call: the first defect throws, naming the entry and the field.
import type { Rate, RateTable } from "../../dist/index.js";

/** One checked entry of data/rates.json (#33): its rate, or null, with its effective date and its source. */
export type RateEntry = { readonly rate: Rate | null; readonly effectiveFrom: string; readonly source: string };

const ENTRY_FIELDS = ["rate", "effectiveFrom", "source"];
const PRICE_FIELDS = ["usdPerMillionTokensIn", "usdPerMillionTokensOut"];
// The only source under which a price may be 0 (rule R1); start-guard.ts refuses a hosted price of 0 (R2).
const LOCAL_SOURCE = "local";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function checkFields(value: Record<string, unknown>, fields: readonly string[], where: string): void {
  for (const field of fields) {
    if (!Object.hasOwn(value, field)) throw new Error(`${where}: missing field '${field}'`);
  }
  for (const field of Object.keys(value)) {
    if (!fields.includes(field)) throw new Error(`${where}: unexpected field '${field}'`);
  }
}

function isRealDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function readPrice(value: unknown, where: string, source: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${where}: must be a finite number >= 0`);
  }
  if (value === 0 && source !== LOCAL_SOURCE) throw new Error(`${where}: a zero price requires source "${LOCAL_SOURCE}"`);
  return value;
}

function readRate(value: unknown, where: string, source: string): Rate | null {
  if (value === null) return null;
  if (!isObject(value)) throw new Error(`${where}: must be null or an object`);
  checkFields(value, PRICE_FIELDS, where);
  const [usdPerMillionTokensIn, usdPerMillionTokensOut] = PRICE_FIELDS.map((field) =>
    readPrice(value[field], `${where}.${field}`, source),
  );
  return { usdPerMillionTokensIn, usdPerMillionTokensOut };
}

function readEntry(id: string, entry: unknown): RateEntry {
  if (id === "") throw new Error("rates: a model id must not be empty");
  const where = `rates['${id}']`;
  if (!isObject(entry)) throw new Error(`${where}: must be an object`);
  checkFields(entry, ENTRY_FIELDS, where);
  if (!isRealDate(entry.effectiveFrom)) throw new Error(`${where}.effectiveFrom: must be a real YYYY-MM-DD date`);
  if (typeof entry.source !== "string" || entry.source.trim() === "") {
    throw new Error(`${where}.source: must be a non-empty string`);
  }
  if (/[\r\n]/.test(entry.source)) throw new Error(`${where}.source: must hold no line break`);
  const rate = readRate(entry.rate, `${where}.rate`, entry.source);
  return { rate, effectiveFrom: entry.effectiveFrom, source: entry.source };
}

/**
 * Reads the text of data/rates.json into a new record built by Object.fromEntries, one new RateEntry
 * per model: a `__proto__` key stays an own entry. Same checks, order and messages as loadRateFile.
 */
export function loadRateEntries(text: string): Readonly<Record<string, RateEntry>> {
  let root: unknown;
  try {
    root = JSON.parse(text);
  } catch (error) {
    throw new Error(`rates: not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!isObject(root)) throw new Error("rates: the root must be an object keyed by model id");
  return Object.fromEntries(Object.entries(root).map(([id, entry]) => [id, readEntry(id, entry)]));
}

/**
 * Reads the text of data/rates.json into a new RateTable built by Object.fromEntries: a `__proto__`
 * key stays an own entry. effectiveFrom and source are checked, then dropped: loadRateEntries keeps them.
 */
export function loadRateFile(text: string): RateTable {
  return Object.fromEntries(Object.entries(loadRateEntries(text)).map(([id, entry]) => [id, entry.rate]));
}
