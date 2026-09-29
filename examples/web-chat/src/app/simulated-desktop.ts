import type { Tool } from "@a-world-felt/nathan-agent-core";

/**
 * APP SIDE: a simulated desktop application, and the tools that are the agent's only way into it.
 *
 * This is the application talking **to** the package: a `Tool` is the shape the package expects of
 * anything it is allowed to call, so the objects below are this demo's half of that contract. The
 * import above is type-only, and nothing here is constructed by the package: an application brings
 * its own tools, and the package receives exactly the ones it is handed, nothing implicit.
 *
 * This is a **simulator, not a set of mocks** (ADR-AGENT-0006): three of the four tools are views
 * onto one mutable state, so `focusWindow("notes")` followed by `getFocusedWindow()` answers
 * "notes". The agent cannot tell the application is not real, because its whole world arrives
 * through tool results. The fourth, `listTools`, describes the tools themselves rather than the
 * desktop.
 *
 * Deliberately generic: this package ships no product of its own, and its examples say nothing
 * about what any specific consumer builds with it (`ADR-AGENT-0018`). A desktop with a few windows
 * demonstrates tool calls with visible, harmless side effects without describing anyone's real UI.
 *
 * Same simulator as `examples/navigation`, at the same path, duplicated rather than shared: each
 * example reads on its own, without following an import into a sibling package.
 */

/** The windows of the simulated desktop, each with what it is for, as the model reads it. */
const WINDOWS: Record<string, string> = {
  inbox: "unread messages and recent activity",
  calendar: "upcoming events and reminders",
  notes: "quick notes and drafts",
  settings: "preferences and shortcuts",
};

/** The live state the tools share. Read it after a run to see what the agent actually did. */
export type DesktopState = {
  /** The window in focus. `focusWindow` writes it, `getFocusedWindow` reads it. */
  focused: string;
  /** Every window focused, in order, starting from the one open at launch. */
  history: string[];
};

export type SimulatedDesktop = {
  state: DesktopState;
  tools: Tool[];
  /** Every window that exists, not just the focused one: lets a UI show the whole state space,
      so a request naming a wrong window can be tried on purpose. Kept on both copies for one
      shared shape; only `examples/web-chat`'s UI actually reads it. */
  windows: Record<string, string>;
};

/**
 * A factory, never a shared instance: every call starts from a fresh state (ADR-AGENT-0006).
 * Two runs sharing one state would each start where the previous one stopped.
 */
export function createSimulatedDesktop(): SimulatedDesktop {
  const state: DesktopState = { focused: "inbox", history: ["inbox"] };

  const listWindows: Tool = {
    name: "listWindows",
    description: "List the windows of the application and what each one is for.",
    schema: { type: "object", properties: {} },
    async execute() {
      const lines = Object.entries(WINDOWS).map(([name, purpose]) => `- ${name}: ${purpose}`);
      return { content: lines.join("\n"), isError: false };
    },
  };

  const getFocusedWindow: Tool = {
    name: "getFocusedWindow",
    description: "Report which window is currently focused.",
    schema: { type: "object", properties: {} },
    async execute() {
      return { content: `"${state.focused}" is currently focused.`, isError: false };
    },
  };

  const focusWindow: Tool = {
    name: "focusWindow",
    description: "Bring a window into focus.",
    // The set of windows is closed, so the schema says so with an `enum` rather than leaving the
    // model to invent a name. A tool's schema is the only description the model gets: what it
    // omits, the model guesses.
    schema: {
      type: "object",
      properties: {
        window: { type: "string", description: "the name of the target window", enum: Object.keys(WINDOWS) },
      },
      required: ["window"],
    },
    async execute(args) {
      const asked = readWindow(args);
      if (asked === "") {
        return { content: 'The "window" argument is missing.', isError: true };
      }
      const window = findWindow(asked);
      if (window === undefined) {
        // A tool that fails does not throw: it hands the failure back to the model, which can
        // then correct itself (safety rule, CLAUDE.md).
        return { content: `There is no window called "${asked}". ${availableWindows()}`, isError: true };
      }
      state.focused = window;
      state.history.push(window);
      return { content: `"${window}" is now focused.`, isError: false };
    },
  };

  // Every tool the model already receives its schema for, on every single call
  // (`toRequestTool` in `ollama-llm-provider.ts`): this does not hand it information it lacks. It
  // hands it a **reliable** way to answer "what can you do", instead of leaving that answer to
  // whatever it recalls of its own system prompt, which is exactly where it has been seen to
  // hallucinate a wrong one.
  const tools: Tool[] = [listWindows, getFocusedWindow, focusWindow];
  const listTools: Tool = {
    name: "listTools",
    description: "List the tools this agent has access to and what each one does.",
    schema: { type: "object", properties: {} },
    async execute() {
      const lines = tools.map((tool) => `- ${tool.name}: ${tool.description}`);
      return { content: lines.join("\n"), isError: false };
    },
  };
  tools.push(listTools);

  return { state, tools, windows: WINDOWS };
}

/** The model's arguments arrive parsed but untyped, so a tool narrows what it reads. */
function readWindow(args: Record<string, unknown>): string {
  const window = args.window;
  if (typeof window !== "string") return "";
  return window.trim();
}

/** The declared window matching what was asked, ignoring case: a model naming one is forgiving. */
function findWindow(asked: string): string | undefined {
  const target = asked.toLowerCase();
  return Object.keys(WINDOWS).find((window) => window.toLowerCase() === target);
}

function availableWindows(): string {
  return `Available windows: ${Object.keys(WINDOWS).join(", ")}.`;
}
