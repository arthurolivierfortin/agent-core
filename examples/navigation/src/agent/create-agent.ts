/**
 * PACKAGE SIDE: everything this demo uses from `@a-world-felt/nathan-agent-core` to build an
 * agent, in one file.
 *
 * Read this to see what wiring the package actually asks for: an agent definition, a provider, a
 * context strategy, and the bounds of a run. No other file in the demo constructs a package
 * object, so no other file has to be read to answer "what does consuming this look like".
 *
 * The package is imported through its public entry point, exactly as a real project consumes it,
 * never through a relative path into its `dist/`.
 */
import {
  AgenticLLM,
  defineAgent,
  HeuristicTokenCounter,
  OllamaLLMProvider,
  SlidingWindowStrategy,
  type Tool,
} from "@a-world-felt/nathan-agent-core";

/** The agent's system prompt: no product of this package's own, so nothing here is domain-specific. */
export const PROMPT = [
  "You control a simulated desktop application on someone's behalf.",
  "Use the tools to check which window is focused, and to focus the one they ask for.",
  "When you call a tool, give each argument its actual value, for example a window name is a",
  "plain word like \"settings\", never the argument's own description or type.",
  "Once you're done, reply in one sentence naming the window that is now focused.",
].join(" ");

/**
 * A small bound so the demo lands quickly if the model wanders. Reaching it is a landing, not a
 * cutoff: the agent is asked to conclude and always answers (ADR-AGENT-0011).
 */
export const BUDGET = { maxIterations: 5 };

/** What the agent is told when it reaches that bound. */
export const LANDING_INSTRUCTION =
  "You've reached the limit for this request. Do not call any more tools: answer now with " +
  "what you already know, and say what's still missing.";

export type AgentWiring = {
  /** Which server answers. The application reads its own environment for this, the library never does. */
  ollamaHost: string;
  /** Which model the provider declares. */
  model: string;
  /** What the application lets the agent do: see `app/simulated-desktop.ts`. */
  tools: Tool[];
};

/**
 * The one place the package is instantiated. Everything it needs arrives as an argument, so the
 * demo's own choices (which host, which model, which tools) stay on the application's side of the
 * line.
 */
export function createAgent({ ollamaHost, model, tools }: AgentWiring): AgenticLLM {
  // An agent is a prompt plus tools, declared in TypeScript and imported statically: the compiler
  // checks the wiring, and nothing is looked up by name (ADR-AGENT-0005).
  const assistant = defineAgent({
    name: "assistant",
    prompt: PROMPT,
    tools,
  });

  // A provider is a vendor and its models are declared, never discovered (ADR-AGENT-0017).
  const llm = new OllamaLLMProvider({
    baseURL: ollamaHost,
    models: [{ id: model, supportsTools: true }],
  });

  const context = new SlidingWindowStrategy({
    maxTokens: 4000,
    counter: new HeuristicTokenCounter(),
  });

  return new AgenticLLM({
    agent: assistant,
    llm,
    context,
    budget: BUDGET,
    landingInstruction: LANDING_INSTRUCTION,
  });
}
