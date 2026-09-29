# Prompt engineering for reliable tool calls

- **Type**: theory / reference, **non-decisional**
- **Date**: 2026-08-03
- **Author**: Arthur-Olivier Fortin
- **Status**: living reference. One entry below is empirically measured here, with its methodology and numbers; the rest, under "further principles", is general prompt-engineering practice, not independently verified against this package's providers, and marked as such.
- **Related**: `examples/navigation/`, `examples/web-chat/` (where the measured example below lives and can be reproduced); `AgentDefinition.prompt` (`src/agent/models/agent-definition.ts`).

## Why this document exists

`defineAgent()` hands a consumer exactly one lever over how well a model uses its tools: `prompt`. Everything else, the tool schemas, the loop, the provider, is fixed by the package. This document collects what has actually been observed to change tool-call quality through that one lever, so a consumer tuning their own agent's prompt does not have to re-derive it from scratch. It is deliberately **non-decisional**: nothing here is a package default or a requirement, only what has been observed to help.

## Verified: an argument's value is not its schema

A tool's JSON Schema (`Tool.schema`, sent to the model as `ToolDefinition.parameters`) describes the **shape** a valid argument must have: its type, and a human-readable `description` of what it means. It is not itself a valid argument. Nothing in the wire format stops a model from confusing the two, and a small model sometimes does exactly that: instead of `focusWindow({"window":"notes"})`, it calls `focusWindow({"window":{"description":"the name of the target window","type":"notes"}})`, the schema's own shape handed back as if it were the value. The tool then rejects the call (`The "window" argument is missing.`) and the model has to try again, if it tries at all.

**Measured in `examples/navigation`** (`qwen2.5:0.5b` via Ollama, the exact command `npm start`, the request *"focus the settings window"*, nothing else changed between the two rows):

| `PROMPT` | Successes | Runs |
|---|---|---|
| No mention of argument format | 7 | 13 |
| + "When you call a tool, give each argument its actual value... never the argument's own description or type." | 13 | 13 |

One added sentence was the entire difference: same model, same tools, same schema, same request. A small model still needs to be told, in the prompt, that the schema is not the answer.

Caveats, so this reads as a data point and not a law:

- 13 runs is enough to see a large effect, not enough to bound it precisely.
- It is one model, one quantization, one tool, one argument shape.
- It has not been re-measured since the domain's other tools (`listWindows`, `getFocusedWindow`, `listTools`) were added, though none of them takes an argument that could echo a schema.
- A model upgrade, a different quantization, or a differently-shaped schema could change the result. Reproduce before relying on the exact numbers.

## Further principles (general practice, not independently verified here)

- **State the format an argument must take, and give a concrete example value**, not just its type. A schema's `description` field is written for whoever reads the tool call, not necessarily as an instruction the model reliably follows as one.
- **Prefer an `enum` over free text when the set of valid values is closed.** `examples/navigation`'s `focusWindow` already does this (`window`'s schema declares `enum: Object.keys(WINDOWS)`), so the model chooses from a declared list rather than generating a string.
- **A bigger model is a blunter, more expensive lever than a better prompt.** `qwen2.5:7b` calls tools more reliably than `qwen2.5:0.5b` on the same prompt (see `examples/navigation/README.md`, "Configuration"), but the prompt change measured above closed most of the same gap on the smaller model, at no runtime cost.

## How to reproduce or extend the measurement above

```bash
cd examples/navigation
npm start    # repeat N times, count how many runs show `tools called : focusWindow`
```

Edit `PROMPT` in `src/agent/create-agent.ts` between batches of runs to test a different wording, keeping every other variable (model, request, tools) fixed. `examples/web-chat` holds the same constant at the same path.
