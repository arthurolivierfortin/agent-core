# Checklist · docs(claude-md): corriger le compte des ADR, retirer les clés DEV-xxx et déclarer la langue des documents · #7

Issue : https://github.com/arthurolivierfortin/agent-core/issues/7
Spécification : docs/specs/2026-09-30-claude-md-design.md

## Livrables
- [x] [SPEC-1] Remplacer dans `CLAUDE.md` la chaîne `(ADR-AGENT-0001 à 0021)` par `(ADR-AGENT-0001 à 0020)`, le reste de la ligne restant identique — fichier attendu : CLAUDE.md
- [x] [SPEC-2] Remplacer dans `CLAUDE.md` la chaîne « Les clés `DEV-xxx` citées dans les ADR et le ROADMAP renvoient » par « Les clés `DEV-xxx` citées dans les ADR renvoient », en gardant le reste du paragraphe Origine, dont `feat/DEV-197-test-harness`, à l'identique — fichier attendu : CLAUDE.md
- [x] [SPEC-3] Remplacer dans le bloc `<!-- core-project` de `CLAUDE.md` la ligne `derogations: []` par les quatre lignes `derogations:`, `  - rule: core/langue`, `    reason: "<phrase exacte de la décision D2 de la spécification>"` et `    revue_le: 2026-12-31`, toutes les autres lignes du bloc restant identiques — fichier attendu : CLAUDE.md
- [ ] [SPEC-4] Dans la carte « Full tree » de `ROADMAP.md`, supprimer la ligne `    infrastructure/with-metrics.ts     withMetrics (LLMProvider → MetricsCollector decorator)` du sous-arbre `  llm/` et insérer la ligne `    application/use-cases/with-metrics.ts   withMetrics (LLMProvider → MetricsCollector decorator)` dans le sous-arbre `  metrics/`, juste après la ligne `    services/aggregate.ts        pure: records → MetricsTotal (with RateTable)` — fichier attendu : ROADMAP.md

## Tests
- [x] [TEST-1] Cas `TEST-1 (issue 7) CLAUDE.md cite l'intervalle exact des ADR` : les noms de `docs/decisions/` qui correspondent à `/^ADR-AGENT-(\d{4})-.+\.md$/` sont au nombre de N, leurs numéros sont exactement 1 à N sans trou, et `CLAUDE.md` contient une seule fois la chaîne `(ADR-AGENT-0001 à `, suivie de N écrit sur quatre chiffres puis de `)` (exerce SPEC-1) — fichier attendu : scripts/repo-conventions.test.mjs
- [x] [TEST-2] Cas `TEST-2 (issue 7) CLAUDE.md ne rapporte les clés DEV-xxx qu'aux ADR` : la ligne de `CLAUDE.md` qui contient `` `DEV-xxx` `` contient `citées dans les ADR renvoient` et ne contient pas `ROADMAP` ; `CLAUDE.md` contient toujours `feat/DEV-197-test-harness` ; `ROADMAP.md` ne contient ni `DEV-xxx` ni une correspondance de `/\bDEV-\d+\b/` ; au moins un fichier `docs/decisions/ADR-AGENT-*.md` contient une correspondance de `/\bDEV-\d+\b/` (exerce SPEC-2) — fichier attendu : scripts/repo-conventions.test.mjs
- [x] [TEST-3] Cas `TEST-3 (issue 7) le manifeste déclare la dérogation de langue` : dans les lignes de `CLAUDE.md` comprises entre `<!-- core-project` et `-->`, aucune ligne n'est `derogations: []` ; la ligne `derogations:` est suivie immédiatement de `  - rule: core/langue`, puis d'une ligne qui commence par `    reason: "`, finit par `"`, ne contient aucun autre guillemet double ni deux espaces consécutifs après l'indentation, et contient `anglais`, `français`, `README.md`, `ROADMAP.md`, `docs/guide-agent-package.md`, `docs/decisions/`, `docs/plans/2026-07-21-v1-decoupage-pr.md` et `#7`, puis de `    revue_le: 2026-12-31` ; les lignes `  - id: GATE-1  name: build  cmd: npm run build`, `  - id: GATE-2  name: typecheck  cmd: npm run typecheck` et `  - id: GATE-3  name: test  cmd: npm run test` sont toujours présentes (exerce SPEC-3) — fichier attendu : scripts/repo-conventions.test.mjs
- [ ] [TEST-4] Cas `TEST-4 (issue 7) ROADMAP place withMetrics sous metrics/application/use-cases` : `ROADMAP.md` ne contient pas `infrastructure/with-metrics.ts` ; les lignes comprises entre la première ligne égale à `  llm/` et la première ligne égale à `  context/` ne contiennent pas `with-metrics` ; les lignes comprises entre la première ligne égale à `  metrics/` et la première ligne suivante qui commence par `  voice/` contiennent une ligne qui contient à la fois `application/use-cases/with-metrics.ts` et `withMetrics` ; le fichier `src/metrics/application/use-cases/with-metrics.ts` existe (`existsSync`, sans l'ouvrir) (exerce SPEC-4) — fichier attendu : scripts/repo-conventions.test.mjs

## Base de données
(aucune)

## Vérifications
- [ ] [GATE-1] build — `npm run build`
- [ ] [GATE-2] typecheck — `npm run typecheck`
- [ ] [GATE-3] test — `npm run test`

## Hypothèses
