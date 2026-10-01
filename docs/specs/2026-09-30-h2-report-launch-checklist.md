# Checklist · feat(scripts): lancer le rapport H2 plafonné et écrire ses CSV sans fuite · #42

Issue : https://github.com/arthurolivierfortin/agent-core/issues/42
Spécification : docs/specs/2026-09-30-h2-report-launch-design.md

## Livrables
- [x] [SPEC-1] Lever `rates['<id>'].source: must hold no line break` dans `readEntry` quand `source` contient `\n` ou `\r`, par une seule ligne placée après le contrôle de chaîne non vide, ce qui fait refuser la source par `loadRateEntries` et par `loadRateFile` — fichier attendu : scripts/h2-report/rates.ts
- [x] [SPEC-2] Calculer dans `assertOutFree` les segments par `relative(repo.toLowerCase(), target.toLowerCase())` et comparer `segments[0] === "docs"` et `segments[1] === "demo"`, sur toutes les plateformes, en gardant le message de refus et le contrôle `existsSync(join(target, name))` sur `target` tel quel — fichier attendu : scripts/h2-report/run-report.ts
- [x] [SPEC-3] Ajouter `DEFAULT_OLLAMA_HOST = "http://localhost:11434"` et insérer dans l'annonce, après la ligne `local model: …`, la ligne `local host: <OLLAMA_HOST> (from OLLAMA_HOST)` quand `io.env.OLLAMA_HOST` est défini, sinon `local host: http://localhost:11434 (default, OLLAMA_HOST unset)`, identique sur les chemins `--dry-run` et lancement — fichier attendu : scripts/h2-report/run-report.ts
- [x] [SPEC-4] Remplacer le refus du lancement réel par `launch(io, args, rates)` : un seul appel de `(io.providers ?? defaultProviders)(args)`, un seul `capGuard(providers.hosted, rates, args.capUsd)` partagé, `runMatrix` sur `H1_SCENARIO` et `H1_AGENT` recopiés de `matrix-demo.test.ts`, axes `{ model: [ollamaModel, geminiModel] }`, `runs` N, `deps` qui rend le garde pour le modèle hébergé et `providers.local` non gardé, une `SlidingWindowStrategy` neuve et `budget: { maxIterations: REPORT_MAX_ITERATIONS }` par run, `rates`, `now` tiré de `io.now` ; puis `mkdirSync(target, { recursive: true })`, écriture de `summary.csv` (`toCSV`) et `runs.csv` (`toRunsCSV`) en `{ flag: "wx" }`, stdout `H2 report written: summary.csv, runs.csv in <out>`, code 0 ; toute exception de `launch` sur stderr et code 1 — fichier attendu : scripts/h2-report/run-report.ts
- [ ] [SPEC-5] Ajouter `scrubMachinePaths(text, repo, home)`, qui remplace `repo` par `<repo>` puis `home` par `<home>`, chacun dans sa forme à barres obliques puis à contre-obliques, ignore une racine vide ou racine du système de fichiers, et que `launch` applique à chaque texte avant tout contrôle et toute écriture — fichier attendu : scripts/h2-report/run-report.ts
- [ ] [SPEC-6] Ajouter `truncationCause(guard, capUsd)` (`cut: network, no HTTP status reported`, `cut: <reason>`, `cap reached` quand `spentUsd() >= capUsd` et `refused() > 0`, sinon `null`) et, pour une cause non nulle, écrire `summary.truncated.csv`, `runs.truncated.csv` et `TRUNCATED.txt` (lignes `H2 report TRUNCATED`, `cause:`, `spent:`, `cap:`, `refused calls:`, `at:` de `io.now`, `models: <local> (local), <hosted> (hosted)`) au lieu de `summary.csv` et `runs.csv`, écrire sur stderr `H2 report TRUNCATED (<cause>): spent <n> USD, cap <n> USD, <n> calls refused; see TRUNCATED.txt in <out>` et rendre 1 — fichier attendu : scripts/h2-report/run-report.ts
- [ ] [SPEC-7] Refuser d'écrire, après `scrubMachinePaths` et avant `mkdirSync`, quand la valeur trimée non vide de `io.env.GEMINI_API_KEY` apparaît dans l'un des textes (complets ou tronqués) : stderr `refusing to write: the value of GEMINI_API_KEY appears in <noms dans l'ordre d'écriture>; nothing was written`, aucun dossier ni fichier créé, code 1, valeur jamais écrite — fichier attendu : scripts/h2-report/run-report.ts
- [ ] [SPEC-8] Calculer `repo` une fois depuis `import.meta.url` dans `cli.ts`, lire `ratesText` dans `join(repo, "data", "rates.json")` et renvoyer l'en-tête à `docs/rapport-h2.md` — fichier attendu : scripts/h2-report/cli.ts
- [ ] [SPEC-9] Ajouter à `.gitattributes` le commentaire `# The H2 report files are committed as written (CRLF in the CSV): no line-ending conversion.` et la ligne `docs/reports/** -text` — fichier attendu : .gitattributes
- [ ] [SPEC-10] Écrire `docs/rapport-h2.md` en français avec les titres, les cinq gestes `### 1.` à `### 5.`, les quatre commandes PowerShell et bash (`--dry-run` puis lancement, `--cap-usd 1` annoncé comme exemple) et la lecture de H2, H3 et H4 décrits en SPEC-10 de la spécification, et ajouter à la section `## Evaluating agents over a matrix` du README la phrase anglaise qui lie `docs/rapport-h2.md` — fichier attendu : docs/rapport-h2.md, README.md

