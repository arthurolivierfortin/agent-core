// Conventions du dépôt agent-core (issue #1) : documentation et outillage
// vérifiés ici, hors de tests/ qui reste la suite du moteur (TypeScript).
// Ce fichier ne lit aucun fichier .env : seulement les .env.example versionnés.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function readRepoFile(relativePath) {
  return readFileSync(new URL("../" + relativePath, import.meta.url), "utf8");
}

function splitLines(text) {
  return text.split(/\r?\n/);
}

function checkEnvExample(relativePath, expectedNamed) {
  const envLines = splitLines(readRepoFile(relativePath));
  assert.deepEqual(
    envLines.filter((line) => line !== "" && !line.startsWith("#")),
    [],
    `${relativePath} : ligne ni vide ni commentée`,
  );
  assert.deepEqual(
    envLines.filter((line) => line.includes("=")),
    expectedNamed,
    `${relativePath} : lignes avec = inattendues`,
  );
  assert.deepEqual(
    envLines.filter((line) => line.includes("localhost") || line.includes("qwen")),
    [],
    `${relativePath} : valeur par défaut recopiée`,
  );
}

function leadingQuoteBlock(text) {
  const block = [];
  for (const line of splitLines(text)) {
    if (!line.startsWith(">")) break;
    block.push(line);
  }
  return block.join("\n");
}

function sectionAfterHeading(text, heading) {
  const lines = splitLines(text);
  const start = lines.indexOf(heading);
  assert.notEqual(start, -1, `titre absent : ${heading}`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("## "));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}

test("TEST-1 .gitignore versionne docs/specs et docs/plans", () => {
  const gitignore = splitLines(readRepoFile(".gitignore"));
  assert.ok(!gitignore.includes("/docs/specs"), ".gitignore ignore encore /docs/specs");
  assert.ok(!gitignore.includes("/docs/plans"), ".gitignore ignore encore /docs/plans");
  assert.deepEqual(
    gitignore.filter((line) => line.includes("non versionn")),
    [],
    ".gitignore garde un commentaire « non versionné »",
  );
  for (const kept of [".env", ".env.*", "!.env.example", "node_modules/", "dist/"]) {
    assert.ok(gitignore.includes(kept), `.gitignore a perdu la ligne ${kept}`);
  }
});

test("TEST-2 .env.example nomme les variables sans valeur", () => {
  checkEnvExample(".env.example", ["# LLM_PROVIDER=", "# OLLAMA_HOST=", "# OLLAMA_MODEL="]);
});

test("TEST-3 examples/web-chat/.env.example nomme les variables sans valeur", () => {
  checkEnvExample("examples/web-chat/.env.example", ["# VITE_OLLAMA_HOST=", "# VITE_OLLAMA_MODEL="]);
});

test("TEST-4 le guide porte la note d'origine", () => {
  const guide = readRepoFile("docs/guide-agent-package.md");
  assert.ok(splitLines(guide)[0].startsWith("> **Note d'origine"), "guide : première ligne sans note d'origine");
  const note = leadingQuoteBlock(guide);
  for (const expected of ["DEV-xxx", "Jira", "arthurolivierfortin/agent-core", "CONTRIBUTING.md", "dev-kit", "docs/specs/", "docs/plans/"]) {
    assert.ok(note.includes(expected), `guide : note d'origine sans ${expected}`);
  }
  assert.ok(!note.includes("\u2014"), "guide : tiret cadratin dans la note d'origine");
  assert.ok(splitLines(guide).includes("# Claude Code Guidelines for nathan-agent-core"), "guide : titre d'origine disparu");
});

test("TEST-5 le registre des ADR porte la note d'origine", () => {
  const registry = readRepoFile("docs/decisions/README.md");
  assert.ok(splitLines(registry)[0].startsWith("> **Note d'origine"), "registre ADR : première ligne sans note d'origine");
  const note = leadingQuoteBlock(registry);
  for (const expected of ["aucun ADR n'est réécrit", "DEV-xxx", "Jira", "NATHAN-console", "PMC/"]) {
    assert.ok(note.includes(expected), `registre ADR : note d'origine sans ${expected}`);
  }
  assert.ok(!note.includes("\u2014"), "registre ADR : tiret cadratin dans la note d'origine");
  assert.ok(registry.includes("An ADR is immutable once accepted"), "registre ADR : règle d'immuabilité disparue");
});

