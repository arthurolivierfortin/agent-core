# Checklist · feat(scripts): annoncer le rapport H2 et le répéter à blanc sans réseau · #33

Issue : https://github.com/arthurolivierfortin/agent-core/issues/33
Spécification : docs/specs/2026-09-30-h2-report-runner-design.md

## Livrables
- [x] [SPEC-1] Exporter le type `RateEntry = { rate, effectiveFrom, source }` et `loadRateEntries(text)`, qui rend un `RateEntry` neuf par modèle avec les mêmes validations et messages que `loadRateFile`, construit par `Object.fromEntries`, et reconstruire `loadRateFile(text)` sur `loadRateEntries` sans changer sa signature ni son résultat — fichier attendu : scripts/h2-report/rates.ts
- [ ] [SPEC-2] Exporter le type `ReportProviders = { local, hosted }` et `defaultProviders(args)`, qui rend `new OllamaLLMProvider({ models: [{ id: args.ollamaModel, supportsTools: true }] })` et `new GeminiLLMProvider({ models: [{ id: args.geminiModel, supportsTools: true }] })`, sans `PROVIDERS` ni `resolveProvider`, et que `runReport` n'appelle pas — fichier attendu : scripts/h2-report/run-report.ts
- [ ] [SPEC-3] Exporter les types `Sink` et `ReportIO` et `runReport(io): Promise<number>`, qui ne lève jamais et, au premier défaut dans l'ordre `parseReportArgs(io.argv, io.today)`, modèles identiques (`--ollama-model and --gemini-model must differ, got '<id>' for both`), `loadRateEntries` puis `loadRateFile` de `io.ratesText`, `assertReadyToStart(args, rates, io.env)`, écrit `<message>\n` sur `io.stderr`, n'écrit rien sur `io.stdout`, n'appelle pas `io.providers` et rend 1 — fichier attendu : scripts/h2-report/run-report.ts
- [ ] [SPEC-4] Exporter `REPORT_FILES = ["summary.csv", "runs.csv", "summary.truncated.csv", "runs.truncated.csv", "TRUNCATED.txt"]` et refuser dans `runReport`, après `assertReadyToStart`, un `--out` résolu contre `io.repo` dont les deux premiers segments relatifs valent `docs` et `demo` sans tenir compte de la casse (`--out must not be under docs/demo/ (the H1 proof there is compared byte for byte), got '<out>'`), puis un `--out` qui contient déjà l'un des noms de `REPORT_FILES` (`--out already holds <noms>; choose another --out or move them away`), par stderr et code 1, sans rien créer — fichier attendu : scripts/h2-report/run-report.ts
- [ ] [SPEC-5] Exporter `REPORT_MAX_ITERATIONS = 10` et écrire sur `io.stdout`, après les contrôles et avant toute construction de fournisseur, l'annonce exacte de SPEC-5 de la spécification : scénario `aller aux reglages`, N, modèle local et modèle hébergé avec tarif (`rate null` ou `rate <in> USD in, <out> USD out per million tokens`), date d'effet et source, `max calls: <2 × N × 11>, of which <N × 11> hosted (at most 11 per run: maxIterations 10 plus the landing call)`, plafond en USD et `--out` — fichier attendu : scripts/h2-report/run-report.ts
- [ ] [SPEC-6] Après l'annonce, écrire `dry run: no provider built, no call made\n` sur stdout et rendre 0 avec `--dry-run`, et sinon écrire `refusing the real run: it is delivered by #42 (capped matrix, safe CSV writing); nothing was called, rerun with --dry-run\n` sur stderr et rendre 1, sans appeler `io.providers` ni `fetch` sur aucun des deux chemins — fichier attendu : scripts/h2-report/run-report.ts
- [ ] [SPEC-7] Écrire le point d'entrée `cli.ts`, qui passe à `runReport` `process.argv.slice(2)`, `process.env`, le texte de `data/rates.json` lu depuis `import.meta.url`, la racine du dépôt tirée de `import.meta.url`, `os.homedir()`, `process.stdout` et `process.stderr`, sans `providers`, et pose `process.exitCode` — fichier attendu : scripts/h2-report/cli.ts

