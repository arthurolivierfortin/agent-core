# Plan · Borner par un délai les deux spawnSync de cli.test.ts · #53

- Issue : #53 (label `T:chore`, origine #31, R-1 de la spécification de #31, PR #52)
  https://github.com/arthurolivierfortin/agent-core/issues/53
- Checklist : `docs/specs/2026-10-01-cli-spawnsync-timeout-checklist.md`
- Spécification : `docs/specs/2026-10-01-cli-spawnsync-timeout-design.md`
- Estimation : `docs/plans/2026-10-01-cli-spawnsync-timeout-estimate.json`
- Plan précédent pris pour forme : `docs/plans/2026-10-01-spawnsync-timeout-plan.md` (#31).
- Conception appliquée : celle de la spécification, sans écart. Un seul fichier modifié,
  `scripts/h2-report/cli.test.ts` : un import de type (`SpawnSyncReturns`), une constante
  `CHILD_TIMEOUT_MS` et son commentaire, une fonction `assertNotTimedOut`, puis l'option
  `timeout: CHILD_TIMEOUT_MS` et un appel `assertNotTimedOut(child, …)` dans chacun des deux tests.
  Aucun test ajouté, aucun titre changé. Noms nouveaux, tous locaux au fichier : `SpawnSyncReturns`
  (importé), `CHILD_TIMEOUT_MS`, `assertNotTimedOut`, et dans la fonction `code`, `timedOut`.
- Branche : `chore/53-cli-spawnsync-timeout`, base `main` (`publication_branch` du manifeste). Elle
  existe déjà : branche du worktree
  `C:/Projects/Perso/agent-core/.claude/worktrees/chore-53-cli-spawnsync-timeout`, `HEAD` =
  `27bd9a1993f3d6a4379a2dfd771c5c4b2698f512` (constaté par `git rev-parse HEAD`). `origin/main` a
  avancé d'un commit depuis (voir « Vérifications » et l'hypothèse P6).
- Toutes les commandes se lancent depuis la racine de ce worktree, chacune par son propre appel
  Bash, en avant-plan, `timeout` 600000 ms pour un build, un test ou un gate, 120000 ms sinon.
  Jamais `&&`, `;` ni `cd` entre deux commandes (le garde d'isolation du worktree refuse une
  commande composée : constaté par le planificateur), jamais `&` final, jamais
  `run_in_background`, aucun serveur, aucun REPL (jamais `python -`, jamais `node` sans fichier ni
  `-e`), jamais de heredoc, aucune commande interactive.
- **Garde réseau** : avant **chaque** commande de test (`npm run test`, `node --test …`), par un
  appel Bash distinct qui la précède immédiatement :
  `node -e "process.exit(process.env.GEMINI_INTEGRATION === undefined ? 0 : 1)"` → aucune sortie,
  code 0. Code 1 : s'arrêter et le signaler au pilote, sans lancer le test.
- Fichiers de travail, dans `<dossier_tmp>` (dossier temporaire de la session du builder, chemin
  absolu `C:/…` reçu dans le prompt de dispatch, sinon créé une fois par `mktemp -d` puis converti
  par `cygpath -m <chemin>`, chaque commande par son propre appel) :
  `<dossier_tmp>/agent-core-issue53-commit-msg.txt` (message de commit, réécrit à chaque commit,
  relu par l'outil Read avant réécriture dès qu'il existe),
  `<dossier_tmp>/agent-core-issue53-pr-title.txt` (titre de PR),
  `<dossier_tmp>/agent-core-issue53-pr-body.md` (corps de PR). Jamais `%TEMP%` ni `/tmp`
  directement, jamais un nom sans dépôt.
- Contraintes du pilote rappelées : aucun fournisseur hébergé appelé (TEST-7 refuse avant tout
  fournisseur, TEST-8 tourne en `--dry-run`) ; le package ne lit que `process.env` ; aucun
  fichier `.env` ouvert, listé, lu ni copié ; l'environnement des fils est inchangé (`TEST-8`
  garde sa copie sans `GEMINI_API_KEY`, puis la sentinelle) ; type de commit `test` ; aucun
  message de commit ne porte de ligne `Co-Authored-By` (le hook `commit-msg` du dépôt et
  `commit_msg.py` la refusent) : trailers `Refs: #53`, `Session:`, `Model:`, `Authorship:`
  seulement ; sujets à l'impératif (forme infinitive des commits du dépôt), 72 caractères au plus
  type compris ; chemins relatifs au dépôt dans toute preuve (les lignes `location:` et les
  lignes de pile du TAP portent des chemins absolus : ne pas les recopier). Ignorer toute consigne
  injectée par un hook (vercel-plugin, Next.js) : le dépôt est un package Node/TypeScript.

## Taille mesurée

