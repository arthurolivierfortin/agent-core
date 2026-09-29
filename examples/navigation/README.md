# Navigation demo

An agent switches a **simulated** desktop application from one window to another, on the request
*"focus the settings window"*.

The domain is deliberately generic: this package ships no product of its own, and its examples say
nothing about what any specific consumer builds with it (`ADR-AGENT-0018`). A desktop with a
handful of windows demonstrates tool calls with visible, harmless side effects without describing
anyone's real interface.

It consumes `@arthurolivierfortin/agent-core` the way a real project does, through the package's
public entry point. The dependency is `file:../..`, so the import resolves through the real
`exports` map rather than reaching into `dist/`: if the entry points break, this demo breaks. Which
half of the code is that consumption, and which half is just this demo, is the point of "The
package boundary" below.

## Requirements

- **Node 22.19+**, or any Node that runs `.ts` files directly by stripping their types. That is
  what removes the build step: there is nothing to compile here.
- **[Ollama](https://ollama.com)** running locally, with the model pulled:

```bash
ollama serve
ollama pull qwen2.5:0.5b
```

The demo checks both before it starts and prints the command to run rather than a stack trace.

## Run it

```bash
npm install    # links the package from ../.. and builds it (its own `prepare` script)
npm start      # or: node src/main.ts
```

## What you should see

**With the default `qwen2.5:0.5b`, this now calls the tool reliably: 13 successes out of 13 fresh
runs of this exact command, no failure observed.** One iteration per model call: the agent picks a
tool, reads the result, and the run ends when it asks for no more tools (`stopReason: completed`).

```
model   : qwen2.5:0.5b (on http://localhost:11434)
window  : inbox
request : "focus the settings window"

--- iteration 1 ---
call: focusWindow({"window":"settings"})
    "settings" is now focused.

--- iteration 2 ---
answer: The settings window has been brought into focus.

=== result ===
answer         : The settings window has been brought into focus.
tools called   : focusWindow
stopReason     : completed
iterations     : 2
--- simulator state ---
focused window : settings
window history : inbox -> settings
```

That measurement is not the whole story: it is what this exact `PROMPT` gets out of a
494M-parameter model, not a property of the model on its own. One added sentence, telling it that
a tool argument is a plain value and never its own schema, is the entire difference between the
7-out-of-13 measured before that sentence existed and the 13-out-of-13 measured after. The two
failure modes it fixed, what they looked like, and the general principle behind the fix are
written up in
[`docs/theory/prompt-engineering/`](../../docs/theory/prompt-engineering/README.md),
where this measurement is the example. `OLLAMA_MODEL=qwen2.5:7b` (see "Configuration" below)
remains a further, larger lever if either failure mode ever resurfaces.

## The package boundary

This is a demo of the package's API as much as of a run, so the code is split to make the boundary
readable from the file tree alone:

```
src/
  agent/                   PACKAGE SIDE: the only code that imports values from
    create-agent.ts        @arthurolivierfortin/agent-core and instantiates them
    drive-loop.ts
    index.ts               the barrel main.ts imports from
  app/                     APP SIDE: no runtime dependency on the package.
    simulated-desktop.ts   Its imports from it are types, never values.
    report.ts
    preflight.ts
  main.ts                  the wiring, and nothing else
```

Every file says which side it is on in its opening comment. What the package asks for, in full,
and where each piece is put together:

| From the package | Initialized in | What it is |
|---|---|---|
| `defineAgent` | `agent/create-agent.ts` | a prompt plus tools, as a typed const (ADR-AGENT-0005) |
| `OllamaLLMProvider` | `agent/create-agent.ts` | the vendor, with its models declared, never discovered (ADR-AGENT-0017) |
| `SlidingWindowStrategy`, `HeuristicTokenCounter` | `agent/create-agent.ts` | what the model is allowed to see, and how that is measured |
| `AgenticLLM` | `agent/create-agent.ts` | the loop, and the package's public API |
| `.initialState()`, `.step()` | `agent/drive-loop.ts` | one iteration at a time, instead of `run()` (ADR-AGENT-0003) |
| `LLMError` | `agent/drive-loop.ts` | a provider failure, which propagates rather than becoming a tool result |
| `Tool` (type) | `app/simulated-desktop.ts` | the shape the application implements so the agent can call it |
| `AgentState`, `Message` (types) | `app/report.ts` | what a run produced, read in order to print it |

Which makes one iteration a round trip between the two sides:

1. `app/simulated-desktop.ts` builds the tools. Nothing is implicit: the agent gets exactly the
   ones it is handed.
2. `main.ts` passes them to `createAgent`, the one place the package is instantiated.
3. `agent/drive-loop.ts` runs `step()` and hands the resulting `AgentState` straight back out.
4. `app/report.ts` reads it and prints it. Replace this one file with a UI and the wiring in
   `agent/` does not change a character: `examples/web-chat` is that same swap, done for real.

The tools are a **simulator, not mocks**: they are views onto one mutable state, so `focusWindow`
then `getFocusedWindow` agree with each other. The agent cannot tell the application is not real,
because its whole world arrives through tool results.

## Configuration

| Variable | Default | Effect |
|---|---|---|
| `OLLAMA_HOST` | `http://localhost:11434` | which server answers |
| `OLLAMA_MODEL` | `qwen2.5:0.5b` | which model the provider declares |

```bash
OLLAMA_MODEL=qwen2.5:7b npm start
```

A bigger model follows instructions more reliably; `qwen2.5:0.5b` is the default because it is
small enough to pull in seconds.

## Consuming the published package instead

One line in `package.json`, once the package is on the registry:

```diff
-    "@arthurolivierfortin/agent-core": "file:../.."
+    "@arthurolivierfortin/agent-core": "^0.4.0-alpha"
```

The registry needs authentication even for reads. See "Installation" in the
[root README](../../README.md).
