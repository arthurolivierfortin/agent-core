// Entry point of the H2 report (#33, #42): the only module of scripts/h2-report/ that reads process.*.
// Run it after npm run build: node scripts/h2-report/cli.ts --cap-usd <USD> [--dry-run]; see docs/rapport-h2.md.
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runReport } from "./run-report.ts";

// The repository root comes from this file, never from process.cwd(): the rates and --out resolve the same anywhere.
const repo = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
process.exitCode = await runReport({
  argv: process.argv.slice(2),
  env: process.env,
  ratesText: readFileSync(join(repo, "data", "rates.json"), "utf8"),
  repo,
  home: homedir(),
  stdout: process.stdout,
  stderr: process.stderr,
});