test("TEST-7 ROADMAP : le cycle se fait avec Marcel", () => {
  const roadmap = readRepoFile("ROADMAP.md");
  assert.ok(splitLines(roadmap).includes("## The cycle with Marcel"), "ROADMAP sans le titre ## The cycle with Marcel");
  for (const expected of ["integration into Marcel (#4)", "Every abstraction added before Marcel consumes the package"]) {
    assert.ok(roadmap.includes(expected), `ROADMAP sans ${expected}`);
  }
  for (const gone of ["PMC/", "TECH-19", "January 2027"]) {
    assert.ok(!roadmap.includes(gone), `ROADMAP contient encore ${gone}`);
  }
  assert.ok(!/\bS7\b/.test(roadmap), "ROADMAP contient encore S7");
});

test("TEST-6 ROADMAP : Marcel est le consommateur de référence", () => {
  const roadmap = readRepoFile("ROADMAP.md");
  const consumer = sectionAfterHeading(roadmap, "## Target consumer");
  for (const expected of ["Marcel", "#4 (milestone H3)", "No overhead. It must stay maintainable."]) {
    assert.ok(consumer.includes(expected), `section Target consumer sans ${expected}`);
  }
  for (const gone of ["NATHAN", "Flux E", "MicroPython", "ADR-0006"]) {
    assert.ok(!roadmap.includes(gone), `ROADMAP contient encore ${gone}`);
  }
});

test("TEST-8 ROADMAP : plus aucune mention de l'IDE", () => {
  const roadmap = readRepoFile("ROADMAP.md");
  assert.ok(!/\bIDE\b/.test(roadmap), "ROADMAP contient encore le mot IDE");
  assert.ok(!roadmap.includes("blind"), "ROADMAP contient encore blind");
  for (const expected of ["when Marcel needs it", "in the consumer (Marcel), never in the package", "after Marcel's integration surfaces"]) {
    assert.ok(roadmap.includes(expected), `ROADMAP sans ${expected}`);
  }
});

test("TEST-9 ROADMAP : renvois aux issues #2 et #3", () => {
  const roadmap = readRepoFile("ROADMAP.md");
  assert.ok(roadmap.includes("PR 6 is tracked by #2 (milestone H1)"), "ROADMAP sans renvoi à #2");
  const tracked = roadmap.indexOf("Tracked by #3 (milestone H2)");
  assert.notEqual(tracked, -1, "ROADMAP sans renvoi à #3");
  const v2 = roadmap.indexOf("## V2: Second provider + evaluation on a real model");
  const v3 = roadmap.indexOf("## V3: Self-feeding memory");
  assert.ok(v2 !== -1 && v3 !== -1, "ROADMAP sans titre V2 ou V3");
  assert.ok(v2 < tracked && tracked < v3, "renvoi à #3 hors de la section V2");
});

test("TEST-10 ROADMAP : titre agent-core, sans renvoi au plan d'origine", () => {
  const roadmap = readRepoFile("ROADMAP.md");
  const lines = splitLines(roadmap);
  assert.equal(lines[0], "# Roadmap: agent-core", "ROADMAP : premier titre");
  assert.ok(!roadmap.includes("nathan-agent-core"), "ROADMAP contient encore nathan-agent-core");
  assert.ok(!roadmap.includes("v1-decoupage-pr"), "ROADMAP contient encore v1-decoupage-pr");
  for (const heading of [
    "## V1: The engine, on Ollama",
    "## V2: Second provider + evaluation on a real model",
    "## V3: Self-feeding memory",
    "## V4: Voice",
  ]) {
    assert.ok(lines.includes(heading), `ROADMAP sans le titre ${heading}`);
  }
});

test("TEST-8 (issue 9) le guide et le README documentent la matrice, ses exports et replayRun", () => {
  const symbols = ["runMatrix", "withMetrics", "RateTable", "summary", "toJSON", "toCSV", "toRunsCSV", "replayRun"].map((s) => `\`${s}\``);
  const guide = readRepoFile("docs/guide-agent-package.md");
  const readme = readRepoFile("README.md");
  const sections = [
    ["guide", sectionAfterHeading(guide, "### Evaluation matrix: runMatrix, report, replay"), [...symbols, "docs/demo/h1-matrix/", "AGENT_CORE_WRITE_DEMO"]],
    ["README", sectionAfterHeading(readme, "## Evaluating agents over a matrix"), [...symbols, "docs/demo/h1-matrix/"]],
  ];
  for (const [name, section, expected] of sections) {
    for (const text of expected) assert.ok(section.includes(text), `${name} : section de la matrice sans ${text}`);
    assert.ok(!section.includes(String.fromCharCode(0x2014)), `${name} : tiret cadratin dans la section de la matrice`);
  }
  for (const file of ["matrix-csv.ts", "replay-run.ts"]) assert.ok(guide.includes(file), `guide : arborescence sans ${file}`);
  assert.ok(!guide.includes("llm/infrastructure/with-metrics.ts"), "guide : ancien emplacement de withMetrics");
  const entry = splitLines(readme).find((line) => line.startsWith("| `./testing` |")) ?? "";
  for (const name of ["runMatrix", "replayRun"]) assert.ok(entry.includes(name), `README : ligne ./testing sans ${name}`);
});

