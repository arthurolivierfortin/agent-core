import type { LLMResponse } from "../../llm/models/index.js";
import { FakeLLMProvider } from "../../llm/testing/index.js";
import type { AgentDeps } from "../application/dtos/index.js";
import type { Scenario } from "./define-scenario.js";
import { runScenario } from "./run-scenario.js";
import type { ScenarioResult } from "./run-scenario.js";

/**
 * Replay one run from its trace: a `FakeLLMProvider` scripted with `run.trace.responses`, in order,
 * answers every call as `FakeLLMProvider.MODEL_ID`, since a script is read by cursor, never by
 * model. `run` is a `MatrixRun`, or one read back by `JSON.parse` from a saved report. The caller
 * compares the result with the run (ADR-AGENT-0006: the harness asserts nothing).
 *
 * The replay is identical (same `toolCalls`, `finalState`, `stopReason`, `content`, `passed`,
 * `failures`) only if `deps` carries the same agent, the same context strategy, the same budget
 * and the same landing instruction as the run, and if `scenario.env` is deterministic: nothing
 * here can check it. Nothing is caught either: the trace of a run whose provider threw stops
 * short, so its replay rejects with the fake's end-of-script error.
 *
 * Design: docs/specs/2026-09-30-csv-rejeu-demo-design.md (#9).
 */
export async function replayRun<TState>(
  scenario: Scenario<TState>,
  run: { readonly trace: { readonly responses: readonly LLMResponse[] } },
  deps: Omit<AgentDeps, "tools" | "llm" | "model">,
): Promise<ScenarioResult<TState>> {
  const llm = new FakeLLMProvider({ responses: [...run.trace.responses] });
  return runScenario(scenario, { ...deps, llm, model: FakeLLMProvider.MODEL_ID });
}
