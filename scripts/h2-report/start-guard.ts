// Start guard of the H2 report (#20): docs/specs/2026-09-30-h2-report-guards-design.md.
// Collects every defect, then refuses once, before any network call.
import type { RateTable } from "../../dist/index.js";
import type { ReportArgs } from "./report-args.ts";

const PRICE_FIELDS = ["usdPerMillionTokensIn", "usdPerMillionTokensOut"] as const;

/**
 * Throws one Error listing, a line each, what keeps the report from starting: a model without an
 * own entry in the rate table, or a hosted rate that is null or has a price <= 0 whatever its
 * source (rule R2). The local model's rate may be null or 0. Returns when nothing is missing.
 */
export function assertReadyToStart(
  args: Pick<ReportArgs, "ollamaModel" | "geminiModel">,
  rates: RateTable,
  env: Readonly<Record<string, string | undefined>>,
): void {
  const defects: string[] = [];
  for (const [id, option] of [[args.ollamaModel, "--ollama-model"], [args.geminiModel, "--gemini-model"]]) {
    if (!Object.hasOwn(rates, id)) defects.push(`data/rates.json has no entry for '${id}' (${option})`);
  }
  const hosted = Object.hasOwn(rates, args.geminiModel) ? rates[args.geminiModel] : undefined;
  if (hosted === null) {
    defects.push(
      `data/rates.json: '${args.geminiModel}'.rate is null; enter a verified` +
        ` { usdPerMillionTokensIn, usdPerMillionTokensOut } with its effectiveFrom and source`,
    );
  }
  for (const field of PRICE_FIELDS) {
    if (hosted && hosted[field] <= 0) {
      defects.push(`data/rates.json: '${args.geminiModel}'.rate.${field} must be > 0 for the hosted model`);
    }
  }
  if (defects.length > 0) {
    throw new Error(`refusing to start before any network call:${defects.map((defect) => `\n- ${defect}`).join("")}`);
  }
}
