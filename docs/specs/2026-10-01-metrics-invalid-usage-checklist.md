# Checklist · fix(metrics): enregistrer un usage null dans withMetrics quand un compteur est invalide · #46

Issue : https://github.com/arthurolivierfortin/agent-core/issues/46
Spécification : docs/specs/2026-10-01-metrics-invalid-usage-design.md

## Livrables
- [x] [SPEC-1] Ajouter à `with-metrics.ts` les fonctions non exportées `isTokenCount(value: unknown): value is number` (vrai seulement pour `typeof value === "number" && Number.isInteger(value) && value >= 0`) et `recordedCounters(usage: Usage | undefined)` (lit `tokensIn` et `tokensOut` une fois chacun, rend les deux compteurs s'ils passent tous deux `isTokenCount`, sinon `{ tokensIn: null, tokensOut: null }`), et faire enregistrer par `complete` `{ model: opts.model, ...recordedCounters(response.usage), durationMs }` avec `response.usage` lu une seule fois, pour qu'un appel résolu dont un compteur est négatif, fractionnaire, `NaN`, infini, non numérique ou absent laisse `tokensIn` et `tokensOut` tous deux `null` et que `MetricsCollector.total(rates)` rende `tokensIn`, `tokensOut` et `costUsd` `null`, sans symbole exporté nouveau ni type exporté modifié, avec le TSDoc de `withMetrics` et celui de `UsageRecord` (`src/metrics/models/index.ts`) qui citent #46 et la proposition « A missing usage, a usage with a counter that is not an integer >= 0, or a missing rate » dans `README.md:232` et `docs/guide-agent-package.md:262` — fichier attendu : src/metrics/application/use-cases/with-metrics.ts

## Tests
- [x] [TEST-1] Pour chacun des usages `{ -1, 1_000_000 }`, `{ 1_000_000, -1 }`, `{ 0.5, 125_000 }`, `{ NaN, 1 }`, `{ 1, Infinity }`, `{ 250_000, "125000" }` et `{ 7, null }` (table `INVALID_USAGES`) rendus par `FakeLLMProvider` sous `withMetrics` avec `scriptedClock([0, 5])`, obtenir la même référence de réponse, `records()` égal à `[{ model: "fake-model", tokensIn: null, tokensOut: null, durationMs: 5 }]` et `total(RATES)` égal à `{ calls: 1, tokensIn: null, tokensOut: null, durationMs: 5, costUsd: null }` au tarif `fake-model` 1 / 2 USD par million ; pour `{ 0, 0 }` et `{ 500_000, 250_000 }` (table `VALID_USAGES`), obtenir les compteurs enregistrés tels quels et `costUsd` `0` puis `1`, la mutation locale non commitée `value > 0` dans `isTokenCount`, appliquée après le commit de SPEC-1, faisant échouer la ligne `{ 0, 0 }` ; pour une réponse dont l'accesseur `tokensIn` rend `3` puis `-1`, obtenir `tokensIn` `3`, `tokensOut` `4` et une seule lecture de `usage`, de `tokensIn` et de `tokensOut` ; rouge avant SPEC-1 sur 8 des 10 tests ajoutés, titres préfixés `TEST-1 (issue 46)` (exerce SPEC-1) — fichier attendu : tests/metrics/application/use-cases/with-metrics.test.ts

## Base de données
(aucune)

## Vérifications
- [ ] [GATE-1] build — `npm run build`
- [ ] [GATE-2] typecheck — `npm run typecheck`
- [ ] [GATE-3] test — `npm run test`

## Hypothèses
