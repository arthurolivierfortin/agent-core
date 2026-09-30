import type { LLMProvider } from "../../llm/interfaces/index.js";
import type { LLMResponse, ToolCall } from "../../llm/models/index.js";
import { MetricsCollector, withMetrics } from "../../metrics/index.js";
import type { RateTable } from "../../metrics/index.js";
import type { AgentDeps, StopReason } from "../application/dtos/index.js";
import type { Scenario, ScenarioEnv } from "./define-scenario.js";
import { runsCSV, summaryCSV } from "./matrix-csv.js";
import { runScenario } from "./run-scenario.js";

/** One value per axis. Not exported: a consumer names it `MatrixRun<S, A>["combination"]`. */
type Combination<TAxes extends Record<string, readonly unknown[]>> = {
  readonly [K in keyof TAxes]: TAxes[K][number];
};

export type MatrixOptions<TState, TAxes extends Record<string, readonly unknown[]>> = {
  readonly scenarios: readonly Scenario<TState>[];
  readonly axes: TAxes;
  /** Runs per (scenario, combination) pair: an integer, at least 1. */
  readonly runs: number;
  /** Called once per run, so each run gets a fresh provider if this builds one. */
  readonly deps: (combination: Combination<TAxes>) => Omit<AgentDeps, "tools">;
  /** Prices `costUsd`; without it every cost is null (ADR-AGENT-0007). */
  readonly rates?: RateTable;
  /** The clock of `durationMs` and of every call's record. Defaults to `Date.now`. */
  readonly now?: () => number;
};

/** What one run left behind, whether it passed, failed or threw (ADR-AGENT-0006 rule 3). */
export type MatrixTrace<TState> = {
  readonly toolCalls: readonly ToolCall[];
  /** Null, like `stopReason` and `content`, when the run threw before it could be read. */
  readonly finalState: TState | null;
  readonly stopReason: StopReason | null;
  readonly content: string | null;
  /** Every response the provider resolved, in order, the landing one included: the same objects. */
  readonly responses: readonly LLMResponse[];
};

export type MatrixRun<TState, TAxes extends Record<string, readonly unknown[]>> = {
  readonly scenario: string;
  /** The very object `deps` received. */
  readonly combination: Combination<TAxes>;
  /** 1 to `runs`, per (scenario, combination) pair. */
  readonly run: number;
  readonly passed: boolean;
  readonly failures: readonly string[];
  /** The message of what the run threw, null when it threw nothing. */
  readonly error: string | null;
  readonly durationMs: number;
  /** Null as soon as one call reported no usage: absent is not zero (ADR-AGENT-0007). */
  readonly tokensUsed: number | null;
  readonly costUsd: number | null;
  readonly trace: MatrixTrace<TState>;
};

/**
 * One line per (scenario, combination) pair: every dimension apart, never folded into a composite
 * score (ADR-AGENT-0007 rule 3). The trade-off between them belongs to the reader.
 */
export type MatrixSummaryRow<TAxes extends Record<string, readonly unknown[]>> = {
  readonly scenario: string;
  /** The very object the pair's runs carry. */
  readonly combination: Combination<TAxes>;
  readonly runs: number;
  readonly passed: number;
  /** `passed / runs`. */
  readonly successRate: number;
  readonly meanDurationMs: number;
  /** Sums over the pair's runs, null as soon as one run has null: absent is not zero (ADR-AGENT-0007). */
  readonly tokensUsed: number | null;
  readonly costUsd: number | null;
};

export type MatrixReport<TState, TAxes extends Record<string, readonly unknown[]>> = {
  readonly runs: readonly MatrixRun<TState, TAxes>[];
  /** One line per (scenario, combination) pair, in the order the pairs ran. */
  readonly summary: readonly MatrixSummaryRow<TAxes>[];
  /** Fresh plain data on every call, keys in the order of the types, every null kept null (ADR-AGENT-0006). */
  toJSON(): { runs: MatrixRun<TState, TAxes>[]; summary: MatrixSummaryRow<TAxes>[] };
  /** One line per `summary` row, one column per axis: RFC 4180, CRLF, an empty cell for null. */
  toCSV(): string;
  /** One line per run, the same rules as `toCSV`; `failures` joined by `; `. */
  toRunsCSV(): string;
};

