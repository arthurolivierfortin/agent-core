import type { ToolCall } from "../../llm/models/index.js";
import type { AgentDeps, AgentResult, StopReason } from "../application/dtos/index.js";
import { AgenticLLM } from "../application/use-cases/agentic-llm.js";
import type { Scenario, ScenarioExpectation } from "./define-scenario.js";

/** One scenario's run, kept whether it passed or not (ADR-AGENT-0006 rule 3: the report keeps the trace). */
export type ScenarioResult<TState> = {
  readonly scenario: string;
  readonly passed: boolean;
  /** One entry per failed predicate. Empty when `passed` is true. */
  readonly failures: readonly string[];
  readonly toolCalls: readonly ToolCall[];
  readonly stopReason: StopReason;
  readonly content: string;
  readonly finalState: TState;
};

/**
 * Run one scenario to completion against a real `AgenticLLM`.
 *
 * `deps` never carries `tools`: the simulator's are the only ones a scenario runs against
 * (ADR-AGENT-0010), so the type removes the field rather than defining what happens if a caller
 * supplies one anyway. `env()` is called exactly once, before the agent is built, which is what
 * gives every run a fresh environment without the caller having to remember to (ADR-AGENT-0006
 * rule 1).
 */
export async function runScenario<TState>(
  scenario: Scenario<TState>,
  deps: Omit<AgentDeps, "tools">,
): Promise<ScenarioResult<TState>> {
  const env = scenario.env();
  const agent = new AgenticLLM({ ...deps, tools: env.tools });
  const result = await agent.run(scenario.input);
  const failures = checkExpectation(scenario.expect, env.state, result);

  return {
    scenario: scenario.name,
    passed: failures.length === 0,
    failures,
    toolCalls: result.toolCalls,
    stopReason: result.stopReason,
    content: result.content,
    finalState: env.state,
  };
}

function checkExpectation<TState>(
  expect: ScenarioExpectation<TState>,
  state: TState,
  result: AgentResult,
): string[] {
  const failures: string[] = [];

  if (expect.toolsUsed !== undefined) {
    const used = new Set(result.toolCalls.map((call) => call.name));
    const missing = expect.toolsUsed.filter((name) => !used.has(name));
    if (missing.length > 0) {
      failures.push(`toolsUsed: missing ${missing.join(", ")}`);
    }
  }

  if (expect.finalState !== undefined && !expect.finalState(state)) {
    failures.push("finalState: predicate returned false");
  }

  if (expect.stopReason !== undefined && expect.stopReason !== result.stopReason) {
    failures.push(`stopReason: expected '${expect.stopReason}', got '${result.stopReason}'`);
  }

  return failures;
}
