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
- [x] [GATE-1] build — `npm run build`
- [x] [GATE-2] typecheck — `npm run typecheck`
- [x] [GATE-3] test — `npm run test`

## Hypothèses
- [H] **R-1** (spécification) · Import hors barrel entre frameworks (D2) : `step.ts` importe `src/llm/services/token-count.ts`, servi par aucun barrel ; le jour où `llm` devient un paquet distinct (ADR-AGENT-0012:56), il faudra l'exporter ou le copier. Sans effet aujourd'hui (même paquet, compilé par `tsc` sans bundler).
- [H] **R-2** (spécification) · Trois définitions de la règle, inchangées en nombre : `src/llm/services/token-count.ts` (adaptateurs et boucle), `src/metrics/application/use-cases/with-metrics.ts:54-57` (#46), `scripts/h2-report/cap-guard.ts:39-42` (#41).
- [H] **R-4** (spécification) · `usage: null` d'un fournisseur JavaScript : hors du type `Usage | undefined`, non testé ; la lecture `usage?.tokensIn` le traite comme absent, alors que l'ancien `tokensOf` levait un `TypeError`. Pas un engagement de #60.
- [H] **R-5** (spécification) · Débordement du cumul : `state.tokensUsed + tokensOf(...)` n'est pas contrôlé ; l'atteindre demande un cumul de comptes valides voisin de `1.8e308`, et il ferait alors tomber le budget (`Infinity >= maxTokens`), sens sûr.
- [H] **P1** · Les documents de l'issue (spécification, checklist, estimation, plan) entrent dans le commit de SPEC-1 (spécification ; précédent P1 de #20, #35, #39, #41, #46, #51).
- [H] **P2** · Issue relue par le planificateur (`gh issue view 60`) : le corps correspond mot pour mot à la citation de la spécification ; R-3 de la spécification est levée. Le titre de l'issue (« fix(agent): tokensOf contrôle aussi l'usage des fournisseurs tiers ») et le sujet du commit (`fix(agent): borner tokensOf aux compteurs d'usage valides`) partagent type et scope.
- [H] **P3** · TSDoc de `Budget.maxTokens`, `AgentState.tokensUsed` et `AgentResult.tokensUsed` repliés sous 100 colonnes ; les phrases exigées par la checklist s'y trouvent mot pour mot après jointure des lignes (contrôle 1.4.4). Le TSDoc de `Budget.maxTokens` et celui de `AgentState.tokensUsed` passent d'une ligne `/** … */` à un bloc de quatre lignes.
- [H] **P4** · Tests : libellés des lignes de table et titres choisis par ce plan, en anglais comme leurs voisins, préfixés `TEST-1 (issue 60)`, sans `#` ; table typée `ReadonlyArray<readonly [string, Usage]>` comme `tests/metrics/application/use-cases/with-metrics.test.ts:166` ; la ligne `"7"` écrite `as unknown as Usage` (spécification).
- [H] **P5** · Aucun test commité ne verrouille les nouvelles phrases TSDoc ni l'en-tête de `token-count.ts` (la spécification n'en demande pas) ; leur présence est prouvée par les contrôles 1.4.4 et 1.4.5, à la PR seulement.
- [H] **P6** · Sorties observées par le planificateur sur une sonde (`git archive` de 4ab989d dans `docs/plans/.probe-60/`, compilée par le `tsc` du `node_modules/` du worktree, supprimée ensuite), pas sur le worktree lui-même ; un écart de totaux à la tâche 0 se traite comme dit en 0.2.
- [H] **P7** · Taille : +95 −7 mesurées hors `docs/` et `*.md` (102 lignes) contre environ 90 estimées (fourchette 70 à 130), sous le seuil de 400, aucune dérogation.
- [H] **P8** · Type et scope `fix(agent)` (D7) ; correction de comportement sans changement de signature, relève d'un correctif (patch) ; `package.json` (version) n'est pas touché.
- [H] **Node** · Node local ≥ 22.18 (retrait de types sans drapeau), constaté v22.19.0.
