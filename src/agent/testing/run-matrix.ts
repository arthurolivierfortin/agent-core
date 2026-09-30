import type { AgentDeps } from "../application/dtos/index.js";
import type { Scenario } from "./define-scenario.js";
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
};

export type MatrixRun<TState, TAxes extends Record<string, readonly unknown[]>> = {
  readonly scenario: string;
  /** The very object `deps` received. */
  readonly combination: Combination<TAxes>;
  /** 1 to `runs`, per (scenario, combination) pair. */
  readonly run: number;
  readonly passed: boolean;
  readonly failures: readonly string[];
};

export type MatrixReport<TState, TAxes extends Record<string, readonly unknown[]>> = {
  readonly runs: readonly MatrixRun<TState, TAxes>[];
};

/**
 * Run every scenario on every combination of `axes` (their Cartesian product, the last axis
 * varying fastest), `runs` times each, one after the other, and report every run in that order
 * (ADR-AGENT-0006). Sequential: a local provider serves one call at a time, and a fixed order
 * keeps a report against fakes reproducible. Options that would yield an empty report, which
 * reads as "nothing failed", are refused before any run.
 *
 * Design: docs/specs/2026-09-30-run-matrix-design.md (#8).
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

  const runOne = async (scenario: Scenario<TState>, combination: Combination<TAxes>, run: number) => {
    const result = await runScenario(scenario, options.deps(combination));
    return { scenario: result.scenario, combination, run, passed: result.passed, failures: result.failures };
  };

  const runs: MatrixRun<TState, TAxes>[] = [];
  const combinations = combinationsOf(options.axes);
  for (const scenario of options.scenarios) {
    for (const combination of combinations) {
      for (let run = 1; run <= options.runs; run++) {
        runs.push(await runOne(scenario, combination, run));
      }
    }
  }
  return { runs };
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
