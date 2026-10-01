import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
