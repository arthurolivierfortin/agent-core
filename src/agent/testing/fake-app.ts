import type { Tool } from "../../tools/interfaces/index.js";

/** What a scenario starts the simulated app from. */
export type FakeAppConfig = {
  pages: string[];
  current: string;
};

/** The simulator's shared, mutable state. What a scenario's `finalState` predicate reads. */
export type FakeAppState = {
  pages: readonly string[];
  current: string;
};

/**
 * A simulator, not a mock (ADR-AGENT-0006): `navigate` and `getCurrentPage` close over the same
 * `state`, so `navigate("reglages")` then `getCurrentPage()` observes the change. The agent has
 * no way to tell it apart from the real app: its whole world passes through these tool results.
 */
export type FakeApp = {
  readonly state: FakeAppState;
  readonly tools: readonly Tool[];
};

/**
 * Build one simulated app. A factory, not a singleton (ADR-AGENT-0006 rule 1): call it once per
 * run, never share the result between two, or the second run starts where the first left off and
 * the rates a matrix computes from it mean nothing.
 */
export function fakeApp(config: FakeAppConfig): FakeApp {
  const state: FakeAppState = { pages: [...config.pages], current: config.current };
  return { state, tools: [navigateTool(state), getCurrentPageTool(state)] };
}

function navigateTool(state: FakeAppState): Tool {
  return {
    name: "navigate",
    description: "Navigate to a page of the application by name.",
    schema: {
      type: "object",
      properties: { page: { type: "string", description: "The page to navigate to." } },
      required: ["page"],
    },
    async execute(args) {
      const page = args.page;
      if (typeof page !== "string") {
        return { content: "navigate: 'page' must be a string.", isError: true };
      }
      if (!state.pages.includes(page)) {
        return {
          content: `Unknown page '${page}'. Available: ${state.pages.join(", ")}.`,
          isError: true,
        };
      }
      state.current = page;
      return { content: `Navigated to '${page}'.`, isError: false };
    },
  };
}

function getCurrentPageTool(state: FakeAppState): Tool {
  return {
    name: "getCurrentPage",
    description: "Return the name of the page currently displayed.",
    schema: { type: "object", properties: {} },
    async execute() {
      return { content: state.current, isError: false };
    },
  };
}
