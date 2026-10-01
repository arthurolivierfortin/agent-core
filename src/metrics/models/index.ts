// Metrics framework models.
// Pure types: no runtime dependency (placement rule, docs/conventions/architecture.md).
// The package measures; it never prices on its own. Rates come from the caller (ADR-AGENT-0007).

/**
 * One provider call, as measured. `tokensIn` and `tokensOut` are both null when the provider
 * reported no usage, or a usage with a counter that is not an integer >= 0 (withMetrics, #46):
 * absent is not zero (ADR-AGENT-0007), and a total that counted it as 0 would understate the run
 * without saying so.
 */
export type UsageRecord = {
  /** The model the call went to, as carried by `CompletionOptions.model`. */
  model: string;
  tokensIn: number | null;
  tokensOut: number | null;
  /** How long the call took, measured by whoever records it. */
  durationMs: number;
};

/** A model's price, in US dollars per million tokens. The unit lives in the field names. */
export type Rate = {
  usdPerMillionTokensIn: number;
  usdPerMillionTokensOut: number;
};

/**
 * Rates keyed by model id, supplied by the caller: no price is hard-coded in the package
 * (ADR-AGENT-0007). A `null` rate marks a model that is not billed, a local one for instance.
 * Cost rule, applied by `aggregate`: a record whose model is not an own key of the table, whose
 * rate is null, or whose usage is null has a null cost, never 0.
 */
export type RateTable = Readonly<Record<string, Rate | null>>;

/**
 * What a list of records adds up to. A sum that depends on missing information is null rather
 * than partial: one record without usage nulls `tokensIn` and `tokensOut`, one record that
 * cannot be priced nulls `costUsd`.
 */
export type MetricsTotal = {
  calls: number;
  tokensIn: number | null;
  tokensOut: number | null;
  durationMs: number;
  /** US dollars. Null without a rate table, or as soon as one record cannot be priced. */
  costUsd: number | null;
};
