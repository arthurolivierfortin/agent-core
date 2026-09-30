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
  assert.ok(!note.includes("—"), "guide : tiret cadratin dans la note d'origine");
  assert.ok(splitLines(guide).includes("# Claude Code Guidelines for nathan-agent-core"), "guide : titre d'origine disparu");
});
