import { test } from "node:test";
import assert from "node:assert/strict";
import { defineAgent } from "../../../dist/agent/index.js";
import type { AgentDeps } from "../../../dist/agent/index.js";
import { fakeApp, defineScenario, runScenario } from "../../../dist/agent/testing/index.js";
import { HeuristicTokenCounter, SlidingWindowStrategy } from "../../../dist/context/index.js";
import type { ContextStrategy } from "../../../dist/context/index.js";
import type { LLMResponse } from "../../../dist/llm/index.js";
import { FakeLLMProvider } from "../../../dist/testing/index.js";

function wideContext(): ContextStrategy {
  return new SlidingWindowStrategy({ maxTokens: 100_000, counter: new HeuristicTokenCounter() });
}

function textResponse(content: string): LLMResponse {
  return { content, toolCalls: [] };
}

function callResponse(id: string, name: string, args: Record<string, unknown>): LLMResponse {
  return { content: "", toolCalls: [{ id, name, arguments: args }] };
}

function depsFor(responses: LLMResponse[]): Omit<AgentDeps, "tools"> {
  return {
    agent: defineAgent({
      name: "navigateur",
      prompt: "Tu aides une personne a naviguer dans l'application.",
      tools: [],
    }),
    llm: new FakeLLMProvider({ responses }),
    context: wideContext(),
  };
}

function naviguerVersReglages() {
  return defineScenario({
    name: "aller aux reglages",
    env: () => fakeApp({ pages: ["accueil", "reglages", "profil"], current: "accueil" }),
    input: "amene-moi aux reglages",
    expect: {
      toolsUsed: ["navigate"],
      finalState: (state) => state.current === "reglages",
      stopReason: "completed",
    },
  });
}

test("a passing scenario reports success and the simulator's final state", async () => {
  const scenario = naviguerVersReglages();
  const deps = depsFor([
    callResponse("call-1", "navigate", { page: "reglages" }),
    textResponse("tu y es"),
  ]);

  const result = await runScenario(scenario, deps);

  assert.equal(result.passed, true);
  assert.deepEqual(result.failures, []);
  assert.equal(result.finalState.current, "reglages");
  assert.equal(result.stopReason, "completed");
  assert.equal(result.toolCalls.length, 1);
});

test("a scenario whose tool was never called fails with a named reason, not a thrown error", async () => {
  const scenario = naviguerVersReglages();
  const deps = depsFor([textResponse("je ne sais pas naviguer")]);

  const result = await runScenario(scenario, deps);

  assert.equal(result.passed, false);
  assert.equal(result.finalState.current, "accueil");
  assert.equal(result.failures.some((failure) => failure.includes("navigate")), true);
});

test("toolsUsed tolerates an extra call and does not require a strict order", async () => {
  const scenario = naviguerVersReglages();
  const deps = depsFor([
    callResponse("call-1", "getCurrentPage", {}),
    callResponse("call-2", "navigate", { page: "reglages" }),
    textResponse("tu y es"),
  ]);

  const result = await runScenario(scenario, deps);

  assert.equal(result.passed, true);
  assert.equal(result.toolCalls.length, 2);
});

test("a stopReason mismatch is reported as its own failure", async () => {
  const scenario = defineScenario({
    name: "stopReason attendu incorrect",
    env: () => fakeApp({ pages: ["accueil", "reglages"], current: "accueil" }),
    input: "amene-moi aux reglages",
    expect: { stopReason: "budget" },
  });
  const deps = depsFor([
    callResponse("call-1", "navigate", { page: "reglages" }),
    textResponse("tu y es"),
  ]);

  const result = await runScenario(scenario, deps);

  assert.equal(result.passed, false);
  assert.equal(result.failures.some((failure) => failure.includes("stopReason")), true);
});
