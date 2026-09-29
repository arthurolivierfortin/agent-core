/**
 * A demo of `@a-world-felt/nathan-agent-core`, consumed exactly as a real project consumes it:
 * through the package's public entry point, never through a relative path into its `dist/`.
 *
 * Same agent and simulated application as `examples/navigation`, driven from a chat thread instead
 * of a CLI trace (`ADR-AGENT-0018`). The package ships no UI component, so everything on screen is
 * this demo's own, wired to the DOM by hand the way any consumer would.
 *
 * **This file is the wiring, and nothing else.** The demo is split in two so the boundary is
 * visible from the file tree alone:
 *
 * - `agent/` is the package side: the only code that imports values from
 *   `@a-world-felt/nathan-agent-core` and instantiates them. Two files, and neither touches the DOM.
 * - `app/` is this demo: a simulated application, its tools, and the components on screen. Its
 *   files import types from the package and never a value, so they have no runtime dependency on
 *   it at all.
 *
 * Below, in order: the application builds itself, the package is handed what it needs, and the two
 * are connected by one set of handlers. That handler block is the whole conversation between the
 * two sides.
 *
 * Everything is constructed before the first `await`, and every component keeps its own state in
 * its own closure, so nothing here can be read before it is initialized.
 */
import {
  BUDGET,
  createAgent,
  createConversation,
  LANDING_INSTRUCTION,
  PROMPT,
} from "./agent/index.ts";
import { createComposer } from "./app/components/composer.ts";
import { createDesktopPanel } from "./app/components/desktop-panel.ts";
import { showModelInfo, showUnreachableNotice } from "./app/components/status.ts";
import { createThread } from "./app/components/thread.ts";
import { createToolList } from "./app/components/tool-list.ts";
import { createTracesPanel } from "./app/components/traces/index.ts";
import { FIRST_REQUEST, INTRO_REQUEST, model, ollamaHost } from "./app/config.ts";
import { isOllamaReachable } from "./app/ollama-health.ts";
import { createSimulatedDesktop } from "./app/simulated-desktop.ts";

// --- The application: a simulated desktop, and the components that show what happens to it ------

const desktop = createSimulatedDesktop();

showModelInfo(model, ollamaHost);
const desktopPanel = createDesktopPanel(desktop);
const toolList = createToolList(desktop.tools);
const thread = createThread();
const traces = createTracesPanel();

// --- The package: one call, and the agent is wired ----------------------------------------------
// What it takes is what the application chose: its host, its model, its tools, and where the
// context strategy should report to.

const agent = createAgent({
  ollamaHost,
  model,
  tools: desktop.tools,
  onContextBuild: (report) => traces.recordContext(report),
});

// --- Between the two: what the loop reports, and which component receives it --------------------

const conversation = createConversation(agent, {
  onRequest: (request, visible) => {
    if (visible) thread.appendRequest(request);
    traces.log("request", { request, visible });
  },
  onIterationStart: () => thread.startThinking(),
  onIterationEnd: () => thread.stopThinking(),
  // Three components read the same message and each takes what concerns it: the thread renders it,
  // the tool list flashes the tools it calls, the Tools tab records the call and its result.
  onMessage: (message) => {
    thread.render(message);
    toolList.flashCallsIn(message);
    traces.recordMessage(message);
  },
  // The full delta, not the curated bubbles: raw `Message[]` as the loop produced them, plus the
  // bookkeeping the chat view never shows. An empty `toolCalls` in the summary below is what
  // "completed with no tool call" looks like on the wire.
  onStep: (state, added) =>
    traces.log("step", {
      iteration: state.iterations,
      added,
      tokensUsed: state.tokensUsed,
      repetition: state.repetition,
    }),
  onSettled: (state) => {
    // The tools moved the simulator during the run; this is where the panel catches up with it.
    desktopPanel.render();
    traces.log("summary", {
      stopReason: state.stopReason,
      iterations: state.iterations,
      tokensUsed: state.tokensUsed,
      toolCalls: state.toolCalls,
    });
  },
  onError: (message) => {
    thread.appendError(message);
    traces.log("error", { message });
  },
});

const composer = createComposer({
  initialRequest: FIRST_REQUEST,
  onSubmit: (request) => conversation.send(request),
});

traces.log("config", {
  model,
  host: ollamaHost,
  prompt: PROMPT,
  budget: BUDGET,
  landingInstruction: LANDING_INSTRUCTION,
});

// --- Start: check the prerequisite, then let the agent speak first -------------------------------

const reachable = await isOllamaReachable(ollamaHost);
if (!reachable) {
  // The composer already starts disabled, so there is nothing to lock down: the notice is the page.
  showUnreachableNotice(ollamaHost, model);
} else {
  await conversation.send(INTRO_REQUEST, false);
  composer.setEnabled(true);
  composer.focus();
}
