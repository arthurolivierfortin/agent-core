import { test } from "node:test";
import assert from "node:assert/strict";
import { defineScenario } from "../../../dist/agent/testing/index.js";

function noopEnv() {
  return { state: { visited: false }, tools: [] };
}

test("a scenario carries the name, env, input and expectations it was given", () => {
  const finalState = (state: { visited: boolean }) => state.visited;

  const scenario = defineScenario({
    name: "aller aux reglages",
    env: noopEnv,
    input: "amene-moi aux reglages",
    expect: { toolsUsed: ["navigate"], finalState, stopReason: "completed" },
  });

  assert.equal(scenario.name, "aller aux reglages");
  assert.equal(scenario.env, noopEnv);
  assert.equal(scenario.input, "amene-moi aux reglages");
  assert.deepEqual(scenario.expect.toolsUsed, ["navigate"]);
  assert.equal(scenario.expect.finalState, finalState);
  assert.equal(scenario.expect.stopReason, "completed");
});

test("a scenario cannot be mutated after it is declared", () => {
  const scenario = defineScenario({ name: "test", env: noopEnv, input: "bonjour", expect: {} });

  const rename = () => {
    Object.assign(scenario, { name: "autre" });
  };

  assert.throws(rename, TypeError);
  assert.equal(scenario.name, "test");
});

test("later edits to the object passed in do not reach the scenario", () => {
  const source = { name: "test", env: noopEnv, input: "v1", expect: {} };

  const scenario = defineScenario(source);
  source.input = "v2";

  assert.equal(scenario.input, "v1");
});
