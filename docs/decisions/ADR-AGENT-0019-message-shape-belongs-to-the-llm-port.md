# ADR-AGENT-0019: The message list belongs to the LLM port, not to agent

- **Status**: ✅ Accepted, complements ADR-AGENT-0012
- **Date**: 2026-08-03
- **Deciders**: Arthur-Olivier Fortin
- **Scope**: `@a-world-felt/nathan-agent-core`

## Context

ADR-AGENT-0012 already assigns `Message` to `llm` ("the conversation protocol"), but it does not argue why, and the question resurfaced directly: shouldn't `llm` stay ignorant of how a conversation is structured, so that `agent` alone decides the shape of what it sends? Concretely: could `LLMProvider.complete()` take plain text instead of `Message[]`, so that `llm` never imports a type describing roles or tool calls?

`step.ts` already owns every decision about the conversation: when to create a system/user/assistant/tool turn, when to append it to `AgentState.history`, when to inject the landing instruction (ADR-AGENT-0011). `OllamaLLMProvider` never decides any of that: `toRequestMessage` only translates whatever `Message[]` it receives into Ollama's own `{role, content, tool_calls}` wire shape. So the concern was legitimate to check: does `llm` hold structural logic it should not, or only a type it cannot avoid?

## Options considered

- **A: `complete(text: string, opts)`.** `llm` would import nothing describing turns. But every mainstream chat-completion API (Ollama's `/api/chat`, and the OpenAI/Anthropic-style APIs the roadmap plans further providers for) requires a role-tagged turn list to do multi-turn context and tool calling at all, because the model is trained on that turn structure. A flat string would force each adapter to invent its own private encoding of roles and tool calls into that string, then parse it back out: it undoes the discriminated union's compile-time guarantee (a `user` carrying `toolCalls` does not typecheck) and reproduces, ad hoc and untyped inside every adapter, exactly the structure being avoided. It is the `feature: string` anti-pattern by another name (CLAUDE.md, ADR-AGENT-0001): a shape that should be typed, hidden in a string.
- **B: `complete(payload: unknown, opts)`, agent casts it.** Same problem as A, plus the port itself loses type safety entirely: nothing stops one adapter from accepting a shape no other adapter agrees on.
- **C: `Message` moves to `agent/models`, `llm/interfaces` imports it from there.** This inverts the dependency ADR-AGENT-0012 just established: `llm` is meant to stay a clean leaf, publishable and usable through `./llm` without `agent` ever entering its graph. A consumer using `OllamaLLMProvider` directly, without the agentic loop, would still need `Message` to call `complete()`, and would end up importing part of `agent/` to do it.
- **D (current, kept): `Message` stays in `llm/models`, as the port's minimal typed wire contract; `agent` owns everything about when and how it is built.** No change from ADR-AGENT-0012's table; this ADR records why the alternatives fail.

## Decision

**Option D.** `llm` owns the *shape* of one turn, because that shape is the minimal structure every real chat-completion provider needs in order to exist as an implementer of `LLMProvider` at all, not an editorial choice this package made. `llm` owns zero *conversation logic*: it never decides which messages exist, in what order, or when one is added. That responsibility is entirely `agent`'s (`step.ts`: `initialState`, `advance`, `land`) and, downstream of it, `context`'s (`ContextStrategy.build()` decides the subset actually sent, ADR-AGENT-0016).

The distinction that resolves the original concern: a port needs a **data contract** for its parameters (placement rule 1, ADR-AGENT-0001) so every adapter can be typed against it; it does not need, and here does not have, any logic about that data. `Message` is exactly the former, never the latter.

## Consequences

**Positive**

- `llm` stays a clean, standalone leaf (ADR-AGENT-0012): the type it needs to expose its own port is defined where the port is.
- Illegal turns still do not typecheck (`user` with `toolCalls`, `tool` without `toolCallId`), which a string or `unknown` payload would give up.
- No adapter reinvents its own private, untyped turn encoding.

**Negative**

- `agent` imports `Message` from `llm/models`: a one-directional coupling, already implied by ADR-AGENT-0012's dependency direction (`agent` legitimately depends on every layer; no layer depends on `agent`), so this adds no new edge.

## Relations

- Confirms and documents the reasoning behind ADR-AGENT-0012's ownership table (`Message` → `llm`, "the conversation protocol"), which stated the assignment without arguing the rejected alternatives.
- Rests on ADR-AGENT-0001's placement rule (a port's parameter type is a `models/` concern) and its `feature: string` rule.
- The port signature this protects is the one ADR-AGENT-0013 froze (`complete(messages: Message[], opts)`).
