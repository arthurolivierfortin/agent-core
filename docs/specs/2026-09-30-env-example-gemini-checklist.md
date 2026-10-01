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
- [ ] [GATE-1] build — `npm run build`
- [ ] [GATE-2] typecheck — `npm run typecheck`
- [ ] [GATE-3] test — `npm run test`

## Hypothèses
