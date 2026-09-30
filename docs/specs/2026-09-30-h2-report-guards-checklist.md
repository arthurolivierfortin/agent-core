# Checklist · feat(scripts): poser les garde-fous du rapport H2 avant tout réseau · #20

Issue : https://github.com/arthurolivierfortin/agent-core/issues/20
Spécification : docs/specs/2026-09-30-h2-report-guards-design.md

## Livrables
- [x] [SPEC-1] Étendre `include` de tsconfig.json à `["src", "tests", "scripts"]` avec `allowImportingTsExtensions: true`, et poser `allowImportingTsExtensions: false` dans tsconfig.build.json dont `include` reste `["src"]` et `rootDir` reste `"src"` — fichier attendu : tsconfig.json, tsconfig.build.json
- [x] [SPEC-2] Écrire `loadRateFile(text)` qui rend une `RateTable` neuve par `Object.fromEntries` et lève au premier défaut un `Error` nommant l'entrée et le champ pour chacun des onze défauts du tableau de SPEC-2 de la spécification (JSON illisible, racine non objet, clé vide, entrée non objet, champ manquant, champ en trop, `effectiveFrom` hors date réelle AAAA-MM-JJ, `source` vide, `rate` ni null ni objet, champ manquant ou en trop dans `rate`, composante non finie ou négative) — fichier attendu : scripts/h2-report/rates.ts
- [ ] [SPEC-3] Refuser dans `loadRateFile` une composante de tarif égale à 0 quand la `source` de l'entrée n'est pas exactement `"local"`, avec le message `rates['<id>'].rate.<champ>: a zero price requires source "local"` (règle R1) — fichier attendu : scripts/h2-report/rates.ts
- [ ] [SPEC-4] Créer data/rates.json avec exactement deux entrées : `gemini-2.5-flash` à `rate: null`, `effectiveFrom: "2026-09-30"` et une source non vide disant que le tarif reste à saisir par Arthur, et `qwen2.5:0.5b` à `{ usdPerMillionTokensIn: 0, usdPerMillionTokensOut: 0 }`, `effectiveFrom: "2026-09-30"`, `source: "local"` — fichier attendu : data/rates.json
- [ ] [SPEC-5] Écrire `parseReportArgs(argv, today = new Date())` sur `parseArgs` de `node:util` en mode strict, qui exige `--cap-usd` décimal `^\d+(\.\d+)?$` strictement positif, prend `--runs` entier ≥ 1 par défaut `DEFAULT_RUNS` = 5, `--ollama-model` par défaut `DEFAULT_OLLAMA_MODEL`, `--gemini-model` par défaut `DEFAULT_GEMINI_MODEL`, `--out` par défaut `defaultReportOut(today)` = `docs/reports/h2-<AAAA>-<MM>-<JJ>/` sur la date locale de `today` (jamais sous `docs/demo/`), refuse une valeur vide, et rend `dryRun` booléen pour `--dry-run` sans autre effet — fichier attendu : scripts/h2-report/report-args.ts
- ~~[SPEC-6]~~ retiré : `capGuard` (plafond partagé, `spentUsd()`, refus `cap_reached` / `cost_unknown` / `unpriced_model`) déplacé dans #35 (option C du pilote)
- ~~[SPEC-7]~~ retiré : coupure de `capGuard` au premier appel hébergé rejeté et `cutReason()` déplacés dans #35 (option C du pilote)
- [ ] [SPEC-8] Écrire `assertReadyToStart(args, rates, env)` qui lève un seul `Error` commençant par `refusing to start before any network call:` avec une ligne par défaut quand `args.ollamaModel` ou `args.geminiModel` n'a pas de clé propre dans `rates`, quand le tarif hébergé est null (ligne nommant `data/rates.json`, `usdPerMillionTokensIn`, `usdPerMillionTokensOut`, `effectiveFrom` et `source`), ou quand une composante du tarif hébergé est ≤ 0 quelle que soit sa source (règle R2) — fichier attendu : scripts/h2-report/start-guard.ts
- [ ] [SPEC-9] Ajouter dans `assertReadyToStart` la ligne `environment variable GEMINI_API_KEY is unset or empty` quand `env.GEMINI_API_KEY` est absente ou vide après `trim()`, sans jamais recopier la valeur de la clé dans un message — fichier attendu : scripts/h2-report/start-guard.ts