test("TEST-1 (issue 7) CLAUDE.md cite l'intervalle exact des ADR", () => {
  const numbers = readdirSync(new URL("../docs/decisions/", import.meta.url))
    .map((name) => /^ADR-AGENT-(\d{4})-.+\.md$/.exec(name))
    .filter((match) => match !== null)
    .map((match) => Number(match[1]))
    .sort((a, b) => a - b);
  const count = numbers.length;
  assert.ok(count > 0, "docs/decisions/ : aucun fichier ADR-AGENT-NNNN-*.md");
  assert.deepEqual(
    numbers,
    Array.from({ length: count }, (_, index) => index + 1),
    "docs/decisions/ : numéros d'ADR non contigus depuis 0001",
  );
  // Les ADR copiés de NATHAN sont ceux que la note d'origine du registre déclare copiés ;
  // les suivants sont natifs du dépôt (ADR-AGENT-0021 depuis main 85771db).
  const note = splitLines(readRepoFile("docs/decisions/README.md"))[0];
  const copiedMatch = /`ADR-AGENT-0001` à `ADR-AGENT-(\d{4})` sont copiés/.exec(note);
  assert.ok(copiedMatch !== null, "docs/decisions/README.md : note d'origine sans l'intervalle des ADR copiés");
  const copied = Number(copiedMatch[1]);
  assert.ok(copied <= count, "docs/decisions/README.md : plus d'ADR copiés que de fichiers ADR");
  const pad = (n) => String(n).padStart(4, "0");
  const natives =
    count === copied
      ? ""
      : count === copied + 1
        ? `, ${pad(count)} natif du dépôt`
        : `, ${pad(copied + 1)} à ${pad(count)} natifs du dépôt`;
  const claude = readRepoFile("CLAUDE.md");
  assert.equal(claude.split("(ADR-AGENT-0001 à ").length - 1, 1, "CLAUDE.md : « (ADR-AGENT-0001 à » absent ou répété");
  const expected = `(ADR-AGENT-0001 à ${pad(copied)} copiés de NATHAN${natives})`;
  assert.ok(claude.includes(expected), `CLAUDE.md : intervalle des ADR attendu ${expected}`);
});

test("TEST-2 (issue 7) CLAUDE.md ne rapporte les clés DEV-xxx qu'aux ADR", () => {
  const claude = readRepoFile("CLAUDE.md");
  const keyLines = splitLines(claude).filter((line) => line.includes("`DEV-xxx`"));
  assert.equal(keyLines.length, 1, "CLAUDE.md : une et une seule ligne doit citer `DEV-xxx`");
  assert.ok(keyLines[0].includes("citées dans les ADR renvoient"), "CLAUDE.md : les clés DEV-xxx ne sont pas rapportées aux seuls ADR");
  assert.ok(!keyLines[0].includes("ROADMAP"), "CLAUDE.md : les clés DEV-xxx sont encore rapportées au ROADMAP");
  assert.ok(claude.includes("feat/DEV-197-test-harness"), "CLAUDE.md : branche d'origine feat/DEV-197-test-harness disparue");
  const roadmap = readRepoFile("ROADMAP.md");
  assert.ok(!roadmap.includes("DEV-xxx"), "ROADMAP.md contient DEV-xxx");
  assert.ok(!/\bDEV-\d+\b/.test(roadmap), "ROADMAP.md contient une clé DEV-NNN");
  const adrs = readdirSync(new URL("../docs/decisions/", import.meta.url)).filter(
    (name) => name.startsWith("ADR-AGENT-") && name.endsWith(".md"),
  );
  assert.ok(
    adrs.some((name) => /\bDEV-\d+\b/.test(readRepoFile(`docs/decisions/${name}`))),
    "docs/decisions/ : aucun ADR ne cite de clé DEV-NNN, CLAUDE.md ne doit plus les rapporter aux ADR",
  );
});

