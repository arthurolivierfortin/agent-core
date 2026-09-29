import type { Tool } from "../../tools/interfaces/index.js";
import type { AgentInput, StopReason } from "../application/dtos/index.js";

/** What a scenario's `env` factory hands the loop: the simulator's tools, and the state a scenario asserts against. */
export type ScenarioEnv<TState> = {
  readonly state: TState;
  readonly tools: readonly Tool[];
};

/**
 * What a scenario checks once its run is over. Every member is a predicate (ADR-AGENT-0006 rule
 * 2): `toolsUsed` asks whether a name appears anywhere in the run, never in which order, so a
 * model that checks `getCurrentPage` before calling `navigate` is not penalised for being right.
 *
 * **Deliberately absent**: a vocabulary for sequence constraints between named tools (a strict
 * precedence, a pipeline triggered freely then followed in order, periodicity across a run).
 * None of them has a real scenario driving its shape yet, in this package or a consumer
 * (`ROADMAP.md`, "Deferred with no date"). Adding one later is additive: every member here is
 * optional, so a new named field costs nothing to existing scenarios, the same property that
 * lets `observe()` and `stream()` ship as no-ops ahead of the version that needs them.
 */
export type ScenarioExpectation<TState> = {
  /** Every name here must appear at least once among the run's tool calls. Extra calls are fine. */
  toolsUsed?: readonly string[];
  finalState?: (state: TState) => boolean;
  stopReason?: StopReason;
};

/**
 * One thing to try, against one simulated environment (ADR-AGENT-0006). `env` is a factory, not
 * an instance: `runScenario` calls it once per run, so two runs of the same scenario never share
 * state.
 */
export type Scenario<TState> = {
  readonly name: string;
  readonly env: () => ScenarioEnv<TState>;
  readonly input: AgentInput;
  readonly expect: ScenarioExpectation<TState>;
};

/**
 * Declare a scenario. A pure function that returns the typed object it was given, frozen, the
 * same shape as `defineAgent` (ADR-AGENT-0009): the value is the type, not a runtime lookup. The
 * freeze is shallow, exactly like `defineAgent`'s: it protects the scenario's own fields, not the
 * `env` factory's output, which is rebuilt fresh on every run.
 */
export function defineScenario<TState>(scenario: Scenario<TState>): Scenario<TState> {
  return Object.freeze({ ...scenario });
}
