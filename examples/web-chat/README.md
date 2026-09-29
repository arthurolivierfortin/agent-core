# Web chat demo

The same agent as `examples/navigation` (an agent switching a **simulated** desktop application
from one window to another, on the request *"focus the settings window"*), driven from a small
browser chat UI instead of a CLI trace.

The domain is deliberately generic: this package ships no product of its own, and its examples say
nothing about what any specific consumer builds with it (`ADR-AGENT-0018`). A desktop with a
handful of windows demonstrates tool calls with visible, harmless side effects without describing
anyone's real interface.

It consumes `@arthurolivierfortin/agent-core` the way a real project does, through the package's
public entry point. The dependency is `file:../..`, so the import resolves through the real
`exports` map rather than reaching into `dist/`. The package ships no UI component
(`ADR-AGENT-0018`): this page wires `AgenticLLM` to the DOM by hand, the way any consumer would.
Which half of the code is that wiring, and which half is just this demo's interface, is the point
of "The package boundary" below.

## Requirements

- **Node 22.19+** and a package manager that understands `file:` dependencies (npm is enough).
- **[Ollama](https://ollama.com)** running locally, with the model pulled:

```bash
ollama serve
ollama pull qwen2.5:0.5b
```

The page checks Ollama's reachability on load and shows the commands above instead of a silent
failure if nothing answers on `http://localhost:11434`.

## Run it

```bash
npm install    # links the package from ../.. and builds it (its own `prepare` script)
npm run dev    # starts Vite, prints the local URL (http://localhost:5173 by default)
```

Open the printed URL. The agent speaks first: as soon as Ollama answers, the page silently asks it
to introduce itself. That request never appears as a bubble, only the agent's own reply does, so
the thread opens on its introduction rather than on a message nobody typed. From there, type a
request, or keep the pre-filled *"focus the settings window"*, and press **Send**.

Three panels, three different questions about the same run:

- **State** (left): every window that exists, the focused one highlighted, and the focus history,
  so you can also ask for a window that does not exist and watch the agent handle it. Below it, the
  static list of tools the agent actually has, each one flashing briefly the moment it is called:
  the answer to "what can it do", read from the tools themselves rather than from whatever the
  model recalls of its own system prompt (which is exactly where a small model has been seen to
  hallucinate a wrong answer).
- **Chat** (center): the conversation thread. Each iteration appears as the model reads it: a tool
  call, the result it got back, and its final answer.
- **Traces** (right): the mechanism, split by what it traces, not just where it happened.
  - **Agent**: one entry per `step()`, the full `Message[]` delta, token counts, and the final
    `stopReason`, `toolCalls` included. It answers the question the chat bubbles alone cannot:
    whether a given turn called a tool at all (`toolCalls: []` when it did not), which is what
    tells "completed by finishing the task" apart from "completed by just replying". With the
    default `qwen2.5:0.5b`, this is where that would show: `toolCalls` stays empty and the State
    panel never changes while the model still claims a window is now focused, a 494M-parameter
    model answering from nothing rather than acting. Measured now at 13 successes out of 13 fresh
    runs of `examples/navigation`'s equivalent CLI request, so seeing this failure mode here is
    unlikely, not impossible; what changed and why is in
    [`docs/theory/prompt-engineering/`](../../docs/theory/prompt-engineering/README.md).
    `VITE_OLLAMA_MODEL=qwen2.5:7b` remains a further lever if it resurfaces; the trade is a slower
    pull and a slower first response.
  - **Context**: a live view of the window by default, one row per message currently kept, a
    stable id badge, and a pinned system message marked apart. Each row is a disclosure: closed,
    it is only that id, role, and a short preview, so the list stays a glance rather than a wall
    of text; open it to read the message in full. Below it, the raw report from
    `SlidingWindowStrategy`'s `onBuild` hook, one per call, sits behind its own disclosure,
    collapsed until you choose to open it. A message that just got dropped lingers, struck
    through, for a moment on its way out. The placeholder says so plainly until the first request
    runs.
  - **Tools**: one row per call, filled in with its response as soon as it arrives, paired by
    arrival order rather than by id: Ollama does not always send one. The State panel's flash
    says "this ran, just now"; this tab is the durable record of what was asked and what came
    back.

The conversation persists across requests: each one appends to the same accumulated history
instead of starting over, so the sliding window actually has something to manage past the first
exchange, dropping the oldest messages once the conversation outgrows its token budget rather than
never getting the chance to. The simulated desktop persists the same way, so a later request still
builds on wherever an earlier one left the focus.

## Configuration

Vite only exposes browser-side env vars prefixed `VITE_`. Copy `.env.example` to `.env` to override
the server or the model, then restart `npm run dev`:

| Variable | Default | Effect |
|---|---|---|
| `VITE_OLLAMA_HOST` | `http://localhost:11434` | which server answers |
| `VITE_OLLAMA_MODEL` | `qwen2.5:0.5b` | which model the provider declares |

## The package boundary

This is a demo of the package's API as much as of a run, so the code is split to make the boundary
readable from the file tree alone:

```
src/
  agent/                     PACKAGE SIDE: the only code that imports values from
    create-agent.ts          @arthurolivierfortin/agent-core and instantiates them.
    conversation.ts          Neither file touches the DOM.
    index.ts                 the barrel main.ts imports from
  app/                       APP SIDE: no runtime dependency on the package.
    simulated-desktop.ts     Its imports from it are types, never values.
    config.ts
    ollama-health.ts
    dom.ts
    components/
      composer.ts
      desktop-panel.ts
      status.ts
      thread.ts
      tool-list.ts
      traces/                one file per tab, plus the tab strip
  main.ts                    the wiring, and nothing else
  style.css
```

Every file says which side it is on in its opening comment. What the package asks for, in full,
and where each piece is put together:

| From the package | Initialized in | What it is |
|---|---|---|
| `defineAgent` | `agent/create-agent.ts` | a prompt plus tools, as a typed const (ADR-AGENT-0005) |
| `OllamaLLMProvider` | `agent/create-agent.ts` | the vendor, with its models declared, never discovered (ADR-AGENT-0017) |
| `SlidingWindowStrategy`, `HeuristicTokenCounter` | `agent/create-agent.ts` | what the model is allowed to see, how that is measured, and its `onBuild` reporting hook |
| `AgenticLLM` | `agent/create-agent.ts` | the loop, and the package's public API |
| `.step()` | `agent/conversation.ts` | one iteration at a time, over a hand-built `AgentState`, instead of `run()` (ADR-AGENT-0003) |
| `Tool` (type) | `app/simulated-desktop.ts` | the shape the application implements so the agent can call it |
| `Message`, `AgentState`, `SlidingWindowReport` (types) | the components | what a run produced, read in order to render it |

## How a component talks to the package

Never directly. `agent/conversation.ts` reports what a request produced through a set of handlers,
and `main.ts` is the one file that decides which component receives what. That handler block is the
whole conversation between the two sides:

| Component | What it gets from the loop | Through |
|---|---|---|
| `components/thread.ts` | each `Message` an iteration added, rendered as a bubble or a call | `onMessage` |
| `components/tool-list.ts` | the same `Message`, for the names of the tools it calls | `onMessage` |
| `components/traces/tools-tab.ts` | the same `Message` again, for the calls and their results | `onMessage` |
| `components/traces/agent-tab.ts` | the loop's own bookkeeping, dumped verbatim | `onRequest`, `onStep`, `onSettled`, `onError` |
| `components/traces/context-tab.ts` | a `SlidingWindowReport` per context build | `onContextBuild`, the strategy's own hook |
| `components/desktop-panel.ts` | nothing: it reads the simulator, not the agent | `onSettled` tells it to redraw |
| `components/composer.ts` | nothing: it is the one component that talks **to** the agent | `conversation.send()` |

Three components read the same `Message` and each takes only what concerns it, which is why the
stream is handed out raw rather than pre-split. Adding a fourth reader is one more line in
`main.ts`.

## What is in here

| File | Contents |
|---|---|
| `src/app/simulated-desktop.ts` | same simulator as `examples/navigation`, at the same path, duplicated rather than shared: each example reads on its own |
| `src/agent/` | the two files above, and nothing else that knows the package exists |
| `src/app/components/` | one file per piece of the interface, each a factory returning a small handle |
| `src/style.css` | a small token system (colors, one signature "thinking" animation), scoped to this page: not the reusable, restylable component `ADR-AGENT-0018` explicitly defers |

## Consuming the published package instead

One line in `package.json`, once the package is on the registry:

```diff
-    "@arthurolivierfortin/agent-core": "file:../.."
+    "@arthurolivierfortin/agent-core": "^0.4.0-alpha"
```

The registry needs authentication even for reads. See "Installation" in the
[root README](../../README.md).