test("TEST-3 (issue 7) le manifeste déclare la dérogation de langue", () => {
  const lines = splitLines(readRepoFile("CLAUDE.md"));
  const start = lines.indexOf("<!-- core-project");
  const end = lines.indexOf("-->");
  assert.ok(start !== -1 && end > start, "CLAUDE.md : bloc <!-- core-project ... --> introuvable");
  const block = lines.slice(start + 1, end);
  assert.ok(!block.includes("derogations: []"), "CLAUDE.md : le manifeste déclare encore derogations: []");
  const at = block.indexOf("derogations:");
  assert.notEqual(at, -1, "CLAUDE.md : ligne derogations: absente du manifeste");
  assert.equal(block[at + 1], "  - rule: core/langue", "CLAUDE.md : derogations: n'est pas suivi de la règle core/langue");
  const reason = block[at + 2] ?? "";
  assert.ok(reason.startsWith('    reason: "') && reason.endsWith('"'), "CLAUDE.md : la ligne reason n'est pas entre guillemets doubles");
  assert.equal(reason.split('"').length - 1, 2, "CLAUDE.md : guillemet double dans le texte de reason");
  assert.ok(!reason.slice(4).includes("  "), "CLAUDE.md : deux espaces consécutifs dans reason");
  for (const expected of [
    "anglais",
    "français",
    "README.md",
    "ROADMAP.md",
    "docs/guide-agent-package.md",
    "docs/decisions/",
    "docs/plans/2026-07-21-v1-decoupage-pr.md",
    "#7",
  ]) {
    assert.ok(reason.includes(expected), `CLAUDE.md : reason de la dérogation sans ${expected}`);
  }
  assert.equal(block[at + 3], "    revue_le: 2026-12-31", "CLAUDE.md : revue_le de la dérogation absent ou différent");
  for (const gate of [
    "  - id: GATE-1  name: build  cmd: npm run build",
    "  - id: GATE-2  name: typecheck  cmd: npm run typecheck",
    "  - id: GATE-3  name: test  cmd: npm run test",
  ]) {
    assert.ok(block.includes(gate), `CLAUDE.md : gate perdu dans le manifeste : ${gate.trim()}`);
  }
});

test("TEST-4 (issue 7) ROADMAP place withMetrics sous metrics/application/use-cases", () => {
  const roadmap = readRepoFile("ROADMAP.md");
  assert.ok(!roadmap.includes("infrastructure/with-metrics.ts"), "ROADMAP.md : ancien emplacement infrastructure/with-metrics.ts");
  const lines = splitLines(roadmap);
  const llm = lines.indexOf("  llm/");
  const context = lines.indexOf("  context/");
  assert.ok(llm !== -1 && context > llm, "ROADMAP.md : sous-arbres llm/ puis context/ introuvables");
  assert.ok(!lines.slice(llm, context).some((line) => line.includes("with-metrics")), "ROADMAP.md : with-metrics encore sous llm/");
  const metrics = lines.indexOf("  metrics/");
  const voice = lines.findIndex((line, index) => index > metrics && line.startsWith("  voice/"));
  assert.ok(metrics !== -1 && voice !== -1, "ROADMAP.md : sous-arbres metrics/ puis voice/ introuvables");
  assert.ok(
    lines.slice(metrics, voice).some((line) => line.includes("application/use-cases/with-metrics.ts") && line.includes("withMetrics")),
    "ROADMAP.md : withMetrics absent de metrics/application/use-cases/",
  );
  assert.ok(
    existsSync(new URL("../src/metrics/application/use-cases/with-metrics.ts", import.meta.url)),
    "src/metrics/application/use-cases/with-metrics.ts introuvable",
  );
});

// Forme d'une clé d'API Google : aucun fichier versionné n'en porte une.
const GOOGLE_KEY_SHAPE = /AIza[0-9A-Za-z_-]{35}/;

test("TEST-3 (issue 26) le test d'intégration Gemini est ignoré sans GEMINI_INTEGRATION=1", () => {
  const file = "tests/integration/gemini.integration.test.ts";
  // Le fils n'a ni l'opt-in ni la clé : il ne peut pas appeler l'API. NODE_TEST_CONTEXT, posé par
  // le lanceur de node --test, ferait sauter au node --test imbriqué l'exécution de ses fichiers.
  // Les noms se comparent sans casse : sous Windows, process.env les ignore.
  const scrubbed = ["GEMINI_INTEGRATION", "GEMINI_API_KEY", "NODE_TEST_CONTEXT"];
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !scrubbed.includes(name.toUpperCase())));
  const child = spawnSync(process.execPath, ["--test", "--test-reporter=tap", file], {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env,
    encoding: "utf8",
  });
  assert.equal(child.status, 0, `node --test ${file} : code ${child.status}\n${child.stdout}${child.stderr}`);
  assert.ok(
    child.stdout.includes("# SKIP set GEMINI_INTEGRATION=1 with GEMINI_API_KEY in the environment"),
    `${file} n'est pas ignoré par défaut\n${child.stdout}`,
  );
  assert.match(child.stdout, /^# fail 0$/m);
  const source = readRepoFile(file);
  for (const expected of ['process.env.GEMINI_INTEGRATION === "1"', "checkProviderContract"]) {
    assert.ok(source.includes(expected), `${file} sans ${expected}`);
  }
  for (const forbidden of ["console.", "dotenv", "readFileSync", "GEMINI_API_KEY ="]) {
    assert.ok(!source.includes(forbidden), `${file} contient ${forbidden}`);
  }
  assert.doesNotMatch(source, GOOGLE_KEY_SHAPE);
});

