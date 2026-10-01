import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import type { SpawnSyncReturns } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

// Entry point of the H2 report (#33): docs/specs/2026-09-30-h2-report-runner-design.md.
// cli.ts runs in a child process, never imported: importing it would launch it. Without --cap-usd the
// arguments are refused first, before the rates, the key and any provider: no network can be reached.

// Timeout of the cli.ts child processes, as in scripts/repo-conventions.test.mjs (#31): a blocked
// child fails its test instead of freezing the suite (#53).
const CHILD_TIMEOUT_MS = 60_000;

function assertNotTimedOut(child: SpawnSyncReturns<string>, command: string): void {
  const code = (child.error as NodeJS.ErrnoException | undefined)?.code;
  const timedOut = code === "ETIMEDOUT" || child.signal === "SIGTERM";
  assert.ok(
    !timedOut,
    `${command}: the child process exceeded the ${CHILD_TIMEOUT_MS} ms timeout and was stopped (error ${code}, signal ${child.signal})\n${child.stdout}${child.stderr}`,
  );
}

test("TEST-7 (issue 33) cli.ts without arguments exits 1 on --cap-usd is required, stdout empty", () => {
  const child = spawnSync(process.execPath, ["scripts/h2-report/cli.ts"], {
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    encoding: "utf8",
    timeout: CHILD_TIMEOUT_MS,
  });
  assertNotTimedOut(child, "node scripts/h2-report/cli.ts");
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
    const child = spawnSync(process.execPath, [cli, "--cap-usd", "1", "--dry-run"], { cwd: tmpdir(), env: childEnv, encoding: "utf8", timeout: CHILD_TIMEOUT_MS });
    assertNotTimedOut(child, "node scripts/h2-report/cli.ts --cap-usd 1 --dry-run");
    assert.ok(!child.stderr.includes("ENOENT"), child.stderr);
    assert.ok(!(child.stdout + child.stderr).includes(SENTINEL), "the sentinel key was written");
    assert.equal(child.stderr.includes("environment variable GEMINI_API_KEY is unset or empty"), unset, child.stderr);
  }
});
