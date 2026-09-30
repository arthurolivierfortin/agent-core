import type { MatrixRun, MatrixSummaryRow } from "./run-matrix.js";

// The CSV views of a matrix report (#9), served by no barrel: a consumer calls `report.toCSV()`.

type Axes = Record<string, readonly unknown[]>;

/** One line per `summary` row: axis columns after `scenario`, named by their key, in `axisKeys` order. */
export function summaryCSV(summary: readonly MatrixSummaryRow<Axes>[], axisKeys: readonly string[]): string {
  const header = ["scenario", ...axisKeys, "runs", "passed", "successRate", "meanDurationMs", "tokensUsed", "costUsd"];
  const lines = summary.map((row) => [
    row.scenario, ...axisKeys.map((key) => row.combination[key]), row.runs, row.passed,
    row.successRate, row.meanDurationMs, row.tokensUsed, row.costUsd,
  ]);
  return csvDocument([header, ...lines.map((line) => line.map(cellText))]);
}

/** One line per run, the same columns for the axes; `failures` joined by `; `, the JSON keeps the array. */
export function runsCSV(runs: readonly MatrixRun<unknown, Axes>[], axisKeys: readonly string[]): string {
  const header = ["scenario", ...axisKeys, "run", "passed", "failures", "error", "durationMs", "tokensUsed", "costUsd", "stopReason"];
  const lines = runs.map((run) => [
    run.scenario, ...axisKeys.map((key) => run.combination[key]), run.run, run.passed, run.failures.join("; "),
    run.error, run.durationMs, run.tokensUsed, run.costUsd, run.trace.stopReason,
  ]);
  return csvDocument([header, ...lines.map((line) => line.map(cellText))]);
}

/** An empty cell for null and undefined (absent is not zero, ADR-AGENT-0007), else `String(value)`. */
function cellText(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

/** RFC 4180 2.6 and 2.7: quoted, inner quotes doubled, as soon as the text holds `,`, `"`, CR or LF. */
function csvField(text: string): string {
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** RFC 4180 2.1 and 2.2: fields joined by `,`, every line, the last one included, ended by CRLF. */
function csvDocument(rows: readonly (readonly string[])[]): string {
  return rows.map((row) => row.map(csvField).join(",") + "\r\n").join("");
}
