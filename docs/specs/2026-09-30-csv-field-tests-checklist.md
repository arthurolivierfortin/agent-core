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
- [ ] [GATE-1] build — `npm run build`
- [ ] [GATE-2] typecheck — `npm run typecheck`
- [ ] [GATE-3] test — `npm run test`

## Hypothèses
