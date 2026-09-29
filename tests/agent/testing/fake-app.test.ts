import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeApp } from "../../../dist/agent/testing/index.js";

test("navigate moves state.current to a known page", async () => {
  const app = fakeApp({ pages: ["accueil", "reglages", "profil"], current: "accueil" });
  const [navigate] = app.tools;

  const outcome = await navigate.execute({ page: "reglages" });

  assert.equal(outcome.isError, false);
  assert.equal(app.state.current, "reglages");
});

test("navigate to an unknown page returns an error outcome and leaves the state unchanged", async () => {
  const app = fakeApp({ pages: ["accueil", "reglages"], current: "accueil" });
  const [navigate] = app.tools;

  const outcome = await navigate.execute({ page: "profil" });

  assert.equal(outcome.isError, true);
  assert.equal(app.state.current, "accueil");
});

test("getCurrentPage reflects the state after a navigation", async () => {
  const app = fakeApp({ pages: ["accueil", "reglages"], current: "accueil" });
  const [navigate, getCurrentPage] = app.tools;

  await navigate.execute({ page: "reglages" });
  const outcome = await getCurrentPage.execute({});

  assert.equal(outcome.content, "reglages");
});

test("fakeApp is a factory: two calls produce independent state", async () => {
  const first = fakeApp({ pages: ["accueil", "reglages"], current: "accueil" });
  const second = fakeApp({ pages: ["accueil", "reglages"], current: "accueil" });
  const [firstNavigate] = first.tools;

  await firstNavigate.execute({ page: "reglages" });

  assert.equal(first.state.current, "reglages");
  assert.equal(second.state.current, "accueil");
});

test("the simulator exposes exactly navigate and getCurrentPage", () => {
  const app = fakeApp({ pages: ["accueil"], current: "accueil" });
  assert.deepEqual(app.tools.map((tool) => tool.name).sort(), ["getCurrentPage", "navigate"]);
});