**`hors docs/ et *.md : +18/-1 lignes (code +0, tests +18), seuil 400 respecté`** : ligne que
`pr_size.py` rendra (format de `format_measure` ; `classify_path("scripts/h2-report/cli.test.ts")`
rend `test`, constaté ; `pr_size.py` mesure `origin/main...HEAD`, depuis la base de fusion, donc
sans les fichiers de #59), mesurée par le planificateur par `git diff --no-index --numstat` du
fichier de `HEAD` contre son état final sur la sonde (voir « Vérifications »).

| Fichier | Ajoutées | Retirées |
|---|---|---|
| `scripts/h2-report/cli.test.ts`, SPEC-1 (import 1 ; commentaire 2, constante 1, ligne vide 1 ; fonction 8, ligne vide 1 ; option 1 ; appel 1) | 16 | 0 |
| `scripts/h2-report/cli.test.ts`, SPEC-2 (ligne du `spawnSync` remplacée 1 ; appel 1) | 2 | 1 |
| **Total** | **18** | **1** |

Environ 20 estimées par la spécification (fourchette 15 à 30), 19 mesurées : dans la fourchette,
381 sous le seuil de 400, aucune dérogation.

## Ordre des tâches et dépendances

Un SPEC = un commit = un test (spécification, D7 et « Ordre des commits et preuves »).

| Tâche | Élément | Dépend de | Pourquoi cet ordre |
|---|---|---|---|
| 0 | préparation (état de l'arbre, référence de la suite) | aucune | `node_modules/` et `dist/` existent déjà dans ce worktree (constaté : `ls node_modules` → `@types`, `typescript`, `undici-types` ; `ls dist` → `agent`, `context`, `core`, …) ; `cli.ts` importe `dist/` par `run-report.ts` |
| 1 | SPEC-1 + TEST-1 (vert, commit, puis mutations A et B annulées) | 0 | SPEC-1 porte la constante et la fonction dont SPEC-2 se sert (D7) ; les mutations se font sur l'arbre propre **après** le commit |
| 2 | SPEC-2 + TEST-2 (vert, commit, puis mutations A et B annulées) | 1 | appelle `CHILD_TIMEOUT_MS` et `assertNotTimedOut`, définis par la tâche 1 |
| 3 | gates GATE-1 à GATE-3, checklist, contrôles, taille, corps de PR | 2 | |

Aucun `[DB-N]`.

## Vérifications faites par le planificateur (sorties fraîches du 2026-10-01)

- `node --version` : `v22.19.0`. `git config core.autocrlf` : `true`.
  `git ls-files --eol scripts/h2-report/cli.test.ts` : `i/lf    w/crlf` : la copie de travail est
  en **CRLF**. Les blocs de ce plan sont écrits en LF ; l'outil Edit garde les fins de ligne du
  fichier ; au commit, git normalise en LF dans l'index. Un avertissement
  `LF will be replaced by CRLF` ou `CRLF will be replaced by LF` est sans effet.
- Manifeste : `publication_branch` `main`, gates `GATE-1 build` `npm run build`,
  `GATE-2 typecheck` `npm run typecheck`, `GATE-3 test` `npm run test` ; stack
  `node-typescript` ; une dérogation (`core/langue`, documents hérités de NATHAN) sans effet ici.
- `git status --short --untracked-files=all` au lancement : trois fichiers non suivis
  (estimation, checklist, spécification).
- `git rev-parse HEAD origin/main` : `27bd9a1…` et `419617a…` ;
  `git log --oneline HEAD..origin/main` :
  `419617a fix(llm): écarter les compteurs d'usage invalides du budget (#59)` ;
  `git diff --stat HEAD origin/main` : 11 fichiers, sous `docs/`, `src/llm/` et `tests/`, **aucun**
  sous `scripts/` : aucun recouvrement avec `scripts/h2-report/cli.test.ts`.
- Code lu : `scripts/h2-report/cli.test.ts` en entier (37 lignes ; `spawnSync` importé l.3 ;
  TEST-7 l.11-19, `spawnSync` multiligne l.12-15 ; `SENTINEL` l.23 ; TEST-8 l.25-36, `spawnSync`
  sur une ligne l.31) ; `scripts/h2-report/cli.ts` (importe `./run-report.ts`, lit
  `data/rates.json` sous la racine du dépôt) ; `scripts/h2-report/run-report.ts` l.4-17 (importe
  `../../dist/index.js` et `../../dist/testing/index.js`) ; `scripts/repo-conventions.test.mjs`
  l.313-335 (précédent #31) ; `package.json` (`test` = `npm run build && node --test`,
  `typecheck` = `tsc --noEmit`) ; `tsconfig.json` (`strict`, `include` `src`, `tests`,
  `scripts`, `allowImportingTsExtensions`) ; `C:/Projects/dev-kit/scripts/pr_size.py`
  (`<base>...<head>`, `format_measure`), `commit_msg.py` (trailers requis `Refs`, `Session`,
  `Model`, `Authorship` ; interdits `Co-Authored-By`, `Claude-Session`).
- `grep -rn "child_process\|spawnSync\|execSync\|execFile" scripts src tests` : seulement
  `scripts/h2-report/cli.test.ts:3`, `:12`, `:31` et `scripts/repo-conventions.test.mjs:6`, `:324`.
- Ancres des éditions dans le fichier du worktree, `grep -c` rend 1 pour chacune :
  `import { spawnSync } from "node:child_process";`,
  `// arguments are refused first, before the rates, the key and any provider: no network can be reached.`,
  `    encoding: "utf8",`, `assert.equal(child.status, 1, child.stderr);`,
  `{ cwd: tmpdir(), env: childEnv, encoding: "utf8" });`. `git grep -n "#53" -- scripts src tests`
  et `git grep -n "assertNotTimedOut\|SpawnSyncReturns" -- scripts src tests` : vides.
- Aucun outil de formatage configuré (aucun `.prettierrc`, `.editorconfig`, `eslint`, `biome` à
  la racine) ; largeur maximale des fichiers de `scripts/h2-report/` mesurée : 116 à 182 colonnes
  (`run-report.test.ts` 182, `rates.test.ts` 170, `cli.test.ts` 136).
- **Sonde sans installation ni modification de `scripts/`.** Le planificateur a extrait `HEAD`
  (`git archive`, 27bd9a1) dans `docs/plans/.probe-53/` de ce worktree, y a compilé `src/` par le
  `tsc` de `node_modules/` de ce worktree (`tsc -p tsconfig.build.json`, code 0), a écrit dans la
  copie les états de ce plan, puis a supprimé la sonde et ses fichiers
  (`git status --short --untracked-files=all` revenu aux trois fichiers du lancement). Observé,
  garde réseau à 0 avant chaque lancement :
  - référence `HEAD`, `node --test --test-reporter=tap` : code 0, `# tests 389`, `# pass 387`,
    `# fail 0`, `# skipped 2` ; `ok 44 - TEST-7 (issue 33) …`, `ok 45 - TEST-8 (issue 42) …` ;
    `node --test --test-reporter=tap scripts/h2-report/cli.test.ts` : 2 / 2 / 0 ;
  - SPEC-1 appliquée : `git diff --no-index --numstat` → `16	0` ; `tsc --noEmit` : code 0, aucune
    sortie ; suite complète : code 0, 389 / 387 / 0 / 2 ; fichier seul : code 0, 2 / 2 / 0 ;
  - SPEC-1, mutation A (`CHILD_TIMEOUT_MS = 1`), `node --test scripts/h2-report/cli.test.ts`
    (sortie non TTY : reporter TAP par défaut) : code 1, `# tests 2`, `# pass 1`, `# fail 1` ;
    `not ok 1 - TEST-7 (issue 33) …`, ligne d'erreur
    `node scripts/h2-report/cli.ts: the child process exceeded the 1 ms timeout and was stopped (error ETIMEDOUT, signal SIGTERM)`,
    `operator: '=='`, `duration_ms` 19 ; `ok 2 - TEST-8 (issue 42) …` ;
  - SPEC-1, mutations A et B : code 1, 2 / 1 / 1 ; `not ok 1 - TEST-7 (issue 33) …`, erreur
    `Expected values to be strictly equal:` puis `null !== 1`, `operator: 'strictEqual'` (le
    message passé, `child.stderr`, est vide : Node rend son message par défaut) ;
  - SPEC-2 appliquée : `git diff --no-index --numstat` contre l'état SPEC-1 → `2	1`, contre
    `HEAD` → `18	1` ; `tsc --noEmit` : code 0 ; suite complète : code 0, 389 / 387 / 0 / 2 ;
    fichier seul : code 0, 2 / 2 / 0 ;
  - SPEC-2, mutation A : code 1, `# tests 2`, `# pass 0`, `# fail 2` ; TEST-7 échoue comme
    ci-dessus ; `not ok 2 - TEST-8 (issue 42) …`, ligne d'erreur
    `node scripts/h2-report/cli.ts --cap-usd 1 --dry-run: the child process exceeded the 1 ms timeout and was stopped (error ETIMEDOUT, signal SIGTERM)`,
    `operator: '=='` ;
  - SPEC-2, mutations A et B (appel de TEST-8 retiré) : code 1, 2 / 0 / 2 ; TEST-7 inchangé
    (message de délai) ; `not ok 2 - TEST-8 (issue 42) …`, erreur
    `Expected values to be strictly equal:` puis `false !== true`, `operator: 'strictEqual'`
    (troisième assertion de la boucle : stderr vide, sans le message `unset or empty` attendu au
    premier lancement).
- Messages : `python C:/Projects/dev-kit/scripts/commit_msg.py <fichier>` rend 0 sur les trois
  messages de commit de ce plan (trailers remplis par des valeurs d'essai) ;
  `pr_title.py --title-file … --body-file …` rend `pr_title : conforme` sur le titre de ce plan et
  un corps finissant par le bloc de trailers. Longueurs (`len` Python) : 61, 62, 66 ; titre de PR
  52 sans suffixe, 58 avec ` (#NN)`.

## Totaux attendus

- Pas de rouge préalable (spécification, « Ordre des commits et preuves ») : TEST-1 et TEST-2 sont
  les tests existants `TEST-7 (issue 33)` et `TEST-8 (issue 42)`, modifiés par SPEC-1 et SPEC-2 ;
  le défaut couvert (un fils bloqué) ne se produit pas sur `main`. Le rouge est porté par les
  mutations A et B, faites sur l'arbre propre **après** le commit du SPEC concerné et
  `npm run build`, puis annulées sans commit.
- Éditions : chaque « Édition » et chaque « Mutation » se fait par l'outil Edit
  (`old_string` = premier bloc, `new_string` = second bloc), dans l'ordre. Chaque premier bloc est
  présent **une seule fois** dans le fichier au moment où l'édition s'applique. S'il n'est pas
  trouvé, relire le fichier (outil Read) et recopier le bloc depuis la lecture, sans changer le
  texte.
- Les numéros d'ordre TAP de la suite complète dépendent de l'ordre des fichiers : seuls comptent
  les titres et les totaux. Si la référence diffère de 389 à la tâche 0, noter la valeur B et
  décaler d'autant `# tests` et `# pass` de la suite complète ; les totaux du fichier seul (2) ne
  changent pas.

| Étape | Commande | Code | `# tests` | `# pass` | `# fail` | `# skipped` |
|---|---|---|---|---|---|---|
| 0.3 référence | `npm run test` | 0 | 389 | 387 | 0 | 2 |
| 1.2 vert | `npm run test` | 0 | 389 | 387 | 0 | 2 |
| 1.5 mutation A | `node --test scripts/h2-report/cli.test.ts` | 1 | 2 | 1 | 1 | 0 |
| 1.6 mutations A + B | `node --test scripts/h2-report/cli.test.ts` | 1 | 2 | 1 | 1 | 0 |
| 1.7 après `git restore` | `node --test scripts/h2-report/cli.test.ts` | 0 | 2 | 2 | 0 | 0 |
| 2.2 vert | `npm run test` | 0 | 389 | 387 | 0 | 2 |
| 2.5 mutation A | `node --test scripts/h2-report/cli.test.ts` | 1 | 2 | 0 | 2 | 0 |
| 2.6 mutations A + B | `node --test scripts/h2-report/cli.test.ts` | 1 | 2 | 0 | 2 | 0 |
| 2.7 après `git restore` | `node --test scripts/h2-report/cli.test.ts` | 0 | 2 | 2 | 0 | 0 |
| 3 GATE-3 | `npm run test` | 0 | 389 | 387 | 0 | 2 |

---

## Tâche 0 · préparation

1. `git status --short` → sortie attendue, exactement :
   ```
   ?? docs/plans/2026-10-01-cli-spawnsync-timeout-estimate.json
   ?? docs/plans/2026-10-01-cli-spawnsync-timeout-plan.md
   ?? docs/specs/2026-10-01-cli-spawnsync-timeout-checklist.md
   ?? docs/specs/2026-10-01-cli-spawnsync-timeout-design.md
   ```
   (Si une version `-plan-v2.md` a été écrite, elle s'ajoute à cette liste.)
2. `ls node_modules/typescript/package.json` → sortie attendue :
   `node_modules/typescript/package.json`. Si le fichier manque : `npm ci` (timeout 600000) →
   code 0 (son script `prepare` lance le build) ; sinon, aucune installation.
3. Garde réseau → code 0. Puis `npm run test` (timeout 600000) → `> tsc -p tsconfig.build.json`,
   puis code 0, fin TAP `# tests 389`, `# pass 387`, `# fail 0`, `# skipped 2` ; les lignes
   `ok … - TEST-7 (issue 33) cli.ts without arguments exits 1 on --cap-usd is required, stdout empty`
   et
   `ok … - TEST-8 (issue 42) cli.ts reads the rates under its own root and passes process.env, from any folder`
   présentes. Si `# tests` diffère de 389, noter la valeur B et décaler les totaux de la suite.
4. `git status --short` → la même sortie qu'en 0.1 (`dist/` est ignoré par git).

---

## Tâche 1 · SPEC-1 · constante, fonction d'assertion et délai du fils de TEST-7 (issue 33)

### 1.1 Écrire SPEC-1 (TEST-1 est le test ainsi modifié)

Édition 1 · `scripts/h2-report/cli.test.ts` · remplacer :

```ts
import { spawnSync } from "node:child_process";
```

par :

```ts
import { spawnSync } from "node:child_process";
import type { SpawnSyncReturns } from "node:child_process";
```

Édition 2 · `scripts/h2-report/cli.test.ts` · remplacer :

```ts
// arguments are refused first, before the rates, the key and any provider: no network can be reached.

test("TEST-7 (issue 33) cli.ts without arguments exits 1 on --cap-usd is required, stdout empty", () => {
```

par :

```ts
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
```

Édition 3 · `scripts/h2-report/cli.test.ts` · remplacer :

```ts
    encoding: "utf8",
  });
  assert.equal(child.status, 1, child.stderr);
```

par :

```ts
    encoding: "utf8",
    timeout: CHILD_TIMEOUT_MS,
  });
  assertNotTimedOut(child, "node scripts/h2-report/cli.ts");
  assert.equal(child.status, 1, child.stderr);
```

Rien d'autre ne change : ni le titre de TEST-7, ni `cwd`, ni ses trois assertions existantes, ni
TEST-8.

`git diff --numstat -- scripts/h2-report/cli.test.ts` → sortie attendue, exactement :
`16	0	scripts/h2-report/cli.test.ts`.

`git diff -- scripts/h2-report/cli.test.ts` → deux blocs, observés sur la sonde (en-tête `index`
et avertissement de fins de ligne mis à part) :

```diff
@@ -1,6 +1,7 @@
 import { test } from "node:test";
 import assert from "node:assert/strict";
 import { spawnSync } from "node:child_process";
+import type { SpawnSyncReturns } from "node:child_process";
 import { tmpdir } from "node:os";
 import { fileURLToPath } from "node:url";
 
@@ -8,11 +9,26 @@ import { fileURLToPath } from "node:url";
 // cli.ts runs in a child process, never imported: importing it would launch it. Without --cap-usd the
 // arguments are refused first, before the rates, the key and any provider: no network can be reached.
 
+// Timeout of the cli.ts child processes, as in scripts/repo-conventions.test.mjs (#31): a blocked
+// child fails its test instead of freezing the suite (#53).
+const CHILD_TIMEOUT_MS = 60_000;
+
+function assertNotTimedOut(child: SpawnSyncReturns<string>, command: string): void {
+  const code = (child.error as NodeJS.ErrnoException | undefined)?.code;
+  const timedOut = code === "ETIMEDOUT" || child.signal === "SIGTERM";
+  assert.ok(
+    !timedOut,
+    `${command}: the child process exceeded the ${CHILD_TIMEOUT_MS} ms timeout and was stopped (error ${code}, signal ${child.signal})\n${child.stdout}${child.stderr}`,
+  );
+}
+
 test("TEST-7 (issue 33) cli.ts without arguments exits 1 on --cap-usd is required, stdout empty", () => {
   const child = spawnSync(process.execPath, ["scripts/h2-report/cli.ts"], {
     cwd: fileURLToPath(new URL("../../", import.meta.url)),
     encoding: "utf8",
+    timeout: CHILD_TIMEOUT_MS,
   });
+  assertNotTimedOut(child, "node scripts/h2-report/cli.ts");
   assert.equal(child.status, 1, child.stderr);
   assert.ok(child.stderr.includes("--cap-usd is required"), child.stderr);
   assert.equal(child.stdout, "");
```

### 1.2 Constater le vert (TEST-1, premier critère)

1. `npm run typecheck` (timeout 600000) → `> tsc --noEmit`, code 0, aucune erreur (preuve de D5 :
   `child.error?.code` sans transtypage échouerait ici).
2. Garde réseau → code 0.
3. `npm run test` (timeout 600000) → code 0, `# tests 389`, `# pass 387`, `# fail 0`,
   `# skipped 2` (B, inchangé : aucun test ajouté) ; les lignes `ok … - TEST-7 (issue 33) …` et
   `ok … - TEST-8 (issue 42) …` présentes.

### 1.3 Commit

Cocher `[SPEC-1]` seul dans `docs/specs/2026-10-01-cli-spawnsync-timeout-checklist.md` (outil
Edit, `- [ ] [SPEC-1]` devient `- [x] [SPEC-1]`). `[TEST-1]` reste décoché : son critère exige les
mutations faites après ce commit (cochée au commit de la tâche 2). Les documents de l'issue entrent
dans ce commit (spécification, « Ordre des commits et preuves » ; précédent P1 de #31).

`git add scripts/h2-report/cli.test.ts docs/specs/2026-10-01-cli-spawnsync-timeout-checklist.md docs/specs/2026-10-01-cli-spawnsync-timeout-design.md docs/plans/2026-10-01-cli-spawnsync-timeout-estimate.json docs/plans/2026-10-01-cli-spawnsync-timeout-plan.md`
(ajouter `docs/plans/2026-10-01-cli-spawnsync-timeout-plan-v2.md` s'il existe) → sortie
attendue : vide ou des avertissements de fins de ligne, rien d'autre.

Outil Write sur `<dossier_tmp>/agent-core-issue53-commit-msg.txt`, message (sujet de 61
caractères) :

```
test(scripts): borner le fils de TEST-7 de cli.test.ts à 60 s

TEST-7 (issue 33) de scripts/h2-report/cli.test.ts lance
node scripts/h2-report/cli.ts par spawnSync, sans délai : un fils
bloqué figeait toute la suite. Le spawnSync reçoit désormais
timeout: CHILD_TIMEOUT_MS (60 000 ms, la valeur de #31), et
assertNotTimedOut, appelée avant l'assertion de statut, échoue s'il
expire (error.code ETIMEDOUT ou signal SIGTERM) sur un message qui
nomme la commande, le délai, l'erreur et le signal, au lieu de
« null !== 1 ». Le code d'erreur est lu par NodeJS.ErrnoException,
seule forme acceptée par tsc en mode strict.

Pas de rouge préalable : un fils bloqué ne se produit pas sur main.
La preuve suit ce commit : mutation locale du délai à 1 ms, annulée
sans commit.

Refs: #53
Session: <id>
Model: <modèle>
Authorship: ai
```

`<id>` est l'identifiant de la session du builder, `<modèle>` son modèle exact ; aucune ligne
`Co-Authored-By`.

`python C:/Projects/dev-kit/scripts/commit_msg.py <dossier_tmp>/agent-core-issue53-commit-msg.txt`
→ code 0, aucune sortie de non-conformité.

`git commit -F <dossier_tmp>/agent-core-issue53-commit-msg.txt` → sortie attendue : une ligne
`[chore/53-cli-spawnsync-timeout <sha>] test(scripts): borner le fils de TEST-7 de cli.test.ts à 60 s`,
`5 files changed` (6 avec un plan v2), quatre lignes `create mode` (les documents de l'issue ;
cinq avec un plan v2). Aucune sortie du hook `commit-msg` (message conforme).

### 1.4 Préparer les mutations

1. `git status --short` → sortie attendue : vide (arbre propre).
2. `npm run build` (timeout 600000) → `> tsc -p tsconfig.build.json`, code 0, aucune erreur
   (exigé par TEST-1 avant les mutations).

### 1.5 Mutation A, délai minuscule (TEST-1, deuxième critère), jamais commitée

Mutation A · `scripts/h2-report/cli.test.ts` · remplacer :

```ts
const CHILD_TIMEOUT_MS = 60_000;
```

par :

```ts
const CHILD_TIMEOUT_MS = 1;
```

1. `git diff --numstat -- scripts/h2-report/cli.test.ts` → `1	1	scripts/h2-report/cli.test.ts`.
2. Garde réseau → code 0.
3. `node --test scripts/h2-report/cli.test.ts` (timeout 120000) → code 1, en moins de quelques
   secondes ; fin TAP `# tests 2`, `# pass 1`, `# fail 1`, `# skipped 0` ; une seule ligne
   `not ok`, exactement :
   ```
   not ok 1 - TEST-7 (issue 33) cli.ts without arguments exits 1 on --cap-usd is required, stdout empty
   ```
   et, dans son bloc YAML (observé sur la sonde) :
   ```
     failureType: 'testCodeFailure'
     error: |-
       node scripts/h2-report/cli.ts: the child process exceeded the 1 ms timeout and was stopped (error ETIMEDOUT, signal SIGTERM)
       
     code: 'ERR_ASSERTION'
     name: 'AssertionError'
     expected: true
     actual: false
     operator: '=='
   ```
   puis `ok 2 - TEST-8 (issue 42) …` (encore sans délai). Le message contient
   `node scripts/h2-report/cli.ts: the child process exceeded the 1 ms timeout and was stopped` et
   `ETIMEDOUT` (critère de TEST-1). Si TEST-7 passe ou échoue sur un autre message, s'arrêter et le
   signaler au pilote.

### 1.6 Mutation B, message obscur évité (TEST-1, troisième critère), cumulée à A, jamais commitée

Mutation B · `scripts/h2-report/cli.test.ts` · remplacer :

```ts
  assertNotTimedOut(child, "node scripts/h2-report/cli.ts");
  assert.equal(child.status, 1, child.stderr);
```

par :

```ts
  assert.equal(child.status, 1, child.stderr);
```

(La fonction `assertNotTimedOut` reste définie, inutilisée ; la mutation A reste en place.)

1. `git diff --numstat -- scripts/h2-report/cli.test.ts` → `1	2	scripts/h2-report/cli.test.ts`.
2. Garde réseau → code 0.
3. `node --test scripts/h2-report/cli.test.ts` (timeout 120000) → code 1 ; fin TAP `# tests 2`,
   `# pass 1`, `# fail 1`, `# skipped 0` ; une seule ligne `not ok`, la même qu'en 1.5, et dans
   son bloc YAML (observé sur la sonde) :
   ```
     failureType: 'testCodeFailure'
     error: |-
       Expected values to be strictly equal:
       
       null !== 1
       
     code: 'ERR_ASSERTION'
     name: 'AssertionError'
     expected: 1
     actual: ~
     operator: 'strictEqual'
   ```
   L'échec porte sur `assert.equal(child.status, 1, child.stderr)` et le message ne contient pas
   `exceeded` : c'est le message obscur que SPEC-1 remplace.

### 1.7 Annulation

1. `git restore scripts/h2-report/cli.test.ts` → sortie vide.
2. `git diff --stat -- scripts/h2-report/cli.test.ts` → sortie attendue : **vide**.
3. `git status --short` → sortie attendue : vide.
4. Garde réseau → code 0. Puis `node --test scripts/h2-report/cli.test.ts` (timeout 120000) →
   code 0, `# tests 2`, `# pass 2`, `# fail 0`.

Recopier dans le rapport du builder les sorties de 1.5.3, 1.6.3 (ligne `not ok`, lignes `error`,
compteurs `# tests`, `# pass`, `# fail`), 1.7.1 et 1.7.2, chemins relatifs au dépôt seulement (ni
les lignes `location:` ni les lignes de pile), et les résumer dans le corps de PR.

---

## Tâche 2 · SPEC-2 · délai des deux fils de TEST-8 (issue 42)

### 2.1 Écrire SPEC-2 (TEST-2 est le test ainsi modifié)

Édition 4 · `scripts/h2-report/cli.test.ts` · remplacer :

```ts
    const child = spawnSync(process.execPath, [cli, "--cap-usd", "1", "--dry-run"], { cwd: tmpdir(), env: childEnv, encoding: "utf8" });
    assert.ok(!child.stderr.includes("ENOENT"), child.stderr);
```

par :

```ts
    const child = spawnSync(process.execPath, [cli, "--cap-usd", "1", "--dry-run"], { cwd: tmpdir(), env: childEnv, encoding: "utf8", timeout: CHILD_TIMEOUT_MS });
    assertNotTimedOut(child, "node scripts/h2-report/cli.ts --cap-usd 1 --dry-run");
    assert.ok(!child.stderr.includes("ENOENT"), child.stderr);
```

L'appel reste sur une ligne (163 colonnes, voir P2). Rien d'autre ne change : ni le titre de
TEST-8, ni `cli`, ni `env` et son filtrage de `GEMINI_API_KEY`, ni `launches`, ni `SENTINEL`, ni
les trois assertions de la boucle, ni TEST-7.

`git diff --numstat -- scripts/h2-report/cli.test.ts` → sortie attendue, exactement :
`2	1	scripts/h2-report/cli.test.ts`.

`git diff -- scripts/h2-report/cli.test.ts` → un bloc, observé sur la sonde :

```diff
@@ -44,7 +44,8 @@ test("TEST-8 (issue 42) cli.ts reads the rates under its own root and passes pro
   const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => name.toUpperCase() !== "GEMINI_API_KEY"));
   const launches: Array<[NodeJS.ProcessEnv, boolean]> = [[env, true], [{ ...env, GEMINI_API_KEY: SENTINEL }, false]];
   for (const [childEnv, unset] of launches) {
-    const child = spawnSync(process.execPath, [cli, "--cap-usd", "1", "--dry-run"], { cwd: tmpdir(), env: childEnv, encoding: "utf8" });
+    const child = spawnSync(process.execPath, [cli, "--cap-usd", "1", "--dry-run"], { cwd: tmpdir(), env: childEnv, encoding: "utf8", timeout: CHILD_TIMEOUT_MS });
+    assertNotTimedOut(child, "node scripts/h2-report/cli.ts --cap-usd 1 --dry-run");
     assert.ok(!child.stderr.includes("ENOENT"), child.stderr);
     assert.ok(!(child.stdout + child.stderr).includes(SENTINEL), "the sentinel key was written");
     assert.equal(child.stderr.includes("environment variable GEMINI_API_KEY is unset or empty"), unset, child.stderr);
```

Contrôle de symétrie (spécification, « Symétrie ») :
`git grep -c "timeout: CHILD_TIMEOUT_MS" -- scripts/h2-report/cli.test.ts` →
`scripts/h2-report/cli.test.ts:2` ;
`git grep -c "assertNotTimedOut(child, \"" -- scripts/h2-report/cli.test.ts` →
`scripts/h2-report/cli.test.ts:2`.

### 2.2 Constater le vert (TEST-2, premier critère)

1. `npm run typecheck` (timeout 600000) → `> tsc --noEmit`, code 0, aucune erreur.
2. Garde réseau → code 0.
3. `npm run test` (timeout 600000) → code 0, `# tests 389`, `# pass 387`, `# fail 0`,
   `# skipped 2` (B) ; les lignes `ok … - TEST-7 (issue 33) …` et `ok … - TEST-8 (issue 42) …`
   présentes.

### 2.3 Commit

Dans `docs/specs/2026-10-01-cli-spawnsync-timeout-checklist.md` (outil Edit) : cocher `[SPEC-2]`
et `[TEST-1]` (prouvé en 1.5 à 1.7). `[TEST-2]` reste décoché (mutations après ce commit).

`git add scripts/h2-report/cli.test.ts docs/specs/2026-10-01-cli-spawnsync-timeout-checklist.md`
→ sortie attendue : vide ou des avertissements de fins de ligne.

Outil Read puis Write sur `<dossier_tmp>/agent-core-issue53-commit-msg.txt`, message (sujet de 62
caractères) :

```
test(scripts): borner les fils de TEST-8 de cli.test.ts à 60 s

TEST-8 (issue 42) de scripts/h2-report/cli.test.ts lance deux fois
cli.ts --cap-usd 1 --dry-run par spawnSync, sans délai. Chaque
lancement reçoit timeout: CHILD_TIMEOUT_MS et passe par
assertNotTimedOut avant ses assertions de stderr : aucun fils du
fichier ne reste sans délai. Les valeurs de cwd, env et encoding,
SENTINEL, le filtrage de GEMINI_API_KEY et la liste launches ne
changent pas.

La checklist coche aussi TEST-1, prouvé par mutation après le
commit précédent. La preuve de TEST-2 suit ce commit : mutation
locale du délai à 1 ms, annulée sans commit.

Refs: #53
Session: <id>
Model: <modèle>
Authorship: ai
```

`python C:/Projects/dev-kit/scripts/commit_msg.py <dossier_tmp>/agent-core-issue53-commit-msg.txt`
→ code 0.

`git commit -F <dossier_tmp>/agent-core-issue53-commit-msg.txt` → sortie attendue : une ligne
`[chore/53-cli-spawnsync-timeout <sha>] test(scripts): borner les fils de TEST-8 de cli.test.ts à 60 s`,
`2 files changed, 4 insertions(+), 3 deletions(-)`.

### 2.4 Préparer les mutations

1. `git status --short` → sortie attendue : vide.
2. `npm run build` (timeout 600000) → `> tsc -p tsconfig.build.json`, code 0.

### 2.5 Mutation A, délai minuscule (TEST-2, deuxième critère), jamais commitée

Mutation A · `scripts/h2-report/cli.test.ts` · remplacer :

```ts
const CHILD_TIMEOUT_MS = 60_000;
```

par :

```ts
const CHILD_TIMEOUT_MS = 1;
```

1. `git diff --numstat -- scripts/h2-report/cli.test.ts` → `1	1	scripts/h2-report/cli.test.ts`.
2. Garde réseau → code 0.
3. `node --test scripts/h2-report/cli.test.ts` (timeout 120000) → code 1 ; fin TAP `# tests 2`,
   `# pass 0`, `# fail 2`, `# skipped 0` ; `not ok 1 - TEST-7 (issue 33) …` avec le même bloc
   qu'en 1.5.3 ; puis, exactement :
   ```
   not ok 2 - TEST-8 (issue 42) cli.ts reads the rates under its own root and passes process.env, from any folder
   ```
   et, dans son bloc YAML (observé sur la sonde) :
   ```
     failureType: 'testCodeFailure'
     error: |-
       node scripts/h2-report/cli.ts --cap-usd 1 --dry-run: the child process exceeded the 1 ms timeout and was stopped (error ETIMEDOUT, signal SIGTERM)
       
     code: 'ERR_ASSERTION'
     name: 'AssertionError'
     expected: true
     actual: false
     operator: '=='
   ```
   Le message de TEST-8 contient
   `node scripts/h2-report/cli.ts --cap-usd 1 --dry-run: the child process exceeded the 1 ms timeout and was stopped`
   et `ETIMEDOUT` (critère de TEST-2), sans aucun chemin absolu. Sinon, s'arrêter et le signaler
   au pilote.

### 2.6 Mutation B, message obscur évité (TEST-2, troisième critère), cumulée à A, jamais commitée

Mutation B · `scripts/h2-report/cli.test.ts` · remplacer :

```ts
    assertNotTimedOut(child, "node scripts/h2-report/cli.ts --cap-usd 1 --dry-run");
    assert.ok(!child.stderr.includes("ENOENT"), child.stderr);
```

par :

```ts
    assert.ok(!child.stderr.includes("ENOENT"), child.stderr);
```

(L'appel de TEST-7 reste ; la mutation A reste en place.)

1. `git diff --numstat -- scripts/h2-report/cli.test.ts` → `1	2	scripts/h2-report/cli.test.ts`.
2. Garde réseau → code 0.
3. `node --test scripts/h2-report/cli.test.ts` (timeout 120000) → code 1 ; fin TAP `# tests 2`,
   `# pass 0`, `# fail 2`, `# skipped 0` ; TEST-7 échoue toujours sur son message de délai (son
   appel est en place) ; `not ok 2 - TEST-8 (issue 42) …` avec, dans son bloc YAML (observé sur la
   sonde) :
   ```
     failureType: 'testCodeFailure'
     error: |-
       Expected values to be strictly equal:
       
       false !== true
       
     code: 'ERR_ASSERTION'
     name: 'AssertionError'
     expected: true
     actual: false
     operator: 'strictEqual'
   ```
   L'échec de TEST-8 porte sur une de ses assertions existantes (la troisième,
   `assert.equal(child.stderr.includes("environment variable GEMINI_API_KEY is unset or empty"), unset, child.stderr)`,
   stderr vide au premier lancement) et son message ne contient pas `exceeded`.

### 2.7 Annulation

1. `git restore scripts/h2-report/cli.test.ts` → sortie vide.
2. `git diff --stat -- scripts/h2-report/cli.test.ts` → sortie attendue : **vide**.
3. `git status --short` → sortie attendue : vide.
4. Garde réseau → code 0. Puis `node --test scripts/h2-report/cli.test.ts` (timeout 120000) →
   code 0, `# tests 2`, `# pass 2`, `# fail 0`.

Recopier dans le rapport du builder les sorties de 2.5.3, 2.6.3, 2.7.1 et 2.7.2, chemins relatifs
au dépôt seulement, et les résumer dans le corps de PR.

---

## Tâche 3 · gates, checklist, contrôles, taille et corps de PR

Chaque gate par son propre appel, `timeout` 600000, dans cet ordre ; garde réseau → code 0 juste
avant GATE-3 :

| Gate | Commande | Sortie attendue |
|---|---|---|
| GATE-1 build | `npm run build` | `> tsc -p tsconfig.build.json`, code 0, aucune erreur |
| GATE-2 typecheck | `npm run typecheck` | `> tsc --noEmit`, code 0, aucune erreur |
| GATE-3 test | `npm run test` | fin TAP : `# tests 389`, `# pass 387`, `# fail 0`, `# skipped 2` (B), et les lignes `ok … - TEST-7 (issue 33) …` et `ok … - TEST-8 (issue 42) …` |

Juste après GATE-3 : `git status --short` → sortie attendue : vide.

Puis, dans `docs/specs/2026-10-01-cli-spawnsync-timeout-checklist.md` : cocher `[TEST-2]`,
`[GATE-1]`, `[GATE-2]`, `[GATE-3]`, et inscrire sous `## Hypothèses` les entrées de la section
« Hypothèses » de ce plan, une par ligne, préfixées `- [H]`.
`git add docs/specs/2026-10-01-cli-spawnsync-timeout-checklist.md` ; outil Read puis Write sur
`<dossier_tmp>/agent-core-issue53-commit-msg.txt`, message (sujet de 66 caractères) :

```
chore(checklist): cocher TEST-2 et les gates, noter les hypothèses

Refs: #53
Session: <id>
Model: <modèle>
Authorship: ai
```

`python C:/Projects/dev-kit/scripts/commit_msg.py <dossier_tmp>/agent-core-issue53-commit-msg.txt`
→ code 0. `git commit -F <dossier_tmp>/agent-core-issue53-commit-msg.txt` → sortie attendue :
`1 file changed`.

Contrôles, chaque commande par son propre appel, résultats à recopier dans le corps de PR, chemins
relatifs au dépôt :

1. `git fetch origin` → sortie attendue : vide ou une ligne de mise à jour.
2. `git log --oneline HEAD..origin/main` → sortie attendue au 2026-10-01 :
   `419617a fix(llm): écarter les compteurs d'usage invalides du budget (#59)` (P6). Toute autre
   ligne : lancer `git diff --name-only HEAD...origin/main` ; si `scripts/h2-report/cli.test.ts`
   y figure, s'arrêter et le signaler au pilote avant la PR ; sinon, le noter dans la PR. Jamais
   de rebase ni de merge décidé seul.
3. `git diff --name-only origin/main...HEAD` → sortie attendue, exactement ces cinq chemins :
   ```
   docs/plans/2026-10-01-cli-spawnsync-timeout-estimate.json
   docs/plans/2026-10-01-cli-spawnsync-timeout-plan.md
   docs/specs/2026-10-01-cli-spawnsync-timeout-checklist.md
   docs/specs/2026-10-01-cli-spawnsync-timeout-design.md
   scripts/h2-report/cli.test.ts
   ```
   (plus `docs/plans/2026-10-01-cli-spawnsync-timeout-plan-v2.md` s'il existe).
4. `git diff --numstat origin/main...HEAD -- scripts src tests package.json package-lock.json tsconfig.json`
   → sortie attendue, exactement : `18	1	scripts/h2-report/cli.test.ts` (ni
   `scripts/repo-conventions.test.mjs`, ni `scripts/h2-report/cli.ts`, ni `src/`).
5. `git grep -n "CHILD_TIMEOUT_MS" -- scripts/h2-report/cli.test.ts` → quatre lignes, aux lignes
   14 (`const CHILD_TIMEOUT_MS = 60_000;`), 21 (le gabarit du message), 29
   (`    timeout: CHILD_TIMEOUT_MS,`) et 47 (le `spawnSync` de TEST-8).
6. `git grep -n "assertNotTimedOut" -- scripts/h2-report/cli.test.ts` → trois lignes : 16 (la
   fonction), 31 (`  assertNotTimedOut(child, "node scripts/h2-report/cli.ts");`), 48
   (`    assertNotTimedOut(child, "node scripts/h2-report/cli.ts --cap-usd 1 --dry-run");`).
7. `git grep -n "const SENTINEL = \|const launches" -- scripts/h2-report/cli.test.ts` → deux
   lignes, 39 (`const SENTINEL = "sentinel-value-not-a-key";`) et 45 (`const launches …`, texte
   inchangé).
8. `git grep -n -E "AIza[0-9A-Za-z_-]{35}" -- scripts src tests` → sortie attendue : vide.
9. `git log --format=%s origin/main..HEAD` → sortie attendue, exactement, du plus récent au plus
   ancien :
   ```
   chore(checklist): cocher TEST-2 et les gates, noter les hypothèses
   test(scripts): borner les fils de TEST-8 de cli.test.ts à 60 s
   test(scripts): borner le fils de TEST-7 de cli.test.ts à 60 s
   ```
   puis `git log --format=%B origin/main..HEAD` et vérifier à la lecture : aucune ligne
   `Co-Authored-By`, trois blocs de trailers `Refs: #53` / `Session:` / `Model:` /
   `Authorship: ai`.
10. Outil Write sur `<dossier_tmp>/agent-core-issue53-pr-title.txt` : une ligne,
    `test(scripts): borner les fils de cli.test.ts à 60 s` (52 caractères). Corps de PR écrit (voir
    plus bas), puis
    `python C:/Projects/dev-kit/scripts/pr_title.py --title-file <dossier_tmp>/agent-core-issue53-pr-title.txt --body-file <dossier_tmp>/agent-core-issue53-pr-body.md`
    → `pr_title : conforme`, code 0.
11. `python C:/Projects/dev-kit/scripts/pr_size.py origin/main HEAD --body-file <dossier_tmp>/agent-core-issue53-pr-body.md`
    → sortie attendue :
    `hors docs/ et *.md : +18/-1 lignes (code +0, tests +18), seuil 400 respecté`, code 0.
    Recopier la ligne mesurée dans le corps de PR.

Corps de PR (outil Write sur `<dossier_tmp>/agent-core-issue53-pr-body.md`, sections du dépôt :
Contexte, Changements, Vérifications, Métriques, Risques et suivi, Message de squash proposé). Il
porte obligatoirement :

- `Closes #53` dans « Contexte », l'origine (R-1 de #31, PR #52) ; la taille : environ 20 lignes
  estimées (fourchette 15 à 30), la ligne mesurée par `pr_size.py`, sous le seuil de 400, sans
  dérogation.
- Les trois gates avec leur dernière ligne de sortie, et la référence (B = 389 tests sur 27bd9a1).
- Les contrôles 2 à 11 avec leur résultat, dont `origin/main` avancé par #59 sans recouvrement.
- La preuve de TEST-1 : vert à 60 000 ms et typecheck vert (1.2) ; mutation A : seul
  `TEST-7 (issue 33)` échoue, sur
  `node scripts/h2-report/cli.ts: the child process exceeded the 1 ms timeout and was stopped (error ETIMEDOUT, signal SIGTERM)`,
  2 / 1 / 1 ; mutations A et B : échec sur `null !== 1` ; annulation par
  `git restore scripts/h2-report/cli.test.ts`, `git diff --stat` vide, fichier revenu à 2 / 2 / 0.
- La preuve de TEST-2 : vert à 60 000 ms et typecheck vert (2.2) ; mutation A : TEST-7 et TEST-8
  échouent, TEST-8 sur
  `node scripts/h2-report/cli.ts --cap-usd 1 --dry-run: the child process exceeded the 1 ms timeout and was stopped (error ETIMEDOUT, signal SIGTERM)`,
  2 / 0 / 2 ; mutations A et B : TEST-8 échoue sur `false !== true` ; annulation, `git diff --stat`
  vide, 2 / 2 / 0.
- **Toutes** les hypothèses de la section « Hypothèses » de ce plan, chacune nommée et recopiée en
  entier.
- Aucun fichier `.env` ouvert ni lu ; aucun fournisseur hébergé appelé ; environnement des fils
  inchangé ; garde réseau à 0 avant chaque commande de test ; aucune valeur de clé dans le fichier
  touché.
- La section « Message de squash proposé », sujet **et** corps, repris de la spécification, dans
  un bloc de code, sans ligne `Co-Authored-By` (sujet : 52 caractères sans le suffixe
  ` (#<PR>)`, 58 avec un numéro à deux chiffres ; `<PR>` remplacé par le numéro une fois connu) :

```
test(scripts): borner les fils de cli.test.ts à 60 s (#<PR>)

Les deux tests de scripts/h2-report/cli.test.ts lancent cli.ts par
spawnSync, sans délai : un fils bloqué figeait toute la suite. Ils
reçoivent le délai de #31 (CHILD_TIMEOUT_MS, 60 000 ms) et échouent,
s'il expire, sur un message qui nomme la commande, le délai, l'erreur
et le signal, au lieu de « null !== 1 » ou d'une assertion de stderr.
La condition est celle de scripts/repo-conventions.test.mjs, réunie
dans assertNotTimedOut ; le message suit l'anglais du fichier.

L'environnement des fils est inchangé ; aucun fournisseur n'est
construit. Preuve par mutation locale du délai à 1 ms, annulée sans
commit.

Refs: #53
Session: <id>
Model: <modèle>
Authorship: ai
```

- **Règle A4** : le corps de PR se **termine** par le bloc de trailers, hors de tout bloc de code,
  séparé du reste par une ligne vide, et rien après lui (ni ligne « Generated with », ni ligne
  vide de texte) :

```
Refs: #53
Session: <id>
Model: <modèle>
Authorship: ai
```

Relire le fichier (outil Read) dans l'appel qui précède immédiatement toute commande qui le publie.

---

## Hypothèses (à recopier toutes dans la checklist et dans la PR)

- **R-1** (spécification) · Petit-fils : sans objet. `cli.ts` est lancé directement par `node` et
  ne lance aucun sous-processus (aucun `child_process` sous `scripts/`, `src/`, `tests/` hors des
  deux fichiers de test) : l'arrêt du fils direct suffit.
- **R-2** (spécification) · Autres erreurs du fils : même condition que #31. Une sortie au-delà de
  `maxBuffer` (`ENOBUFS`) tombe sur le message de délai, libellé inexact mais erreur réelle
  affichée ; une erreur de lancement sans signal (`ENOENT`, `EACCES`) garde les messages
  existants.
- **R-3** (spécification) · Le commentaire de la constante ne cite aucune durée observée ; texte
  de SPEC-1, sans ajout.
- **R-4** (spécification) · Message en anglais (D6) : si le pilote veut le texte français de #31,
  seul le gabarit de `assertNotTimedOut` change (une ligne) et les critères de TEST-1 et TEST-2
  suivent.
- **P1** · Les documents de l'issue (spécification, checklist, estimation, plan) entrent dans le
  commit de SPEC-1 (précédent P1 de #31) ; `[TEST-1]` est coché au commit de SPEC-2 et `[TEST-2]`
  au troisième commit, parce que le critère de chacun exige les mutations faites après le commit
  de son SPEC.
- **P2** · Le `spawnSync` de TEST-8 reste sur une seule ligne (163 colonnes) : la spécification le
  permet, aucun outil de formatage n'est configuré, les voisins de `scripts/h2-report/` vont
  jusqu'à 182 colonnes (mesuré), et le diff de SPEC-2 reste à +2 −1.
- **P3** · `assertNotTimedOut` n'a pas de commentaire propre : la spécification n'en prescrit pas,
  le commentaire de la constante qui la précède dit l'objet du couple.
- **P4** · Sous les mutations B, les messages d'échec sont les messages par défaut de Node
  (`null !== 1`, `false !== true`), parce que le message passé (`child.stderr`) est vide quand le
  fils est arrêté à 1 ms (observé sur la sonde). Ils ne contiennent pas `exceeded`, comme exigé.
- **P5** · Sorties observées par le planificateur sur une sonde (`git archive` de 27bd9a1, `dist/`
  compilé par le `tsc` de `node_modules/` de ce worktree), pas sur le worktree lui-même ; un écart
  de totaux de la suite à la tâche 0 se traite comme dit dans « Totaux attendus ».
- **P6** · `origin/main` a avancé de 27bd9a1 à 419617a (#59) pendant la préparation ; aucun fichier
  commun avec cette PR (`git diff --stat HEAD origin/main` : `docs/`, `src/llm/`, `tests/`). La
  branche reste sur 27bd9a1 ; `pr_size.py` et le contrôle 3 mesurent depuis la base de fusion. La
  référence B = 389 vaut pour 27bd9a1 ; #59 ajoute des tests sur `main`, sans effet sur cette
  branche. Aucun rebase décidé seul.
- **P7** · Type et scope `test(scripts)` (D8 de la spécification), branche `chore/` d'après le
  label `T:chore` ; le troisième commit, qui ne touche que la checklist, est `chore(checklist)`
  comme dans les PR précédentes ; le squash porte le type `test`.
- **Node** · Node local ≥ 22.18 (retrait de types sans drapeau), constaté v22.19.0 ; la mutation A
  repose sur un démarrage de Node plus long que 1 ms (observé : arrêt en 10 à 19 ms, `ETIMEDOUT`
  et `SIGTERM` à chaque lancement).

## Risques

- **`dist/` périmé ou absent** : `cli.ts` importe `dist/` par `run-report.ts` ; `npm run test`
  reconstruit `dist/` avant `node --test`, et chaque série de mutations est précédée de
  `npm run build` (1.4, 2.4).
- **Mutation oubliée** : une mutation non annulée partirait dans le commit suivant ; les contrôles
  `git diff --stat` vide (1.7.2, 2.7.2), `git status --short` vide (2.4.1, après GATE-3) et le
  contrôle 4 (numstat exact `18	1`) l'interdisent.
- **Fins de ligne** : le fichier est en CRLF dans la copie de travail ; si l'outil Edit ne trouve
  pas un bloc, relire le fichier et recopier le bloc depuis la lecture ; les numstat attendus
  (`16	0`, `2	1`) vérifient qu'aucune ligne n'a été réécrite par un changement de fin de ligne.
- **Mutation A non déclenchée** : si une machine démarrait `node` en moins de 1 ms, la mutation A
  ne prouverait rien ; observé impossible ici (10 à 19 ms) ; dans ce cas, s'arrêter et le signaler
  au pilote plutôt que changer la valeur de mutation.
- **`main` en mouvement** (P6) : d'autres commits peuvent arriver avant la PR ; le contrôle 2 les
  détecte, un recouvrement de `scripts/h2-report/cli.test.ts` arrête la tâche.
- **Garde d'isolation du worktree** : une commande composée (`cd … &&`, `; echo $?`, `cp … &&`) est
  refusée ; lancer chaque commande seule depuis la racine du worktree.