## Tests
- [x] [TEST-1] Obtenir de `loadRateEntries` les entrées `{ rate, effectiveFrom, source }` d'un texte à deux entrées, de `loadRateFile` la même table qu'avant sans date ni source, le même message `rates['<id>']: missing field 'source'` des deux fonctions sur une entrée sans source, et une clé `__proto__` rendue comme entrée propre (exerce SPEC-1) — fichier attendu : scripts/h2-report/rates.test.ts
- [ ] [TEST-2] Vérifier que `defaultProviders({ ollamaModel: "local-x", geminiModel: "hosted-x" })` rend une instance d'`OllamaLLMProvider` d'id `ollama` et de `models()` `[{ id: "local-x", supportsTools: true }]`, et une instance de `GeminiLLMProvider` d'id `gemini` et de `models()` `[{ id: "hosted-x", supportsTools: true }]` (exerce SPEC-2) — fichier attendu : scripts/h2-report/run-report.test.ts
- [ ] [TEST-3] Pour `[]`, deux modèles identiques, un `ratesText` `not json`, un tarif hébergé `null` et un `env` `{}`, obtenir le code 1, un stdout vide, le message attendu (ou son préfixe) suivi de `\n` sur stderr, aucun appel de la fabrique, et l'absence de la sentinelle de clé sur stderr (exerce SPEC-3) — fichier attendu : scripts/h2-report/run-report.test.ts
- [ ] [TEST-4] Obtenir le refus `docs/demo` exact (code 1, fabrique non appelée) pour `docs/demo`, `docs/demo/h1-matrix/`, `Docs/DEMO/x`, `./docs/../docs/demo` et le chemin absolu sous `<repo>/docs/demo`. Obtenir le refus `--out already holds <nom>` pour chacun des cinq noms de `REPORT_FILES` déposé seul, puis `summary.csv, TRUNCATED.txt` déposés ensemble. Aucun message sur `--out` pour `docs/demonstration/` ni pour le défaut (exerce SPEC-4) — fichier attendu : scripts/h2-report/run-report.test.ts
- [ ] [TEST-5] Avec `--cap-usd 2.5 --runs 3`, `local-x`, `hosted-x`, `--out docs/reports/h2-test/` et `--dry-run`, obtenir un stdout qui commence par l'annonce exacte, lignes de tarif avec date d'effet et source et `max calls: 66, of which 33 hosted (…)` compris ; obtenir `rate null` pour un tarif local `null` ; `REPORT_MAX_ITERATIONS` vaut 10 (exerce SPEC-5) — fichier attendu : scripts/h2-report/run-report.test.ts
- [ ] [TEST-6] Avec `globalThis.fetch` remplacé par un compteur : obtenir avec `--dry-run` le code 0, l'annonce suivie de la ligne `dry run: …` et un stderr vide ; sans `--dry-run`, le code 1, l'annonce seule au caractère près et le refus exact sur stderr. Sur les deux chemins, fabrique et `fetch` à 0 appel, sentinelle de clé absente des deux flux (exerce SPEC-6) — fichier attendu : scripts/h2-report/run-report.test.ts
- [ ] [TEST-7] Lancer `node scripts/h2-report/cli.ts` sans argument par `spawnSync` depuis la racine du dépôt et obtenir le statut 1, `--cap-usd is required` dans stderr et un stdout vide (exerce SPEC-7) — fichier attendu : scripts/h2-report/cli.test.ts

## Base de données
(aucune)

## Vérifications
- [ ] [GATE-1] build — `npm run build`
- [ ] [GATE-2] typecheck — `npm run typecheck`
- [ ] [GATE-3] test — `npm run test`

## Hypothèses

Décisions du pilote (font foi, recopiées de la spécification) :