## Tests
- [x] [TEST-1] Vérifier que tsconfig.json a `include` `["src", "tests", "scripts"]` et `allowImportingTsExtensions: true`, et que tsconfig.build.json a `include` `["src"]`, `rootDir` `"src"` et `allowImportingTsExtensions: false` (exerce SPEC-1) — fichier attendu : scripts/repo-conventions.test.mjs
- [x] [TEST-2] Charger un fichier à deux entrées (une null, une chiffrée) et obtenir la table attendue, obtenir une clé `__proto__` comme entrée propre, puis faire lever chacun des onze défauts de SPEC-2 avec son message exact, une ligne de table par défaut (exerce SPEC-2) — fichier attendu : scripts/h2-report/rates.test.ts
- [ ] [TEST-3] Accepter un tarif à 0 avec `source: "local"` et un tarif local positif, refuser un tarif à une composante nulle avec `source: "pricing page"` par le message de R1 (exerce SPEC-3) — fichier attendu : scripts/h2-report/rates.test.ts
- [ ] [TEST-4] Lire data/rates.json par `readFileSync`, le charger par `loadRateFile`, obtenir `null` pour `gemini-2.5-flash` et `{ 0, 0 }` pour `qwen2.5:0.5b`, et vérifier que le texte ne correspond pas à `/AIza[0-9A-Za-z_-]{35}/` (exerce SPEC-4) — fichier attendu : scripts/h2-report/rates.test.ts
- [ ] [TEST-5] Obtenir `{ capUsd: 2.5, runs: 5, ollamaModel: "qwen2.5:0.5b", geminiModel: "gemini-2.5-flash", out: "docs/reports/h2-2026-09-30/", dryRun: false }` pour `parseReportArgs(["--cap-usd", "2.5"], new Date(2026, 8, 30, 23, 30))`, `"docs/reports/h2-2026-01-05/"` pour `defaultReportOut(new Date(2026, 0, 5))`, un `out` par défaut commençant par `docs/reports/h2-` et non par `docs/demo/` sans `today`, toutes les options posées (forme `--opt=valeur` comprise, `--out` explicite rendu tel quel) avec `dryRun: true`, puis les douze refus de la table de TEST-5 de la spécification (exerce SPEC-5) — fichier attendu : scripts/h2-report/report-args.test.ts
- ~~[TEST-6]~~ retiré : test du plafond de `capGuard` déplacé dans #35 avec SPEC-6
- ~~[TEST-7]~~ retiré : test de la coupure de `capGuard` déplacé dans #35 avec SPEC-7
- [ ] [TEST-8] Avec les défauts de `parseReportArgs(["--cap-usd", "1"])`, `loadRateFile` sur data/rates.json et `env` `{ GEMINI_API_KEY: "sentinel-value-not-a-key" }`, obtenir un rejet commençant par `refusing to start before any network call:` et nommant `data/rates.json`, `gemini-2.5-flash`, `usdPerMillionTokensIn` et `usdPerMillionTokensOut` ; obtenir les lignes des entrées Ollama et Gemini absentes ; refuser un tarif hébergé `{ 0, 1 }` chargé avec `source: "local"` ; ne rien lever pour une table complète et positive (exerce SPEC-8) — fichier attendu : scripts/h2-report/start-guard.test.ts
- [ ] [TEST-9] Obtenir la ligne `environment variable GEMINI_API_KEY is unset or empty` pour `env` `{}`, `{ GEMINI_API_KEY: "" }` et `{ GEMINI_API_KEY: "   " }`, et vérifier qu'avec la clé `sentinel-value-not-a-key` et un tarif hébergé null le message ne contient pas `sentinel-value-not-a-key` (exerce SPEC-9) — fichier attendu : scripts/h2-report/start-guard.test.ts

## Base de données
(aucune)

## Vérifications
- [ ] [GATE-1] build — `npm run build`
- [ ] [GATE-2] typecheck — `npm run typecheck`
- [ ] [GATE-3] test — `npm run test`

## Hypothèses
