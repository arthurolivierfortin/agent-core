# Checklist · deux tests CSV : un CR seul dans csvField, undefined dans cellText · #17

Issue : https://github.com/arthurolivierfortin/agent-core/issues/17
Spécification : docs/specs/2026-09-30-csv-field-tests-design.md

## Livrables
- [x] [SPEC-1] Fixer par un test, sans modifier `src/`, que `csvField` (`src/agent/testing/matrix-csv.ts:33-35`) met entre guillemets un champ qui contient un retour chariot seul (`\r` non suivi de `\n`), exercé par `report.toCSV()` de `runMatrix` sur la valeur d'axe `"a\rb"`, le test étant inséré après le test « report.toRunsCSV() writes one line per run: failures joined, a thrown error quoted, null empty » — fichier attendu : tests/agent/testing/run-matrix.test.ts
- [x] [SPEC-2] Fixer par un test, sans modifier `src/`, que `cellText` (`src/agent/testing/matrix-csv.ts:28-30`) rend une cellule vide pour `undefined`, identique à celle de `null`, exercé par `report.toCSV()` et `report.toRunsCSV()` de `runMatrix` sur les valeurs d'axe `[null, undefined]`, le test étant inséré après celui de SPEC-1 — fichier attendu : tests/agent/testing/run-matrix.test.ts

## Tests
- [x] [TEST-1] Test de titre `report.toCSV() quotes a field that holds a lone CR (RFC 4180)` : `let t = 0` puis `matrix({ axes: { model: ["a\rb"] }, now: () => (t += 10) })` ; `report.toCSV()` vaut exactement `'scenario,model,runs,passed,successRate,meanDurationMs,tokensUsed,costUsd\r\naller aux reglages,"a\rb",1,1,1,50,,\r\n'` ; vert à l'écriture, et la mutation locale non commitée de `src/agent/testing/matrix-csv.ts:34` `/[",\r\n]/` → `/[",\n]/` le fait échouer, lui seul, puis est annulée par `git restore src/agent/testing/matrix-csv.ts` (exerce SPEC-1) — fichier attendu : tests/agent/testing/run-matrix.test.ts
- [x] [TEST-2] Test de titre `report.toCSV() and report.toRunsCSV() write an empty cell for an undefined axis value, like null` : `let t = 0` puis `matrix({ axes: { memory: [null, undefined] }, now: () => (t += 10) })` ; `report.toCSV()` vaut exactement `"scenario,memory,runs,passed,successRate,meanDurationMs,tokensUsed,costUsd\r\naller aux reglages,,1,1,1,50,,\r\naller aux reglages,,1,1,1,50,,\r\n"` et `report.toRunsCSV()` vaut exactement `"scenario,memory,run,passed,failures,error,durationMs,tokensUsed,costUsd,stopReason\r\naller aux reglages,,1,true,,,50,,,completed\r\naller aux reglages,,1,true,,,50,,,completed\r\n"` ; vert à l'écriture, et la mutation locale non commitée de `src/agent/testing/matrix-csv.ts:29` `value === null || value === undefined ? "" : String(value)` → `value === null ? "" : String(value)` le fait échouer, lui seul, puis est annulée par `git restore src/agent/testing/matrix-csv.ts` (exerce SPEC-2) — fichier attendu : tests/agent/testing/run-matrix.test.ts

## Base de données
(aucune)

## Vérifications
- [x] [GATE-1] build — `npm run build`
- [x] [GATE-2] typecheck — `npm run typecheck`
- [x] [GATE-3] test — `npm run test`

## Hypothèses
- [H] R1 (spécification) · Tests non exécutés à la rédaction de la spécification. Levée par le planificateur : vert sans mutation, rouge sous M1 et sous M2 (un seul échec chacun) et durée `50` observés sur une copie de `main` ; le builder l'a constaté de nouveau dans ce worktree (1.2, 1.3, 2.2, 2.3) : 376 puis 377 tests verts, `# fail 1` sous M1 (TEST-1 seul) et sous M2 (TEST-2 seul), durée `50` sans alignement.
- [H] R2 (spécification, hors périmètre, maintenue) · Vue JSON d'un axe `undefined` : `toJSON()` recopie `{ memory: undefined }` (`src/agent/testing/run-matrix.ts:200`), mais `JSON.stringify(report)` omet la clé : le JSON perd la colonne que le CSV garde vide. Comportement standard de `JSON.stringify`, non demandé ici ; à rouvrir en issue si le pilote veut l'aligner.
- [H] R3 (spécification) · Titre de l'issue. Levée : relu par `gh issue view 17` le 2026-09-30, « test(testing): couvrir le CR seul de csvField et undefined dans cellText ».
- [H] R4 (spécification, maintenue) · Origine. Le corps de l'issue, relu, dit « Relevé par le juge à la review de la PR #16 (#9), deux anomalies mineures » ; la revue de la PR #16 elle-même n'a pas été relue. Les deux attentes de l'issue correspondent à SPEC-1 et SPEC-2.
- [H] P1 · Les documents de l'issue (spécification, checklist, estimation, plan) entrent dans le commit de SPEC-1 (précédent P1 de #20, #35, #39, #41). Un troisième commit, de checklist seulement (`chore(checklist)`), coche les gates et consigne les hypothèses (précédent #41, #27).
- [H] P2 · Sonde du planificateur : copie de `main` dans `docs/plans/.probe-17/` (supprimée), compilée avec le `tsc` 5.9.3 du dépôt principal (même version que `package-lock.json`), aucune installation lancée, `src/` de ce worktree jamais modifié. Les mutations y ont été appliquées à la copie de `src/agent/testing/matrix-csv.ts` puis compilées ; la compilation rend la ligne mutée telle quelle dans `dist/agent/testing/matrix-csv.js`.
- [H] P3 · Référence B = 375 tests (373 verts, 2 ignorés), observée sur la copie de `main` ; un écart en 0.3 décale les totaux, pas les échecs. Constaté par le builder en 0.3 : `# tests 375`, `# pass 373`, `# skipped 2`.
- [H] P4 · Textes repris de la spécification sans changement, y compris les guillemets simples de l'en-tête attendu de TEST-1 (le fichier mêle déjà guillemets simples et doubles, l.323 et l.352). Le titre de TEST-2 dépasse 100 colonnes (118) ; le dépôt n'a ni formateur ni linter, et le fichier a déjà des lignes de 131 colonnes (l.351).
- [H] P5 · Fins de ligne : le test est en CRLF dans la copie de travail, LF dans l'index (`core.autocrlf=true`) ; l'outil Edit peut écrire des lignes LF, `git add` ramène tout à LF ; le contenu commité est prouvé par les empreintes de 1.4 (`f88d3e7a7cfc0fc4e137d42f0ed041a6a095520d`) et 2.4 (`fc86a43f75c1c1d7917c6da1b795819dc8a6849f`), toutes deux constatées.
- [H] P6 · Commande ciblée : `--test-name-pattern` filtre par titre ; les tests non retenus du fichier ne sont pas comptés dans `# tests` (observé : `# tests 1` après TEST-1, `# tests 2` après TEST-2).
- [H] Node · Node local ≥ 22.18 (retrait de types sans drapeau pour les tests `.ts`), constaté v22.19.0 par le planificateur et de nouveau par le builder (`node --version`).
