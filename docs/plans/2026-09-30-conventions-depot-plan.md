# Plan · mettre la copie aux conventions du dépôt · #1

- Issue : #1 (T:chore) https://github.com/arthurolivierfortin/agent-core/issues/1
- Checklist : `docs/specs/2026-09-30-conventions-depot-checklist.md`
- Spécification : `docs/specs/2026-09-30-conventions-depot-design.md`
- Estimation : `docs/plans/2026-09-30-conventions-depot-estimate.json`
- Branche : `chore/1-conventions-depot`, base `main` (`publication_branch` du manifeste). Elle existe déjà :
  c'est la branche du worktree `C:/Projects/Perso/agent-core/.claude/worktrees/chore+1-conventions-depot`,
  au niveau de `origin/main` (constaté le 2026-09-30 : `git log --oneline origin/main..HEAD` vide).
- Toutes les commandes se lancent depuis la racine de ce worktree (répertoire courant de la
  session), chacune par son propre appel Bash, en avant-plan, `timeout` 600000 ms pour une
  installation, un test ou un gate, 120000 ms sinon.
- Fichiers de travail : `<dossier_tmp>/agent-core-issue1-commit-msg.txt` (message de commit, réécrit
  à chaque tâche, relu par l'outil Read avant réécriture) et
  `<dossier_tmp>/agent-core-issue1-pr-body.md` (corps de PR). Jamais `%TEMP%` ni `/tmp`.

## Ordre des tâches et dépendances

| Tâche | Élément | Dépend de | Pourquoi cet ordre |
|---|---|---|---|
| 0 | préparation (dépendances, référence de la suite) | aucune | le worktree n'a pas de `node_modules/` (constaté) |
| 1 | SPEC-1 + TEST-1 | 0 | crée le fichier de test ; rend `docs/specs/` et `docs/plans/` suivables, donc la checklist commitable |
| 2 | SPEC-2 + TEST-2 | 1 | fichier de test existant |
| 3 | SPEC-3 + TEST-3 | 2 | réutilise `checkEnvExample` de la tâche 2 |
| 4 | SPEC-4 + TEST-4 | 1 | |
| 5 | SPEC-5 + TEST-5 | 4 | réutilise `leadingQuoteBlock` de la tâche 4 |
| 6 | **SPEC-7** + TEST-7 | 1 | avant SPEC-6 : `Flux E` figure aussi l.192 (paragraphe « Point of vigilance », retiré par SPEC-7) ; sans cela TEST-6 resterait rouge après SPEC-6 |
| 7 | **SPEC-6** + TEST-6 | 6 | TEST-6 exige l'absence de `Flux E` dans tout `ROADMAP.md` |
| 8 | SPEC-8 + TEST-8 | 6, 7 | TEST-8 exige l'absence de `IDE` et `blind` dans tout le fichier : l.11 (SPEC-6) et l.182, 187, 192 (SPEC-7) doivent déjà être traitées |
| 9 | SPEC-9 + TEST-9 | 1 | indépendante des autres textes du ROADMAP |
| 10 | SPEC-10 + TEST-10 | 1 | indépendante |
| 11 | gates GATE-1 à GATE-3 et contrôles de PR | 1 à 10 | |

Vérifications faites par le researcher (sorties fraîches du 2026-09-30) :

- **`npm run test` découvre `scripts/*.test.mjs` sans changer `package.json`.** `node --version` :
  `v22.19.0`. Motif par défaut du lanceur de tests, lu dans Node lui-même
  (`node --expose-internals -e "...require('internal/test_runner/utils').kDefaultPattern"`) :
  `**/{test,test/**/*,test-*,*[._-]test}.{js,mjs,cjs,ts,mts,cts}` ; `repo-conventions.test.mjs`
  correspond à `*[._-]test.mjs`. Le script `test` (`npm run build && node --test`) n'a aucun
  motif, donc GATE-3 l'exécute. `tsconfig.json` n'inclut que `src` et `tests` : GATE-2 ne le voit pas.
- **`docs/specs` et `docs/plans` sont ignorés aujourd'hui.** `git check-ignore -v` :
  `.gitignore:13:/docs/specs` pour la checklist, `.gitignore:17:/docs/plans` pour l'estimation.
  `git ls-files docs/specs docs/plans` : vide ; `git log --all -- docs/plans docs/specs` : vide.
- **`docs/plans/2026-07-21-v1-decoupage-pr.md` n'est suivi nulle part.** Il n'existe que dans le
  checkout principal `C:/Projects/Perso/agent-core/docs/plans/`, non suivi et ignoré
  (`.gitignore:17:/docs/plans`), absent du worktree et de tout commit. Voir « Risques ».
- Le code de test complet (annexe A) a été exécuté par le researcher dans un arbre de sonde
  (supprimé depuis) : les 10 cas sont rouges sur l'état actuel avec les messages cités tâche par
  tâche, et verts (`# pass 10`, `# fail 0`) après application des remplacements exacts de ce plan,
  dont chacun a été vérifié présent **une seule fois** dans le fichier réel.
- Fins de ligne : copies de travail en CRLF (`core.autocrlf=true`, index en LF,
  `git ls-files --eol`). Le test découpe par `/\r?\n/` et tolère les deux.

Aucun fichier `.env` n'est lu par ce plan ni par le test ; seuls les deux `.env.example`.

---

## Tâche 0 · préparation

1. `git branch --show-current` → sortie attendue : `chore/1-conventions-depot`.
2. `git log --oneline origin/main..HEAD` → sortie attendue : vide.
3. `npm ci` (timeout 600000) → sortie attendue : le script `prepare` s'exécute
   (`> tsc -p tsconfig.build.json`), puis `added 3 packages` (`@types/node`, `typescript`,
   `undici-types`, les trois entrées de `package-lock.json`), code de sortie 0.
4. `npm run test` (timeout 600000) → sortie attendue : fin TAP avec `# fail 0` et `# skipped 1`
   (le seul test ignoré est `tests/integration/ollama.integration.test.ts`, opt-in par
   `OLLAMA_INTEGRATION=1`, variable à ne pas poser). **Noter la valeur de `# tests` : c'est la
   référence B** ; après la tâche 10, GATE-3 doit montrer `# tests` = B + 10.

Aucun commit dans cette tâche.

---

## Tâche 1 · SPEC-1 · `.gitignore` versionne `docs/specs/` et `docs/plans/`

### 1.1 Écrire TEST-1 (crée le fichier)

Créer `scripts/repo-conventions.test.mjs` (outil Write) avec exactement :

```js
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
```

### 1.2 Observer l'échec

`node --test scripts/repo-conventions.test.mjs` → sortie attendue (extraits) :

```
not ok 1 - TEST-1 .gitignore versionne docs/specs et docs/plans
  error: '.gitignore ignore encore /docs/specs'
# tests 1
# pass 0
# fail 1
```

Bonne raison : la ligne `/docs/specs` est présente (l.13).

### 1.3 Implémenter

Dans `.gitignore`, outil Edit, remplacer ce bloc (l.12 à l.18, lignes vides comprises) :

```
# spec de travail, non versionnée (décision de l'équipe)
/docs/specs

# plans de travail, non versionnés : documents locaux (comme les specs) ;
# ce qui doit survivre vit dans les ADRs et le code
/docs/plans

```

par rien (chaîne vide). Le fichier obtenu, en entier :

```
node_modules/
dist/
*.tgz

.env
.env.*
!.env.example

# réglages locaux à la machine, pas au projet
.claude/settings.local.json

# scratch local : lecture des tâches JIRA via le package (contient un .env copié)
_jira-scratch/

# artefacts de session laissés par un pilotage navigateur (Playwright MCP)
.playwright-mcp/
```

### 1.4 Observer le succès

`node --test scripts/repo-conventions.test.mjs` → sortie attendue :

```
ok 1 - TEST-1 .gitignore versionne docs/specs et docs/plans
# tests 1
# pass 1
# fail 0
```

### 1.5 Ajouter au suivi les fichiers de l'issue

1. `git status --short --untracked-files=all` → sortie attendue, exactement :

   ```
    M .gitignore
   ?? docs/plans/2026-09-30-conventions-depot-estimate.json
   ?? docs/plans/2026-09-30-conventions-depot-plan.md
   ?? docs/specs/2026-09-30-conventions-depot-checklist.md
   ?? docs/specs/2026-09-30-conventions-depot-design.md
   ?? scripts/repo-conventions.test.mjs
   ```

   Un autre fichier sous `docs/` dont le nom commence par `2026-09-30-conventions-depot` (par exemple
   un plan `-plan-v2.md`) est de cette issue : il s'ajoute aussi. Tout autre fichier non suivi n'est
   pas ajouté (hypothèse H5).
2. Cocher dans la checklist `- [x] [SPEC-1]` et `- [x] [TEST-1]` (outil Edit).
3. `git add .gitignore scripts/repo-conventions.test.mjs docs/specs/2026-09-30-conventions-depot-design.md docs/specs/2026-09-30-conventions-depot-checklist.md docs/plans/2026-09-30-conventions-depot-estimate.json docs/plans/2026-09-30-conventions-depot-plan.md`
   → sortie attendue : vide, ou seulement des avertissements `LF will be replaced by CRLF`.

### 1.6 Commit

Écrire `<dossier_tmp>/agent-core-issue1-commit-msg.txt` :

```
chore(gitignore): versionner docs/specs et docs/plans

La boucle dev-kit commite checklist, plan et estimation : l'ignore
hérité de NATHAN empêchait de suivre la checklist de cette issue.

Refs: #1
Session: <session>
Model: <modele>
Authorship: ai
```

`<session>` et `<modele>` : valeurs littérales du prompt de dispatch du builder.
Puis `git commit -F <dossier_tmp>/agent-core-issue1-commit-msg.txt` → sortie attendue :
`[chore/1-conventions-depot <sha>] chore(gitignore): versionner docs/specs et docs/plans`,
`6 files changed`.

---

## Tâche 2 · SPEC-2 · `.env.example` sans valeur

### 2.1 Écrire TEST-2

Dans `scripts/repo-conventions.test.mjs`, outil Edit : insérer la fonction suivante juste après la
fonction `splitLines` (avant le premier `test(`) :

```js
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
```

et ajouter à la fin du fichier :

```js

test("TEST-2 .env.example nomme les variables sans valeur", () => {
  checkEnvExample(".env.example", ["# LLM_PROVIDER=", "# OLLAMA_HOST=", "# OLLAMA_MODEL="]);
});
```

### 2.2 Observer l'échec

`node --test scripts/repo-conventions.test.mjs` → sortie attendue (extraits) :

```
ok 1 - TEST-1 .gitignore versionne docs/specs et docs/plans
not ok 2 - TEST-2 .env.example nomme les variables sans valeur
  error: |-
    .env.example : ligne ni vide ni commentée
# tests 2
# pass 1
# fail 1
```

Bonne raison : `LLM_PROVIDER=ollama`, `OLLAMA_HOST=...`, `OLLAMA_MODEL=...` sont des lignes actives.

### 2.3 Implémenter

Réécrire `.env.example` (outil Write ; lire le fichier d'abord, il n'est pas un `.env`) avec exactement :

```
# Copy to `.env` (never commit it). The APPLICATION loads this file;
# the library only reads process.env (CLAUDE.md, packaging).
# Every variable is optional: uncomment it and give it a value only to
# override its default, documented in README.md (Setting up Ollama, Configuration).

# Active LLM provider: must match a key of the PROVIDERS union.
# LLM_PROVIDER=

# Ollama: local, free, no key.
# OLLAMA_HOST=
# OLLAMA_MODEL=
```

(`README.md` a bien les sections `## Setting up Ollama` l.299 et `## Configuration` l.318.)

### 2.4 Observer le succès

`node --test scripts/repo-conventions.test.mjs` → `# tests 2`, `# pass 2`, `# fail 0`.

### 2.5 Commit

Cocher `[SPEC-2]` et `[TEST-2]`. `git add .env.example scripts/repo-conventions.test.mjs docs/specs/2026-09-30-conventions-depot-checklist.md`.
Message (même fichier de travail, relu puis réécrit) :

```
chore(env): nommer les variables de .env.example sans valeur

Forme commentée : une variable vide chargée depuis .env vaudrait "",
que le repli ?? du code ne remplace pas.

Refs: #1
Session: <session>
Model: <modele>
Authorship: ai
```

`git commit -F <dossier_tmp>/agent-core-issue1-commit-msg.txt` → `3 files changed`.

---

## Tâche 3 · SPEC-3 · `examples/web-chat/.env.example` sans valeur

### 3.1 Écrire TEST-3

Ajouter à la fin de `scripts/repo-conventions.test.mjs` :

```js

test("TEST-3 examples/web-chat/.env.example nomme les variables sans valeur", () => {
  checkEnvExample("examples/web-chat/.env.example", ["# VITE_OLLAMA_HOST=", "# VITE_OLLAMA_MODEL="]);
});
```

### 3.2 Observer l'échec

`node --test scripts/repo-conventions.test.mjs` → extraits attendus :

```
not ok 3 - TEST-3 examples/web-chat/.env.example nomme les variables sans valeur
  error: |-
    examples/web-chat/.env.example : ligne ni vide ni commentée
# tests 3
# pass 2
# fail 1
```

### 3.3 Implémenter

Réécrire `examples/web-chat/.env.example` (outil Write, après lecture) avec exactement :

```
# Copy to .env to target a different server or model. Read at `vite` startup
# (restart the dev server after changing it). Every variable is optional:
# uncomment it and give it a value only to override its default, documented
# in examples/web-chat/README.md (Configuration table).

# VITE_OLLAMA_HOST=
# VITE_OLLAMA_MODEL=
```

(`examples/web-chat/README.md` a la section `## Configuration` l.86, tableau l.93 et l.94.)

### 3.4 Observer le succès

`node --test scripts/repo-conventions.test.mjs` → `# tests 3`, `# pass 3`, `# fail 0`.

### 3.5 Commit

Cocher `[SPEC-3]` et `[TEST-3]`. `git add examples/web-chat/.env.example scripts/repo-conventions.test.mjs docs/specs/2026-09-30-conventions-depot-checklist.md`.

```
chore(web-chat): nommer les variables du .env.example sans valeur

Refs: #1
Session: <session>
Model: <modele>
Authorship: ai
```

`git commit -F <dossier_tmp>/agent-core-issue1-commit-msg.txt` → `3 files changed`.

---

## Tâche 4 · SPEC-4 · note d'origine du guide

### 4.1 Écrire TEST-4

Dans `scripts/repo-conventions.test.mjs`, insérer juste après la fonction `checkEnvExample` :

```js
function leadingQuoteBlock(text) {
  const block = [];
  for (const line of splitLines(text)) {
    if (!line.startsWith(">")) break;
    block.push(line);
  }
  return block.join("\n");
}
```

et ajouter à la fin du fichier :

```js

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
```

### 4.2 Observer l'échec

`node --test scripts/repo-conventions.test.mjs` → extraits attendus :

```
not ok 4 - TEST-4 le guide porte la note d'origine
  error: "guide : première ligne sans note d'origine"
# tests 4
# pass 3
# fail 1
```

### 4.3 Implémenter

Dans `docs/guide-agent-package.md`, outil Edit : remplacer la ligne 1
`# Claude Code Guidelines for nathan-agent-core` (unique dans le fichier) par ces lignes, suivies
d'une ligne vide puis de la même ligne de titre :

```
> **Note d'origine (agent-core).** Ce guide est copié tel quel, le 2026-09-29, du package d'agents de NATHAN (`A-World-Felt/NATHAN-agent-package`). Les clés `DEV-xxx` qu'il cite renvoient au suivi Jira de ce projet d'origine ; ici, le suivi se fait en issues GitHub de `arthurolivierfortin/agent-core`.
>
> Les renvois à `PMC/`, `NATHAN-console` et `CONTRIBUTING.md` visent des dépôts ou des fichiers du projet d'origine, absents de ce dépôt.
>
> Les conventions de branches, de commits et de PR sont celles de dev-kit (voir `CLAUDE.md`), et non la section « Branch and commit conventions » plus bas. Les dossiers `docs/specs/` et `docs/plans/` sont versionnés, contrairement à ce qu'indique le tableau « Where to find the why ».

# Claude Code Guidelines for nathan-agent-core
```

Apostrophes droites (U+0027) partout, en particulier dans `Note d'origine` ; aucun tiret cadratin
(U+2014) ni demi-cadratin. Le reste du fichier est inchangé.

### 4.4 Observer le succès

`node --test scripts/repo-conventions.test.mjs` → `# tests 4`, `# pass 4`, `# fail 0`.

### 4.5 Commit

Cocher `[SPEC-4]` et `[TEST-4]`. `git add docs/guide-agent-package.md scripts/repo-conventions.test.mjs docs/specs/2026-09-30-conventions-depot-checklist.md`.

```
docs(guide): ajouter la note d'origine en tête du guide

Refs: #1
Session: <session>
Model: <modele>
Authorship: ai
```

`git commit -F <dossier_tmp>/agent-core-issue1-commit-msg.txt` → `3 files changed`.

---

## Tâche 5 · SPEC-5 · note d'origine du registre des ADR

### 5.1 Écrire TEST-5

Ajouter à la fin de `scripts/repo-conventions.test.mjs` :

```js

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
```

### 5.2 Observer l'échec

`node --test scripts/repo-conventions.test.mjs` → extraits attendus :

```
not ok 5 - TEST-5 le registre des ADR porte la note d'origine
  error: "registre ADR : première ligne sans note d'origine"
# tests 5
# pass 4
# fail 1
```

### 5.3 Implémenter

Dans `docs/decisions/README.md`, outil Edit : remplacer la ligne 1
`# Architecture decisions: nathan-agent-core` (unique) par :

```
> **Note d'origine (agent-core).** Les ADR `ADR-AGENT-0001` à `ADR-AGENT-0020` sont copiés du package d'agents de NATHAN (`A-World-Felt/NATHAN-agent-package`) le 2026-09-29, et aucun ADR n'est réécrit. Les clés `DEV-xxx` qu'ils citent renvoient au suivi Jira de ce projet d'origine.
>
> `NATHAN-console`, `PMC/` et les ADR de projet `ADR-0001` à `ADR-0007` sont des dépôts et des documents du projet d'origine, absents de ce dépôt.
>
> Une décision revue ici prend un nouvel ADR, selon la règle d'immuabilité écrite ci-dessous.

# Architecture decisions: nathan-agent-core
```

Apostrophes droites ; aucun tiret cadratin. **Aucun fichier `docs/decisions/ADR-AGENT-*.md` n'est
ouvert en écriture.**

### 5.4 Observer le succès

`node --test scripts/repo-conventions.test.mjs` → `# tests 5`, `# pass 5`, `# fail 0`.
Puis `git status --short docs/decisions` → sortie attendue, exactement : ` M docs/decisions/README.md`.

### 5.5 Commit

Cocher `[SPEC-5]` et `[TEST-5]`. `git add docs/decisions/README.md scripts/repo-conventions.test.mjs docs/specs/2026-09-30-conventions-depot-checklist.md`.

```
docs(adr): ajouter la note d'origine au registre des ADR

Note commune dans le README : les ADR restent immuables, aucun
fichier ADR-AGENT-* n'est modifié.

Refs: #1
Session: <session>
Model: <modele>
Authorship: ai
```

`git commit -F <dossier_tmp>/agent-core-issue1-commit-msg.txt` → `3 files changed`.

---

## Tâche 6 · SPEC-7 · ROADMAP, section du cycle (avant SPEC-6, voir l'ordre)

### 6.1 Écrire TEST-7

Ajouter à la fin de `scripts/repo-conventions.test.mjs` :

```js

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
```

### 6.2 Observer l'échec

`node --test scripts/repo-conventions.test.mjs` → extraits attendus :

```
not ok 6 - TEST-7 ROADMAP : le cycle se fait avec Marcel
  error: 'ROADMAP sans le titre ## The cycle with Marcel'
# tests 6
# pass 5
# fail 1
```

### 6.3 Implémenter

Quatre remplacements dans `ROADMAP.md`, outil Edit, chaque ancienne chaîne étant unique :

a. `## The cycle with the IDE repo` → `## The cycle with Marcel`

b. Le schéma (l.187 à l.189). Ancien :

```
V1 shipped → integration into the IDE repo → harness on the real features
   ↑                                                     │
   └──────── we come back to improve the package ←──── a wall appears
```

Nouveau (le texte raccourcit d'un caractère : 52 espaces entre `↑` et `│` au lieu de 53, et
`←───` avec trois `─` au lieu de quatre, pour que `│` reste au-dessus du `w` de `wall`) :

```
V1 shipped → integration into Marcel (#4) → harness on the real features
   ↑                                                    │
   └──────── we come back to improve the package ←─── a wall appears
```

c. Supprimer le paragraphe l.192 et la ligne vide qui le suit ; ancienne chaîne (une ligne, puis
une ligne vide), remplacée par rien :

```
**Point of vigilance.** According to `PMC/CONTEXT-AGENT.md`, the IDE stack is decided at `TECH-19` in early S7 (January 2027) and Flux E starts at that point. The package will therefore be "finished" several months before its consumer exists.

```

d. `Every abstraction added before then is a bet with no feedback` →
`Every abstraction added before Marcel consumes the package is a bet with no feedback`

La section obtenue :

```
## The cycle with Marcel

The real engine that improves the package is not this roadmap, it is the confrontation with a real consumer:

```
(bloc de schéma du point b)

```
Practical consequence: **keep V1 truly minimal.** Every abstraction added before Marcel consumes the package is a bet with no feedback, and that is exactly how you build the wrong abstraction.
```

### 6.4 Observer le succès

1. `node --test scripts/repo-conventions.test.mjs` → `# tests 6`, `# pass 6`, `# fail 0`.
2. `grep -c "^   ↑ \{52\}│" ROADMAP.md` → `1`.
3. `grep -c "←─── a wall appears" ROADMAP.md` → `1`.

### 6.5 Commit

Cocher `[SPEC-7]` et `[TEST-7]`. `git add ROADMAP.md scripts/repo-conventions.test.mjs docs/specs/2026-09-30-conventions-depot-checklist.md`.

```
docs(roadmap): faire de Marcel le consommateur du cycle de retour

Retire le point de vigilance lié au calendrier universitaire (PMC,
TECH-19, S7).

Refs: #1
Session: <session>
Model: <modele>
Authorship: ai
```

`git commit -F <dossier_tmp>/agent-core-issue1-commit-msg.txt` → `3 files changed`.

---

## Tâche 7 · SPEC-6 · ROADMAP, consommateur de référence

### 7.1 Écrire TEST-6

Dans `scripts/repo-conventions.test.mjs`, insérer juste après la fonction `leadingQuoteBlock` :

```js
function sectionAfterHeading(text, heading) {
  const lines = splitLines(text);
  const start = lines.indexOf(heading);
  assert.notEqual(start, -1, `titre absent : ${heading}`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("## "));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}
```

et ajouter à la fin du fichier :

```js

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
```

### 7.2 Observer l'échec

`node --test scripts/repo-conventions.test.mjs` → extraits attendus :

```
not ok 7 - TEST-6 ROADMAP : Marcel est le consommateur de référence
  error: 'section Target consumer sans Marcel'
# tests 7
# pass 6
# fail 1
```

### 7.3 Implémenter

Dans `ROADMAP.md`, outil Edit, remplacer la ligne 11 entière :

```
The package first serves **NATHAN's accessible IDE** (project ADR-0006, Flux E): a voice assistant for blind people, able to **navigate the application and write in it**. The agent translates dictation into MicroPython.
```

par :

```
The reference consumer is **Marcel**: its agent block (milestone J8) imports this package, and its first consumption, J8.1, is tracked by #4 (milestone H3).
```

Les lignes suivantes (« Permanent constraint, stated by the team: », `> **No overhead. It must stay maintainable.**`, « It is the criterion... ») restent inchangées.

### 7.4 Observer le succès

`node --test scripts/repo-conventions.test.mjs` → `# tests 7`, `# pass 7`, `# fail 0`.

### 7.5 Commit

Cocher `[SPEC-6]` et `[TEST-6]`. `git add ROADMAP.md scripts/repo-conventions.test.mjs docs/specs/2026-09-30-conventions-depot-checklist.md`.

```
docs(roadmap): faire de Marcel le consommateur de référence

Refs: #1
Session: <session>
Model: <modele>
Authorship: ai
```

`git commit -F <dossier_tmp>/agent-core-issue1-commit-msg.txt` → `3 files changed`.

---

## Tâche 8 · SPEC-8 · ROADMAP, autres mentions de l'IDE

### 8.1 Écrire TEST-8

Ajouter à la fin de `scripts/repo-conventions.test.mjs` :

```js

test("TEST-8 ROADMAP : plus aucune mention de l'IDE", () => {
  const roadmap = readRepoFile("ROADMAP.md");
  assert.ok(!/\bIDE\b/.test(roadmap), "ROADMAP contient encore le mot IDE");
  assert.ok(!roadmap.includes("blind"), "ROADMAP contient encore blind");
  for (const expected of ["when Marcel needs it", "in the consumer (Marcel), never in the package", "after Marcel's integration surfaces"]) {
    assert.ok(roadmap.includes(expected), `ROADMAP sans ${expected}`);
  }
});
```

### 8.2 Observer l'échec

`node --test scripts/repo-conventions.test.mjs` → extraits attendus :

```
not ok 8 - TEST-8 ROADMAP : plus aucune mention de l'IDE
  error: 'ROADMAP contient encore le mot IDE'
# tests 8
# pass 7
# fail 1
```

Bonne raison : `IDE` subsiste l.57, l.212, l.215, l.216 et `blind` l.90.

### 8.3 Implémenter

Cinq remplacements dans `ROADMAP.md`, outil Edit, anciennes chaînes uniques :

a. `**Then**: integration into the IDE repo, and back here when a wall appears.` →
   `**Then**: integration into Marcel (#4), and back here when a wall appears.`

b. Supprimer la ligne l.90 et la ligne vide qui la suit ; ancienne chaîne (une ligne puis une
   ligne vide), remplacée par rien :

   ```
   Accessibility stake: for a blind person dictating their code, an agent that remembers their habits avoids re-explaining everything at each session.

   ```

c. `when the IDE repo needs it; `step()` makes it cheap` → `when Marcel needs it; `step()` makes it cheap`
   (ligne de tableau « User approval before writing »).

d. `| in the IDE repo, never in the package |` → `| in the consumer (Marcel), never in the package |`

e. `after IDE integration surfaces the real shape needed` → `after Marcel's integration surfaces the real shape needed`

### 8.4 Observer le succès

`node --test scripts/repo-conventions.test.mjs` → `# tests 8`, `# pass 8`, `# fail 0`.

### 8.5 Commit

Cocher `[SPEC-8]` et `[TEST-8]`. `git add ROADMAP.md scripts/repo-conventions.test.mjs docs/specs/2026-09-30-conventions-depot-checklist.md`.

```
docs(roadmap): retirer les dernières mentions de l'IDE

Refs: #1
Session: <session>
Model: <modele>
Authorship: ai
```

`git commit -F <dossier_tmp>/agent-core-issue1-commit-msg.txt` → `3 files changed`.

---

## Tâche 9 · SPEC-9 · ROADMAP, renvois aux issues #2 et #3

### 9.1 Écrire TEST-9

Ajouter à la fin de `scripts/repo-conventions.test.mjs` :

```js

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
```

### 9.2 Observer l'échec

`node --test scripts/repo-conventions.test.mjs` → extraits attendus (TAP échappe `#` en `\#` dans
le nom) :

```
not ok 9 - TEST-9 ROADMAP : renvois aux issues \#2 et \#3
  error: 'ROADMAP sans renvoi à #2'
# tests 9
# pass 8
# fail 1
```

### 9.3 Implémenter

Deux insertions dans `ROADMAP.md`, outil Edit :

a. Ancienne chaîne (dernière ligne du tableau « Breakdown into six PRs ») :

   ```
   | **6** | `runMatrix` + metrics + `toJSON`/`toCSV` | a 2 × 2 × 5 matrix → 20 runs, one rate per combination, a readable CSV |
   ```

   Nouvelle : la même ligne, puis une ligne vide, puis :

   ```
   PRs 1 to 5 were delivered in the origin project before the copy of 2026-09-29; PR 6 is tracked by #2 (milestone H1).
   ```

   La ligne vide existante et « Three ordering points that are not arbitrary: » suivent inchangées.

b. Ancienne chaîne (dernière puce de `## V2`) :

   ```
   - Real evaluations: real model, simulated tools, matrix across several axes
   ```

   Nouvelle : la même ligne, puis une ligne vide, puis :

   ```
   Tracked by #3 (milestone H2): the Gemini provider, the one Marcel uses, and a first real comparison report.
   ```

   La ligne vide existante et le bloc `> ### ⚠️ Correction: ...` suivent inchangés.

### 9.4 Observer le succès

`node --test scripts/repo-conventions.test.mjs` → `# tests 9`, `# pass 9`, `# fail 0`.

### 9.5 Commit

Cocher `[SPEC-9]` et `[TEST-9]`. `git add ROADMAP.md scripts/repo-conventions.test.mjs docs/specs/2026-09-30-conventions-depot-checklist.md`.

```
docs(roadmap): renvoyer aux issues #2 et #3

Refs: #1
Session: <session>
Model: <modele>
Authorship: ai
```

`git commit -F <dossier_tmp>/agent-core-issue1-commit-msg.txt` → `3 files changed`.

---

## Tâche 10 · SPEC-10 · ROADMAP, titre et renvois locaux de l'origine

### 10.1 Écrire TEST-10

Ajouter à la fin de `scripts/repo-conventions.test.mjs` :

```js

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
```

### 10.2 Observer l'échec

`node --test scripts/repo-conventions.test.mjs` → extraits attendus :

```
not ok 10 - TEST-10 ROADMAP : titre agent-core, sans renvoi au plan d'origine
  error: |-
    ROADMAP : premier titre
# tests 10
# pass 9
# fail 1
```

### 10.3 Implémenter

Trois remplacements dans `ROADMAP.md`, outil Edit :

a. `# Roadmap: nathan-agent-core` → `# Roadmap: agent-core`

b. `The reasoning behind each choice is in `docs/decisions/`. The V1 PR breakdown is in `docs/plans/2026-07-21-v1-decoupage-pr.md`.`
   → `The reasoning behind each choice is in `docs/decisions/`.`

c. `Each PR depends only on the previous ones, and **each PR verifies itself**. Full detail, pitfalls included: `docs/plans/2026-07-21-v1-decoupage-pr.md`.`
   → `Each PR depends only on the previous ones, and **each PR verifies itself**.`

### 10.4 Observer le succès

`node --test scripts/repo-conventions.test.mjs` → sortie attendue :

```
ok 1 - TEST-1 .gitignore versionne docs/specs et docs/plans
ok 2 - TEST-2 .env.example nomme les variables sans valeur
ok 3 - TEST-3 examples/web-chat/.env.example nomme les variables sans valeur
ok 4 - TEST-4 le guide porte la note d'origine
ok 5 - TEST-5 le registre des ADR porte la note d'origine
ok 6 - TEST-7 ROADMAP : le cycle se fait avec Marcel
ok 7 - TEST-6 ROADMAP : Marcel est le consommateur de référence
ok 8 - TEST-8 ROADMAP : plus aucune mention de l'IDE
ok 9 - TEST-9 ROADMAP : renvois aux issues \#2 et \#3
ok 10 - TEST-10 ROADMAP : titre agent-core, sans renvoi au plan d'origine
# tests 10
# pass 10
# fail 0
```

Le fichier doit alors être identique à l'annexe A.

### 10.5 Commit

Cocher `[SPEC-10]` et `[TEST-10]`. `git add ROADMAP.md scripts/repo-conventions.test.mjs docs/specs/2026-09-30-conventions-depot-checklist.md`.

```
docs(roadmap): renommer en agent-core et retirer le plan d'origine

Le plan docs/plans/2026-07-21-v1-decoupage-pr.md n'existe pas dans ce
dépôt.

Refs: #1
Session: <session>
Model: <modele>
Authorship: ai
```

`git commit -F <dossier_tmp>/agent-core-issue1-commit-msg.txt` → `3 files changed`.

---

## Tâche 11 · gates et contrôles de PR

Chaque gate par son propre appel, `timeout` 600000, dans cet ordre :

| Gate | Commande | Sortie attendue |
|---|---|---|
| GATE-1 build | `npm run build` | `> tsc -p tsconfig.build.json`, code 0, aucune erreur (aucun fichier sous `src/` touché) |
| GATE-2 typecheck | `npm run typecheck` | `> tsc --noEmit`, code 0 (`scripts/` hors de `include`) |
| GATE-3 test | `npm run test` | fin TAP : `# tests` = B + 10 (B relevé à la tâche 0), `# fail 0`, `# skipped 1` ; la sortie contient les dix lignes `ok ... - TEST-...` de la tâche 10.4 |

Cocher `[GATE-1]`, `[GATE-2]`, `[GATE-3]` dans la checklist, puis
`git add docs/specs/2026-09-30-conventions-depot-checklist.md` et commit
`chore(checklist): cocher les gates` (mêmes trailers) : sortie attendue `1 file changed`.

Contrôles à recopier tels quels dans le corps de PR (`<dossier_tmp>/agent-core-issue1-pr-body.md`),
chaque commande par son propre appel :

1. `git diff --name-only origin/main...HEAD -- src tests` → sortie attendue : vide.
2. `git diff --name-only origin/main...HEAD -- "docs/decisions/ADR-AGENT-*"` → sortie attendue : vide.
3. `git diff --name-only origin/main...HEAD` → sortie attendue, exactement ces 11 chemins (ordre de git) :

   ```
   .env.example
   .gitignore
   ROADMAP.md
   docs/decisions/README.md
   docs/guide-agent-package.md
   docs/plans/2026-09-30-conventions-depot-estimate.json
   docs/plans/2026-09-30-conventions-depot-plan.md
   docs/specs/2026-09-30-conventions-depot-checklist.md
   docs/specs/2026-09-30-conventions-depot-design.md
   examples/web-chat/.env.example
   scripts/repo-conventions.test.mjs
   ```

4. SPEC-11 (barré, hors PR) : `gh issue list -R arthurolivierfortin/agent-core --state all --json number,milestone --jq ".[] | [.number, .milestone.title] | @tsv"`
   → sortie recopiée telle quelle (le cockpit a constaté les jalons H1 à H3 sur #1 à #4).
5. Déclarer dans le corps de PR : aucun fichier `.env` ouvert ni lu, seulement les deux `.env.example`.
6. SPEC-12 (barré, hors PR) : **pas pour le builder**. La note KB est déposée après l'ouverture de
   la PR par la session `/dev-loop` (`kb_note.py --project agent-core`, texte dans la spécification).

---

## Hypothèses (à recopier dans la PR)

- **H1** · `.gitignore` : les deux lignes vides qui séparaient les blocs retirés (l.14 et l.18)
  partent avec eux, pour ne pas laisser trois lignes vides consécutives ; toutes les lignes non
  vides restantes sont identiques. Réversible, non testé.
- **H2** · Ordre d'exécution SPEC-7 avant SPEC-6, puis SPEC-8 : `Flux E` figure l.11 et l.192, `IDE`
  et `blind` sur des lignes des trois SPEC ; c'est le seul ordre où chaque TEST-N est rouge avant
  son SPEC et vert juste après. Les numéros de la checklist ne changent pas.
- **H3** · Types de commit : `chore` pour SPEC-1 à SPEC-3 (outillage), `docs` pour SPEC-4 à
  SPEC-10 (documentation), dans la branche `chore/1-conventions-depot` (`conventions/commits.md`
  admet un type de commit différent de celui de la branche).
- **H4** · Rédaction des deux notes d'origine (SPEC-4, SPEC-5) : texte choisi par ce plan dans le
  cadre fixé par la spécification ; titre en gras `Note d'origine (agent-core).`.
- **H5** · Seuls les fichiers dont le nom commence par `2026-09-30-conventions-depot` sont ajoutés
  au suivi sous `docs/specs/` et `docs/plans/` ; aucun autre fichier non suivi n'est ajouté.

## Risques

- Le checkout principal `C:/Projects/Perso/agent-core/` contient
  `docs/plans/2026-07-21-v1-decoupage-pr.md`, non suivi et jusqu'ici ignoré. Après le merge de
  SPEC-1, il apparaîtra en `??` dans ce checkout : un `git add -A` le commiterait. Décision du
  pilote (versionner, déplacer ou supprimer), hors de cette PR.
- Le worktree n'a pas de `node_modules/` : sans la tâche 0 (`npm ci`), aucun gate ne tourne
  (`tsc` introuvable).
- Copies de travail en CRLF : l'outil Write écrit en LF ; git peut avertir
  (`LF will be replaced by CRLF`), sans effet sur le contenu commité (index en LF).
- `node --test` sans motif exécute tout `*.test.mjs` du dépôt hors `node_modules/` : un fichier de
  ce nom déposé ailleurs (par exemple sous `docs/plans/`) entrerait dans GATE-3.

---

## Annexe A · `scripts/repo-conventions.test.mjs` dans son état final (après la tâche 10)

```js
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
```