- [H] P-1 · L'annonce cite la date d'effet et la source de chaque tarif.
- [H] P-2 · `docs/demo` est refusé quelle que soit la casse.
- [H] P-3 · Refus si un fichier cible existe déjà : `summary.csv`, `runs.csv`, `summary.truncated.csv`, `runs.truncated.csv`, `TRUNCATED.txt`, parce que #42 écrira en `'wx'`.
- [H] P-4 · `budget.maxIterations` vaut 10 (`REPORT_MAX_ITERATIONS`) ; le nombre maximal d'appels annoncé en découle (11 par run, atterrissage compris).
- [H] P-5 · Dans C2a, rien ne peut dépenser : aucune fabrique de fournisseur n'est appelée, sur aucun chemin.
- [H] P-6 · La marque « tronqué » relève de #42 ; C2a n'en retient que les noms de fichiers.

Hypothèses restantes de la spécification :

- [H] R-1 · Une `source` qui contient `\n` casserait la forme d'une ligne par modèle de l'annonce ; non traité (source saisie par Arthur).
- [H] R-2 · `OLLAMA_HOST` reste honoré par `defaultProviders` (hôte, pas modèle) et n'est pas annoncé.
- [H] R-3 · Casse de `repo` : hors Windows, un `repo` écrit avec une autre casse que le chemin réel rendrait un chemin relatif en `..`, donc non refusé ; `cli.ts` tire `repo` de `import.meta.url`.
- [H] Node ≥ 22.18 (retrait de types sans drapeau, `await` de premier niveau dans `cli.ts`) ; constaté v22.19.0.

Choix du plan (réversibles) :

- [H] H-1 · `run-report.test.ts` importe le module en espace de noms (`import * as runner`) : un export qu'un commit ultérieur ajoute fait échouer son propre test, pas le fichier entier, ce qui donne aux rouges de TEST-3 à TEST-6 la raison écrite dans la spécification.
- [H] H-2 · `isRealDate` (non exportée) devient le prédicat `value is string` pour typer `effectiveFrom` sans conversion ; son corps et ses messages sont inchangés.
- [H] H-3 · L'aide `report` passe `home: repo` (le dossier temporaire, inutilisé par #33) et `today` fixé au 30 septembre 2026, heure locale : aucun test ne lit l'horloge ni le vrai dossier personnel.
- [H] H-4 · La fabrique double de l'aide `report` compte ses appels **et** lève : un appel ferait aussi échouer le run de façon visible.
- [H] H-5 · TEST-3 compare le cas « tarif hébergé null » par une expression régulière sur le début stable du message ; la phrase complète est déjà figée par TEST-8 de #20 (`scripts/h2-report/start-guard.test.ts`). Le message `not valid JSON` est lu de `JSON.parse`, comme dans `rates.test.ts`, parce qu'il dépend de la version de V8.
- [H] H-6 · TEST-4 fige `REPORT_FILES` sur les cinq noms littéraux, puis boucle dessus ; les cinq noms sont gardés (le levier « trois noms » de la spécification ne gagnait aucune ligne).
- [H] H-7 · `cli.ts` ajoute à l'en-tête de la spécification une ligne de commande et un commentaire sur la racine du dépôt (« retouche de forme laissée au builder »).
- [H] H-8 · Des commits de SPEC-3 à SPEC-5, `runReport` rend 1 quand tous les contrôles passent (état intermédiaire de la spécification) ; le chemin qui rend 0 n'existe qu'à partir de SPEC-6.

Risques déclarés par le plan :

- [H] La marge de taille est de 16 lignes : toute ligne ajoutée au code du plan la consomme.
- [H] L'ordre « garde de démarrage avant `--out` » (D2, SPEC-3 : `assertReadyToStart` avant `assertOutFree`) est codé mais aucun test ne le discrimine : tous les cas de TEST-4 ont des tarifs et une clé valides (mutation non détectée en sonde). Ajouter un test coûterait des lignes ; laissé tel quel, à signaler à la revue.
- [H] TEST-7 lit, dans l'enfant, le vrai `data/rates.json` (argument de `runReport`, évalué avant l'analyse des arguments) : son absence ferait échouer TEST-7 par une exception non rattrapée de `cli.ts`, sans rapport avec le réseau. Son contenu n'entre pas dans le résultat ; aucun test ne le fige.
- [H] Les comptes de la suite complète sont déduits, non observés : un écart de comptes sans `not ok` nouveau n'est pas un échec, un `not ok` hors des titres prévus en est un.
