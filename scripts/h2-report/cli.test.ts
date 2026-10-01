import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

// Entry point of the H2 report (#33): docs/specs/2026-09-30-h2-report-runner-design.md.
// cli.ts runs in a child process, never imported: importing it would launch it. Without --cap-usd the
// arguments are refused first, before the rates, the key and any provider: no network can be reached.

test("TEST-7 (issue 33) cli.ts without arguments exits 1 on --cap-usd is required, stdout empty", () => {
  const child = spawnSync(process.execPath, ["scripts/h2-report/cli.ts"], {
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    encoding: "utf8",
  });
  assert.equal(child.status, 1, child.stderr);
  assert.ok(child.stderr.includes("--cap-usd is required"), child.stderr);
  assert.equal(child.stdout, "");
});

// TEST-8 (#42) launches cli.ts by its absolute path from another folder, always with --dry-run: whatever
// data/rates.json holds, no provider is built and no network reached. The key is a sentinel, never a real one.
const SENTINEL = "sentinel-value-not-a-key";

test("TEST-8 (issue 42) cli.ts reads the rates under its own root and passes process.env, from any folder", () => {
  const cli = fileURLToPath(new URL("./cli.ts", import.meta.url));
  // Names compared without case: under Windows, process.env ignores it.
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => name.toUpperCase() !== "GEMINI_API_KEY"));
  const launches: Array<[NodeJS.ProcessEnv, boolean]> = [[env, true], [{ ...env, GEMINI_API_KEY: SENTINEL }, false]];
  for (const [childEnv, unset] of launches) {
    const child = spawnSync(process.execPath, [cli, "--cap-usd", "1", "--dry-run"], { cwd: tmpdir(), env: childEnv, encoding: "utf8" });
    assert.ok(!child.stderr.includes("ENOENT"), child.stderr);
    assert.ok(!(child.stdout + child.stderr).includes(SENTINEL), "the sentinel key was written");
    assert.equal(child.stderr.includes("environment variable GEMINI_API_KEY is unset or empty"), unset, child.stderr);
  }
});
