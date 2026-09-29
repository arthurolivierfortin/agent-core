/**
 * A demo of `@arthurolivierfortin/agent-core`, consumed exactly as a real project consumes it:
 * through the package's public entry point, never through a relative path into its `dist/`.
 *
 * It gives an agent four tools over a simulated desktop, asks it to "focus the settings window",
 * and prints each iteration: the call the model chose, the result it read back, and the answer it
 * concluded with. The simulator's final state is what proves the tools really shared one state.
 *
 * **This file is the wiring, and nothing else.** The demo is split in two so the boundary is
 * visible from the file tree alone:
 *
 * - `agent/` is the package side: the only code that imports values from
 *   `@arthurolivierfortin/agent-core` and instantiates them.
 * - `app/` is this demo: a simulated application, its tools, and its output. It imports types from
 *   the package and never a value, so it has no runtime dependency on it at all.
 *
 * Everything below is one side handing the other what it needs: the app's tools go in, the loop's
 * states come back out.
 */
// Node runs this file directly and strips the types, so there is no build step and no emitted
// file: a relative import names what exists on disk, `.ts`. Inside the package, which is
// compiled, the same import carries `.js`.
import { createAgent, describeMissingModel, driveTheLoop } from "./agent/index.ts";
import { isOllamaReachable, reportUnreachableOllama } from "./app/preflight.ts";
import { reportHeader, reportIteration, reportMissingModel, reportOutcome } from "./app/report.ts";
import { createSimulatedDesktop } from "./app/simulated-desktop.ts";

/** What the demo asks for, deliberately generic (see `app/simulated-desktop.ts`). */
const REQUEST = "focus the settings window";

const DEFAULT_OLLAMA_HOST = "http://localhost:11434";
const DEFAULT_MODEL = "qwen2.5:0.5b";

/** The library reads `process.env`; loading a `.env` would be the application's job, not its own. */
const ollamaHost = process.env.OLLAMA_HOST ?? DEFAULT_OLLAMA_HOST;
const model = process.env.OLLAMA_MODEL ?? DEFAULT_MODEL;

const reachable = await isOllamaReachable(ollamaHost);
if (!reachable) {
  reportUnreachableOllama(ollamaHost, model);
  process.exitCode = 1;
} else {
  await runDemo();
}

async function runDemo(): Promise<void> {
  // App side: a simulated application, and the tools that are the agent's only way into it.
  const desktop = createSimulatedDesktop();

  // Package side: one call, and the agent is wired. What it takes is what the application chose.
  const agent = createAgent({ ollamaHost, model, tools: desktop.tools });

  reportHeader({ model, ollamaHost, request: REQUEST, focused: desktop.state.focused });

  try {
    // The loop hands each iteration to the app's reporter as it lands, rather than printing
    // anything itself. That callback is the entire conversation between the two sides during a run.
    const finalState = await driveTheLoop(agent, REQUEST, reportIteration);
    reportOutcome(finalState, desktop.state);
  } catch (error) {
    const missingModel = describeMissingModel(error);
    // Not a missing model: a genuine bug, left to surface as a stack trace.
    if (missingModel === undefined) throw error;
    reportMissingModel(missingModel);
    process.exitCode = 1;
  }
}
