# ADR-AGENT-0020: `Conversation` owns the session history, behind a `ConversationStore` port

- **Status**: ✅ Accepted, complements ADR-AGENT-0003 and ADR-AGENT-0016
- **Date**: 2026-08-15
- **Deciders**: Arthur-Olivier Fortin
- **Scope**: `@a-world-felt/nathan-agent-core`

## Context

Nothing in the package holds a conversation between two requests.

- `AgenticLLM` has one field, `deps`. No state.
- `AgentInput = string`, commented "a single utterance for now".
- `initialState(input, deps)` always returns a fresh `[system, user]`.
- `AgentState.history` is a value threaded through `step` and discarded when the run ends.

That is a deliberate and good property for a single request (ADR-AGENT-0003: a value, not an object with behaviour, which is what makes an iteration testable in isolation and a run suspendable). It leaves an unnamed gap for anything multi-turn.

`examples/web-chat` hit that gap first and had to write about forty lines to fill it: hold the accumulated history, build an `AgentState` by hand rather than through `initialState`, loop on `step`, and strip the landing instruction between requests.

**Two defects surfaced while writing them, and neither is a missing convenience.**

1. **The landing instruction leaks into the next request.** When a bound falls, `land()` appends the one-off directive ("you have reached the budget, do not call any more tools") as the second-to-last message of `history` (ADR-AGENT-0011). Nothing documents that it has to be removed before that history is reused. A consumer that carries the history forward replays a stale command on every later request, and the symptom is quiet: the agent simply becomes passive after any budget landing.
2. **`observe()` never sees the user.** In `step.ts` it is called with `[assistant]` or `[assistant, ...toolResults]`. The user's own message enters through `history` and is only ever read by `build()`. A V3 `MemoryStrategy` meant to retain "this person prefers X" would never see the sentence where they said it, because `build` produces context, it does not learn.

**A missing concern in the existing framing.** `docs/theory/memory/README.md` separates three concerns: fit the window, long-term memory, termination. It omits a fourth that sits between the first two: **holding the session's thread**. Retention (how much is kept, in messages) and window budget (how many tokens this model accepts, recomputed every iteration) are different questions with different units. Conflating them is what makes the sliding window look like "session memory", which it is not: it stores nothing, it selects from what it is handed.

| Concern | Nature | Owner before this ADR |
|---|---|---|
| **Hold the session thread** (the stock) | state, between requests | **nobody** |
| Fit the window (the filter) | plumbing, every iteration | `ContextStrategy` |
| Remember across sessions | optional capability | V3, deferred |
| Terminate | stop condition | ADR-AGENT-0014 |

## Options considered

- **A: nothing, the application copes.** The status quo. Every consumer that wants a chat thread rewrites the same forty lines, and every one of them walks into defect 1 above without being told. The package's own demo is the existence proof that the first consumer to try it did exactly that.
- **B: `AgenticLLM` becomes stateful.** One agent, one conversation, forever. It breaks the documented guarantee that "two runs on the same instance share the wiring and nothing else", it makes `step` untestable without an agent instance, and it closes the door on several threads over one agent. Rejected outright.
- **C: an input port that notifies subscribers.** The request arrives, and whoever is subscribed (a conversation holder, the context strategy, a future memory) is notified and feeds itself. Seriously considered, and it correctly identifies defect 2. Rejected for three reasons. The hook already exists: `ContextStrategy.observe(exchange)` is that notification, and what it lacks is the user's message and something that outlives a run, both fixable without a bus. Subscribers that each mutate private state scatter the loop's state, make notification order significant, and run against ADR-AGENT-0003's value-threading. And a generic notification mechanism built for three subscribers, two of which do not exist yet, is one instance and two intentions: `docs/theory/memory/README.md` states the rule-of-three discipline that forbids exactly this, and it is the overhead the permanent constraint rules out.
- **D: a `ConversationManager` facade that hides where the conversation lives.** The intent is right, the shape does not deliver it. A facade protects *obtaining* a conversation (`manager.get(id)`) and not *using* it: `conv.send(...)` and reading the messages are what break when storage moves off-process, and the facade shields neither. The package also has no `Manager` anywhere, by convention: its six classes are named for what they do (`Provider`, `Strategy`, `Counter`, `Collector`), and "manager" is the name taken before that is decided.
- **E (chosen): a `Conversation` class that owns the thread, with storage behind a `ConversationStore` port.**

## Decision

**Option E**, with the following points settled.

**1. `Conversation` owns the session stock.** It holds the accumulated history, appends each request to it, drives `step` to completion, and exposes the thread for display. It is a class by ADR-AGENT-0009's criterion: public API, state of its own, several operations. `AgenticLLM.conversation()` is the discoverable factory; `run()` keeps its meaning as a single-turn request and is unchanged.

