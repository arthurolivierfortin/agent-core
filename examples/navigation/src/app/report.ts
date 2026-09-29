/**
 * APP SIDE: the demo's output, and nothing else.
 *
 * No runtime dependency on the package. The two imports are types only (`AgentState`, `Message`),
 * which is what this side of the line is allowed: read what the loop produced, turn it into lines
 * of text, never construct or call anything.
 *
 * Swap these functions for a UI and the agent wiring in `agent/` does not change one character:
 * `examples/web-chat` is that same swap, done for real.
 */
import type { AgentState, Message } from "@arthurolivierfortin/agent-core";
import type { DesktopState } from "./simulated-desktop.ts";

export type RunHeader = {
  model: string;
  ollamaHost: string;
  request: string;
  /** The window in focus before the agent touches anything. */
  focused: string;
};

/** What the run is about, printed before the first model call so the trace has a starting point. */
export function reportHeader({ model, ollamaHost, request, focused }: RunHeader): void {
  console.log(`model   : ${model} (on ${ollamaHost})`);
  console.log(`window  : ${focused}`);
  console.log(`request : "${request}"`);
}

/** What one iteration added to the conversation: the model's move, then what it read back. */
export function reportIteration(state: AgentState, alreadySeen: number): void {
  console.log(`\n--- iteration ${state.iterations} ---`);
  const added = state.history.slice(alreadySeen);
  for (const message of added) {
    console.log(describe(message));
  }
}

/**
 * The run as a whole, and the simulator's state next to it. The two together are the point of the
 * demo: the agent's answer is only worth something if the application really moved.
 */
export function reportOutcome(state: AgentState, desktop: DesktopState): void {
  const toolsUsed = describeToolsUsed(state);
  console.log("\n=== result ===");
  console.log(`answer         : ${state.lastContent}`);
  console.log(`tools called   : ${toolsUsed}`);
  console.log(`stopReason     : ${state.stopReason}`);
  console.log(`iterations     : ${state.iterations}`);
  console.log("--- simulator state ---");
  console.log(`focused window : ${desktop.focused}`);
  console.log(`window history : ${desktop.history.join(" -> ")}`);
}

/** The message the package already built, `ollama pull` command included. */
export function reportMissingModel(message: string): void {
  console.error(`\nModel unavailable.\n${message}`);
}

function describe(message: Message): string {
  if (message.role === "tool") {
    return indent(message.content);
  }
  if (message.role !== "assistant") {
    return `instruction: ${message.content}`;
  }
  const calls = message.toolCalls;
  if (calls === undefined || calls.length === 0) {
    return `answer: ${message.content}`;
  }
  const described = calls.map((call) => `${call.name}(${JSON.stringify(call.arguments)})`);
  return `call: ${described.join(", ")}`;
}

function indent(content: string): string {
  return content
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n");
}

/** Every call of the run, in order, so a repetition is visible rather than deduplicated away. */
function describeToolsUsed(state: AgentState): string {
  if (state.toolCalls.length === 0) return "none";
  return state.toolCalls.map((call) => call.name).join(", ");
}
