// Conventions du dépôt agent-core (issue #1) : documentation et outillage
// vérifiés ici, hors de tests/ qui reste la suite du moteur (TypeScript).
// Ce fichier ne lit aucun fichier .env : seulement les .env.example versionnés.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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
