// Entry point of the H2 report (#33): the only module of scripts/h2-report/ that reads process.*.
// Run it after npm run build: node scripts/h2-report/cli.ts --cap-usd <USD> --dry-run (documented by #42).
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runReport } from "./run-report.ts";

// The repository root comes from this file, never from process.cwd(): --out resolves the same anywhere.
process.exitCode = await runReport({
  argv: process.argv.slice(2),
  env: process.env,
  ratesText: readFileSync(new URL("../../data/rates.json", import.meta.url), "utf8"),
  repo: dirname(dirname(dirname(fileURLToPath(import.meta.url)))),
  home: homedir(),
  stdout: process.stdout,
  stderr: process.stderr,
});
