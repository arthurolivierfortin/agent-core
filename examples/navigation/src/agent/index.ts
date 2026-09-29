/**
 * PACKAGE SIDE, the barrel: the demo's whole surface onto
 * `@a-world-felt/nathan-agent-core`.
 *
 * `main.ts` imports from here and from nowhere else in this folder, so the boundary is one import
 * statement wide.
 */
export { BUDGET, createAgent, LANDING_INSTRUCTION, PROMPT, type AgentWiring } from "./create-agent.ts";
export { describeMissingModel, driveTheLoop, type OnIteration } from "./drive-loop.ts";