// Ce que la section Gemini du README et celle du guide disent toutes deux, mot pour mot.
const GEMINI_DOC_EXPECTED = [
  "`GEMINI_API_KEY`",
  "`apiKeyVar`",
  "`[redacted]`",
  "`GEMINI_MODEL`",
  "`gemini-2.5-flash`",
  "`supportsStreaming()`",
  "`https://generativelanguage.googleapis.com`",
  "Do not pass `/v1beta`: the provider appends it.",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "H7",
  "H8",
  "Launching it is a manual step: no test suite and no agent loop runs it.",
  "`GEMINI_INTEGRATION=1`",
  "`checkProviderContract`",
  "#20",
  'npm run build; if ($LASTEXITCODE -eq 0) { try { $env:GEMINI_INTEGRATION = "1"; node --test tests/integration/gemini.integration.test.ts } finally { Remove-Item Env:GEMINI_INTEGRATION -ErrorAction SilentlyContinue } }',
  "npm run build && GEMINI_INTEGRATION=1 node --test tests/integration/gemini.integration.test.ts",
];

test("TEST-4 (issue 26) le README documente Gemini et corrige ses lignes de surface", () => {
  const readme = readRepoFile("README.md");
  const section = sectionAfterHeading(readme, "## Setting up Gemini");
  for (const text of GEMINI_DOC_EXPECTED) assert.ok(section.includes(text), `README : section Gemini sans ${text}`);
  assert.ok(!section.includes(String.fromCharCode(0x2014)), "README : tiret cadratin dans la section Gemini");
  const lines = splitLines(readme);
  const llmEntry = lines.find((line) => line.startsWith("| `./llm` |")) ?? "";
  assert.ok(llmEntry.includes("GeminiLLMProvider"), "README : ligne ./llm sans GeminiLLMProvider");
  const engine = lines.find((line) => line.startsWith("- **Engine**:")) ?? "";
  for (const name of ["GeminiLLMProvider", "GeminiConfig", "DEFAULT_GEMINI_MODEL"]) {
    assert.ok(engine.includes(name), `README : puce Engine sans ${name}`);
  }
  const llmLayer = sectionAfterHeading(readme, "## Using the LLM layer (`./llm`)");
  for (const text of ["GeminiLLMProvider", "PROVIDERS.gemini()"]) {
    assert.ok(llmLayer.includes(text), `README : section ./llm sans ${text}`);
  }
  const configuration = sectionAfterHeading(readme, "## Configuration");
  for (const text of ["`GEMINI_API_KEY`", "`GEMINI_MODEL`", "`apiKeyVar`", "(#setting-up-gemini)"]) {
    assert.ok(configuration.includes(text), `README : section Configuration sans ${text}`);
  }
  assert.ok(!readme.includes("The variables the LLM layer reads today are"), "README : phrase des variables d'avant Gemini");
  assert.doesNotMatch(readme, GOOGLE_KEY_SHAPE);
});

test("TEST-5 (issue 26) le guide documente Gemini et son test d'intégration", () => {
  const guide = readRepoFile("docs/guide-agent-package.md");
  const section = sectionAfterHeading(guide, "### Gemini provider and its integration test");
  for (const text of [...GEMINI_DOC_EXPECTED, "tests/integration/gemini.integration.test.ts"]) {
    assert.ok(section.includes(text), `guide : sous-section Gemini sans ${text}`);
  }
  assert.ok(!section.includes(String.fromCharCode(0x2014)), "guide : tiret cadratin dans la sous-section Gemini");
  for (const file of ["gemini/gemini-llm-provider.ts", "gemini/gemini-wire.ts"]) {
    assert.ok(guide.includes(file), `guide : arborescence sans ${file}`);
  }
  assert.doesNotMatch(guide, GOOGLE_KEY_SHAPE);
});