## Tests
- [x] [TEST-1] Obtenir de `loadRateFile` et de `loadRateEntries` le message `rates['m'].source: must hold no line break` pour une source `https://a.test/\nnext` et pour une source `a\rb` (exerce SPEC-1) — fichier attendu : scripts/h2-report/rates.test.ts
- [x] [TEST-2] Obtenir le refus `docs/demo` exact, le code 1 et aucun appel de fabrique pour `--out` égal à `join(repo.toUpperCase(), "docs", "demo")` (exerce SPEC-2) — fichier attendu : scripts/h2-report/run-report.test.ts
- [x] [TEST-3] Lire dans `ANNOUNCEMENT` la ligne `local host: http://localhost:11434 (default, OLLAMA_HOST unset)` après la ligne locale, et dans stdout la ligne `local host: http://ollama.test:11434 (from OLLAMA_HOST)` quand `env` porte cet `OLLAMA_HOST` (exerce SPEC-3) — fichier attendu : scripts/h2-report/run-report.test.ts
- [x] [TEST-4] Avec `fetch` remplacé par un compteur et des doubles `scripted` : pour `COMPLETE`, obtenir le code 0, stderr vide, stdout terminé par `H2 report written: summary.csv, runs.csv in out/\n`, une fabrique appelée une fois, `fetch` à 0, exactement `summary.csv` (texte exact de la spécification, local `2,2,1,0,60,0` et hébergé `2,2,1,0,800000,2`) et `runs.csv` (5 lignes CRLF) ; pour `ANNOUNCED` sans `--dry-run`, un stdout qui commence par `ANNOUNCEMENT` ; pour un `summary.csv` créé par le double pendant le run, le code 1, `EEXIST` sur stderr et le fichier inchangé ; le second cas de TEST-6 (issue 33) et `REAL_RUN_REFUSAL` retirés (exerce SPEC-4) — fichier attendu : scripts/h2-report/run-report.test.ts
- [ ] [TEST-5] Avec `home` égal à `dirname(repo)` et un double local qui lève un message portant `repo` sous ses trois graphies et `home`, lire dans `runs.csv` `cannot open <repo>/a and <repo>/b and <repo>\c in <home>` et n'y trouver ni `repo`, ni sa forme à barres obliques, ni `dirname(repo)` (exerce SPEC-5) — fichier attendu : scripts/h2-report/run-report.test.ts
- [ ] [TEST-6] Pour le plafond atteint (`ANNOUNCED`, `cap reached`, dépense 2.5, refus 1, refus de `capGuard` lu dans `runs.truncated.csv`), une coupure `LLMError` de statut 503 (`cut: http_503`) et une coupure `LLMError` sans statut (`cut: network, no HTTP status reported`), obtenir le code 1, exactement les trois fichiers tronqués, `TRUNCATED.txt` et stderr exacts, aucun `H2 report written` (exerce SPEC-6) — fichier attendu : scripts/h2-report/run-report.test.ts
- [ ] [TEST-7] Pour une clé `"  hosted-x  "` (`summary.csv, runs.csv`), une clé reprise dans l'erreur d'un run local (`runs.csv`) et une clé `hosted-x` sur un rapport tronqué (`summary.truncated.csv, runs.truncated.csv, TRUNCATED.txt`), obtenir le code 1, le message de refus exact, un dossier `--out` absent et un stderr sans la valeur (exerce SPEC-7) — fichier attendu : scripts/h2-report/run-report.test.ts
- [ ] [TEST-8] Lancer `cli.ts` par son chemin absolu depuis `tmpdir()` avec `--cap-usd 1 --dry-run`, sans puis avec `GEMINI_API_KEY` sentinelle dans `env` : aucun `ENOENT` sur stderr, la sentinelle absente des deux flux, `environment variable GEMINI_API_KEY is unset or empty` présent au premier lancement et absent au second ; le cas sans argument de #33 gardé (exerce SPEC-8) — fichier attendu : scripts/h2-report/cli.test.ts
- [ ] [TEST-9] Trouver parmi les lignes de `.gitattributes` `docs/demo/** -text` et `docs/reports/** -text` (exerce SPEC-9) — fichier attendu : scripts/repo-conventions.test.mjs
- [ ] [TEST-10] Trouver dans `docs/rapport-h2.md` les quatre commandes comme lignes entières, les cinq sous-titres `### 1.` à `### 5.` dans l'ordre, `GEMINI_API_KEY`, `data/rates.json`, `TRUNCATED.txt`, `<repo>`, `<home>`, `Closes #3`, `H2`, `H3`, `H4`, aucun tiret cadratin ni forme de clé Google, et `(docs/rapport-h2.md)` dans la section matrice du README (exerce SPEC-10) — fichier attendu : scripts/repo-conventions.test.mjs

