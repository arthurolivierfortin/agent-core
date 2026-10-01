# Checklist · test(scripts): borner par un délai le fils qui prouve que l'intégration Gemini est ignorée · #31

Issue : https://github.com/arthurolivierfortin/agent-core/issues/31
Spécification : docs/specs/2026-10-01-spawnsync-timeout-design.md

## Livrables
- [x] [SPEC-1] Dans le test `TEST-3 (issue 26) le test d'intégration Gemini est ignoré sans GEMINI_INTEGRATION=1`, ajouter juste avant lui la constante `const CHILD_TIMEOUT_MS = 60_000;` précédée du commentaire français de la spécification, ajouter `timeout: CHILD_TIMEOUT_MS,` aux options du `spawnSync` après `encoding: "utf8",`, et insérer entre le `spawnSync` et l'assertion `assert.equal(child.status, 0, …)` le calcul `const timedOut = child.error?.code === "ETIMEDOUT" || child.signal === "SIGTERM";` suivi de `assert.ok(!timedOut, …)` dont le message rendu commence par `node --test tests/integration/gemini.integration.test.ts : le sous-processus a dépassé le délai de ${CHILD_TIMEOUT_MS} ms et a été arrêté (erreur ${child.error?.code}, signal ${child.signal})` et se poursuit par `\n${child.stdout}${child.stderr}`, sans changer le titre du test, la liste `scrubbed` (`GEMINI_INTEGRATION`, `GEMINI_API_KEY`, `NODE_TEST_CONTEXT`), la construction de `env` filtrée sans casse, ni les assertions existantes — fichier attendu : scripts/repo-conventions.test.mjs

## Tests
- [x] [TEST-1] Le test `TEST-3 (issue 26) le test d'intégration Gemini est ignoré sans GEMINI_INTEGRATION=1` passe sous `npm run test` avec `CHILD_TIMEOUT_MS` à `60_000`, la garde `node -e "process.exit(process.env.GEMINI_INTEGRATION === undefined ? 0 : 1)"` ayant rendu 0 avant toute commande de test ; puis, après le commit de SPEC-1 et `npm run build`, le rapport du builder montre, exécutées dans la session et annulées sans commit par `git restore scripts/repo-conventions.test.mjs` (suivi d'un `git diff --stat -- scripts/repo-conventions.test.mjs` vide), que la mutation A `CHILD_TIMEOUT_MS = 1` fait échouer sous `node --test scripts/repo-conventions.test.mjs` ce seul test avec un message contenant `le sous-processus a dépassé le délai de 1 ms et a été arrêté` et `ETIMEDOUT`, et que la mutation B (A plus le retrait de l'appel `assert.ok(!timedOut, …)`) le fait échouer sur `node --test tests/integration/gemini.integration.test.ts : code null` (exerce SPEC-1) — fichier attendu : scripts/repo-conventions.test.mjs

## Base de données
(aucune)

## Vérifications
- [x] [GATE-1] build — `npm run build`
- [x] [GATE-2] typecheck — `npm run typecheck`
- [x] [GATE-3] test — `npm run test`

## Hypothèses
- [H] R-1 (spécification) · `scripts/h2-report/cli.test.ts:12-15` et `:31` : deux `spawnSync` sans `timeout`, laissés hors de cette PR (D3). Risque de blocage faible (`cli.ts` sans argument refuse avant tout fournisseur ; `--dry-run` n'en construit aucun), non nul. Décision attendue du pilote : (a) issue de suivi « borner les fils de cli.test.ts » avec la même assertion de délai ; (b) `[SPEC-2]` dans cette PR (environ +15 lignes). Sans décision, la PR reste à SPEC-1.
- [H] R-2 (spécification) · Petit-fils orphelin sous Windows : à l'expiration, Node arrête le fils direct et ferme ses tuyaux, mais le sous-processus que `node --test` lance pour le fichier testé peut survivre. La suite ne se fige pas ; un processus peut rester à tuer à la main.
- [H] R-3 (spécification) · Autres erreurs de lancement (`error` sans `ETIMEDOUT`, par exemple `ENOBUFS` au-delà de 1 Mio de sortie) : gardent le message existant `code null`.
- [H] P1 · Les documents de l'issue (spécification, checklist, estimation, plan) entrent dans le commit de SPEC-1 (précédent P1 de #20, #35, #39, #41, #46) ; `[TEST-1]` est coché au second commit, parce que son critère exige les mutations faites après le premier.
- [H] P2 · Le message de l'assertion de délai est le gabarit de la spécification sur une seule ligne (190 colonnes environ), non replié : le fichier porte déjà des lignes de 139 à 221 colonnes (mesuré), aucun outil de formatage n'est configuré dans le dépôt, et le texte rendu est celui de la spécification, sans risque d'erreur de concaténation.
- [H] P3 · Le commentaire de la constante dit « qui dure environ 0,3 s », texte de la spécification repris tel quel (la checklist l'exige). Mesuré par le planificateur : 212 ms seul, 974 ms dans la suite complète (machine chargée par les autres fichiers) ; dans les deux cas, 60 s laisse une marge de plus de 60 fois.
- [H] P4 · Condition `timedOut` gardée telle quelle : sous Windows 11 et Node v22.19.0, à l'expiration, `spawnSync` rend `status: null`, `signal: "SIGTERM"` et `error.code: "ETIMEDOUT"` (cinq lancements de la même commande à `timeout: 1`, observés par le planificateur ; quatre lancements de la mutation A sur la sonde, même message ; mutation A du builder : même message, `erreur ETIMEDOUT, signal SIGTERM`).
- [H] P5 · Sorties observées par le planificateur sur une sonde (`git archive` de 8af02ce, compilée par le `tsc` 5.9.3 du dépôt principal), pas sur un build frais de ce worktree ; `npm ci` non lancé (installation interdite à ce rôle). Le builder a lancé `npm ci` et retrouvé les mêmes totaux (387 / 385 / 0 / 2).
- [H] P6 · Type et scope `test(scripts)` (D5 de la spécification), branche `chore/` d'après le label `T:chore` ; le second commit, qui ne touche que la checklist, est `chore(checklist)` comme dans les PR précédentes ; le squash porte le type `test`.
- [H] Node · Node local ≥ 22.18 (retrait de types sans drapeau), constaté v22.19.0.
