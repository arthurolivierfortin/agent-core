import type { MetricsTotal, RateTable, UsageRecord } from "../models/index.js";

/**
 * Add a list of call records up into one total. Pure: it reads its input, never changes it, and
 * never throws.
 *
 * `tokensIn` and `tokensOut` are summed independently, and each is null as soon as one record
 * carries null there: counting an absent usage as 0 would understate the total without saying so
 * (ADR-AGENT-0007, "absent is not zero"). With no record, every count is 0.
 *
 * `costUsd` is null: this function reads no rate, which is the "no rate table" case of the cost
 * rule stated on `RateTable`.
 */
export function aggregate(records: readonly UsageRecord[], rates?: RateTable): MetricsTotal {
  let tokensIn: number | null = 0;
  let tokensOut: number | null = 0;
  let durationMs = 0;
  for (const record of records) {
    tokensIn = addOrNull(tokensIn, record.tokensIn);
    tokensOut = addOrNull(tokensOut, record.tokensOut);
    durationMs += record.durationMs;
  }
  return { calls: records.length, tokensIn, tokensOut, durationMs, costUsd: null };
}

/** A sum that stays null once one of its terms is. */
function addOrNull(sum: number | null, term: number | null): number | null {
  if (sum === null || term === null) return null;
  return sum + term;
}