/**
 * Run every scenario on every combination of `axes` (their Cartesian product, the last axis
 * varying fastest), `runs` times each, one after the other, and report every run in that order
 * (ADR-AGENT-0006). Sequential: a local provider serves one call at a time, and a fixed order
 * keeps a report against fakes reproducible. Options that would yield an empty report, which
 * reads as "nothing failed", are refused before any run.
 *
 * Each run is measured by its own `MetricsCollector`, fed by `withMetrics` on `now`.
 * `tokensUsed` comes from that collector, never from `AgentResult.tokensUsed` (pilot's
 * decision): that one is the budget counter, 0 when the provider reports no usage, against
 * ADR-AGENT-0007's "absent is not zero", and it does not exist for a run that throws, while the
 * collector keeps the calls resolved before the error.
 *
 * A run that throws (`deps`, `env`, the provider, a predicate) fails with its `error` and a
 * partial trace, and the matrix goes on. `step.ts` and `runScenario` stay untouched: responses
 * are recorded by wrapping the provider, the final state by wrapping `env`.
 *
 * Each (scenario, combination) pair is summed up into one `summary` line as soon as its runs are
 * done, so the lines follow the order the pairs ran, and two pairs never merge even when their
 * names or values are equal. Success rate, mean duration, tokens and cost stay side by side, never
 * combined into a score (ADR-AGENT-0007 rule 3).
 *
 * `toJSON()` copies what the report owns (arrays, runs, traces, lines, combinations) and passes on
 * as is what the consumer or the provider gave (axis values, final states, calls, responses): a
 * generic deep copy has no safe definition for a function or a class instance given as an axis
 * value. An arrow closed over the arrays, so it works detached from the report too.
 *
 * Design: docs/specs/2026-09-30-run-matrix-design.md (#8),
 * docs/specs/2026-09-30-matrix-report-design.md (#12),
 * docs/specs/2026-09-30-csv-rejeu-demo-design.md (#9).
 */
export async function runMatrix<TState, TAxes extends Record<string, readonly unknown[]>>(
  options: MatrixOptions<TState, TAxes>,
): Promise<MatrixReport<TState, TAxes>> {
  if (!Number.isInteger(options.runs) || options.runs < 1) {
    throw new RangeError(`runMatrix: runs must be an integer >= 1, got ${options.runs}`);
  }
  if (options.scenarios.length === 0) throw new RangeError("runMatrix: scenarios must not be empty");
  for (const name of Object.keys(options.axes)) {
    if (options.axes[name].length === 0) throw new RangeError(`runMatrix: axis '${name}' has no value`);
  }
  const now = options.now ?? Date.now;

  const runOne = async (scenario: Scenario<TState>, combination: Combination<TAxes>, run: number) => {
    const collector = new MetricsCollector();
    const responses: LLMResponse[] = [];
    let captured: ScenarioEnv<TState> | undefined;
    let outcome: Pick<MatrixRun<TState, TAxes>, "scenario" | "passed" | "failures" | "error" | "trace">;
    const startedAt = now();
    try {
      const wiring = options.deps(combination);
      const llm = recordResponses(withMetrics(wiring.llm, collector, now), responses);
      const env = () => { captured = scenario.env(); return captured; };
      const result = await runScenario({ ...scenario, env }, { ...wiring, llm });
      const { toolCalls, finalState, stopReason, content, passed, failures } = result;
      const trace = { toolCalls, finalState, stopReason, content, responses };
      outcome = { scenario: result.scenario, passed, failures, error: null, trace };
    } catch (err) {
      const toolCalls = responses.flatMap((response) => response.toolCalls);
      const finalState = captured === undefined ? null : captured.state;
      const trace = { toolCalls, finalState, stopReason: null, content: null, responses };
      outcome = { scenario: scenario.name, passed: false, failures: [], error: messageOf(err), trace };
    }
    const durationMs = now() - startedAt;
    const { tokensIn, tokensOut, costUsd } = collector.total(options.rates);
    const tokensUsed = tokensIn === null || tokensOut === null ? null : tokensIn + tokensOut;
    return { ...outcome, combination, run, durationMs, tokensUsed, costUsd };
  };

  const runs: MatrixRun<TState, TAxes>[] = [];
  const summary: MatrixSummaryRow<TAxes>[] = [];
  const combinations = combinationsOf(options.axes);
  const axisKeys = Object.keys(options.axes);
  for (const scenario of options.scenarios) {
    for (const combination of combinations) {
      for (let run = 1; run <= options.runs; run++) {
        runs.push(await runOne(scenario, combination, run));
      }
      summary.push(summarize(runs.slice(runs.length - options.runs)));
    }
  }
  return {
    runs,
    summary,
    toJSON: () => ({ runs: runs.map(runData), summary: summary.map(rowData) }),
    toCSV: () => summaryCSV(summary, axisKeys),
    toRunsCSV: () => runsCSV(runs, axisKeys),
  };
}