**2. Storage sits behind `ConversationStore`.** The package ships the in-memory implementer. Anything persistent (disk, database, remote) is an adapter, and by the roadmap's own packaging constraint it cannot ship through the `.` barrel, which must stay importable with no disk access: it needs its own subpath, like `./tools`. A consumer repo writing its own adapter behind the port is the same arrangement as `ExternalLLMProvider`.

**3. Reads are async from day one.** `ContextStrategy.build` set the precedent: async even where the only implementer is synchronous, "because adding `async` later to a published interface would break every implementer". A store that may one day answer over a network makes the same demand. This is the one place where anticipation beats the rule of three, because it is the *signature* being frozen, not an ecosystem of adapters.

**4. A strategy receives the data, never the object.** `build(history: readonly Message[])`, not `build(conversation)`. Passing an array in JavaScript passes a reference, so a strategy already reads the whole thread at no copying cost and takes whatever slice it wants; what a reference to the object would add is not reading power but a dependency edge from `context/` to `agent/`, inverting the direction that holds the hexagon together, and the need to construct a conversation in order to test a window. `readonly` is added to the port: a compile-time guarantee only, which is the level of rigour the rest of the package applies.

**5. `observe()` must see the user's message.** Defect 2 is fixed as part of this work, not deferred: a memory strategy blind to half the conversation cannot do its job, and the fix is inside `step.ts`.

**6. Retention is optional and unlimited by default, and it comes after `observe`.** Two constraints. Any message reaches `observe` before retention may drop it, or long-term memory acquires silent holes. And truncation cuts on atomic units, never between an assistant message carrying `toolCalls` and the `tool` message answering it, which breaks the shape providers expect. `toAtomicUnits` already implements this, privately, in `sliding-window-strategy.ts`; this is its second use, so it moves to `context/services/` by the placement rule.

**7. Several conversations are deferred, and the door is held open by a constraint rather than by code.** No `ConversationManager`, no list with one element, no identifiers invented before anything is persisted. The requirement is met instead by three properties `Conversation` must have: no singleton, no static, no module-level state; injected dependencies rather than self-constructed ones, so "do two conversations share a context strategy, a memory, an agent instance?" stays open; and nothing in it that assumes it is the only one. An object holding several is then purely additive.

## Consequences

**Positive**

- The four concerns each have an owner, and the boundary V3 has to respect is now nameable: `Conversation` holds the session, a memory strategy holds what outlives it.
- The landing-instruction trap is fixed once, in the package, instead of being rediscovered by each consumer.
- `examples/web-chat` loses its hand-rolled conversation and becomes what it should be, a consumer of the package rather than a compensation for it.
- Where a conversation is stored becomes a wiring decision, not a rewrite.

**Negative**

- One more public class and one more port on a package whose standing constraint is "no overhead". The mitigation is scope: the class is roughly the forty lines the demo already proved necessary, the port has one shipped implementer, and neither replaces anything.
- Async reads impose `await` on consumers whose store is in memory and never needs it. Accepted as the cheaper of the two errors.
- `AgentState` and `Conversation` both hold a history, at different lifetimes (one run, one session). The distinction has to stay explicit in the documentation or it will read as duplication.

## Relations

- Complements ADR-AGENT-0003: the value-threaded `AgentState` stays exactly as it is. `Conversation` is what survives *between* runs, and it drives `step` rather than replacing it.
- Complements ADR-AGENT-0016: the `ContextStrategy` port keeps its three members and its meaning. This ADR only tightens `build`'s parameter to `readonly` and fixes what `observe` is given.
- Fixes a gap left by ADR-AGENT-0011: the landing instruction it introduced is written into the history and had no documented lifetime beyond the run.
- Amends the framing in `docs/theory/memory/README.md` with the missing fourth concern; that document is a living reference and is updated alongside this ADR.
- Does **not** decide the V3 memory boundary (transparent `ContextStrategy` versus agentic memory tools). That question stays open, and this ADR is deliberately compatible with either answer.

## Open questions

1. **Is retention actually needed?** A few hundred messages is a few hundred kilobytes. The real trigger is a session running for hours, a paid persistent store, or a UI struggling to render thousands of bubbles. Unlimited by default until one of them is real.
2. **Does a conversation own its context strategy, or share it?** Deliberately unanswered: point 7 keeps it open by injecting rather than constructing.
3. **How does a caller observe a run in progress?** The demo used seven callbacks, and at least half of them are interface concerns rather than package ones. To be settled when the class is built, with the smallest surface that lets a UI render turns as they land.
