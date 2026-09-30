import type { MetricsTotal, RateTable, UsageRecord } from "../models/index.js";

/** Rates are quoted per million tokens. */
const TOKENS_PER_MILLION = 1_000_000;

/**
 * Add a list of call records up into one total. Pure: it reads its input, never changes it, and
 * never throws; missing information comes out as null, never as 0.
 *
 * `tokensIn` and `tokensOut` are summed independently, and each is null as soon as one record
 * carries null there: counting an absent usage as 0 would understate the total without saying so
 * (ADR-AGENT-0007, "absent is not zero"). With no record, every count is 0.
 *
 * `costUsd` is priced from `rates` only, since the package knows no price (ADR-AGENT-0007). It is
 * null without a table, and null as soon as one record cannot be priced: never a partial sum of
 * the records that could be. With a table and no record it is 0: nothing was spent, and no rate
 * is missing.
 */
export function aggregate(records: readonly UsageRecord[], rates?: RateTable): MetricsTotal {
  let tokensIn: number | null = 0;
  let tokensOut: number | null = 0;
  let durationMs = 0;
  let costUsd: number | null = rates === undefined ? null : 0;
  for (const record of records) {
    tokensIn = addOrNull(tokensIn, record.tokensIn);
    tokensOut = addOrNull(tokensOut, record.tokensOut);
    durationMs += record.durationMs;
    costUsd = addOrNull(costUsd, costOf(record, rates));
  }
  return { calls: records.length, tokensIn, tokensOut, durationMs, costUsd };
}

/**
 * One record's cost in US dollars, or null when it cannot be priced: no table, a model that is
 * not an own key of the table, a null rate, or no usage. `Object.hasOwn` rather than `in` or an
 * `undefined` check, so a model named `toString` or `constructor` never inherits a price from
 * `Object.prototype`.
 */
function costOf(record: UsageRecord, rates: RateTable | undefined): number | null {
  if (rates === undefined || !Object.hasOwn(rates, record.model)) return null;
  const rate = rates[record.model];
  if (rate === null || record.tokensIn === null || record.tokensOut === null) return null;
  const usd =
    record.tokensIn * rate.usdPerMillionTokensIn + record.tokensOut * rate.usdPerMillionTokensOut;
  return usd / TOKENS_PER_MILLION;
}

/** A sum that stays null once one of its terms is. */
function addOrNull(sum: number | null, term: number | null): number | null {
  if (sum === null || term === null) return null;
  return sum + term;
}