/** The line of one pair, its runs in order. Never empty: `runMatrix` refuses `runs < 1` before any run. */
function summarize<TState, TAxes extends Record<string, readonly unknown[]>>(
  pair: readonly MatrixRun<TState, TAxes>[],
): MatrixSummaryRow<TAxes> {
  const passed = pair.filter((r) => r.passed).length;
  return {
    scenario: pair[0].scenario,
    combination: pair[0].combination,
    runs: pair.length,
    passed,
    successRate: passed / pair.length,
    meanDurationMs: pair.reduce((sum, r) => sum + r.durationMs, 0) / pair.length,
    tokensUsed: sumOrNull(pair.map((r) => r.tokensUsed)),
    costUsd: sumOrNull(pair.map((r) => r.costUsd)),
  };
}

/** A run as new plain data, keys in the order `MatrixRun` declares them, whatever order `runOne` built. */
function runData<TState, TAxes extends Record<string, readonly unknown[]>>(
  run: MatrixRun<TState, TAxes>,
): MatrixRun<TState, TAxes> {
  const { trace } = run;
  return {
    scenario: run.scenario,
    combination: { ...run.combination },
    run: run.run,
    passed: run.passed,
    failures: [...run.failures],
    error: run.error,
    durationMs: run.durationMs,
    tokensUsed: run.tokensUsed,
    costUsd: run.costUsd,
    trace: {
      toolCalls: [...trace.toolCalls],
      finalState: trace.finalState,
      stopReason: trace.stopReason,
      content: trace.content,
      responses: [...trace.responses],
    },
  };
}

/** A summary line as new plain data, keys in the order `MatrixSummaryRow` declares them. */
function rowData<TAxes extends Record<string, readonly unknown[]>>(
  row: MatrixSummaryRow<TAxes>,
): MatrixSummaryRow<TAxes> {
  return {
    scenario: row.scenario,
    combination: { ...row.combination },
    runs: row.runs,
    passed: row.passed,
    successRate: row.successRate,
    meanDurationMs: row.meanDurationMs,
    tokensUsed: row.tokensUsed,
    costUsd: row.costUsd,
  };
}

/** Null as soon as one value is null: a partial sum would read as an exact total, understated. */
function sumOrNull(values: readonly (number | null)[]): number | null {
  let sum = 0;
  for (const value of values) {
    if (value === null) return null;
    sum += value;
  }
  return sum;
}

function combinationsOf<TAxes extends Record<string, readonly unknown[]>>(
  axes: TAxes,
): Combination<TAxes>[] {
  let combinations: Record<string, unknown>[] = [{}];
  for (const name of Object.keys(axes)) {
    combinations = combinations.flatMap((c) => axes[name].map((value) => ({ ...c, [name]: value })));
  }
  return combinations as Combination<TAxes>[];
}

/** Pushes every response `provider` resolves to `sink`, the same object. Never streams, like `withMetrics`. */
function recordResponses(provider: LLMProvider, sink: LLMResponse[]): LLMProvider {
  return {
    id: provider.id,
    supportsStreaming: () => false,
    models: () => provider.models(),
    complete: async (messages, opts) => {
      const response = await provider.complete(messages, opts);
      sink.push(response);
      return response;
    },
  };
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
