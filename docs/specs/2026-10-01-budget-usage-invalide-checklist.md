# Checklist · fix(llm): fermer le budget maxTokens aux compteurs d'usage invalides de Gemini et d'Ollama · #51

Issue : https://github.com/arthurolivierfortin/agent-core/issues/51
Spécification : docs/specs/2026-10-01-budget-usage-invalide-design.md

## Livrables
- [x] [SPEC-1] Créer `src/llm/providers/token-count.ts` exportant `isTokenCount(value: unknown): value is number` (vrai seulement pour `typeof value === "number" && Number.isInteger(value) && value >= 0`), absent de `src/llm/providers/index.ts` et de tout barrel, et faire rendre par `toUsage` de `gemini-wire.ts` `undefined` dès que `promptTokenCount` ou `candidatesTokenCount` échoue `isTokenCount`, que `thoughtsTokenCount` présent échoue `isTokenCount`, ou que la somme `candidatesTokenCount + (thoughtsTokenCount ?? 0)` échoue `isTokenCount`, chaque compteur lu une fois, avec le TSDoc de `toUsage` qui cite #51 et nomme le budget `maxTokens` — fichier attendu : src/llm/providers/gemini/gemini-wire.ts
- [x] [SPEC-2] Faire rendre par `toUsage(chunk)` de `ollama-llm-provider.ts` `undefined` dès que `prompt_eval_count` ou `eval_count` échoue `isTokenCount` importé de `../token-count.js`, pour `complete` comme pour le fragment terminal de `stream`, avec un TSDoc de `toUsage` qui cite #51, et ajouter au TSDoc du type `Usage` (`src/llm/models/index.ts`) la phrase « Each counter is an integer >= 0: the shipped adapters leave usage absent rather than report a counter that is not (#51). », sans changer la forme d'aucun type exporté — fichier attendu : src/llm/providers/ollama/ollama-llm-provider.ts

## Tests
- [x] [TEST-1] Pour chacun des `usageMetadata` `{ -1, 5 }`, `{ 10, -1 }`, `{ 10, 5, thoughts -1 }`, `{ 0.5, 5 }`, `{ NaN, 5 }`, `{ 10, Infinity }`, `{ 10, 5, thoughts NaN }` et `{ 10, 1e308, thoughts 1e308 }` (table `INVALID_USAGE_METADATA`, un `test()` par ligne), obtenir `fromGeminiResponse(...).usage` `undefined` et le contenu `"ok"` ; pour `{ 0, 0, thoughts 0 }`, obtenir `{ tokensIn: 0, tokensOut: 0 }` ; rouge avant SPEC-1 sur 8 des 9 tests ajoutés ; après le commit de SPEC-2, la mutation locale non commitée `value > 0` dans `isTokenCount` fait échouer la ligne zéro, et le retrait du contrôle de la somme dans `toUsage` fait échouer la ligne `1e308` ; titres préfixés `TEST-1 (issue 51)` (exerce SPEC-1) — fichier attendu : tests/llm/providers/gemini/gemini-wire.test.ts
- [x] [TEST-2] Avec un `fetch` factice `rawFetch(text)` qui répond le corps JSON brut sans `JSON.stringify`, pour chacun des couples `prompt_eval_count` / `eval_count` `-1` / `3`, `36` / `-3`, `0.5` / `3`, `36` / `1e400` et `-1e400` / `3` (table `INVALID_COUNTS`, un `test()` par ligne), obtenir de `OllamaLLMProvider.complete` le contenu `"Hi!"`, `toolCalls` `[]` et `usage` `undefined` ; pour `0` / `0`, obtenir `{ tokensIn: 0, tokensOut: 0 }` ; pour un flux dont le fragment terminal porte `prompt_eval_count` `-1` et `eval_count` `26`, obtenir de `stream` deux fragments, `done` `[false, true]` et `usage` `undefined` sur les deux ; rouge avant SPEC-2 sur 6 des 7 tests ajoutés ; titres préfixés `TEST-2 (issue 51)` (exerce SPEC-2) — fichier attendu : tests/llm/providers/ollama/ollama-adapter.test.ts
- [x] [TEST-3] Avec `OllamaLLMProvider` sur un `fetch` factice `scriptedOllamaFetch` qui répond trois corps bruts dans l'ordre (appel `navigate` `{ page: "reglages" }` aux compteurs invalides, appel `navigate` `{ page: "profil" }` à `6` / `6`, texte `"je conclus ici"` à `1` / `1`), `budget: { maxTokens: 10 }` et `driveWithStep`, obtenir pour les compteurs `5` / `-20` puis pour `1e400` / `-1e400` (un `test()` chacun) `stopReason` `"budget"`, `tokensUsed` `14`, `lastContent` `"je conclus ici"` et 3 appels du `fetch`, là où le code d'avant SPEC-2 rend `stopReason` `"completed"` avec `tokensUsed` `-1` puis `NaN` ; rouge avant SPEC-2 sur les 2 tests ; titres préfixés `TEST-3 (issue 51)` (exerce SPEC-2) — fichier attendu : tests/agent/application/use-cases/step.test.ts

## Base de données
(aucune)

## Vérifications
- [ ] [GATE-1] build — `npm run build`
- [ ] [GATE-2] typecheck — `npm run typecheck`
- [ ] [GATE-3] test — `npm run test`

## Hypothèses
(aucune à la rédaction)
