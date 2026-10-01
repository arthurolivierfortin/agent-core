# Checklist · chore: nommer GEMINI_API_KEY et GEMINI_MODEL dans .env.example · #27

Issue : https://github.com/arthurolivierfortin/agent-core/issues/27
Spécification : docs/specs/2026-09-30-env-example-gemini-design.md

## Livrables
- [x] [SPEC-1] Réécrire `.env.example` au contenu exact de la spécification (section Comportement attendu, 19 lignes) : en-tête recoupé qui cite `Setting up Gemini`, puis après le bloc Ollama un commentaire Gemini de 4 lignes qui dit que la clé n'a pas de défaut et qu'aucun script ni test du dépôt ne charge de `.env` en renvoyant à `docs/rapport-h2.md` (étape 2) et à `README.md` (Setting up Gemini), suivi de `# GEMINI_API_KEY=` et `# GEMINI_MODEL=` sans aucune valeur — fichier attendu : .env.example

## Tests
- [x] [TEST-1] Dans `scripts/repo-conventions.test.mjs`, remonter `GOOGLE_KEY_SHAPE` et son commentaire avant `checkEnvExample`, faire refuser par `checkEnvExample` toute ligne contenant `localhost`, `qwen`, `gemini-` ou `googleapis` et toute correspondance de `GOOGLE_KEY_SHAPE` dans le fichier, et faire attendre par le test `TEST-2 .env.example nomme les variables sans valeur` (titre inchangé) les lignes `# LLM_PROVIDER=`, `# OLLAMA_HOST=`, `# OLLAMA_MODEL=`, `# GEMINI_API_KEY=`, `# GEMINI_MODEL=` dans cet ordre ainsi que les textes `Setting up Gemini` et `docs/rapport-h2.md` ; rouge sur le `.env.example` de la base `76d02c1`, vert après SPEC-1, rouge sous chacune des mutations locales non commitées M1 (`# GEMINI_MODEL=x`), M2 (`# default model gemini-2.5-flash`), M3 (commentaire `# AIza` suivi de 35 `x`) et M4 (retrait de `docs/rapport-h2.md`), `TEST-3 examples/web-chat/.env.example nomme les variables sans valeur` restant vert (exerce SPEC-1) — fichier attendu : scripts/repo-conventions.test.mjs

## Base de données
(aucune)

## Vérifications
- [x] [GATE-1] build — `npm run build`
- [x] [GATE-2] typecheck — `npm run typecheck`
- [x] [GATE-3] test — `npm run test`

## Hypothèses
- [H] **R1** (spécification, D3) · Langue de `.env.example` : les commentaires ajoutés sont en anglais, comme tout le fichier et les commentaires de code du dépôt, alors que la dérogation `core/langue` du manifeste ne liste pas `.env.example`. À trancher par Arthur à la revue : accepter (fichier de configuration, comme le code), ou ajouter `.env.example` à la dérogation dans une issue séparée. Ne bloque pas l'issue.
- [H] **R2** (spécification) · Le corps de l'issue n'avait pas été relu par l'agent de spécification. Relu par le planificateur le 2026-09-30 (`gh issue view 27`) : deux attentes et deux contraintes, conformes au périmètre de la spécification ; rien hors périmètre.
- [H] **P1** · Les documents de l'issue (spécification, checklist, estimation, plan) entrent dans le commit de SPEC-1 (spécification, section « Commits » ; précédent P1 de #20, #35, #39). Un second commit, de checklist seulement, coche les gates et consigne les hypothèses (précédent #41).
- [H] **P2** · Textes choisis par ce plan, la spécification n'en donnant que la forme : nom `envExample` de la constante de TEST-2 ; messages `.env.example : renvoi à Setting up Gemini absent` et `.env.example : renvoi à docs/rapport-h2.md absent` ; deux `assert.ok` explicites plutôt qu'une boucle (« deux assertions », D4).
- [H] **P3** · Longueurs : quatre lignes ajoutées au test dépassent 100 colonnes (l'appel `checkEnvExample` de TEST-2, environ 130 ; le filtre des valeurs par défaut, environ 115 ; la ligne `assert.doesNotMatch`, environ 107 ; les deux `assert.ok`, environ 105) ; le dépôt n'a ni formateur ni linter, et le fichier en a déjà (jusqu'à 221 octets, l.338). `.env.example` reste sous 80 colonnes (70 au plus).
- [H] **P4** · Fins de ligne : `.env.example` et le test sont en CRLF dans la copie de travail, LF dans l'index (`core.autocrlf=true`) ; l'outil Edit peut écrire des lignes LF, `git add` ramène tout à LF ; le contenu commité est prouvé par les empreintes de 1.5.
- [H] **P5** · Le rouge, le vert et les mutations se constatent par la commande ciblée (`--test-name-pattern="env.example nomme"`, TEST-2 et TEST-3 seuls, sans `dist/`) ; la suite complète se lance au vert (1.4) et aux gates. Les sorties de ce plan ont été observées par le planificateur sur une sonde réduite (copie du test et des fichiers d'exemple dans un dossier temporaire de `docs/plans/`, supprimé), pas sur ce worktree.
- [H] **P6** · Référence B = 373 tests (371 verts, 2 ignorés) déduite du plan de #41, non d'une exécution ; un écart en 0.3 décale les totaux, pas les échecs. Constaté par le builder en 0.3 sur `361d7a1` : B = 375 (373 verts, 2 ignorés), inchangé après SPEC-1 et à GATE-3.
- [H] **P7** · M3 : la chaîne factice n'existe que dans la copie de travail pendant une commande ; elle n'est recopiée ni dans ce plan, ni dans le rapport, ni dans la PR (bloc `actual` du TAP remplacé).
- [H] **Node** · Node local ≥ 22.18 (retrait de types sans drapeau pour les tests `.ts` de la suite), constaté v22.19.0.
- [H] Risque · Échappement `\n` dans l'outil Edit : `envLines.join("\n")` doit rester une séquence de deux caractères ; contrôlé par `grep -n -F` (ligne 38 seule) et par l'empreinte d'index `044982ff35b617009897bd94a5d8cca7d49f43d8`.
- [H] Risque · Mutation oubliée : `git diff --stat -- .env.example` vide après chacune de M1 à M4, `git status --short` vide en fin de tâche 2.
- [H] Risque · Chaîne factice de M3 publiée : bloc `actual` du TAP non recopié ; `git grep -n -E "AIza[0-9A-Za-z_-]{35}"` vide.
- [H] Risque · `dist/` absent : `npm run test` rebuild à chaque lancement, la commande ciblée n'en dépend pas.
