# Spécification · Lancer le rapport H2 plafonné et écrire ses CSV sans fuite · #42 (C2b)

Date : 2026-09-30
Issue : https://github.com/arthurolivierfortin/agent-core/issues/42 (type feature, `T:feature`, jalon H2, sous le parapluie #3 ; C2b du découpage de #33 décidé par le pilote le 2026-09-30 ; dépend de #33, fusionné en a4f4805)
Checklist : docs/specs/2026-09-30-h2-report-launch-checklist.md
Branche : `feat/42-h2-report-launch` (worktree `.claude/worktrees/feat+42-h2-report-launch`, `main` a4f4805)
Continuité : docs/specs/2026-09-30-h2-report-runner-design.md (#33, C2a : `loadRateEntries`, `defaultProviders`, `runReport`, `REPORT_FILES`, `REPORT_MAX_ITERATIONS`, annonce, `--dry-run`, `cli.ts` ; ses hypothèses R-1 à R-3 sont traitées ici) ; docs/specs/2026-09-30-h2-report-guards-design.md (#20 : règles communes de `scripts/h2-report/`) ; docs/specs/2026-09-30-cap-guard-design.md (#35) et docs/specs/2026-09-30-cap-guard-finite-cost-design.md (#39) : `capGuard`.

## Objectif

Faire que `node scripts/h2-report/cli.ts --cap-usd <USD>` lance réellement la matrice H2 (modèle local contre Gemini, sous un seul plafond en dollars), écrive `summary.csv` et `runs.csv` sans chemin de machine ni valeur de clé, marque un rapport tronqué et sorte alors en 1, et documenter en français les gestes d'Arthur jusqu'au commit du CSV qui ferme #3.

## Source de l'issue et décisions du pilote

Corps de #42 (C2b), à faire respecter mot pour mot :

- Lancement réel sans `--dry-run` : `runMatrix` sur `{ model: [ollamaModel, geminiModel] }`, runs N, scénario et agent H1 recopiés de `tests/agent/testing/matrix-demo.test.ts` (`docs/demo/` intact), stratégie neuve à chaque run, `budget.maxIterations` 10 explicite, `RateTable` chargée. **Un seul** `capGuard(hosted, rates, capUsd)`, construit une fois et partagé par tous les runs hébergés ; le fournisseur local n'est pas gardé ; fabrique appelée une fois.
- `summary.csv` (`toCSV`) et `runs.csv` (`toRunsCSV`) sous `--out` ; chemins de la machine remplacés, `<repo>` puis `<home>`, en barres obliques et en contre-obliques ; écriture en `'wx'` ; `docs/reports/** -text` dans `.gitattributes`.
- Refus d'écrire si la valeur de `GEMINI_API_KEY` (après trim) apparaît dans l'un des textes : tous contrôlés avant la première écriture ; le message nomme chaque fichier et `GEMINI_API_KEY`, jamais la valeur ; rien n'est écrit, sortie 1.
- Troncature (option b du pilote) : tronqué si `cutReason()` est non nul, ou si `spentUsd() >= capUsd` avec `refused() > 0`. Alors `summary.truncated.csv`, `runs.truncated.csv` et `TRUNCATED.txt` (cause, dépense, plafond, refus, horodatage, modèles), soumis aux mêmes contrôles de clé et de chemin ; stderr « H2 report TRUNCATED (<cause>) » avec dépense, plafond et refus ; sortie 1. Cause : `cap reached`, `cut: <reason>`, ou `cut: network, no HTTP status reported` pour `network` (R-1 de #35). Un rapport complet n'a pas de `TRUNCATED.txt` et sort en 0.
- `docs/rapport-h2.md` en français : commandes exactes PowerShell et bash (dont `--dry-run`), gestes d'Arthur dans l'ordre, lecture de H2 à H4 dans les CSV ; lien depuis la section matrice du README.

Reprises demandées par le pilote (font foi) :

- P-1 · Verrou par test : `runReport` passe par `io.providers` quand il est donné, et n'appelle pas `defaultProviders`.
- P-2 · Le test de `cli.ts` (TEST-7 de #33) doit discriminer la racine du dépôt et la transmission de `process.env`.
- P-3 · R-2 de #33 : l'annonce cite l'hôte Ollama effectif (`OLLAMA_HOST`, ou le défaut s'il est absent).
- P-4 · R-3 de #33 : la comparaison de `--out` avec `docs/demo` reste correcte hors Windows quand la casse de `repo` diffère du chemin réel. Règle choisie et justifiée en D3.
- P-5 · R-1 de #33 : `loadRateEntries` refuse une `source` qui contient un retour à la ligne (une ligne de code, un test).

Contraintes (font foi) : aucun appel réseau dans la suite (doubles de fournisseurs, `fetch` remplacé) ; **aucune exécution réelle par la boucle ni par la PR** ; la valeur d'une clé n'apparaît nulle part ; aucun `.env` lu ; aucun `console.` dans `src/` ni dans `scripts/h2-report/` ; les tests ne figent pas les valeurs du vrai `data/rates.json` ; `docs/demo/` intact ; PR sous 400 lignes hors `docs/` et `*.md`, sans dérogation.

Première passe de #33 : la version de la spécification qui portait déjà les SPEC de C2b a été réécrite pour C2a dans le worktree `feat+33-h2-report-runner` ; aucun fichier `*h2-report*` des worktrees n'en garde trace (constaté par Grep sur `SPEC-(8|9|10|12)`). Son contenu est repris ici depuis le corps de #42, qui le recopie.

## État constaté dans le code (lecture du 2026-09-30, `main` a4f4805)

- `scripts/h2-report/run-report.ts` (130 lignes). En-tête l.1-2 : « Nothing here can spend: no provider is built… (P-5) ». `ReportIO` l.20-35 (`home` « unused by #33 » l.27-28, `providers` « never called by #33 » l.33-34). `REPORT_FILES` l.38 (`summary.csv`, `runs.csv`, `summary.truncated.csv`, `runs.truncated.csv`, `TRUNCATED.txt`). `REPORT_MAX_ITERATIONS = 10` l.41. `SCENARIO = "aller aux reglages"` l.44 (une chaîne). `defaultProviders` l.50-55, TSDoc « never called by #33 » l.47. `assertOutFree` l.62-72 : `relative(repo, target).split(/[\\/]/)` puis `toLowerCase()` par segment (l.64-65). `announcement` l.80-98 ; ligne locale l.90. `runReport` l.105-130 : `assertReadyToStart(args, loadRateFile(io.ratesText), io.env)` l.115 (la `RateTable` n'est pas gardée) ; refus du lancement réel l.126-129.
- `scripts/h2-report/run-report.test.ts` (178 lignes) : aide `report` l.44-64 (fabrique qui compte et lève, `home: repo`, `today: TODAY`, pas d'horloge), `ANNOUNCEMENT` l.127-137, `REAL_RUN_REFUSAL` l.151-152, `reportWithoutNetwork(argv)` l.155-164, second cas de TEST-6 (issue 33) « without --dry-run: … the real run refused » l.173-177.
- `scripts/h2-report/cli.ts` l.13 : `ratesText` lu par `new URL("../../data/rates.json", import.meta.url)` ; l.14 : `repo` tiré de `import.meta.url`. Les deux sont indépendants : un `repo` tiré de `process.cwd()` passerait TEST-7 de #33, lancé avec `cwd` = racine.
- `scripts/h2-report/cli.test.ts` l.10-18 : un seul cas, sans argument, `cwd` = racine du dépôt ; l'environnement hérité n'entre pas dans le résultat.
- `scripts/h2-report/rates.ts` l.56-58 : `source` doit être une chaîne non vide ; un `\n` ou un `\r` passe.
- `scripts/h2-report/cap-guard.ts` l.53 : `capGuard(provider, rates, capUsd): CapGuard` (`spentUsd`, `refused`, `cutReason`) ; `CutReason` l.8 : `rate_limited`, `http_<n>`, `network`, `unclassified`, `unpriced_model`. Un tarif à 0 (local) n'est pas « positif » (l.20-24) : un fournisseur local gardé couperait la matrice en `unpriced_model` dès son premier appel. Le message de refus au plafond est `capGuard refused a call to '<model>': <spent> USD spent reached the cap of <cap> USD` (l.66, l.73).
- `src/agent/testing/run-matrix.ts:15-26` : `MatrixOptions` (`scenarios`, `axes`, `runs`, `deps` appelé une fois par run, `rates`, `now: () => number`, défaut `Date.now`) ; l.117-174 : un run qui lève échoue avec son `error`, la matrice continue ; `toCSV`, `toRunsCSV` l.171-172. `src/agent/testing/matrix-csv.ts` : colonnes `scenario,model,runs,passed,successRate,meanDurationMs,tokensUsed,costUsd` et `scenario,model,run,passed,failures,error,durationMs,tokensUsed,costUsd,stopReason`, CRLF, champ cité dès qu'il contient `,`, `"`, CR ou LF. Servis par le sous-chemin `./testing` (`src/testing/index.ts`), jamais par `.`.
- `tests/agent/testing/matrix-demo.test.ts:35-42` : scénario `aller aux reglages` (`fakeApp({ pages: ["accueil", "reglages", "profil"], current: "accueil" })`, entrée `amene-moi aux reglages`, attentes `toolsUsed: ["navigate"]`, `finalState` `s.current === "reglages"`, `stopReason: "completed"`), agent `defineAgent({ name: "navigateur", prompt: "Tu aides a naviguer.", tools: [] })`, contexte `new SlidingWindowStrategy({ maxTokens: 100_000, counter: new HeuristicTokenCounter() })`.
- `src/agent/application/use-cases/step.ts:17` : `DEFAULT_MAX_ITERATIONS = 10` ; l.157-158 : borne. Un `budget.maxIterations` explicite à 10 est indiscernable du défaut par un test.
- `src/llm/providers/ollama/ollama-llm-provider.ts:50` : `config.baseURL ?? process.env.OLLAMA_HOST ?? "http://localhost:11434"` ; le défaut n'est pas exporté ; `fetch.bind(globalThis)` est lié à la construction (l.55). `src/llm/providers/gemini/gemini-llm-provider.ts:81` : la clé est lue dans `process.env` à chaque `complete()` ; un `fetch` rejeté devient un `LLMError` sans `status` (l.98-101), donc `network` pour `capGuard`.
- `src/metrics/services/aggregate.ts:43-45` : coût = `(tokensIn × in + tokensOut × out) / 1 000 000`.
- `.gitattributes` : deux lignes, `docs/demo/** -text`. `docs/reports/` n'existe pas.
- `README.md:230-273` : section `## Evaluating agents over a matrix`, dernière phrase l.273 sur `docs/demo/h1-matrix/`. `scripts/repo-conventions.test.mjs:158-174` (TEST-8 issue 9) contrôle cette section (symboles, aucun tiret cadratin) ; `GOOGLE_KEY_SHAPE` l.286.
- `data/rates.json` : `gemini-2.5-flash` à `rate: null` (source « non saisi… »), `qwen2.5:0.5b` à `{ 0, 0 }`, source `local`. Le vrai lancement est donc refusé au démarrage tant qu'Arthur n'a pas saisi le tarif.
- Aucune intégration continue n'exécute la suite (seul `.github/workflows/publish.yml`, qui ne teste pas) : la suite tourne sous Windows, en local.

## Périmètre

Dans la PR :

- `scripts/h2-report/rates.ts` et `rates.test.ts` (SPEC-1, TEST-1).
- `scripts/h2-report/run-report.ts` et `run-report.test.ts` (SPEC-2 à SPEC-7, TEST-2 à TEST-7).
- `scripts/h2-report/cli.ts` et `cli.test.ts` (SPEC-8, TEST-8).
- `.gitattributes` (SPEC-9) et `scripts/repo-conventions.test.mjs` (TEST-9, TEST-10).
- `docs/rapport-h2.md` (créé) et `README.md` (une phrase) (SPEC-10).

Hors périmètre : `src/` (aucune ligne), `package.json`, `tsconfig*.json`, `data/rates.json` (le tarif est saisi par Arthur), `docs/demo/`, `report-args.ts`, `start-guard.ts`, `cap-guard.ts`, les barrels, `docs/guide-agent-package.md`, `ROADMAP.md`. Aucune écriture de `report.json` (l'issue ne demande que les deux CSV). Aucune nouvelle tentative après une coupure.

## Conception

Règles communes de #20 maintenues (TypeScript effaçable, `import type`, voisins en `./<nom>.ts`, aucun `console.`, aucun `.env`, aucun `index.ts` sous `scripts/`, seul `cli.ts` lit `process.*`), avec une extension déclarée (D1) : `runMatrix`, `defineScenario`, `fakeApp` et le type `FakeAppState` viennent de `../../dist/testing/index.js`, le sous-chemin `./testing` du paquet, parce que `.` ne sert pas le harnais. Le module ne touche le réseau que par les fournisseurs que rend `io.providers` (ou `defaultProviders`), jamais par `fetch` lui-même. Messages en anglais, comme ceux de C2a.

### Placement et noms

| Fichier | Ajouts |
|---|---|
| `scripts/h2-report/rates.ts` | une condition dans `readEntry` |
| `scripts/h2-report/run-report.ts` | `ReportIO.now` ; constantes non exportées `H1_SCENARIO`, `H1_AGENT`, `DEFAULT_OLLAMA_HOST` (`SCENARIO` disparaît, l'annonce lit `H1_SCENARIO.name`) ; fonctions non exportées `scrubMachinePaths`, `truncationCause`, `truncationMark`, `launch` |
| `scripts/h2-report/cli.ts` | `repo` calculé une fois, `ratesText` lu dans `join(repo, "data", "rates.json")` |

Les noms des fichiers écrits sont ceux de `REPORT_FILES`, lus par déstructuration (`const [SUMMARY, RUNS, SUMMARY_TRUNCATED, RUNS_TRUNCATED, MARK] = REPORT_FILES`), jamais réécrits en littéraux dans `run-report.ts`.

### SPEC-1 · Source sur une seule ligne (`scripts/h2-report/rates.ts`, R-1 de #33)

Dans `readEntry`, juste après le contrôle de chaîne non vide (l.56-58), une ligne : si `/[\r\n]/.test(entry.source)`, `throw new Error(\`${where}.source: must hold no line break\`)`. `loadRateFile` hérite du refus. Le message ne cite pas la source.

### SPEC-2 · `docs/demo` comparé sans casse sur toute plateforme (`assertOutFree`, R-3 de #33)

```ts
const target = resolve(repo, out);
const segments = relative(repo.toLowerCase(), target.toLowerCase()).split(/[\\/]/);
if (segments[0] === "docs" && segments[1] === "demo") { /* même message qu'aujourd'hui */ }
```

`repo` et `target` sont mis en minuscules **avant** `relative`, sur toutes les plateformes ; les `toLowerCase()` par segment disparaissent (déjà en minuscules). Le contrôle des fichiers présents (`existsSync(join(target, name))`) garde `target` tel quel. Justification en D3.

### SPEC-3 · Hôte Ollama annoncé (`announcement`, R-2 de #33)

`const DEFAULT_OLLAMA_HOST = "http://localhost:11434";` avec le commentaire `// The default of OllamaLLMProvider (ollama-llm-provider.ts), not exported by the package.` `announcement(args, entries, env)` reçoit `io.env` et insère, juste après la ligne `local model: …`, la ligne :

- `local host: <OLLAMA_HOST> (from OLLAMA_HOST)` si `env.OLLAMA_HOST !== undefined` (valeur reprise telle quelle, chaîne vide comprise : c'est ce que fait le constructeur, qui teste `??`) ;
- `local host: http://localhost:11434 (default, OLLAMA_HOST unset)` sinon.

L'annonce reste identique au caractère près sur les chemins `--dry-run` et lancement réel. `cli.ts` passe `process.env`, celui que lit `OllamaLLMProvider`.

### SPEC-4 · Lancement réel et écriture d'un rapport complet

`ReportIO` gagne :

```ts
/** Clock of every duration and of the TRUNCATED.txt timestamp; defaults to the current time. */
readonly now?: () => Date;
```

Les TSDoc de `home`, `providers`, `defaultProviders`, `REPORT_FILES` et l'en-tête du fichier ne disent plus « never called by #33 » ni « nothing here can spend » : la dépense passe par `io.providers` (ou `defaultProviders`), sous un seul `capGuard`.

Constantes recopiées de `matrix-demo.test.ts:35-42` (mêmes valeurs, au caractère près) :

```ts
const H1_SCENARIO = defineScenario({ name: "aller aux reglages", env: () => fakeApp({ pages: ["accueil", "reglages", "profil"], current: "accueil" }), input: "amene-moi aux reglages", expect: { toolsUsed: ["navigate"], finalState: (s: FakeAppState) => s.current === "reglages", stopReason: "completed" } });
const H1_AGENT = defineAgent({ name: "navigateur", prompt: "Tu aides a naviguer.", tools: [] });
```

`runReport` garde `rates` (`const rates = loadRateFile(io.ratesText)`, passé à `assertReadyToStart`). Après l'annonce : `--dry-run` inchangé (ligne `dry run: no provider built, no call made`, code 0). Sinon, le refus de C2a (l.126-129) est retiré et `runReport` rend `await launch(io, args, rates)`. `launch`, dans un seul `try` :

1. `const providers = (io.providers ?? defaultProviders)(args)` : **un seul appel** de la fabrique, `io.providers` s'il est donné.
2. `const guard = capGuard(providers.hosted, rates, args.capUsd)` : **un seul** garde, construit une fois.
3. `const clock = io.now ?? (() => new Date())`.
4. `const report = await runMatrix({ scenarios: [H1_SCENARIO], axes: { model: [args.ollamaModel, args.geminiModel] }, runs: args.runs, deps: ({ model }) => ({ agent: H1_AGENT, llm: model === args.geminiModel ? guard : providers.local, model, context: new SlidingWindowStrategy({ maxTokens: 100_000, counter: new HeuristicTokenCounter() }), budget: { maxIterations: REPORT_MAX_ITERATIONS } }), rates, now: () => clock().getTime() })`. Le fournisseur local n'est pas gardé ; la stratégie de contexte est neuve à chaque appel de `deps`, donc à chaque run.
5. Textes du rapport complet : `[[SUMMARY, report.toCSV()], [RUNS, report.toRunsCSV()]]`.
6. `const target = resolve(io.repo, args.out)` ; `mkdirSync(target, { recursive: true })` ; pour chaque texte, dans l'ordre, `writeFileSync(join(target, name), text, { flag: "wx" })`.
7. `io.stdout.write(\`H2 report written: ${SUMMARY}, ${RUNS} in ${args.out}\n\`)` ; rend `0`.

Toute exception levée dans `launch` (fabrique, `capGuard`, `runMatrix`, `mkdirSync`, `writeFileSync`, dont `EEXIST` du drapeau `'wx'`) : `io.stderr.write(messageOf(error) + "\n")`, rend `1`. `runReport` ne lève toujours pas.

### SPEC-5 · Chemins de la machine remplacés (`scrubMachinePaths(text, repo, home)`)

```ts
/** <repo> then <home>, each in its slash and its backslash spelling: the repo usually sits under home. */
function scrubMachinePaths(text: string, repo: string, home: string): string;
```

Pour `[repo, "<repo>"]` puis `[home, "<home>"]` : une racine vide ou racine du système de fichiers (`dirname(root) === root`) est ignorée ; sinon `text = text.replaceAll(root.replaceAll("\\", "/"), label)` puis `text = text.replaceAll(root.replaceAll("/", "\\"), label)`. Comparaison exacte, casse comprise (voir Hypothèses, R-2). `launch` applique la fonction à **chaque** texte avant tout contrôle et toute écriture (rapport complet comme tronqué).

### SPEC-6 · Troncature (option b du pilote)

```ts
/** Null for a complete report; else why it is truncated. */
function truncationCause(guard: CapGuard, capUsd: number): string | null;
```

Dans cet ordre :

- `cutReason() === "network"` → `cut: network, no HTTP status reported` ;
- tout autre `cutReason()` non nul → `cut: <reason>` (par exemple `cut: http_503`, `cut: unclassified`) ;
- `spentUsd() >= capUsd && refused() > 0` → `cap reached` ;
- sinon `null`.

Quand la cause n'est pas nulle, les textes sont `[[SUMMARY_TRUNCATED, report.toCSV()], [RUNS_TRUNCATED, report.toRunsCSV()], [MARK, truncationMark(…)]]`, passés par `scrubMachinePaths`, par le contrôle de clé (SPEC-7) et par l'écriture en `'wx'` comme ceux d'un rapport complet. `TRUNCATED.txt`, fins de ligne `\n`, nombres par `String(n)` :

```
H2 report TRUNCATED
cause: <cause>
spent: <spentUsd()> USD
cap: <capUsd> USD
refused calls: <refused()>
at: <clock().toISOString()>
models: <ollamaModel> (local), <geminiModel> (hosted)
```

Puis `io.stderr.write(\`H2 report TRUNCATED (${cause}): spent ${spent} USD, cap ${capUsd} USD, ${refused} calls refused; see ${MARK} in ${args.out}\n\`)`, rien sur stdout après l'annonce, et `runReport` rend `1`. Un rapport complet n'écrit ni `TRUNCATED.txt` ni fichier `*.truncated.csv`.

### SPEC-7 · Refus d'écrire une clé

Après `scrubMachinePaths` et avant `mkdirSync` : `const key = (io.env.GEMINI_API_KEY ?? "").trim()`. Si `key !== ""`, `leaking` = noms des textes qui contiennent `key`, dans l'ordre d'écriture. Si `leaking` n'est pas vide : `io.stderr.write(\`refusing to write: the value of GEMINI_API_KEY appears in ${leaking.join(", ")}; nothing was written\n\`)`, aucun dossier créé, aucun fichier écrit, ni ligne `H2 report written`, ni ligne `H2 report TRUNCATED` ; `runReport` rend `1`. Le message ne contient jamais la valeur. Le contrôle porte sur les textes tels qu'ils seraient écrits (après remplacement des chemins).

### SPEC-8 · `cli.ts` : tarifs lus depuis la racine calculée

`const repo = dirname(dirname(dirname(fileURLToPath(import.meta.url))));` une fois, puis `ratesText: readFileSync(join(repo, "data", "rates.json"), "utf8")` et `repo`. Un `repo` mal calculé (par exemple `process.cwd()` lancé hors de la racine) fait alors échouer la lecture des tarifs par `ENOENT`, ce que TEST-8 observe. L'en-tête renvoie à `docs/rapport-h2.md` au lieu de « documented by #42 ». Toujours aucun `providers` passé : `runReport` prend `defaultProviders`.

### SPEC-9 · `.gitattributes`

Ajout, après les deux lignes existantes :

```
# The H2 report files are committed as written (CRLF in the CSV): no line-ending conversion.
docs/reports/** -text
```

### SPEC-10 · `docs/rapport-h2.md` et lien du README

`docs/rapport-h2.md`, en français, sans tiret cadratin, sans valeur de clé ni chemin de machine, avec ces titres dans cet ordre :

1. `# Rapport H2 : modèle local contre Gemini, sous plafond` : l'objet (le rapport qui ferme #3), le scénario H1 `aller aux reglages`, N runs par modèle (défaut 5), le plafond qui ne vaut que pour le modèle hébergé.
2. `## Prérequis` : Node 22 et `npm ci` fait une fois ; Ollama démarré avec le modèle tiré (`ollama pull qwen2.5:0.5b`) ; l'hôte effectif est annoncé (`local host:`). Si tous les runs locaux portent `Ollama request failed` dans `error`, le rapport est complet mais inutilisable : ne pas le commiter, relancer dans un autre `--out`.
3. `## Les gestes d'Arthur, dans l'ordre`, puis exactement ces cinq sous-titres :
   - `### 1. Vérifier le tarif dans data/rates.json` : la forme d'une entrée hébergée (`rate` à deux prix strictement positifs, `effectiveFrom` en `AAAA-MM-JJ`, `source` = URL de la page de prix, sur une seule ligne), sans aucun prix écrit dans le document ; tant que `rate` vaut `null`, le démarrage est refusé.
   - `### 2. Exposer GEMINI_API_KEY dans le shell` : hors de tout fichier et de toute ligne de commande, par `$env:GEMINI_API_KEY = Read-Host -MaskInput "GEMINI_API_KEY"` (PowerShell 7.1 ou plus) ou `read -rs GEMINI_API_KEY && export GEMINI_API_KEY` (bash).
   - `### 3. Répéter à blanc (--dry-run)` : les deux commandes `--dry-run`, puis la lecture de l'annonce (modèles, tarifs datés et sourcés, hôte local, appels au plus, plafond, `--out`).
   - `### 4. Lancer` : les deux commandes de lancement ; codes de sortie (0 complet ; 1 pour un refus, un rapport tronqué ou une écriture refusée) ; fichiers écrits ; chemins réduits à `<repo>` et `<home>` ; un rapport tronqué (`TRUNCATED.txt`) ne ferme pas #3 : lever la cause, relancer dans un autre `--out`.
   - `### 5. Commiter le CSV, qui ferme #3` : relire les deux CSV (aucune clé, chemins réduits à `<repo>` et `<home>`), branche `docs/3-rapport-h2`, commit de `summary.csv` et `runs.csv` seuls, PR dont le corps contient `Closes #3` ; puis `Remove-Item Env:GEMINI_API_KEY` (PowerShell) ou `unset GEMINI_API_KEY` (bash).
4. `## Lire H2 à H4 dans les CSV` : H2 (résultat d'outil en contenu `user`) : une ligne hébergée de `runs.csv` à `passed` `true` a fait un second appel après le résultat de `navigate`, que Gemini a accepté ; un refus se lit en `error` (`Gemini 400 …`) et en troncature `cut: http_400`. H3 (identifiant de `functionCall` facultatif) : un run hébergé réussi corrobore le lien par le nom, sans identifiant renvoyé ; le CSV ne dit pas si Gemini a envoyé un identifiant. H4 (`thoughtsTokenCount` compté en sortie) : une cellule `tokensUsed` non vide montre trois compteurs numériques ; le CSV ne sépare ni entrée, ni sortie, ni pensée : comparer `costUsd` au relevé de facturation de la console Google du même jour.

Commandes, chacune seule sur sa ligne dans un bloc de code, lancées depuis la racine du dépôt (le document dit que le plafond `1` est un exemple, à remplacer par celui qu'Arthur choisit) :

```
npm run build; if ($LASTEXITCODE -eq 0) { node scripts/h2-report/cli.ts --cap-usd 1 --dry-run }
npm run build && node scripts/h2-report/cli.ts --cap-usd 1 --dry-run
npm run build; if ($LASTEXITCODE -eq 0) { node scripts/h2-report/cli.ts --cap-usd 1 }
npm run build && node scripts/h2-report/cli.ts --cap-usd 1
```

`README.md`, section `## Evaluating agents over a matrix`, après la phrase de la l.273, une phrase en anglais, sans tiret cadratin : `The first real comparison (milestone H2), a local model against Gemini under a dollar cap, is launched by \`scripts/h2-report/cli.ts\`: see [docs/rapport-h2.md](docs/rapport-h2.md) (in French).`

## Chemins nominal et d'erreur

| Situation | stdout | stderr | Code | Écrit dans `--out` |
|---|---|---|---|---|
| refus de démarrage, `--out` refusé (C2a, inchangés) | rien | le message | 1 | rien |
| `--dry-run` | annonce + `dry run: …` | rien | 0 | rien |
| lancement, rapport complet | annonce + `H2 report written: …` | rien | 0 | `summary.csv`, `runs.csv` |
| lancement, tronqué (plafond ou coupure) | annonce | `H2 report TRUNCATED (<cause>): …` | 1 | `summary.truncated.csv`, `runs.truncated.csv`, `TRUNCATED.txt` |
| lancement, clé présente dans un texte | annonce | `refusing to write: …` | 1 | rien, dossier non créé |
| lancement, exception (fabrique, `EEXIST` de `'wx'`) | annonce | le message | 1 | les fichiers écrits avant l'échec (R-4) |

## Symétrie

- Écriture face à lecture : `REPORT_FILES`, posé par C2a et lu au démarrage (`assertOutFree`), est exactement l'ensemble écrit ici (déstructuration, aucun littéral). `ReportIO.home`, déclaré par C2a, est enfin lu (SPEC-5). `effectiveFrom`, `source` et `OLLAMA_HOST` sont annoncés ; `source` est contrainte à une ligne (SPEC-1) parce que l'annonce la lit sur une ligne.
- Nominal face à erreur : complet (0, deux fichiers) face à tronqué (1, trois fichiers) face à écriture refusée (1, aucun fichier) ; `repo` puis `home` ; barre oblique face à contre-oblique ; garde partagé face à fournisseur local non gardé.
- Énumération des causes : `CutReason` de `cap-guard.ts` (5 valeurs) est traduite sans liste : `network` a un libellé propre, toute autre raison passe par `cut: <reason>`, ce qui suit une valeur ajoutée plus tard sans modification ici. `cap reached` n'est pas une `CutReason` (« Reaching the cap is not a cut », `cap-guard.ts:7`).

## Données touchées

Aucune base. À l'exécution réelle (par Arthur seulement) : création du dossier `--out` (défaut `docs/reports/h2-<AAAA-MM-JJ>/`) et de deux ou trois fichiers en `'wx'`. Dans les tests : dossiers temporaires `mkdtempSync(join(tmpdir(), "h2-report-"))` supprimés en `finally` ; tarifs littéraux ; clé sentinelle `sentinel-value-not-a-key` dans un `env` littéral ; `globalThis.fetch` remplacé par un compteur qui lève, restauré en `finally`. TEST-8 lance `cli.ts` en processus enfant, toujours avec `--dry-run`.

## Décisions et alternatives écartées

- **D1 · Le harnais vient de `../../dist/testing/index.js`**, comme un consommateur l'importe ; écartés : l'exporter depuis `.` (`src/` hors périmètre, règle de placement du paquet) ou recopier `runMatrix`.
- **D2 · `launch` séparée de `runReport`**, pour que le `try` du lancement rende 1 sans mêler ses erreurs aux refus de démarrage, qui n'écrivent rien sur stdout.
- **D3 · R-3 : minuscules avant `relative`, sur toutes les plateformes.** Le refus de `docs/demo` protège la preuve H1 ; le doute doit refuser. Hors Windows, sur un système sensible à la casse, deux dossiers qui ne diffèrent que par la casse seraient confondus : le seul effet est un refus de trop, réparé par un autre `--out`. Écartés : `realpathSync.native` (lève quand `--out` n'existe pas encore, cas nominal, et ne rend pas la casse réelle sur toutes les plateformes) ; laisser tel quel (accepte en silence, sous macOS, un `docs/demo` écrit dans une autre casse que `repo`).
- **D4 · Le contrôle de clé porte sur les textes après remplacement des chemins** : ce sont eux qui seraient écrits.
- **D5 · Horloge unique `io.now`** pour les durées de `runMatrix` et l'horodatage de `TRUNCATED.txt` : les tests figent les deux (durées 0, horodatage connu) ; écarté : réutiliser `io.today`, qui date `--out` à minuit local.
- **D6 · Un rapport tronqué ne ferme pas #3** (document). Il reste une trace locale ; Arthur relance après avoir levé la cause. Réversible par une phrase du document.
- **D7 · `cli.ts` lit les tarifs sous `repo`** (SPEC-8) : sans ce lien, aucun test ne peut observer `repo`, car le vrai `data/rates.json` arrête le démarrage avant `--out` (tarif Gemini `null`).
- **D8 · Commandes du document avec `--cap-usd 1`**, valeur d'exemple annoncée comme telle : une commande à paramètre `<USD>` ne se colle pas telle quelle dans un shell.

## Ordre des commits et preuve de rouge

Un SPEC = un commit = un test, dans l'ordre SPEC-1 à SPEC-10. La spécification et la checklist entrent dans le commit de SPEC-1. Preuves par `npm run test`, chemins relatifs au dépôt, titres `TEST-N (issue 42)`.

État intermédiaire déclaré : de SPEC-4 à SPEC-7, un lancement réel écrirait des CSV sans tous les contrôles ; personne ne lance (contrainte du pilote), et la PR est livrée entière.

- TEST-1 avant SPEC-1 : `loadRateFile` d'une source `https://a.test/\nnext` ne lève pas.
- TEST-2 avant SPEC-2 : **rouge observable hors Windows seulement** (`path.relative` de win32 compare déjà sans casse) ; sous Windows, TEST-2 est vert avant SPEC-2 : verrou de non-régression, rouge déclaré non observable sur la machine de développement.
- TEST-3 avant SPEC-3 : stdout sans ligne `local host:`.
- TEST-4 avant SPEC-4 : code 1 et stderr `refusing the real run: …` au lieu de 0 et des deux fichiers.
- TEST-5 avant SPEC-5 : `runs.csv` contient le chemin du `repo` temporaire.
- TEST-6 avant SPEC-6 : `summary.csv` écrit et code 0 là où `TRUNCATED.txt` et 1 sont attendus.
- TEST-7 avant SPEC-7 : fichiers écrits et code 0 (ou 1 tronqué, sans le refus attendu) malgré la clé.
- TEST-8 avant SPEC-8 : aucun rouge (l'environnement est déjà transmis, les tarifs déjà lus par `import.meta.url`) : TEST-8 est un verrou, dont la morsure se prouve par mutation après SPEC-8 (`repo: process.cwd()` → `ENOENT` dans stderr ; `env: {}` → second lancement qui signale la clé absente).
- TEST-9 avant SPEC-9 : `.gitattributes` sans `docs/reports/** -text`.
- TEST-10 avant SPEC-10 : `docs/rapport-h2.md` introuvable.

Gabarit (aucun `Co-Authored-By`) :

```
<type>(<scope>): <sujet>

Refs: #42
Session: <id>
Model: <modèle>
Authorship: ai
```

| SPEC | Sujet (impératif, 72 caractères au plus type compris) |
|---|---|
| 1 | `feat(scripts): refuser une source de tarif sur plusieurs lignes` (63) |
| 2 | `fix(scripts): comparer --out à docs/demo sans tenir compte de la casse` (70) |
| 3 | `feat(scripts): annoncer l'hôte Ollama effectif du rapport H2` (60) |
| 4 | `feat(scripts): lancer la matrice H2 plafonnée et écrire les CSV` (64) |
| 5 | `feat(scripts): remplacer les chemins de la machine dans les CSV` (64) |
| 6 | `feat(scripts): marquer un rapport H2 tronqué et sortir en 1` (59) |
| 7 | `feat(scripts): refuser d'écrire un rapport qui contient la clé` (62) |
| 8 | `fix(scripts): lire les tarifs depuis la racine du dépôt dans cli.ts` (68) |
| 9 | `chore(git): garder les fins de ligne des rapports sous docs/reports` (68) |
| 10 | `docs(scripts): documenter le lancement du rapport H2 en français` (65) |

### Message de squash proposé

```
feat(scripts): lancer le rapport H2 plafonné et écrire ses CSV

Sans --dry-run, scripts/h2-report/cli.ts lance la matrice H2 : le
scénario H1 sur le modèle local et sur Gemini, N runs chacun, un seul
capGuard partagé par tous les runs hébergés, le local non gardé.

- summary.csv et runs.csv sont écrits en 'wx' sous --out, chemins de
  la machine remplacés par <repo> puis <home>.
- Rien n'est écrit si la valeur de GEMINI_API_KEY apparaît dans un
  texte ; le message nomme les fichiers, jamais la valeur.
- Un rapport coupé ou arrêté au plafond devient summary.truncated.csv,
  runs.truncated.csv et TRUNCATED.txt, et sort en 1.
- L'annonce cite l'hôte Ollama ; une source de tarif tient sur une
  ligne ; docs/demo est refusé quelle que soit la casse, partout.
- docs/rapport-h2.md donne les commandes et les gestes jusqu'au
  commit du CSV qui ferme #3.

Refs: #42
Session: <id>
Model: <modèle>
Authorship: ai
```

Sujet : 63 caractères sans le suffixe, 69 avec ` (#NN)`.

## Tests

Déterministes, sans réseau, sans horloge réelle, sans `.env`. Titres préfixés `TEST-N (issue 42)`.

Fixtures ajoutées dans `run-report.test.ts` :

- `NOW = new Date("2026-09-30T12:00:00.000Z")`, passée en `now: () => NOW` par l'aide `report` à chaque appel (les tests de C2a n'en dépendent pas) ;
- `Overrides` gagne `providers?: (repo: string) => ReportProviders` (la fabrique de l'aide compte l'appel puis délègue ; sans override, elle compte et lève comme aujourd'hui), `home?: (repo: string) => string` (défaut : `repo`) et `after?: (repo: string) => void` (appelée après `runReport`, avant la suppression du dossier) ; `reportWithoutNetwork(argv, overrides?)` les transmet ;
- `scripted(id, usage, fail?)` : double de `LLMProvider` qui déclare le seul modèle `id`, ne diffuse pas, compte ses appels et répond, à un appel impair, un `toolCalls` `navigate` vers `reglages`, à un appel pair, `Vous etes aux reglages.` sans outil ; si `fail(call)` rend une valeur, il la lève à cet appel ;
- `LOCAL_USAGE = { tokensIn: 10, tokensOut: 5 }` ; `HOSTED_USAGE = { tokensIn: 0, tokensOut: 200_000 }`, soit 0,5 USD exactement par appel au tarif de `hosted-x` ;
- `written(repo, out)` : `{ nom: texte }` des fichiers de `<repo>/<out>`, ou `null` si le dossier n'existe pas ;
- `COMPLETE = ["--cap-usd", "5", "--runs", "2", ...MODELS, "--out", "out/"]`.

- **TEST-1** (exerce SPEC-1, `rates.test.ts`) : `loadRateFile(withEntry({ source: "https://a.test/\nnext" }))` et `loadRateFile(withEntry({ source: "a\rb" }))` lèvent `rates['m'].source: must hold no line break` ; `loadRateEntries` lève le même message.
- **TEST-2** (exerce SPEC-2) : `--out` = `join(repo.toUpperCase(), "docs", "demo")` (forme fonction de l'argv) → code 1, stderr égal au refus `docs/demo` exact, fabrique 0. `docs/demonstration/` reste accepté (TEST-4 de #33 inchangé).
- **TEST-3** (exerce SPEC-3) : `ANNOUNCEMENT` gagne la ligne `local host: http://localhost:11434 (default, OLLAMA_HOST unset)` après la ligne locale (TEST-5 et TEST-6 de #33 la lisent) ; avec `env` `{ ...ENV, OLLAMA_HOST: "http://ollama.test:11434" }` et `--dry-run`, les lignes de stdout comprennent `local host: http://ollama.test:11434 (from OLLAMA_HOST)`.
- **TEST-4** (exerce SPEC-4 et le verrou P-1), par `reportWithoutNetwork` avec `providers: () => ({ local: scripted("local-x", LOCAL_USAGE), hosted: scripted("hosted-x", HOSTED_USAGE) })` :
  - `COMPLETE` : code 0 ; stderr `""` ; stdout qui finit par `H2 report written: summary.csv, runs.csv in out/\n` ; `factoryCalls` 1 ; `fetchCalls` 0 (une fabrique par défaut aurait construit de vrais fournisseurs, dont le `fetch`, lié à la construction, aurait été compté) ; `written(repo, "out/")` a exactement les clés `runs.csv` et `summary.csv` ; `summary.csv` vaut exactement `scenario,model,runs,passed,successRate,meanDurationMs,tokensUsed,costUsd\r\naller aux reglages,local-x,2,2,1,0,60,0\r\naller aux reglages,hosted-x,2,2,1,0,800000,2\r\n` (le local passe : non gardé, car un garde le couperait en `unpriced_model`) ; `runs.csv` se termine par `\r\n` et compte 5 lignes (en-tête et 4 runs) ;
  - `ANNOUNCED` sans `--dry-run` : stdout commence par `ANNOUNCEMENT` au caractère près (D3 de #33), `factoryCalls` 1. Le second cas de TEST-6 (issue 33) et `REAL_RUN_REFUSAL` sont retirés ;
  - `'wx'` : avec `COMPLETE`, un double local dont le premier appel crée `<repo>/out/summary.csv` avec le texte `held` → code 1, stderr contient `EEXIST`, `summary.csv` vaut toujours `held`, `runs.csv` absent.
- **TEST-5** (exerce SPEC-5) : `COMPLETE`, `home: (repo) => dirname(repo)` ; le double local lève, au premier appel, une `Error` de message `cannot open ${repo}/a and ${repo.replaceAll("\\", "/")}/b and ${repo.replaceAll("/", "\\")}\\c in ${dirname(repo)}` ; `runs.csv` contient `cannot open <repo>/a and <repo>/b and <repo>\c in <home>` et ne contient ni `repo`, ni `repo.replaceAll("\\", "/")`, ni `dirname(repo)`. L'ordre `<repo>` puis `<home>` est discriminé : `repo` est sous `home`.
- **TEST-6** (exerce SPEC-6), une ligne par cas ; chaque fois : code 1 ; stdout qui commence par `H2 report: announcement, before any network call\n` et ne contient pas `H2 report written` ; `written` a exactement les clés `TRUNCATED.txt`, `runs.truncated.csv`, `summary.truncated.csv` ; `TRUNCATED.txt` égal au texte exact de SPEC-6 avec `at: 2026-09-30T12:00:00.000Z` et `models: local-x (local), hosted-x (hosted)` ; stderr égal au message exact de SPEC-6 :
  - `ANNOUNCED` (plafond 2,5, N 3), hébergé normal → `cap reached`, `spent: 2.5 USD`, `refused calls: 1`, stdout égal à `ANNOUNCEMENT` ; `runs.truncated.csv` contient `capGuard refused a call to 'hosted-x': 2.5 USD spent reached the cap of 2.5 USD` (un garde par run plafonnerait chaque run à 1 USD, sans jamais refuser : verrou du garde unique) ;
  - `[...BASE, "--runs", "2", "--out", "out/"]`, hébergé qui lève au premier appel `new LLMError("API_ERROR", "unavailable", { status: 503 })` → `cut: http_503`, `spent: 0 USD`, `refused calls: 1` ;
  - même argv, hébergé qui lève au premier appel `new LLMError("API_ERROR", "fetch failed")` → `cut: network, no HTTP status reported`, `spent: 0 USD`, `refused calls: 1`.
- **TEST-7** (exerce SPEC-7), une ligne par cas ; chaque fois : code 1, stderr égal à `refusing to write: the value of GEMINI_API_KEY appears in <noms>; nothing was written\n`, `written` rend `null` (dossier non créé), stderr sans la valeur trimée :
  - `COMPLETE`, `env` `{ GEMINI_API_KEY: "  hosted-x  " }` → `summary.csv, runs.csv` (le trim est prouvé) ;
  - `COMPLETE`, `env` `ENV`, double local qui lève `Error(\`leaked ${KEY}\`)` au premier appel → `runs.csv` ;
  - `ANNOUNCED`, `env` `{ GEMINI_API_KEY: "hosted-x" }` → `summary.truncated.csv, runs.truncated.csv, TRUNCATED.txt` (les textes tronqués passent le même contrôle).
- **TEST-8** (exerce SPEC-8 et P-2, `cli.test.ts`) : le cas de #33 reste. Deux lancements par `spawnSync(process.execPath, [<chemin absolu de cli.ts>, "--cap-usd", "1", "--dry-run"], { cwd: tmpdir(), env, encoding: "utf8" })` : `env` = `process.env` sans aucune variable dont le nom, en majuscules, vaut `GEMINI_API_KEY`, puis le même plus `GEMINI_API_KEY: "sentinel-value-not-a-key"`. Les deux : stderr sans `ENOENT` (racine tirée du fichier, pas du dossier courant), stdout et stderr sans la sentinelle. Le stderr du premier contient `environment variable GEMINI_API_KEY is unset or empty` ; celui du second ne le contient pas (`process.env` transmis). Aucune assertion sur les valeurs de `data/rates.json` ni sur le code de sortie ; `--dry-run` garantit qu'aucun chemin n'appelle de fournisseur, quel que soit le tarif saisi un jour.
- **TEST-9** (exerce SPEC-9, `repo-conventions.test.mjs`) : les lignes de `.gitattributes` comprennent `docs/demo/** -text` et `docs/reports/** -text`.
- **TEST-10** (exerce SPEC-10, `repo-conventions.test.mjs`) : les lignes de `docs/rapport-h2.md` comprennent les quatre commandes de SPEC-10, chacune comme ligne entière, et les cinq sous-titres `### 1.` à `### 5.` de SPEC-10, dans cet ordre ; le texte contient `GEMINI_API_KEY`, `data/rates.json`, `TRUNCATED.txt`, `<repo>`, `<home>`, `Closes #3`, `H2`, `H3`, `H4` ; aucun tiret cadratin ; aucune correspondance de `GOOGLE_KEY_SHAPE`. La section `## Evaluating agents over a matrix` du README contient `(docs/rapport-h2.md)`.

## Estimation de taille

Lignes ajoutées ou modifiées, hors `docs/` et `*.md` :

| Fichier | Estimation |
|---|---|
| `scripts/h2-report/rates.ts` (SPEC-1) | 1 |
| `scripts/h2-report/rates.test.ts` (TEST-1) | 6 |
| `scripts/h2-report/run-report.ts` (imports 6, TSDoc et en-tête retouchés 8, `now` 2, H1 12, hôte 6, `assertOutFree` 2, `launch` 40, `scrubMachinePaths` 9, `truncationCause` et `truncationMark` 16, refus de clé 6) | 107 |
| `scripts/h2-report/run-report.test.ts` (aide et fixtures 30, TEST-2 4, TEST-3 6, TEST-4 25, TEST-5 10, TEST-6 30, TEST-7 18) | 123 |
| `scripts/h2-report/cli.ts` (SPEC-8) | 4 |
| `scripts/h2-report/cli.test.ts` (TEST-8) | 18 |
| `.gitattributes` (SPEC-9) | 2 |
| `scripts/repo-conventions.test.mjs` (TEST-9 5, TEST-10 15) | 20 |
| **Total** | **environ 280** (fourchette 240 à 370) |

Sous le plafond de 400 sans dérogation, au-dessus des 250 estimées par l'issue avant les reprises (P-1 à P-5 : environ 45 lignes). À l'écart constaté sur #35 (+28 %), 280 deviennent 358 ; sur #33 (+18 %), 330. Leviers, dans l'ordre, si la mesure du plan approche 400 : retirer le cas `'wx'` de TEST-4 (environ 8 lignes ; le refus au démarrage de C2a couvre le cas courant), réduire TEST-10 aux commandes et au lien (environ 6), fusionner TEST-9 dans TEST-10 (environ 3). Au-delà de 400 mesurées, s'arrêter et le signaler au pilote. La mesure (`pr_size.py`) fait foi à la PR.

## Hypothèses restantes

- **R-1 · Non discriminés par test** : la stratégie de contexte neuve à chaque run (`SlidingWindowStrategy` ne garde aucun état observable d'un run court à l'autre) et `budget.maxIterations` explicite (identique au défaut de `step.ts:17`). Vérifiés à la relecture du code de `launch`.
- **R-2 · Remplacement des chemins exact, casse comprise** : un chemin écrit avec une autre casse (lecteur `c:` contre `C:`), un nom court 8.3 ou une URL `file://` ne sont pas remplacés. Dans le chemin nominal, aucun texte des CSV ne porte de chemin ; seuls des messages d'erreur le pourraient.
- **R-3 · Clé très courte** : une valeur de `GEMINI_API_KEY` courte et banale peut apparaître par hasard et refuser l'écriture ; refus de trop accepté.
- **R-4 · Écriture partielle** : si un fichier cible apparaît entre le démarrage et l'écriture (course), `'wx'` lève ; les fichiers déjà écrits restent, le message (`EEXIST`) le dit.
- **R-5 · `DEFAULT_OLLAMA_HOST` dupliqué** de `ollama-llm-provider.ts:50`, non exporté ; `src/` est hors périmètre. Un `OLLAMA_HOST` vide est annoncé tel quel.
- **R-6 · TEST-8 lit le vrai `data/rates.json`** dans l'enfant : il dépend de sa lisibilité et de sa validité, pas de ses valeurs.
- **R-7 · H3 et H4 ne se lisent qu'en partie dans les CSV** (aucun `report.json` écrit) ; le document le dit.
- **Node** ≥ 22.18, constaté v22.19.0 par #20 et #33.
