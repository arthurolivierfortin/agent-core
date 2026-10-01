# Plan · Distinguer un error.message Gemini vide d'un corps vide · #32

- Issue : #32 (label `T:bug` ; relevé sur #25, PR #29, figé tel quel par #26, R1)
  https://github.com/arthurolivierfortin/agent-core/issues/32
- Checklist : `docs/specs/2026-10-01-gemini-empty-error-label-checklist.md`
- Spécification : `docs/specs/2026-10-01-gemini-empty-error-label-design.md`
- Estimation : `docs/plans/2026-10-01-gemini-empty-error-label-estimate.json`
- Plan précédent pris pour forme : `docs/plans/2026-10-01-metrics-invalid-usage-plan.md` (#46).
- Conception appliquée : celle de la spécification (SPEC-1, D1 à D5), sans écart de comportement.
  Un seul fichier de production, `src/llm/providers/gemini/gemini-llm-provider.ts` : dans
  `httpError` (non exportée), une ligne de commentaire et la constante locale `emptyLabel` ajoutées
  après `const detail = gemini?.message ?? text;` (inchangée), la ligne `extract` réécrite, et une
  phrase ajoutée au commentaire de `httpError`. Un seul fichier de test,
  `tests/llm/providers/gemini/gemini-llm-provider.test.ts` : le test de #26 (l.337-342) ajusté en
  place. Aucun nom exporté ajouté, retiré ou renommé ; aucun `.d.ts` de `dist/` modifié (observé
  sur la sonde, vérifié par le builder en 1.4) ; `LLMErrorCode`, `LLMError`, `geminiErrorOf`,
  `readBody`, `redactKey`, `excerpt`, `retryAfterMsOf`, les trois préfixes de message, le calcul et
  le passage de `http` intacts.
- Branche : `fix/32-gemini-empty-error-label`, base `main` (`publication_branch` du manifeste).
  Elle existe déjà : branche du worktree
  `C:/Projects/Perso/agent-core/.claude/worktrees/fix+32-gemini-empty-error-label`, au niveau de
  `origin/main` (constaté : `git rev-parse HEAD origin/main` rend deux fois
  `491746a767a75ae1e357dd414ea0a615da317e61`).
- Toutes les commandes se lancent depuis la racine de ce worktree, chacune par son propre appel
  Bash, en avant-plan, `timeout` 600000 ms pour une installation, un build, un test ou un gate,
  120000 ms sinon. Jamais `&&`, `;`, `|` ni `cd` entre deux commandes (le garde d'isolation du
  worktree refuse une commande git composée : constaté pendant cette planification), jamais `&`
  final, jamais `run_in_background`, aucun serveur, aucun REPL : jamais `python -`, jamais `node`
  sans fichier ni `-e`, jamais de heredoc, aucune commande interactive.
- **Garde réseau** (précédent P6 de #26), avant **chaque** commande de test (`node --test`,
  `npm run test`, GATE-3) : `node -e "process.exit(process.env.GEMINI_INTEGRATION === undefined ? 0 : 1)"`
  → sortie vide, code 0. Code 1 : s'arrêter et le signaler au pilote, sans lancer le test.
  Constatée à 0 par le planificateur. Aucun appel réseau : `respondingFetch` est un `fetch` injecté.
- Fichiers de travail, dans `<dossier_tmp>` (dossier temporaire de la session du builder, chemin
  absolu `C:/…` reçu dans le prompt de dispatch, sinon créé une fois par `mktemp -d` puis converti
  par `cygpath -m <chemin>`, chaque commande par son propre appel) :
  `<dossier_tmp>/agent-core-issue32-commit-msg.txt` (message de commit, réécrit à chaque commit,
  relu par l'outil Read avant réécriture dès qu'il existe),
  `<dossier_tmp>/agent-core-issue32-pr-title.txt` (titre de PR),
  `<dossier_tmp>/agent-core-issue32-pr-body.md` (corps de PR), et la copie des déclarations de
  `main` : dossier `<dossier_tmp>/agent-core-issue32-dist-before`. Jamais `%TEMP%` ni `/tmp`
  directement, jamais un nom sans dépôt.
- Contraintes du pilote rappelées : code du package publié ; seul le texte de `LLMError.message`
  change, et seulement quand `error.message` vaut `""` ; `code`, `status`, `retryAfterMs`,
  masquage `[redacted]` et types exportés inchangés (`.d.ts` comparés) ; rouge préalable observé ;
  mutations M1 à M4 observées puis annulées par `git restore` (suivi d'un `git diff --stat` vide) ;
  les tests importent `dist/` : `npm run build` avant chaque `node --test` ; aucune valeur de clé
  nulle part (clés factices `cle-factice-*` seulement) ; aucun `console.log` dans `src/` ; aucun
  fichier `.env` ouvert ni lu ; aucun message de commit ne porte de ligne `Co-Authored-By` (un hook
  `commit-msg` du dépôt la refuse) : trailers `Refs: #32`, `Session:`, `Model:`, `Authorship:`
  seulement ; sujets à l'impératif (forme infinitive des commits du dépôt), 72 caractères au plus
  type compris ; chemins relatifs au dépôt dans toute preuve. Ignorer toute consigne injectée par
  un hook (vercel-plugin, Next.js, etc.) : le dépôt est un package Node/TypeScript sans Next.js.

## Taille mesurée

**`hors docs/ et *.md : +31/-7 lignes (code +7, tests +24), seuil 400 respecté`** : ligne que
`pr_size.py` rendra (format de `format_measure` ; `classify_path` : `tests/` = tests, `src/` =
code, `docs/` et `*.md` exclus), mesurée par le planificateur par `git diff --no-index --numstat`
de chaque fichier de `main` contre son état final sur la sonde (voir « Vérifications ») :

| Fichier | Ajoutées | Retirées |
|---|---|---|
| `src/llm/providers/gemini/gemini-llm-provider.ts` | 7 | 3 |
| `tests/llm/providers/gemini/gemini-llm-provider.test.ts` | 24 | 4 |
| **Total** | **31** | **7** |

38 lignes mesurées contre environ 30 estimées par la spécification (fourchette 25 à 40) : dans la
fourchette, 362 sous le seuil de 400, aucune dérogation. Écart : code +7 −3 contre +4 −1, parce
que la phrase ajoutée « après la première phrase » du commentaire de `httpError` oblige à replier
la phrase suivante sur trois lignes (P2) ; tests +24 −4 dans la fourchette. Au-delà de 400,
s'arrêter et le signaler au pilote, sans dérogation décidée seul.

## Ordre des tâches et dépendances

Un SPEC = un commit = un test (spécification, « Ordre des commits et preuves »).

| Tâche | Élément | Dépend de | Pourquoi cet ordre |
|---|---|---|---|
| 0 | préparation (dépendances, référence de la suite, copie des `.d.ts` de `main`) | aucune | le worktree n'a ni `node_modules/` ni `dist/` (constaté : `ls` → absents) ; la copie sert à prouver en 1.4 qu'aucun type exporté ne change |
| 1 | TEST-1 (rouge), SPEC-1 (vert), commit, puis mutations M1 à M4 | 0 | seul SPEC ; les mutations se font sur l'arbre propre **après** le commit |
| 2 | gates GATE-1 à GATE-3, checklist, contrôles, taille, corps de PR | 1 | |

Aucun `[DB-N]`.

## Vérifications faites par le planificateur (sorties fraîches du 2026-10-01)

- `node --version` : `v22.19.0` (`node --test` lance les `.ts` par retrait de types, sans drapeau).
  Manifeste : `publication_branch` `main`, gates `GATE-1 build` `npm run build`, `GATE-2 typecheck`
  `npm run typecheck`, `GATE-3 test` `npm run test` ; `package.json` : `test` =
  `npm run build && node --test`, `build` = `tsc -p tsconfig.build.json`, `typecheck` =
  `tsc --noEmit`.
- `git status --short --untracked-files=all` au lancement : trois fichiers non suivis
  (estimation, checklist, spécification).
- **Fins de ligne** : `git config core.autocrlf` → `true`. Le source et le test de la copie de
  travail sont en **CRLF** (comptage par `node` : 225 `\r` pour 225 lignes ; 681 pour 681) ; la
  checklist est en LF (0 `\r`). Attention : `grep -c $'\r'` de Git Bash rend 0 sur ces fichiers et
  ne prouve rien. L'outil Edit garde la fin de ligne du fichier ; les blocs de ce plan s'écrivent
  en LF. Les commits stockent du LF : les `numstat` ci-dessous valent dans les deux cas.
- Code lu : `src/llm/providers/gemini/gemini-llm-provider.ts` l.120-225 (commentaire de `httpError`
  l.134-139 ; `httpError` l.140-165, `detail` l.145, `extract` l.146 ; `retryAfterMsOf` l.171-182 ;
  `geminiErrorOf` l.184-198 ; `redactKey` l.218-220 ; `excerpt` l.223-225, `MAX_EXCERPT_LENGTH`
  = 200 l.35) ; `src/llm/models/index.ts` (`LLMError`, `status` et `retryAfterMs` posés seulement
  quand donnés, l.91-116) ; `tests/llm/providers/gemini/gemini-llm-provider.test.ts` l.1-40,
  l.255-360, l.520-620 (`ENDPOINT` l.259, `respondingFetch` l.262-273, `unreadableFetch`,
  `TransportError` l.289, `expectFailure` l.291-305 rend l'erreur typée `TransportError`, test de
  #26 l.337-342 entre `a 404 that carries no Gemini error points at baseURL` l.327 et
  `an error body that cannot be read is an API_ERROR with the status` l.344 ; corps vide attendu
  `(empty body)` l.323, l.546, l.603).
- `grep -rn "empty body\|empty error message"` hors `node_modules`, `docs`, `dist`, `.git` : seules
  `src/llm/providers/gemini/gemini-llm-provider.ts:146` et les lignes 323, 338, 340, 546, 603 du
  fichier de test. Aucun autre consommateur dans le dépôt (R-3).
- **Sonde sans installation.** Aucune installation n'est permise à ce rôle. Le planificateur a
  extrait `HEAD` (`git archive`, 491746a) dans `docs/plans/.probe-32/` de ce worktree, l'a compilé
  avec le `tsc` 5.9.3 déjà installé dans le dépôt principal
  (`C:/Projects/Perso/agent-core/node_modules/typescript`, `@types/node` résolu par remontée de
  dossiers), a appliqué les éditions de ce plan sur la copie par remplacement exact à occurrence
  unique, puis a supprimé ce dossier (`git status --short --untracked-files=all` revenu aux trois
  fichiers du lancement). Le `src/` et les `tests/` de ce worktree n'ont jamais été modifiés.
  Observé par `node --test --test-reporter=tap`, garde réseau à 0 :
  - référence `main` : suite code 0, `# tests 387`, `# pass 385`, `# fail 0`, `# skipped 2` ;
    fichier Gemini seul : `# tests 39`, `# pass 39` ;
  - TEST-1 écrit, `src/` de `main` : fichier code 1, 39 / 38 / `# fail 1`, seul
    `not ok 14 - an error body whose error.message is empty is labelled (empty error message), not (empty body)` ;
    suite code 1, 387 / 384 / 1 / 2 ;
  - SPEC-1 appliquée : build code 0, `tsc --noEmit` code 0 sans sortie, fichier 39 / 39, suite
    code 0, 387 / 385 / 0 / 2 ; `diff -r -x "*.js"` de `dist/` avant/après → vide, code 0 (seul
    `dist/llm/providers/gemini/gemini-llm-provider.js` diffère) ;
  - M1, M3, M4 : fichier 39 / 38 / 1 (TEST-1 seul), suite 387 / 384 / 1 / 2 ; M2 : fichier
    39 / 36 / 3 (les trois tests du corps vide, eux seuls), suite 387 / 382 / 3 / 2. Lignes
    `expected` / `actual` recopiées en 1.6.
- Unicité des ancres « remplacer » vérifiée sur la sonde (une occurrence chacune).
- Longueur des sujets mesurée (`len` Python) : 65 (`fix(llm): distinguer un error.message Gemini
  vide d'un corps vide`), 62 (`chore(checklist): cocher les gates et consigner les hypothèses`) ;
  squash et titre de PR 65 sans suffixe, 71 avec ` (#NN)`.
- Contrôles de la tâche 2 déjà lancés sur `main` : `git grep -n "console\.log" -- src` → vide ;
  `git grep -n -E "AIza[0-9A-Za-z_-]{35}" -- scripts src tests` → vide ;
  `git grep -n "#32" -- src tests` → vide.

## Totaux attendus

- `npm run test` = `npm run build && node --test` : le build est refait à chaque lancement.
  `node --test` d'un seul fichier ne rebuild pas : `npm run build` le précède toujours.
- Commande ciblée, notée **[F]** dans ce plan :
  `node --test --test-reporter=tap tests/llm/providers/gemini/gemini-llm-provider.test.ts`
  (P4 : `--test-reporter=tap` fixe la forme de sortie).
- Les numéros TAP de la suite entière (`not ok 279 - …`) dépendent de l'ordre des fichiers : ce
  plan les écrit `…` ; ceux du fichier seul (`not ok 14`) sont stables. Si la référence B diffère
  de 387 à la tâche 0, décaler d'autant les `# tests` et `# pass` de la suite ; les nombres
  d'échecs, les titres et les totaux du fichier seul ne changent pas.

| Étape | Commande | Code | `# tests` | `# pass` | `# fail` | `# skipped` |
|---|---|---|---|---|---|---|
| 0.3 référence | `npm run test` | 0 | 387 | 385 | 0 | 2 |
| 1.2 rouge | [F] | 1 | 39 | 38 | 1 | 0 |
| 1.2 rouge | `npm run test` | 1 | 387 | 384 | 1 | 2 |
| 1.4 vert | [F] | 0 | 39 | 39 | 0 | 0 |
| 1.4 vert | `npm run test` | 0 | 387 | 385 | 0 | 2 |
| 1.6 M1, M3, M4 | [F] | 1 | 39 | 38 | 1 | 0 |
| 1.6 M2 | [F] | 1 | 39 | 36 | 3 | 0 |
| 1.6 après restaurations | [F] | 0 | 39 | 39 | 0 | 0 |
| 2 GATE-3 | `npm run test` | 0 | 387 | 385 | 0 | 2 |

Chaque « Édition » et chaque « Mutation » se fait par l'outil Edit (`old_string` = premier bloc,
`new_string` = second bloc). Chaque premier bloc est présent **une seule fois** dans le fichier au
moment où l'édition s'applique. S'il n'est pas trouvé, relire le fichier (outil Read) et recopier
le bloc depuis la lecture, sans changer le texte.

---

## Tâche 0 · préparation

1. `git status --short` → sortie attendue, exactement :
   ```
   ?? docs/plans/2026-10-01-gemini-empty-error-label-estimate.json
   ?? docs/plans/2026-10-01-gemini-empty-error-label-plan.md
   ?? docs/specs/2026-10-01-gemini-empty-error-label-checklist.md
   ?? docs/specs/2026-10-01-gemini-empty-error-label-design.md
   ```
   (Si une version `-plan-v2.md` a été écrite, elle s'ajoute à cette liste.)
2. `npm ci` (timeout 600000) → code 0 ; le script `prepare` lance `tsc -p tsconfig.build.json`, qui
   crée `dist/` ; une ligne qui commence par `added 3 packages` (`@types/node`, `typescript`,
   `undici-types`, ceux de `node_modules/` du dépôt principal). Sortie déduite du
   `package-lock.json` et du précédent de #46, non lancée par le planificateur (installation
   interdite à ce rôle).
3. Garde réseau → code 0. Puis `npm run test` (timeout 600000) → code 0, fin TAP `# tests 387`,
   `# pass 385`, `# fail 0`, `# skipped 2`. Noter la valeur B de `# tests`.
4. `cp -r dist <dossier_tmp>/agent-core-issue32-dist-before` → sortie vide, code 0.
5. `git status --short` → les mêmes lignes qu'en 1 (`node_modules/` et `dist/` sont ignorés).

Aucun commit dans cette tâche.

---

## Tâche 1 · SPEC-1 · libellé de vide selon sa source, dans `httpError`

### 1.1 Écrire TEST-1 (ajustement en place du test de #26)

Édition 1.1 · `tests/llm/providers/gemini/gemini-llm-provider.test.ts` · remplacer (l.337-342) :

```ts
// Fixed as it is (R1 of #26): the body is not empty, only its error.message is.
test("an error body whose error.message is empty is labelled (empty body)", async () => {
  const double = respondingFetch(400, JSON.stringify({ error: { code: 400, message: "", status: "INVALID_ARGUMENT" } }));
  await expectFailure(double.fetch, "API_ERROR", `Gemini 400 INVALID_ARGUMENT from ${ENDPOINT}: (empty body)`);
  assert.equal(double.count(), 1);
});
```

par :

```ts
// #32, correcting R1 of #26: an empty error.message is not an empty body; a missing one quotes the body.
test("an error body whose error.message is empty is labelled (empty error message), not (empty body)", async () => {
  const emptyMessage = { error: { code: 400, message: "", status: "INVALID_ARGUMENT" } };
  const double = respondingFetch(400, JSON.stringify(emptyMessage), { "retry-after": "7" });
  const badRequest = await expectFailure(
    double.fetch,
    "API_ERROR",
    `Gemini 400 INVALID_ARGUMENT from ${ENDPOINT}: (empty error message)`,
  );
  assert.equal(double.count(), 1);
  assert.equal(badRequest.status, 400);
  assert.equal(badRequest.retryAfterMs, 7000);
  const emptyNotFound = { error: { code: 404, message: "", status: "NOT_FOUND" } };
  const noModel = await expectFailure(
    respondingFetch(404, JSON.stringify(emptyNotFound)).fetch,
    "MODEL_NOT_FOUND",
    `Gemini has no model 'gemini-2.5-flash' (404 NOT_FOUND from ${ENDPOINT}): (empty error message)`,
  );
  assert.equal(noModel.status, 404);
  const noMessage = JSON.stringify({ error: { code: 400, status: "INVALID_ARGUMENT" } });
  await expectFailure(
    respondingFetch(400, noMessage).fetch,
    "API_ERROR",
    `Gemini 400 INVALID_ARGUMENT from ${ENDPOINT}: ${noMessage}`,
  );
});
```

Noms utilisés, tous définis : `test`, `assert` (imports l.1-2), `respondingFetch` (l.262),
`expectFailure` (l.291, rend `TransportError` qui porte `status?` et `retryAfterMs?`), `ENDPOINT`
(l.259). Locales nouvelles : `emptyMessage`, `double`, `badRequest`, `emptyNotFound`, `noModel`,
`noMessage`. `noMessage` vaut `{"error":{"code":400,"status":"INVALID_ARGUMENT"}}` (50 caractères,
sous la borne de 200 d'`excerpt`). Les trois tests du corps vide (l.318-325, l.525-549, l.592-…)
et les onze `REDACTION_CASES` ne sont pas touchés. Le fichier passe de 681 à 701 lignes.

### 1.2 Constater le rouge préalable (`src/` intact)

1. `git diff --stat -- src` → sortie vide (`src/` intact).
2. `npm run build` (timeout 600000) → `> tsc -p tsconfig.build.json`, code 0.
3. Garde réseau → code 0. Puis [F] (timeout 600000) → code 1, fin `# tests 39`, `# pass 38`,
   `# fail 1` ; seul échec, observé (le bloc porte aussi `Expected values to be strictly equal:`,
   un diff coloré et `operator: 'strictEqual'`) :
   ```
   not ok 14 - an error body whose error.message is empty is labelled (empty error message), not (empty body)
     expected: 'Gemini 400 INVALID_ARGUMENT from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: (empty error message)'
     actual: 'Gemini 400 INVALID_ARGUMENT from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: (empty body)'
   ```
   La pile pointe `tests/llm/providers/gemini/gemini-llm-provider.test.ts:341:22` (cas 1). Échec
   pour la bonne raison : le libellé distinct n'existe pas encore.
4. Garde réseau → code 0. Puis `npm run test` (timeout 600000) → code 1, `# tests 387`,
   `# pass 384`, `# fail 1`, `# skipped 2`, seul `not ok … - an error body whose error.message is
   empty is labelled (empty error message), not (empty body)`.

### 1.3 Écrire SPEC-1

Édition 1.3a · `src/llm/providers/gemini/gemini-llm-provider.ts` · remplacer (commentaire de
`httpError`, l.135-136) :

```ts
 * The LLMError of a non-ok response. The message quotes Gemini's error.message when the body
 * carries one (H8), else the body text, always as a bounded excerpt and never the raw body (D2).
```

par :

```ts
 * The LLMError of a non-ok response. An error.message that is "" ends the message with
 * (empty error message), an empty body with (empty body) (#32). The message quotes Gemini's
 * error.message when the body carries one (H8), else the body text, always as a bounded excerpt
 * and never the raw body (D2).
```

Édition 1.3b · `src/llm/providers/gemini/gemini-llm-provider.ts` · remplacer (l.145-146) :

```ts
  const detail = gemini?.message ?? text;
  const extract = detail === "" ? "(empty body)" : excerpt(redactKey(detail, apiKey));
```

par :

```ts
  const detail = gemini?.message ?? text;
  // "" from error.message is not an empty body: the body carries an error object (#32).
  const emptyLabel = gemini?.message === "" ? "(empty error message)" : "(empty body)";
  const extract = detail === "" ? emptyLabel : excerpt(redactKey(detail, apiKey));
```

`gemini` (l.144, `{ status?: string; message?: string } | undefined`), `detail`, `excerpt`,
`redactKey`, `apiKey` existent déjà ; `emptyLabel` est une locale nouvelle. Le fichier passe de
225 à 229 lignes ; la ligne `emptyLabel` est la l.149, le commentaire `#32` les l.136 et l.148.

### 1.4 Constater le vert et l'API inchangée

1. `npm run build` (timeout 600000) → `> tsc -p tsconfig.build.json`, code 0.
2. Garde réseau → code 0. Puis [F] → code 0, `# tests 39`, `# pass 39`, `# fail 0`, dont
   `ok 14 - an error body whose error.message is empty is labelled (empty error message), not (empty body)`.
3. Garde réseau → code 0. Puis `npm run test` (timeout 600000) → code 0, `# tests 387`,
   `# pass 385`, `# fail 0`, `# skipped 2` (B inchangé : TEST-1 remplace un test).
4. `npm run typecheck` (timeout 600000) → `> tsc --noEmit`, code 0, aucune erreur.
5. `diff -r -x "*.js" <dossier_tmp>/agent-core-issue32-dist-before dist` → sortie **vide**, code 0
   (aucun `.d.ts` ne change ; `httpError` n'est pas exportée).
6. `diff -r -q <dossier_tmp>/agent-core-issue32-dist-before dist` → code 1, exactement une ligne :
   `Files <dossier_tmp>/agent-core-issue32-dist-before/llm/providers/gemini/gemini-llm-provider.js and dist/llm/providers/gemini/gemini-llm-provider.js differ`.

Si 5 ou 6 diffère, s'arrêter : un type ou un autre module a changé.

### 1.5 Commit

Cocher `[SPEC-1]` et `[TEST-1]` dans `docs/specs/2026-10-01-gemini-empty-error-label-checklist.md`
(outil Edit, `- [ ]` devient `- [x]` sur ces deux lignes). Les documents de l'issue entrent dans
ce commit (spécification, « Ordre des commits et preuves » ; précédent P1 de #20, #35, #39, #41,
#46, #31).

`git add src/llm/providers/gemini/gemini-llm-provider.ts tests/llm/providers/gemini/gemini-llm-provider.test.ts docs/specs/2026-10-01-gemini-empty-error-label-checklist.md docs/specs/2026-10-01-gemini-empty-error-label-design.md docs/plans/2026-10-01-gemini-empty-error-label-estimate.json docs/plans/2026-10-01-gemini-empty-error-label-plan.md`
(ajouter `docs/plans/2026-10-01-gemini-empty-error-label-plan-v2.md` s'il existe) → sortie
attendue : vide ou des avertissements `LF will be replaced by CRLF`, rien d'autre.

Outil Write sur `<dossier_tmp>/agent-core-issue32-commit-msg.txt` (outil Read d'abord s'il
existe), message (sujet de 65 caractères) :

```
fix(llm): distinguer un error.message Gemini vide d'un corps vide

Dans httpError (src/llm/providers/gemini/gemini-llm-provider.ts), le
libellé de vide dépend de sa source : emptyLabel vaut « (empty error
message) » quand le corps JSON porte un objet error dont message vaut
"", « (empty body) » sinon. detail et son ?? sont inchangés, comme
status, retryAfterMs, le code (API_ERROR ou MODEL_NOT_FOUND), le
masquage [redacted] et les .d.ts de dist/.

Le test de #26 qui figeait l'ancien libellé (R1) est ajusté en place
dans tests/llm/providers/gemini/gemini-llm-provider.test.ts : 400 avec
retry-after 7, 404 NOT_FOUND, objet error sans message (extrait du
corps). Rouge avant ce commit (npm run build puis node --test du
fichier) : ce seul test échoue, actual « …: (empty body) » contre
expected « …: (empty error message) ».

Refs: #32
Session: <id>
Model: <modèle>
Authorship: ai
```

`<id>` est l'identifiant de la session du builder, `<modèle>` son modèle exact ; aucune ligne
`Co-Authored-By`.

`git commit -F <dossier_tmp>/agent-core-issue32-commit-msg.txt` → sortie attendue : une ligne
`[fix/32-gemini-empty-error-label <sha>] fix(llm): distinguer un error.message Gemini vide d'un corps vide`,
`6 files changed` (7 avec un plan v2), quatre lignes `create mode` (les documents de l'issue ;
cinq avec un plan v2). Aucune sortie du hook `commit-msg` (message conforme).

### 1.6 Mutations M1 à M4, après le commit, jamais commitées

`git status --short` → sortie attendue : vide (arbre propre).

Cycle de chaque mutation, dans l'ordre M1, M2, M3, M4, chacune seule sur l'arbre propre :
a) Mutation par l'outil Edit ; b) `npm run build` → code 0 ; c) garde réseau → code 0, puis [F] →
sortie ci-dessous ; d) `git restore src/llm/providers/gemini/gemini-llm-provider.ts` → sortie
vide ; e) `git diff --stat` → sortie **vide**.

**M1** · remplacer :

```ts
  const emptyLabel = gemini?.message === "" ? "(empty error message)" : "(empty body)";
```

par :

```ts
  const emptyLabel = "(empty body)";
```

[F] → code 1, `# tests 39`, `# pass 38`, `# fail 1`, observé :

```
not ok 14 - an error body whose error.message is empty is labelled (empty error message), not (empty body)
  expected: 'Gemini 400 INVALID_ARGUMENT from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: (empty error message)'
  actual: 'Gemini 400 INVALID_ARGUMENT from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: (empty body)'
```

(pile : `tests/llm/providers/gemini/gemini-llm-provider.test.ts:341:22`, cas 1).

**M2** · remplacer la même ligne :

```ts
  const emptyLabel = gemini?.message === "" ? "(empty error message)" : "(empty body)";
```

par :

```ts
  const emptyLabel = "(empty error message)";
```

[F] → code 1, `# tests 39`, `# pass 36`, `# fail 3`, exactement ces trois titres (TEST-1 passe),
observé :

```
not ok 12 - a non-ok response quotes its status and a bounded excerpt of its body, never the whole body
  expected: 'Gemini 500 from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: (empty body)'
  actual: 'Gemini 500 from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: (empty error message)'
not ok 32 - every LLMError of a non-ok response carries its status, 404 NOT_FOUND included
  expected: 'Gemini 503 from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: (empty body)'
  actual: 'Gemini 503 from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: (empty error message)'
not ok 35 - a Retry-After in whole seconds is retryAfterMs on every error of a non-ok response
  expected: 'Gemini 503 from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: (empty body)'
  actual: 'Gemini 503 from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: (empty error message)'
```

(piles : `…test.ts:323:3`, `…test.ts:563:17`, `…test.ts:620:15`).

**M3** · remplacer (mutation de #26) :

```ts
  const detail = gemini?.message ?? text;
```

par :

```ts
  const detail = gemini?.message || text;
```

[F] → code 1, `# tests 39`, `# pass 38`, `# fail 1`, observé :

```
not ok 14 - an error body whose error.message is empty is labelled (empty error message), not (empty body)
  expected: 'Gemini 400 INVALID_ARGUMENT from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: (empty error message)'
  actual: 'Gemini 400 INVALID_ARGUMENT from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: {"error":{"code":400,"message":"","status":"INVALID_ARGUMENT"}}'
```

(pile : `…test.ts:341:22`, cas 1).

**M4** · remplacer :

```ts
  const detail = gemini?.message ?? text;
```

par :

```ts
  const detail = gemini === undefined ? text : (gemini.message ?? "");
```

[F] → code 1, `# tests 39`, `# pass 38`, `# fail 1`, observé (échec sur le cas 3, `message`
absent) :

```
not ok 14 - an error body whose error.message is empty is labelled (empty error message), not (empty body)
  expected: 'Gemini 400 INVALID_ARGUMENT from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: {"error":{"code":400,"status":"INVALID_ARGUMENT"}}'
  actual: 'Gemini 400 INVALID_ARGUMENT from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: (empty body)'
```

(pile : `…test.ts:357:3`, cas 3).

Après M4 et sa restauration : `npm run build` → code 0 ; garde réseau → code 0 ; [F] → code 0,
`# tests 39`, `# pass 39`, `# fail 0` ; `git status --short` → vide.

Recopier les sorties de 1.2 et de 1.6 (lignes `not ok`, `expected`, `actual`, compteurs
`# tests`, `# pass`, `# fail`, et les `git diff --stat` vides) dans le rapport du builder et,
résumées, dans le corps de PR.

---

## Tâche 2 · gates, checklist, contrôles, taille et corps de PR

Chaque gate par son propre appel, `timeout` 600000, dans cet ordre (le typecheck lit les `.d.ts`
de `dist/` produits par le build, et les tests importent `dist/`) :

| Gate | Commande | Sortie attendue |
|---|---|---|
| GATE-1 build | `npm run build` | `> tsc -p tsconfig.build.json`, code 0, aucune erreur |
| GATE-2 typecheck | `npm run typecheck` | `> tsc --noEmit`, code 0, aucune erreur |
| GATE-3 test | garde réseau (code 0), puis `npm run test` | code 0, fin TAP : `# tests 387`, `# pass 385`, `# fail 0`, `# skipped 2` (= B), et `ok … - an error body whose error.message is empty is labelled (empty error message), not (empty body)` |

Juste après GATE-3 : `git status --short` → sortie attendue : vide.

Puis, dans `docs/specs/2026-10-01-gemini-empty-error-label-checklist.md` : cocher `[GATE-1]`,
`[GATE-2]`, `[GATE-3]`, et remplacer la ligne `(vide à la rédaction ; builder y inscrit …)` sous
`## Hypothèses` par les entrées de la section « Hypothèses » de ce plan, une par ligne, préfixées
`- [H]`. `git add docs/specs/2026-10-01-gemini-empty-error-label-checklist.md` ; outil Read puis
Write sur `<dossier_tmp>/agent-core-issue32-commit-msg.txt`, message (sujet de 62 caractères) :

```
chore(checklist): cocher les gates et consigner les hypothèses

Refs: #32
Session: <id>
Model: <modèle>
Authorship: ai
```

`git commit -F <dossier_tmp>/agent-core-issue32-commit-msg.txt` → sortie attendue :
`1 file changed`.

Contrôles, chaque commande par son propre appel, résultats à recopier dans le corps de PR, chemins
relatifs au dépôt dans toute preuve :

1. `git fetch origin` → sortie attendue : vide ou une ligne de mise à jour.
2. `git log --oneline HEAD..origin/main` → sortie attendue : vide (sinon `main` a bougé : le
   signaler au pilote avant la PR, sans rebase ni merge décidé seul).
3. `git diff --name-only origin/main...HEAD` → sortie attendue, exactement ces six chemins :
   ```
   docs/plans/2026-10-01-gemini-empty-error-label-estimate.json
   docs/plans/2026-10-01-gemini-empty-error-label-plan.md
   docs/specs/2026-10-01-gemini-empty-error-label-checklist.md
   docs/specs/2026-10-01-gemini-empty-error-label-design.md
   src/llm/providers/gemini/gemini-llm-provider.ts
   tests/llm/providers/gemini/gemini-llm-provider.test.ts
   ```
   (plus `docs/plans/2026-10-01-gemini-empty-error-label-plan-v2.md` s'il existe).
4. `git diff --name-only origin/main...HEAD -- src/llm/models src/llm/providers/gemini/gemini-wire.ts src/index.ts src/llm/index.ts README.md docs/guide-agent-package.md package.json package-lock.json scripts`
   → sortie attendue : **vide**.
5. `git diff --name-only -G export origin/main...HEAD -- src` → sortie attendue : **vide** (aucune
   ligne ajoutée ou retirée de `src/` ne contient `export`).
6. `git diff --name-only -G "process\.env|readFile|console\.|fetch\(|LLMErrorCode|retryAfterMs|status:" origin/main...HEAD -- src`
   → sortie attendue : **vide** (ni environnement, ni fichier, ni log, ni appel réseau, ni code,
   ni `status` / `retryAfterMs` touchés).
7. `git diff --numstat origin/main...HEAD -- src tests` → sortie attendue, exactement :
   ```
   7	3	src/llm/providers/gemini/gemini-llm-provider.ts
   24	4	tests/llm/providers/gemini/gemini-llm-provider.test.ts
   ```
8. `git grep -n "#32" -- src` → sortie attendue, exactement :
   ```
   src/llm/providers/gemini/gemini-llm-provider.ts:136: * (empty error message), an empty body with (empty body) (#32). The message quotes Gemini's
   src/llm/providers/gemini/gemini-llm-provider.ts:148:  // "" from error.message is not an empty body: the body carries an error object (#32).
   ```
9. `git grep -n "console\.log" -- src` → sortie attendue : vide.
10. `git grep -n -E "AIza[0-9A-Za-z_-]{35}" -- scripts src tests` → sortie attendue : vide.
11. `git log --format=%s origin/main..HEAD` → sortie attendue, exactement, du plus récent au plus
    ancien :
    ```
    chore(checklist): cocher les gates et consigner les hypothèses
    fix(llm): distinguer un error.message Gemini vide d'un corps vide
    ```
12. `git log --format=%h -i --grep=Co-Authored-By origin/main..HEAD` → sortie attendue : vide ;
    puis `git log --format=%B origin/main..HEAD` et vérifier à la lecture deux blocs de trailers
    `Refs: #32` / `Session:` / `Model:` / `Authorship: ai`.
13. Outil Write sur `<dossier_tmp>/agent-core-issue32-pr-title.txt` : une ligne,
    `fix(llm): distinguer un error.message Gemini vide d'un corps vide` (65 caractères). Corps de
    PR écrit (voir plus bas), puis
    `python C:/Projects/dev-kit/scripts/pr_title.py --title-file <dossier_tmp>/agent-core-issue32-pr-title.txt --body-file <dossier_tmp>/agent-core-issue32-pr-body.md`
    → `pr_title : conforme`, code 0 (règle A4 : le message squashé, titre + corps, a son dernier
    paragraphe en trailers).
14. `python C:/Projects/dev-kit/scripts/pr_size.py origin/main HEAD --body-file <dossier_tmp>/agent-core-issue32-pr-body.md`
    → sortie attendue :
    `hors docs/ et *.md : +31/-7 lignes (code +7, tests +24), seuil 400 respecté`, code 0.
    Recopier la ligne mesurée dans le corps de PR.

Corps de PR (outil Write sur `<dossier_tmp>/agent-core-issue32-pr-body.md`, sections du dépôt :
Contexte, Changements, Vérifications, Métriques, Risques et suivi, Hypothèses, Message de squash
proposé). Il porte obligatoirement :

- `Closes #32` dans « Contexte », l'origine (relevé sur #25, PR #29 ; figé par R1 de #26) ; la
  table des cas de la spécification réduite à l'effet observable : seul le texte de
  `LLMError.message` change, et seulement quand le corps JSON porte un objet `error` à `message`
  égal à `""` (`: (empty body)` → `: (empty error message)`) ; `name`, `code`, `status`,
  `retryAfterMs`, absence de `cause`, masquage `[redacted]`, un seul appel à `fetch` inchangés ;
  la taille : environ 30 lignes estimées (fourchette 25 à 40), la ligne mesurée par `pr_size.py`,
  sous le seuil de 400, sans dérogation, et l'écart du code expliqué (P2).
- Les trois gates avec leur dernière ligne de sortie, et la référence (B = 387 tests sur 491746a).
- Le rouge préalable de 1.2 (seul TEST-1, `actual` `…: (empty body)`), le vert de 1.4, les
  contrôles d'API de 1.4 (5 et 6 : aucun `.d.ts` changé), les mutations M1 à M4 de 1.6 (titres,
  `expected` / `actual`, compteurs, annulées par
  `git restore src/llm/providers/gemini/gemini-llm-provider.ts`, `git diff --stat` vide), et les
  contrôles 2 à 14 avec leur résultat. La garde `GEMINI_INTEGRATION` à 0 avant chaque test.
- Aucun fichier `.env` ouvert ni lu ; aucun fournisseur hébergé appelé (fetch injecté) ; aucun
  `console.log` dans `src/` ; aucune valeur de clé dans les fichiers touchés ; aucun symbole ni
  type exporté changé ; aucun code de `LLMErrorCode` ajouté, retiré ou réattribué.
- Section « Hypothèses » : **toutes** les hypothèses de la section « Hypothèses » de ce plan,
  chacune nommée et recopiée en entier, R-1 à R-3 d'abord.
- La section « Message de squash proposé », sujet **et** corps, repris de la spécification, dans
  un bloc de code, sans ligne `Co-Authored-By` (sujet : 65 caractères sans le suffixe
  ` (#<PR>)`, 71 avec un numéro à deux chiffres ; `<PR>` remplacé par le numéro une fois connu) :

```
fix(llm): distinguer un error.message Gemini vide d'un corps vide (#<PR>)

Une réponse Gemini non ok dont le corps JSON porte un error.message
vide finissait son message d'erreur par « (empty body) » alors que le
corps n'est pas vide. Elle finit désormais par « (empty error
message) » ; « (empty body) » reste réservé au corps réellement vide,
et un objet error sans message cite toujours l'extrait du corps.

Effet observable : le texte de LLMError.message de ce seul cas. Le
code (API_ERROR ou MODEL_NOT_FOUND), status et retryAfterMs (#34),
l'absence de cause et le masquage [redacted] de la clé sont
inchangés. Le test qui figeait l'ancien libellé (R1 de #26) est
ajusté dans
tests/llm/providers/gemini/gemini-llm-provider.test.ts ; preuve par
rouge préalable et par quatre mutations de
src/llm/providers/gemini/gemini-llm-provider.ts annulées sans commit.
Aucun appel réseau : fetch injecté.

Refs: #32
Session: <id>
Model: <modèle>
Authorship: ai
```

- **Règle A4** : le corps de PR se **termine** par le bloc de trailers, hors de tout bloc de code,
  séparé du reste par une ligne vide, et rien après lui (ni ligne « Generated with », ni ligne
  vide de texte) :

```
Refs: #32
Session: <id>
Model: <modèle>
Authorship: ai
```

Relire le fichier (outil Read) dans l'appel qui précède immédiatement toute commande qui le publie
(`gh pr create --body-file`, `gh pr edit --body-file`). Le builder ne merge pas.

---

## Hypothèses (à recopier toutes dans la checklist et dans la PR)

- **R-1** (spécification) · Forme réelle d'un `error.message` vide chez Gemini : non observée sur
  l'API réelle ; le cas est construit sur un double, comme H8 de #25. Le correctif ne dépend que
  de `typeof message === "string" && message === ""`.
- **R-2** (spécification) · Textes faits de blancs seuls : un `error.message` valant `" "` ou un
  corps valant `"  "` sont cités tels quels (message qui finit par `: ` suivi de blancs), avant
  comme après #32. Hors de l'attendu de l'issue ; candidat à une issue de suivi si le pilote veut
  un libellé pour eux.
- **R-3** (spécification) · Consommateurs qui comparent le texte : aucun dans le dépôt (recherche
  de `empty body` hors `docs/` : `src/llm/providers/gemini/gemini-llm-provider.ts:146` et le
  fichier de test seulement). Un consommateur externe qui comparait `(empty body)` pour ce cas
  verra le nouveau libellé ; le message n'est pas un contrat (`code` l'est), d'où le type `fix`
  sans montée de version.
- **P1** · Les documents de l'issue (spécification, checklist, estimation, plan) entrent dans le
  commit de SPEC-1 (spécification ; précédent P1 de #20, #35, #39, #41, #46, #31).
- **P2** · Commentaire de `httpError` : la phrase de la checklist est insérée littéralement
  « après sa première phrase », c'est-à-dire juste après `The LLMError of a non-ok response.` ;
  la phrase suivante (`The message quotes Gemini's error.message …`) est repliée sur trois lignes
  sous 100 colonnes, texte inchangé. D'où code +7 −3 au lieu des +4 −1 estimés.
- **P3** · Forme de TEST-1 : constantes locales `emptyMessage`, `emptyNotFound`, `noMessage` et
  erreurs nommées `badRequest`, `noModel`, appels `expectFailure` sur plusieurs lignes comme
  leurs voisins (l.525-549) ; un seul `test()`, même position, titre et commentaire de la
  checklist mot pour mot. Tests +24 −4.
- **P4** · Les commandes ciblées ajoutent `--test-reporter=tap` à
  `node --test tests/llm/providers/gemini/gemini-llm-provider.test.ts` de la spécification, pour
  que la forme de la sortie (`not ok`, `expected`, `actual`, `# tests`) soit celle de ce plan quel
  que soit le terminal ; le fichier et les tests exécutés sont les mêmes.
- **P5** · Sorties observées par le planificateur sur une sonde (`git archive` de 491746a, compilée
  par le `tsc` 5.9.3 du dépôt principal), pas sur un build frais de ce worktree ; `npm ci` non
  lancé (installation interdite à ce rôle). Un écart de totaux à la tâche 0 se traite comme dit
  dans « Totaux attendus ».
- **P6** · Taille : +31 −7 mesurées hors `docs/` et `*.md` (38 lignes), dans la fourchette 25 à
  40 de la spécification, sous le seuil de 400.
- **P7** · Fins de ligne : source et test en CRLF dans la copie de travail (`core.autocrlf`
  `true`), stockés en LF par git ; les éditions se font par l'outil Edit, qui garde la fin de ligne
  du fichier.
- **Node** · Node local ≥ 22.18 (retrait de types sans drapeau), constaté v22.19.0.

## Risques

- **`dist/` absent ou périmé** : les tests et le typecheck lisent `dist/` ; [F] ne rebuild pas.
  Toujours `npm ci` (tâche 0) avant tout le reste, et `npm run build` avant chaque [F] ; un [F]
  lancé sans build après une mutation testerait l'état précédent et donnerait une preuve fausse.
- **Copie de `dist/` de `main`** : faite en 0.4, avant l'édition 1.3 ; faite après un build de la
  branche, le `diff` de 1.4 serait vide et ne prouverait rien.
- **Mutation oubliée** : une mutation non annulée partirait dans le commit de la tâche 2 ; le
  `git diff --stat` vide après chaque restauration, `git status --short` vide après GATE-3 et le
  contrôle 7 (numstat exact) l'interdisent.
- **Garde réseau** : si `GEMINI_INTEGRATION` est posée dans l'environnement du builder, la suite
  lancerait le test d'intégration hébergé ; la garde avant chaque test l'arrête.
- **Garde d'isolation du worktree** : une commande git composée (`cd … &&`, `; echo $?`, tube) est
  refusée ; lancer chaque commande seule depuis la racine du worktree.
- **R-2** : défaut résiduel déclaré (blancs seuls), hors périmètre, à reprendre en issue si le
  pilote le décide.
