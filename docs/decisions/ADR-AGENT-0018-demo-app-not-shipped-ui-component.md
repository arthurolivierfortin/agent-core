# ADR-AGENT-0018: A demo app in `examples/`, not a shipped UI component

- **Status**: ✅ Accepted
- **Date**: 2026-08-03
- **Deciders**: Arthur-Olivier Fortin
- **Scope**: `@a-world-felt/nathan-agent-core`

## Context

Two needs surfaced while working on the navigation demo: a fast local loop to try
package changes without re-importing them into a consumer app each time, and a
visual artifact to show the package working, beyond `examples/navigation`'s CLI
trace.

Two ideas were considered before this one:

1. Build the chat UI directly inside `NATHAN-IDE` (the real consumer repo),
   pointing its dependency at this package via a `file:` link for fast local
   iteration.
2. Ship a reusable, restylable UI component as a new package entry point
   (e.g. `./ui`), consumable by any React-based frontend, including
   `NATHAN-IDE`.

Both were rejected; a third option, a plain demo web app inside `examples/`,
was retained. This ADR is about the **demo/interaction UI**, not the harness's
evaluation reports: `ROADMAP.md`'s "Web interface for reports, in the IDE
repo, never in the package" is a separate, unrelated commitment about
visualizing `runMatrix` output, not about showing the agent loop run.

Constraints already in force:

- `ROADMAP.md`: "keep V1 truly minimal. Every abstraction added before then
  is a bet with no feedback." The package is expected to be finished months
  before its consumer exists: the IDE stack decision (`DEV-107`) is not due
  before January 2027 (S7), per `PMC/CONTEXT-AGENT.md`.
- `ADR-AGENT-0002` / `ADR-AGENT-0012`: a new `exports` subpath is a public-API
  commitment (barrel-contract tests, the "no overhead" discipline).
- The package stays provider- and consumer-agnostic: "the consumer repo
  chooses its provider and brings its own tools" (`CLAUDE.md`).
- Jira already scopes this need as its own ticket, `DEV-205` ("Banc d'essai:
  importer le package dans l'IDE et définir par des tests les fonctionnalités
  attendues de l'agent"), under the AI-library epic (`DEV-172`), deliberately
  independent from the IDE-stack epic (`DEV-68` / `DEV-107`).

## Options considered

**A: Chat UI built directly in `NATHAN-IDE`, package consumed via a `file:`
link.**
Fastest to wire, mirrors `examples/navigation`'s own `file:../..` pattern.
Rejected: it makes this package's iteration loop depend on a second,
separately-versioned repo whose own stack is undecided (`DEV-107`), and
reintroduces exactly the coupling the two repos are meant to avoid: the
package should not know the IDE. It also front-loads the IDE integration the
`ROADMAP` explicitly times for after V1 ships.

**B: A shipped, restylable UI component (new `./ui` entry point).**
Would let any consumer, `NATHAN-IDE` or third parties, drop in a ready-made
chat panel and restyle it, or ignore it and drive the engine directly.
Rejected for now: it commits to a UI framework (React) and a styling contract
before any real consumer has exercised the engine, which is precisely the
"abstraction added before feedback" the `ROADMAP` warns against. It also adds
a new versioned public surface (barrel-contract coverage, an `exports`
branch, a framework peer dependency) for a shape nobody has validated yet.

**C: A plain demo web app inside `examples/`, consuming the engine's existing
`.` entry point directly, no new export.**
No new public API, no framework commitment beyond the example itself, same
footprint as `examples/navigation` (an application that consumes the
package, not code the package ships). Answers both stated needs: a fast
local loop (same repo, `file:../..` already the established pattern for
examples) and a visual artifact to show the package working.

## Decision

**Option C.** A demo web app lives in `examples/`, calling `AgenticLLM` the
way any consumer would. It ships no reusable component and adds no `exports`
branch.

Option B is not rejected outright, only deferred: see `ROADMAP.md`,
"Deferred with no date". The IDE integration (`ROADMAP.md`, "The cycle with
the IDE repo") is the intended trigger: only a real consumer can say whether
a shipped component's shape earns its keep.

Option A stays rejected regardless of timing: whenever `NATHAN-IDE` consumes
this package, it does so as a normal registry install, the same as any
external consumer, never via a local file link committed to either repo's
workflow.

## Consequences

**Positive**

- No new public surface, no new framework peer dependency, no new
  barrel-contract coverage: zero cost to the "no overhead" constraint.
- The demo stays disposable and rewritable: since nothing outside
  `examples/` depends on its shape, changing frameworks or dropping it later
  costs nothing.
- Keeps the package/IDE boundary exactly where `CLAUDE.md` already draws it.

**Negative**

- Consumers who want a ready-made chat UI, `NATHAN-IDE` eventually or third
  parties, get nothing off the shelf yet; they build their own. `NATHAN-IDE`
  would likely have had to anyway, given accessibility requirements (ARIA,
  keyboard navigation, TTS/STT) that probably exceed what a generic
  default-styled component would offer.
- If a shipped component does get built later, the demo app in `examples/`
  may be partly rewritten to consume it, since today it is written against
  the raw engine.

**Boundaries this sets**

- A new `exports` subpath for a UI layer requires a demonstrated need from
  actual IDE integration, not an anticipated one. Mirrors the precedent in
  `ADR-AGENT-0012`: "`./context`, `./metrics` later only if a real need
  appears (YAGNI)".
- `NATHAN-IDE`, or any consumer, never depends on this package via
  `file:`/local path outside of this package's own `examples/`.
