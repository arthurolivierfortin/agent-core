/**
 * PACKAGE SIDE: the agentic loop, driven one iteration at a time.
 *
 * `run()` is the one-liner for when nobody is watching, and it is a `while` around this same
 * `step()` (ADR-AGENT-0003). Driving it by hand is what makes the trace readable: the caller gets
 * a turn between two model calls, which is where this demo prints what just happened.
 */
import { LLMError, type AgenticLLM, type AgentState } from "@arthurolivierfortin/agent-core";

/**
 * Called once per iteration, with the state that iteration produced and how long the history was
 * before it ran: `state.history.slice(alreadySeen)` is what the iteration added.
 */
export type OnIteration = (state: AgentState, alreadySeen: number) => void;

export async function driveTheLoop(
  agent: AgenticLLM,
  request: string,
  onIteration: OnIteration,
): Promise<AgentState> {
  let state = agent.initialState(request);
  while (state.stopReason === undefined) {
    const alreadySeen = state.history.length;
    state = await agent.step(state);
    onIteration(state, alreadySeen);
  }
  return state;
}

/**
 * The one prerequisite that cannot be checked before the run: a model that is declared but not
 * installed. A provider failure propagates as an `LLMError` instead of becoming a tool result, so
 * it surfaces out of the loop; the package already builds the message, `ollama pull` command
 * included.
 *
 * Anything else returns `undefined`: it is a genuine bug and belongs on a stack trace.
 */
export function describeMissingModel(error: unknown): string | undefined {
  if (error instanceof LLMError && error.code === "MODEL_NOT_FOUND") return error.message;
  return undefined;
}
