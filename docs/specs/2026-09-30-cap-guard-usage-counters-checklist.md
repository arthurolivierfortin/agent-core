# Checklist · fix(scripts): contrôler chaque compteur d'usage dans capGuard et lire l'usage sous garde · #41

Issue : https://github.com/arthurolivierfortin/agent-core/issues/41
Spécification : docs/specs/2026-09-30-cap-guard-usage-counters-design.md

## Livrables
- [x] [SPEC-1] Ajouter les fonctions non exportées `isCount(value: unknown): value is number` (vrai seulement pour `typeof value === "number" && Number.isInteger(value) && value >= 0`) et `usageCounters(response: LLMResponse)` (lit `response.usage`, puis `tokensIn` et `tokensOut` une fois chacun, rend `{ tokensIn, tokensOut }` si les deux passent `isCount`, sinon `null`), et remplacer dans `guarded` la construction de `usage` par `const counters = usageCounters(response)` avec `cost` à `null` quand `counters` est `null`, la condition de #39 restant inchangée, pour qu'un compteur négatif, fractionnaire, non fini ou non numérique d'un appel résolu rende la réponse, pose la coupure `unclassified` et laisse `spentUsd()` inchangé, avec une phrase citant #41 dans le TSDoc de `capGuard` — fichier attendu : scripts/h2-report/cap-guard.ts
- [x] [SPEC-2] Placer l'appel `usageCounters(response)` de `guarded` dans un second `try`, après celui de `provider.complete`, dont le `catch` pose `cut ??= "unclassified"` sans appeler `classifyCut` puis relance la même erreur, pour qu'une réponse `undefined`, `null` ou dont un accesseur lève fasse rejeter l'appel avec cette erreur et refuser l'appel suivant (coupure `unclassified`), avec une phrase citant #41 dans le TSDoc de `capGuard` — fichier attendu : scripts/h2-report/cap-guard.ts

## Tests
- [x] [TEST-1] Pour les usages `{ tokensIn: -1, tokensOut: 1_000_000 }`, `{ tokensIn: 1_000_000, tokensOut: -1 }`, `{ tokensIn: 0.5, tokensOut: 125_000 }` et `{ tokensIn: 250_000, tokensOut: "125000" as unknown as number }` (table `INVALID_COUNTERS`) rendus après un appel tarifé au plafond 10, obtenir la même référence de réponse, `[cutReason(), spentUsd(), refused()]` égal à `["unclassified", 0.5, 0]`, puis le rejet `cutMessage(MODEL, "unclassified")` avec le double à 2 appels et `refused()` 1 ; pour l'usage `{ tokensIn: 1e308, tokensOut: 1e308 }` (coût `Infinity` par dépassement) dans les mêmes conditions, obtenir le même résultat, la mutation locale non commitée qui retire `|| !Number.isFinite(cost)` de `guarded`, appliquée après le commit de SPEC-1, le faisant échouer (exerce SPEC-1) — fichier attendu : scripts/h2-report/cap-guard.test.ts
- [x] [TEST-2] Pour un double qui résout, après un appel tarifé au plafond 10, `undefined`, puis `null` (rejet `{ name: "TypeError" }`), puis un objet dont l'accesseur `usage` lève `new LLMError("API_ERROR", "unreadable usage", { status: 429 })` (rejet par la même référence), obtenir `[cutReason(), spentUsd(), refused()]` égal à `["unclassified", 0.5, 0]`, puis le rejet `cutMessage(MODEL, "unclassified")` avec le double à 2 appels et `refused()` 1 (table `UNREADABLE_RESPONSES`) ; la mutation locale non commitée qui place `usageCounters(response)` dans le `try` de `provider.complete`, appliquée après le commit de SPEC-2, fait échouer la ligne de l'accesseur (`rate_limited`) (exerce SPEC-2) — fichier attendu : scripts/h2-report/cap-guard.test.ts

## Base de données
(aucune)

## Vérifications
- [ ] [GATE-1] build — `npm run build`
- [ ] [GATE-2] typecheck — `npm run typecheck`
- [ ] [GATE-3] test — `npm run test`

## Hypothèses
