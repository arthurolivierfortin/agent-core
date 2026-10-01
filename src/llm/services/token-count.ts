// #51: the rule every usage counter obeys before it leaves a provider adapter, the one capGuard
// (#41) and withMetrics (#46) apply too, and the one the agent loop applies before adding usage
// to its token budget (#60). Served by no barrel: the adapters and step.ts import it relatively.

/**
 * A usage counter is an integer >= 0, so finite: negative, fractional, NaN, infinite or
 * non-numeric is not a count.
 */
export function isTokenCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
