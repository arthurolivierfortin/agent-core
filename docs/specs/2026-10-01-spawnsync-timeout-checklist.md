# Checklist · test(scripts): borner par un délai le fils qui prouve que l'intégration Gemini est ignorée · #31

Issue : https://github.com/arthurolivierfortin/agent-core/issues/31
Spécification : docs/specs/2026-10-01-spawnsync-timeout-design.md

## Livrables
- [x] [SPEC-1] Dans le test `TEST-3 (issue 26) le test d'intégration Gemini est ignoré sans GEMINI_INTEGRATION=1`, ajouter juste avant lui la constante `const CHILD_TIMEOUT_MS = 60_000;` précédée du commentaire français de la spécification, ajouter `timeout: CHILD_TIMEOUT_MS,` aux options du `spawnSync` après `encoding: "utf8",`, et insérer entre le `spawnSync` et l'assertion `assert.equal(child.status, 0, …)` le calcul `const timedOut = child.error?.code === "ETIMEDOUT" || child.signal === "SIGTERM";` suivi de `assert.ok(!timedOut, …)` dont le message rendu commence par `node --test tests/integration/gemini.integration.test.ts : le sous-processus a dépassé le délai de ${CHILD_TIMEOUT_MS} ms et a été arrêté (erreur ${child.error?.code}, signal ${child.signal})` et se poursuit par `\n${child.stdout}${child.stderr}`, sans changer le titre du test, la liste `scrubbed` (`GEMINI_INTEGRATION`, `GEMINI_API_KEY`, `NODE_TEST_CONTEXT`), la construction de `env` filtrée sans casse, ni les assertions existantes — fichier attendu : scripts/repo-conventions.test.mjs

## Tests
- [ ] [TEST-1] Le test `TEST-3 (issue 26) le test d'intégration Gemini est ignoré sans GEMINI_INTEGRATION=1` passe sous `npm run test` avec `CHILD_TIMEOUT_MS` à `60_000`, la garde `node -e "process.exit(process.env.GEMINI_INTEGRATION === undefined ? 0 : 1)"` ayant rendu 0 avant toute commande de test ; puis, après le commit de SPEC-1 et `npm run build`, le rapport du builder montre, exécutées dans la session et annulées sans commit par `git restore scripts/repo-conventions.test.mjs` (suivi d'un `git diff --stat -- scripts/repo-conventions.test.mjs` vide), que la mutation A `CHILD_TIMEOUT_MS = 1` fait échouer sous `node --test scripts/repo-conventions.test.mjs` ce seul test avec un message contenant `le sous-processus a dépassé le délai de 1 ms et a été arrêté` et `ETIMEDOUT`, et que la mutation B (A plus le retrait de l'appel `assert.ok(!timedOut, …)`) le fait échouer sur `node --test tests/integration/gemini.integration.test.ts : code null` (exerce SPEC-1) — fichier attendu : scripts/repo-conventions.test.mjs

## Base de données
(aucune)

## Vérifications
- [ ] [GATE-1] build — `npm run build`
- [ ] [GATE-2] typecheck — `npm run typecheck`
- [ ] [GATE-3] test — `npm run test`

## Hypothèses
