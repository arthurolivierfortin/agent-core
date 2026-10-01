# Checklist · fix(agent): faire appliquer isTokenCount par tokensOf à l'usage de tout fournisseur · #60

Issue : https://github.com/arthurolivierfortin/agent-core/issues/60
Spécification : docs/specs/2026-10-01-tokensof-fournisseurs-tiers-design.md

## Livrables
- [x] [SPEC-1] Faire rendre par `tokensOf(usage)` de `step.ts` la somme `tokensIn + tokensOut` seulement quand `isTokenCount`, importé de `../../../llm/services/token-count.js`, est vrai pour `tokensIn`, pour `tokensOut` et pour leur somme, chaque compteur lu une fois par `usage?.tokensIn` et `usage?.tokensOut`, et `0` sinon (usage absent, compteur `NaN`, négatif, fractionnaire, infini ou non numérique, somme qui déborde), le compteur valide accompagnant un invalide n'étant pas compté, avec un TSDoc de `tokensOf` qui cite #60 et nomme le budget `maxTokens` ; dans `src/agent/application/dtos/index.ts`, ajouter au TSDoc de `Budget.maxTokens` « and a call whose usage has a counter, or a sum, that is not an integer >= 0 counts as reporting none », au TSDoc de `AgentState.tokensUsed` « a call whose usage has a counter, or a sum, that is not an integer >= 0 adds nothing » et au TSDoc de `AgentResult.tokensUsed`, après « which cannot tell "absent" from zero. », la phrase « A call whose usage has a counter, or a sum, that is not an integer >= 0 adds nothing, as if unreported. » ; terminer l'en-tête de `src/llm/services/token-count.ts` par « and the one the agent loop applies before adding usage to its token budget (#60). Served by no barrel: the adapters and step.ts import it relatively. » ; aucun fichier créé, aucun type exporté changé de forme — fichier attendu : src/agent/application/use-cases/step.ts

## Tests
- [x] [TEST-1] Avec `FakeLLMProvider` scripté de trois réponses (appel `navigate` `{ page: "reglages" }` portant l'usage de la ligne, appel `navigate` `{ page: "profil" }` à `{ 6, 6 }`, texte `"je conclus ici"` à `{ 1, 1 }`), `budget: { maxTokens: 10 }` et `driveWithStep`, obtenir pour chacun des usages `{ NaN, 5 }`, `{ 20, -15 }`, `{ 7, -20 }`, `{ 0.5, 4.5 }`, `{ 7, Infinity }`, `{ 7, -Infinity }`, `{ 1e308, 1e308 }` et `{ "7", 5 }` (table `INVALID_USAGES`, un `test()` par ligne) `stopReason` `"budget"`, `tokensUsed` `14`, `lastContent` `"je conclus ici"` et `llm.calls.length` `3` ; avec un appel `navigate` à `{ 6, 6 }` suivi d'un appel d'atterrissage `"je conclus ici"` à `{ NaN, 1 }`, obtenir `stopReason` `"budget"`, `tokensUsed` `12`, `lastContent` `"je conclus ici"` et `llm.calls.length` `2` ; rouge avant SPEC-1 sur les 9 tests ajoutés ; après le commit de SPEC-1, la mutation locale non commitée qui remplace le contrôle des compteurs par `tokensIn === undefined || tokensOut === undefined` fait échouer les lignes `{ 20, -15 }` et `{ 0.5, 4.5 }`, et le retrait du contrôle de la somme fait échouer la ligne `{ 1e308, 1e308 }` ; titres préfixés `TEST-1 (issue 60)` (exerce SPEC-1) — fichier attendu : tests/agent/application/use-cases/step.test.ts

## Base de données
(aucune)

## Vérifications
- [ ] [GATE-1] build — `npm run build`
- [ ] [GATE-2] typecheck — `npm run typecheck`
- [ ] [GATE-3] test — `npm run test`

## Hypothèses
(vide à la rédaction)
