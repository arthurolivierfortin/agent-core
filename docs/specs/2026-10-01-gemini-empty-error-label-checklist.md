# Checklist · fix(llm): distinguer un error.message Gemini vide d'un corps vide · #32

Issue : https://github.com/arthurolivierfortin/agent-core/issues/32
Spécification : docs/specs/2026-10-01-gemini-empty-error-label-design.md

## Livrables
- [x] [SPEC-1] Dans `httpError`, laisser `const detail = gemini?.message ?? text;` telle quelle, ajouter juste après elle le commentaire `// "" from error.message is not an empty body: the body carries an error object (#32).` et la ligne `const emptyLabel = gemini?.message === "" ? "(empty error message)" : "(empty body)";`, remplacer la ligne `extract` par `const extract = detail === "" ? emptyLabel : excerpt(redactKey(detail, apiKey));`, et ajouter au commentaire de `httpError`, après sa première phrase, `An error.message that is "" ends the message with (empty error message), an empty body with (empty body) (#32).`, sans toucher au calcul ni au passage de `http` (`status`, `retryAfterMs`), au choix du code (`MODEL_NOT_FOUND` ou `API_ERROR`), aux trois préfixes de message, à `geminiErrorOf`, `readBody`, `redactKey`, `excerpt`, ni à `LLMErrorCode`, et sans aucun `console.log` — fichier attendu : src/llm/providers/gemini/gemini-llm-provider.ts

## Tests
- [x] [TEST-1] Le test de #26 `an error body whose error.message is empty is labelled (empty body)` est ajusté en place, pas supprimé : commentaire remplacé par `// #32, correcting R1 of #26: an empty error.message is not an empty body; a missing one quotes the body.`, titre `an error body whose error.message is empty is labelled (empty error message), not (empty body)`, et trois cas sur `respondingFetch` : (1) 400 `{ error: { code: 400, message: "", status: "INVALID_ARGUMENT" } }` avec l'en-tête `retry-after: 7` rejette `API_ERROR` au message exact `Gemini 400 INVALID_ARGUMENT from ${ENDPOINT}: (empty error message)`, un seul appel au double, `status` 400, `retryAfterMs` 7000 ; (2) 404 `{ error: { code: 404, message: "", status: "NOT_FOUND" } }` rejette `MODEL_NOT_FOUND` au message exact `Gemini has no model 'gemini-2.5-flash' (404 NOT_FOUND from ${ENDPOINT}): (empty error message)`, `status` 404 ; (3) 400 `{ error: { code: 400, status: "INVALID_ARGUMENT" } }` (sans `message`) rejette `API_ERROR` au message exact `Gemini 400 INVALID_ARGUMENT from ${ENDPOINT}: ` suivi de ce corps JSON ; les trois tests existants qui attendent `(empty body)` pour un corps réellement vide (`a non-ok response quotes its status and a bounded excerpt of its body, never the whole body`, `every LLMError of a non-ok response carries its status, 404 NOT_FOUND included`, `a Retry-After in whole seconds is retryAfterMs on every error of a non-ok response`) et les onze `REDACTION_CASES` restent inchangés et verts ; le rapport du builder montre, exécutés dans la session après la garde `node -e "process.exit(process.env.GEMINI_INTEGRATION === undefined ? 0 : 1)"` rendant 0 et chaque fois après `npm run build`, le rouge préalable de ce seul test sur `(empty body)` avant la modification de `src/`, puis, après le commit de SPEC-1 et annulées sans commit par `git restore src/llm/providers/gemini/gemini-llm-provider.ts` (suivi d'un `git diff --stat` vide), les mutations M1 `const emptyLabel = "(empty body)";` (ce seul test échoue), M2 `const emptyLabel = "(empty error message)";` (les trois tests du corps vide échouent, et eux seuls), M3 `gemini?.message || text` (ce seul test échoue) et M4 `const detail = gemini === undefined ? text : (gemini.message ?? "");` (ce seul test échoue, sur le cas 3) (exerce SPEC-1) — fichier attendu : tests/llm/providers/gemini/gemini-llm-provider.test.ts

## Base de données
(aucune)

## Vérifications
- [ ] [GATE-1] build — `npm run build`
- [ ] [GATE-2] typecheck — `npm run typecheck`
- [ ] [GATE-3] test — `npm run test`

## Hypothèses
(vide à la rédaction ; builder y inscrit chaque hypothèse sous laquelle il a poursuivi, une par ligne, préfixée `- [H]`)