## Base de données
(aucune)

## Vérifications
- [ ] [GATE-1] build — `npm run build`
- [ ] [GATE-2] typecheck — `npm run typecheck`
- [ ] [GATE-3] test — `npm run test`

## Hypothèses

Recopiées en entier de la spécification (« Décisions et alternatives écartées », « Hypothèses restantes ») et du plan (« Hypothèses et décisions », « Risques »).

### Décisions du pilote (font foi)
- [H] Corps de #42 : lancement réel par `runMatrix` sur `{ model: [ollamaModel, geminiModel] }`, N runs, scénario et agent H1 recopiés de `matrix-demo.test.ts`, stratégie neuve par run, `budget.maxIterations` 10 explicite, un seul `capGuard` partagé, local non gardé, fabrique appelée une fois ; CSV en `'wx'`, chemins `<repo>` puis `<home>` ; refus d'écrire la clé ; troncature option (b) ; `docs/rapport-h2.md`.
- [H] P-1 · `runReport` passe par `io.providers` quand il est donné et n'appelle pas `defaultProviders` (verrou : TEST-4, `factoryCalls` 1 et `fetchCalls` 0).
- [H] P-2 · Le test de `cli.ts` discrimine la racine du dépôt et la transmission de `process.env` (TEST-8, mordant prouvé par M8a et M8b).
- [H] P-3 · L'annonce cite l'hôte Ollama effectif (R-2 de #33).
- [H] P-4 · `docs/demo` comparé sans casse hors Windows aussi (R-3 de #33), règle D3.
- [H] P-5 · `loadRateEntries` refuse une `source` à retour à la ligne (R-1 de #33).

### Décisions de la spécification
- [H] D1 · Le harnais vient de `../../dist/testing/index.js`, comme un consommateur l'importe ; écartés : l'exporter depuis `.` (`src/` hors périmètre, règle de placement du paquet) ou recopier `runMatrix`.
- [H] D2 · `launch` séparée de `runReport`, pour que le `try` du lancement rende 1 sans mêler ses erreurs aux refus de démarrage, qui n'écrivent rien sur stdout.
- [H] D3 · R-3 : minuscules avant `relative`, sur toutes les plateformes. Le refus de `docs/demo` protège la preuve H1 ; le doute doit refuser. Hors Windows, sur un système sensible à la casse, deux dossiers qui ne diffèrent que par la casse seraient confondus : le seul effet est un refus de trop, réparé par un autre `--out`. Écartés : `realpathSync.native` (lève quand `--out` n'existe pas encore, cas nominal, et ne rend pas la casse réelle sur toutes les plateformes) ; laisser tel quel (accepte en silence, sous macOS, un `docs/demo` écrit dans une autre casse que `repo`).
- [H] D4 · Le contrôle de clé porte sur les textes après remplacement des chemins : ce sont eux qui seraient écrits.
- [H] D5 · Horloge unique `io.now` pour les durées de `runMatrix` et l'horodatage de `TRUNCATED.txt` : les tests figent les deux (durées 0, horodatage connu) ; écarté : réutiliser `io.today`, qui date `--out` à minuit local.
- [H] D6 · Un rapport tronqué ne ferme pas #3 (document). Il reste une trace locale ; Arthur relance après avoir levé la cause. Réversible par une phrase du document.
- [H] D7 · `cli.ts` lit les tarifs sous `repo` (SPEC-8) : sans ce lien, aucun test ne peut observer `repo`, car le vrai `data/rates.json` arrête le démarrage avant `--out` (tarif Gemini `null`).
- [H] D8 · Commandes du document avec `--cap-usd 1`, valeur d'exemple annoncée comme telle : une commande à paramètre `<USD>` ne se colle pas telle quelle dans un shell.

### Hypothèses restantes de la spécification
- [H] R-1 · Non discriminés par test : la stratégie de contexte neuve à chaque run (`SlidingWindowStrategy` ne garde aucun état observable d'un run court à l'autre) et `budget.maxIterations` explicite (identique au défaut de `step.ts:17`). Vérifiés à la relecture du code de `launch`.
- [H] R-2 · Remplacement des chemins exact, casse comprise : un chemin écrit avec une autre casse (lecteur `c:` contre `C:`), un nom court 8.3 ou une URL `file://` ne sont pas remplacés. Dans le chemin nominal, aucun texte des CSV ne porte de chemin ; seuls des messages d'erreur le pourraient.
- [H] R-3 · Clé très courte : une valeur de `GEMINI_API_KEY` courte et banale peut apparaître par hasard et refuser l'écriture ; refus de trop accepté.
- [H] R-4 · Écriture partielle : si un fichier cible apparaît entre le démarrage et l'écriture (course), `'wx'` lève ; les fichiers déjà écrits restent, le message (`EEXIST`) le dit.
- [H] R-5 · `DEFAULT_OLLAMA_HOST` dupliqué de `ollama-llm-provider.ts:50`, non exporté ; `src/` est hors périmètre. Un `OLLAMA_HOST` vide est annoncé tel quel.
- [H] R-6 · TEST-8 lit le vrai `data/rates.json` dans l'enfant : il dépend de sa lisibilité et de sa validité, pas de ses valeurs.
- [H] R-7 · H3 et H4 ne se lisent qu'en partie dans les CSV (aucun `report.json` écrit) ; le document le dit.
- [H] Node ≥ 22.18, constaté v22.19.0 par #20 et #33 (et v22.19.0 dans ce worktree).
- [H] État intermédiaire : de SPEC-4 à SPEC-7, un lancement réel écrirait des CSV sans tous les contrôles ; personne ne lance (contrainte du pilote), et la PR est livrée entière.

### Choix du plan (réversibles)
- [H] H-1 · `run-report.ts` est réécrit en entier à la tâche 4 (bloc unique) ; ses lignes issues des tâches 2 et 3 sont identiques. Les tâches 5 à 7 le modifient par remplacements.
- [H] H-2 · Aides de test : `launched(argv, overrides)` lit `--out` dans l'argv et les fichiers écrits par le crochet `after` de `report`, avant la suppression du dossier ; `written` rend `null` quand le dossier n'existe pas (preuve de « aucun dossier créé » pour TEST-7).
- [H] H-3 · `scripted(id, usage, fail)` : `fail(call)` est appelé à chaque appel ; une valeur rendue est levée. TEST-4 `'wx'` s'en sert aussi comme crochet : au premier appel du local, il crée `out/summary.csv` (`held`) et rend `undefined`.
- [H] H-4 · Le cas `ANNOUNCED` de TEST-4 est regroupé dans le premier test de TEST-4 (deux lignes) ; `runs.csv` de TEST-4 est contrôlé par sa forme, `^(?:[^\r\n]*\r\n){5}$` (cinq lignes, chacune CRLF), comme le dit la spécification, pas par son texte exact.
- [H] H-5 · La fabrique par défaut de l'aide `report` lève désormais `this test gives no provider factory` (au lieu de `#33 must not call …`), après avoir compté l'appel.
- [H] H-6 · `stdout` égal à `ANNOUNCEMENT` n'est asserté que pour le cas `cap reached` de TEST-6 (seul cas à argv `ANNOUNCED`) ; les cas de coupure assertent le début de l'annonce, comme la spécification.
- [H] H-7 · TEST-7 prend `hosted-x` (nom du modèle hébergé, présent dans chaque CSV) pour valeur de clé ; la sentinelle `sentinel-value-not-a-key` sert au cas « clé dans une erreur locale ».
- [H] H-8 · Rouge de TEST-2 observé par la mutation M2a (simulation POSIX : `posix.relative` sur les formes à barres obliques), M2b prouvant SPEC-2 sous la même simulation ; absence de rouge de TEST-8 avant SPEC-8 montrée par M8-pre, morsure par M8a et M8b. Aucune mutation n'est commitée.
- [H] H-9 · Les messages d'assertion de TEST-5 n'affichent aucun chemin ; celui de TEST-8 affiche le stderr de l'enfant (un `ENOENT` y porterait un chemin temporaire, seulement sous mutation).
- [H] H-10 · Commentaires de décision ajoutés dans `run-report.ts` (R-3 dans `assertOutFree`, hôte `??`, origine de H1, D1, racine de système de fichiers ignorée, `network` sans statut, ordre remplacement puis contrôle de clé) et dans les tests (garde unique de TEST-6, `hosted-x` pris pour clé).
- [H] H-11 · La phrase du README forme un nouveau paragraphe après celle de la l.273.
- [H] H-12 · TEST-10 compare toutes les lignes `### ` du document aux cinq sous-titres : le document n'a pas d'autre titre de niveau 3.
- [H] H-13 · La prose de `docs/rapport-h2.md` au-delà de ce que fixe la spécification (titres, commandes, gestes, lecture de H2 à H4) est du planificateur ; elle ne cite aucun prix, aucune clé, aucun chemin de machine.

### Risques (plan)
- [H] La marge de taille est de 29 lignes (371 sur 400) : toute ligne ajoutée au code de ce plan la consomme ; la mesure de `pr_size.py` fait foi (même algorithme, comptée en sonde sur des copies).
- [H] R-1 : la stratégie neuve par run et `maxIterations` explicite ne sont gardés par aucun test ; une régression ne se verrait qu'à la relecture.
- [H] TEST-2 ne rougit jamais sous Windows : sa valeur hors Windows repose sur la simulation M2a (`posix.relative`), aucune intégration continue POSIX n'existant.
- [H] TEST-8 lance deux processus enfants et lit le vrai `data/rates.json` : sa durée (environ 0,3 s pour les deux lancements en sonde) et sa dépendance au fichier (R-6).
- [H] La lecture de H2 à H4 du document reprend la spécification ; elle n'a pas été confrontée à une vraie réponse de Gemini (aucune exécution réelle permise).
- [H] Comptes de la suite pour M8a et M8b déduits (observés sur `cli.test.ts` seul) : un écart de comptes sans `not ok` nouveau n'est pas un échec, un `not ok` hors des titres prévus en est un.
- [H] `scrubMachinePaths` est sensible à la casse (R-2) : un message d'erreur qui écrirait le chemin avec une autre casse de lecteur garderait le chemin ; Arthur relit les CSV (geste 5).
