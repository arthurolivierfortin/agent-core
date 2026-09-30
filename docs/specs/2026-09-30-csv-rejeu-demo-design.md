# Spécification · Export CSV du rapport de matrice, rejeu d'un échec et démonstration H1 · #9

Date : 2026-09-30
Issue : https://github.com/arthurolivierfortin/agent-core/issues/9 (type feature ; dernière issue du jalon H1)
Titre exact : « feat(testing): toCSV, rejeu d'un échec depuis sa trace et démonstration 2 modèles factices × 5 runs »
Checklist : docs/specs/2026-09-30-csv-rejeu-demo-checklist.md
Branche : `feat/9-csv-rejeu-demo` (worktree `.claude/worktrees/feat+9-csv-rejeu-demo`, `main` bc80afa intégrée : `withMetrics` #11, `runMatrix` #8, `summary` et `toJSON` #12 livrés)
Continuité : docs/specs/2026-09-30-run-matrix-design.md (#8) ; docs/specs/2026-09-30-matrix-report-design.md (#12)

## Objectif

Clore le jalon H1 : exporter le rapport de matrice en CSV (une ligne par couple, une ligne par exécution), rejouer une exécution depuis sa trace, et versionner la preuve du jalon, une matrice 2 modèles factices × 1 contexte × 5 runs dont le rapport JSON et les deux CSV sont vérifiés à chaque `npm run test`.

## Source de l'issue (corps relevé le 2026-09-30)

Découpage du 2026-09-30 de l'ancienne #2 en #2 (A, métriques), #8 (B, `runMatrix`) et #9 (C, cette spécification). Dépend de #8 et #12 (fusionnés, bc80afa). Conception figée : ADR-AGENT-0006.

Périmètre (issue et consignes du pilote), numéroté ici SPEC-1 à SPEC-8 :

1. `report.toCSV()` : en-tête fixe, une ligne par ligne de `summary`, une colonne par clé d'axe, échappement RFC 4180 (virgule, guillemet, saut de ligne), cellule vide pour un coût ou des jetons `null` ; rend une chaîne. Un second export, une ligne par exécution.
2. `replayRun(scenario, run, deps)` : reconstruit un `FakeLLMProvider` depuis `run.trace.responses` et rejoue le scénario à l'identique (mêmes `toolCalls`, `finalState`, `stopReason`).
3. Démonstration, preuve du jalon H1 : scénario « aller aux reglages » sur `fakeApp` ; modèles factices `fake-a` et `fake-b` (double de test local sous `tests/` qui délègue à `FakeLLMProvider`, sans modifier `FakeLLMProvider`) ; 1 contexte ; 5 runs ; taux 1 et 0,6 ; `RateTable` `{ "fake-a": tarif, "fake-b": null }`, donc un coût chiffré et une cellule vide ; un échec rejoué par `replayRun`. Rapport JSON et CSV lisibles, versionnés, produits et vérifiés de façon déterministe (horloge injectée), sans `console.log` dans le package.
4. Deux tests demandés après la revue de #12, sans code de production : les objets imbriqués copiés par `toJSON` sont neufs (`combination`, `failures`, `trace`) ; `trace.finalState`, `trace.stopReason` et `trace.content` `null` sont recopiés `null` à l'export.
5. Documentation : section `runMatrix` / `withMetrics` / `RateTable` / `summary` / `toJSON` / `toCSV` / `replayRun` dans `docs/guide-agent-package.md` et `README.md`.

Contraintes : aucun fournisseur hébergé dans les tests ; aucun `console.log` dans `src/` ; le package ne lit que `process.env` (le code livré ici n'en lit rien) ; `step.ts` inchangé ; `FakeLLMProvider` inchangé ; `ROADMAP.md` non modifié (écart `ROADMAP.md:139` laissé à #7) ; PR sous 400 lignes hors `docs/` et `*.md`.

## État constaté dans le code (lecture du 2026-09-30, `main` bc80afa)

- `src/agent/testing/run-matrix.ts:73-79` : `MatrixReport<TState, TAxes>` = `{ runs, summary, toJSON() }`. `:160` : `runMatrix` rend `{ runs, summary, toJSON: () => ({ runs: runs.map(runData), summary: summary.map(rowData) }) }`, fonction fléchée fermée sur les tableaux locaux.
- `src/agent/testing/run-matrix.ts:151` et `:231-239` : `combinationsOf(options.axes)` construit chaque combinaison dans l'ordre de `Object.keys(axes)` ; `axes` `{}` donne la combinaison `{}`.
- `src/agent/testing/run-matrix.ts:181-203` : `runData` copie `combination` (`{ ...run.combination }`), `failures` (`[...]`) et `trace` (objet neuf, `toolCalls` et `responses` copiés) et recopie `finalState`, `stopReason`, `content` tels quels. Aucun test n'assert que ces objets imbriqués sont neufs, ni que les trois champs `null` de la trace restent `null` (points du pilote après la revue de #12).
- `src/agent/testing/run-matrix.ts:137-142` : un run qui lève a `trace.finalState` `null` si `env` n'a pas été appelé, `trace.stopReason` et `trace.content` `null`, `trace.responses` = les réponses résolues avant l'erreur.
- `src/agent/testing/run-matrix.ts:130-133` : `withMetrics(wiring.llm, collector, now)` est posé sous l'enregistreur `recordResponses` ; le modèle enregistré est `opts.model` de chaque appel (`src/metrics/application/use-cases/with-metrics.ts:45-50`), donc celui que la boucle résout (`src/agent/application/use-cases/step.ts:110-125` : `deps.model`, puis `agent.recommendedModel`, puis le premier modèle déclaré par le fournisseur).
- `src/metrics/services/aggregate.ts:39-46` : coût d'une réponse = `(tokensIn × usdPerMillionTokensIn + tokensOut × usdPerMillionTokensOut) / 1 000 000` ; `null` si le modèle n'est pas une clé propre de la table, si son tarif est `null` ou si l'usage manque. Avec `{ tokensIn: 500 000, tokensOut: 250 000 }` et `{ usdPerMillionTokensIn: 2, usdPerMillionTokensOut: 8 }` : 3 $ exactement.
- `src/llm/testing/fake-llm-provider.ts:22-66` : `FakeLLMProvider` ne répond qu'au modèle `FakeLLMProvider.MODEL_ID` = `"fake-model"` (sinon `LLMError("MODEL_NOT_FOUND")`, appel non enregistré) ; rend les réponses scriptées dans l'ordre, par curseur ; lève `Error("FakeLLMProvider: no scripted response for call #N")` à la fin du script.
- `src/agent/testing/run-scenario.ts:27-45` : `runScenario(scenario, deps: Omit<AgentDeps, "tools">)` rend `ScenarioResult<TState>` = `{ scenario, passed, failures, toolCalls, stopReason, content, finalState }` ; rejette si `env`, le fournisseur ou un prédicat lève.
- `src/agent/models/agent-definition.ts:18` : `AgentDefinition.recommendedModel`, facultatif.
- `src/agent/testing/index.ts:3-6` : `export *` de `fake-app`, `define-scenario`, `run-scenario`, `run-matrix` ; `src/testing/index.ts:4-5` sert `llm/testing` et `agent/testing` sous `./testing`.
- `tests/barrel-contract.test.ts:56-61` (« `./testing` exposes the scenario harness ») et `:63-73` (« `.` and `./llm` do not leak the testing surface ») listent les fonctions du harnais.
- `tests/agent/testing/run-matrix.test.ts:17-58` : aides `PAGES`, `USAGE`, `RATE`, `app`, `text`, `call`, `navigate`, `scenario`, `wiring`, `script`, `matrix`, `scriptedClock`. Les tests importent depuis `dist/`.
- `scripts/repo-conventions.test.mjs` : tests de documentation lancés par `node --test` (aides `readRepoFile`, `splitLines`, `sectionAfterHeading`).
- `package.json:36` : `"test": "npm run build && node --test"` ; la suite `.ts` tourne par le retrait de types de Node 22.
- Aucun fichier `.gitattributes` à la racine ; aucun dossier `docs/demo/`.
- `docs/guide-agent-package.md` : règle l.34, aucun tiret cadratin dans les livrables écrits (README, docs, commentaires de code) ; l.118-123 arborescence de `agent/testing/` sans `replay-run.ts` ; l.130 situe `withMetrics` dans `llm/infrastructure/with-metrics.ts`, alors qu'il est dans `src/metrics/application/use-cases/with-metrics.ts` ; section « Testing conventions » l.234-252 sans mention de la matrice.
- `README.md:103` : la ligne `./testing` du tableau des points d'entrée ne cite ni `runMatrix` ni un export ; aucune mention de `runMatrix`, `withMetrics`, `RateTable`, `toJSON`, `toCSV`, `replayRun`.
- Manifeste (`CLAUDE.md`, bloc `core-project`) : `GATE-1 build` `npm run build`, `GATE-2 typecheck` `npm run typecheck`, `GATE-3 test` `npm run test` ; `derogations: []`.

## Périmètre

Dans la PR :

| Fichier | Contenu | SPEC |
|---|---|---|
| `src/agent/testing/matrix-csv.ts` (nouveau) | `summaryCSV`, `runsCSV` (exportées du module, servies par aucun barrel), fonctions privées `cellText`, `csvField`, `csvDocument` | SPEC-1, SPEC-2 |
| `src/agent/testing/run-matrix.ts` | membres `toCSV` et `toRunsCSV` de `MatrixReport`, `axisKeys` dans `runMatrix` | SPEC-1, SPEC-2 |
| `src/agent/testing/replay-run.ts` (nouveau) | `replayRun` | SPEC-3 |
| `src/agent/testing/index.ts` | `export * from "./replay-run.js";` | SPEC-4 |
| `tests/agent/testing/run-matrix.test.ts` | TEST-1, TEST-2, TEST-5, TEST-6 | |
| `tests/agent/testing/replay-run.test.ts` (nouveau) | TEST-3 | |
| `tests/barrel-contract.test.ts` | TEST-4 | |
| `tests/agent/testing/matrix-demo.test.ts` (nouveau) | démonstration H1, TEST-7 | SPEC-7 |
| `docs/demo/h1-matrix/report.json`, `docs/demo/h1-matrix/summary.csv`, `docs/demo/h1-matrix/runs.csv` (nouveaux) | artefacts versionnés de la démonstration | SPEC-7 |
| `.gitattributes` (nouveau) | `docs/demo/** -text` | SPEC-7 |
| `docs/guide-agent-package.md`, `README.md` | documentation | SPEC-8 |
| `scripts/repo-conventions.test.mjs` | TEST-8 | |

Hors périmètre :

- Toute modification de `step.ts`, `run-scenario.ts`, `define-scenario.ts`, `fake-app.ts`, `FakeLLMProvider`, `withMetrics`, `MetricsCollector`, `aggregate`, du port `LLMProvider`, de `runOne`, `summarize`, `runData`, `rowData`.
- `ROADMAP.md` (écart `ROADMAP.md:139`, même chemin périmé que `guide:130`, laissé à #7).
- Toute colonne CSV de trace imbriquée (`toolCalls`, `responses`, `finalState`, `content`) : le JSON les porte, le CSV est une vue à plat.
- Neutralisation des formules de tableur (cellule commençant par `=`, `+`, `-`, `@`) : non demandée, RFC 4180 ne la prévoit pas.
- Options de `toCSV` (séparateur, fin de ligne, libellé des valeurs d'axes) : aucune.
- Un rejeu qui compare lui-même au run d'origine : `replayRun` rend un `ScenarioResult`, l'appelant compare (harnais sans assertion, ADR-AGENT-0006).
- Un script `npm` ou un exécutable de démonstration : la démonstration est un test (voir « Décisions »).

## Conception

### Rendu d'une cellule et d'un document CSV (SPEC-1, SPEC-2)

Module `src/agent/testing/matrix-csv.ts`, importé par `run-matrix.ts`, jamais réexporté par un barrel (il n'apparaît pas dans `src/agent/testing/index.ts`). Il n'importe que des types de `./run-matrix.js` (`import type`), donc aucune dépendance circulaire à l'exécution.

- `cellText(value: unknown): string`, privée : `""` pour `null` et `undefined` ; la chaîne elle-même pour une chaîne ; `String(value)` pour tout le reste (nombre : `String(0.6)` = `"0.6"`, `String(1500000)` = `"1500000"` ; booléen : `"true"`, `"false"`).
- `csvField(text: string): string`, privée : si `text` contient `,`, `"`, `\r` ou `\n`, rend `"` + `text` dont chaque `"` est doublé + `"` ; sinon `text` tel quel (RFC 4180, §2.6 et §2.7).
- `csvDocument(rows: readonly (readonly string[])[]): string`, privée : chaque ligne = ses champs passés par `csvField` joints par `,` ; les lignes jointes par `\r\n`, et `\r\n` après la dernière (RFC 4180, §2.1 et §2.2).
- Valeur d'axe : `cellText(combination[key])`. Une valeur non primitive donne `String(value)` : un objet sans `toString` propre donne `[object Object]`. Le libellé d'une valeur d'axe appartient au consommateur : il passe des libellés (`memory: ["fenetre-8", "fenetre-20"]`) et construit l'objet dans `deps`, comme le fait déjà `tests/agent/testing/run-matrix.test.ts:72-76`, ou il donne un `toString` à sa valeur. Écrit dans le guide (SPEC-8).

### `report.toCSV()` (SPEC-1)

- `MatrixReport` gagne `toCSV(): string`, commentaire (anglais) : une ligne par ligne de `summary`, RFC 4180, CRLF, cellule vide pour `null`.
- `runMatrix` calcule `const axisKeys = Object.keys(options.axes);` avant la boucle et rend `toCSV: () => summaryCSV(summary, axisKeys)` (fonction fléchée sans `this`, comme `toJSON`).
- `summaryCSV(summary, axisKeys)` rend `csvDocument` de :
  - l'en-tête `["scenario", ...axisKeys, "runs", "passed", "successRate", "meanDurationMs", "tokensUsed", "costUsd"]` ;
  - puis, pour chaque ligne de `summary` dans l'ordre, `[row.scenario, ...axisKeys.map((key) => combination[key]), row.runs, row.passed, row.successRate, row.meanDurationMs, row.tokensUsed, row.costUsd]`, chaque valeur passée par `cellText`.
- L'en-tête est fixe hors colonnes d'axes : les colonnes d'axes se placent après `scenario`, dans l'ordre de `Object.keys(axes)`, nommées par la clé d'axe elle-même, et passent par `csvField` comme toute cellule. Avec `axes` `{}`, aucune colonne d'axe.
- `tokensUsed` ou `costUsd` `null` donnent une cellule vide, jamais `0` (ADR-AGENT-0007, règle 2). Aucune colonne composite (règle 3).
- Chemin d'erreur : aucun. `summary` n'est jamais vide (`RangeError` de `runMatrix` avant tout run), les nombres sont finis ou `null`.

### `report.toRunsCSV()` (SPEC-2)

- `MatrixReport` gagne `toRunsCSV(): string`, commentaire : une ligne par exécution, mêmes règles que `toCSV`.
- `runMatrix` rend `toRunsCSV: () => runsCSV(runs, axisKeys)`.
- `runsCSV(runs, axisKeys)` rend `csvDocument` de :
  - l'en-tête `["scenario", ...axisKeys, "run", "passed", "failures", "error", "durationMs", "tokensUsed", "costUsd", "stopReason"]` ;
  - puis, pour chaque run de `runs` dans l'ordre, `[run.scenario, ...valeurs d'axes, run.run, run.passed, run.failures.join("; "), run.error, run.durationMs, run.tokensUsed, run.costUsd, run.trace.stopReason]`, chaque valeur passée par `cellText`.
- `failures` vide donne une cellule vide ; `error` et `stopReason` `null` donnent une cellule vide. La jointure `"; "` est une vue : le JSON garde le tableau.

### `replayRun` (SPEC-3)

```ts
export async function replayRun<TState>(
  scenario: Scenario<TState>,
  run: { readonly trace: { readonly responses: readonly LLMResponse[] } },
  deps: Omit<AgentDeps, "tools" | "llm" | "model">,
): Promise<ScenarioResult<TState>>
```

- Fichier `src/agent/testing/replay-run.ts`. Imports, liste fermée : `import type { LLMResponse } from "../../llm/models/index.js"`, `import { FakeLLMProvider } from "../../llm/testing/index.js"`, `import type { AgentDeps } from "../application/dtos/index.js"`, `import type { Scenario } from "./define-scenario.js"`, `import { runScenario } from "./run-scenario.js"`, `import type { ScenarioResult } from "./run-scenario.js"`.
- Corps : `const llm = new FakeLLMProvider({ responses: [...run.trace.responses] });` puis `return runScenario(scenario, { ...deps, llm, model: FakeLLMProvider.MODEL_ID });`.
- `model` est forcé à `FakeLLMProvider.MODEL_ID` : le script est indexé par curseur, jamais par modèle (`fake-llm-provider.ts:15-20`), et le modèle d'origine (`fake-a`, `qwen2.5:0.5b`, ou le `recommendedModel` de l'agent) serait refusé par `MODEL_NOT_FOUND`. Le type retire `llm` et `model` de `deps` ; à l'exécution, `llm` et `model` sont posés après la décomposition de `deps` et l'emportent.
- `run` est typé structurellement : un `MatrixRun` de `report.runs` convient, et un run relu par `JSON.parse` d'un rapport versionné aussi.
- Identité garantie : mêmes `toolCalls`, `finalState`, `stopReason`, `content`, `passed`, `failures` que le run d'origine si `deps` porte le même agent (au `recommendedModel` près, sans effet sur un script lu par curseur), la même stratégie de contexte, le même budget et la même consigne d'atterrissage, et si `scenario.env` est déterministe. `replayRun` ne peut pas le vérifier ; le commentaire de la fonction et le guide le disent.
- Chemin d'erreur : un run qui a levé porte une trace partielle. Si le fournisseur a levé, le script s'épuise et `replayRun` rejette avec l'`Error` de `FakeLLMProvider` (`FakeLLMProvider: no scripted response for call #N`) ; si le prédicat avait levé, il relève. `replayRun` ne capte rien : il rend ce que `runScenario` rend ou rejette avec ce qu'il rejette.

### Export de `replayRun` (SPEC-4)

- `src/agent/testing/index.ts` gagne `export * from "./replay-run.js";`, donc `./testing` sert `replayRun`. `.` et `./llm` ne le servent pas (`src/index.ts`, `src/llm/index.ts` n'importent pas `agent/testing`).
- `tests/barrel-contract.test.ts` : `typeof testing.replayRun === "function"` dans « `./testing` exposes the scenario harness », `surface.replayRun === undefined` dans « `.` and `./llm` do not leak the testing surface ».

### Tests de `toJSON` (SPEC-5, SPEC-6)

Aucun code de production : `runData` (`run-matrix.ts:181-203`) copie déjà ces objets et recopie ces `null`. SPEC-5 et SPEC-6 livrent les verrous demandés après la revue de #12.

### Démonstration H1 (SPEC-7)

Emplacement : `tests/agent/testing/matrix-demo.test.ts` produit la matrice et la compare à trois fichiers versionnés sous `docs/demo/h1-matrix/`.

Montage, écrit en entier dans le test :

- Scénario `defineScenario({ name: "aller aux reglages", env: () => fakeApp({ pages: ["accueil", "reglages", "profil"], current: "accueil" }), input: "amene-moi aux reglages", expect: { toolsUsed: ["navigate"], finalState: (s) => s.current === "reglages", stopReason: "completed" } })`.
- Double local `namedFake(id, responses)` : construit, une fois par appel de `namedFake`, un `FakeLLMProvider` scripté par `responses`, et rend un littéral `LLMProvider` (`id: "named-fake"`, `supportsStreaming: () => false`, `models: () => [{ id, supportsTools: true }]`) dont chaque `complete(messages, opts)` délègue à ce même `FakeLLMProvider` en passant `{ ...opts, model: FakeLLMProvider.MODEL_ID }`, pour que son curseur avance d'un appel à l'autre. `withMetrics` enregistre donc le modèle demandé par la boucle (`fake-a` ou `fake-b`), clé de la `RateTable`. `FakeLLMProvider` n'est pas modifié.
- `axes: { model: ["fake-a", "fake-b"], context: ["fenetre-100k"] }` ; `runs: 5` ; `now: () => (t += 10)` avec `t` initialisé à 0 ; `rates: { "fake-a": { usdPerMillionTokensIn: 2, usdPerMillionTokensOut: 8 }, "fake-b": null }`.
- `deps(combination)` rend `{ agent: defineAgent({ name: "navigateur", prompt: "Tu aides a naviguer.", tools: [] }), llm: namedFake(combination.model, script), context: new SlidingWindowStrategy({ maxTokens: 100_000, counter: new HeuristicTokenCounter() }), model: combination.model }`, où `script` est, avec `USAGE` = `{ tokensIn: 500_000, tokensOut: 250_000 }` sur chaque réponse :
  - pour `fake-a`, à chaque run : [appel `navigate` `{ page: "reglages" }`, texte « Vous etes aux reglages. »] ;
  - pour `fake-b`, runs 1, 3 et 5 : le même script ; runs 2 et 4 (compteur de runs propre à `fake-b`) : [appel `navigate` `{ page: "profil" }`, texte « Vous etes au profil. »].
- Résultat attendu, calculé : chaque run dure 50 (deux lectures de `runMatrix`, deux par appel résolu, pas de 10) ; chaque run consomme 1 500 000 jetons ; un run `fake-a` coûte 6 $ ; un run `fake-b` coûte `null`. `summary` : `fake-a` 5 runs, 5 réussis, taux 1, 50 ms, 7 500 000 jetons, 30 $ ; `fake-b` 5 runs, 3 réussis, taux 0,6, 50 ms, 7 500 000 jetons, coût `null`. Les runs `fake-b` 2 et 4 ont `failures` `["finalState: predicate returned false"]`, `stopReason` `completed`, `finalState.current` `profil`.
- Rejeu : le premier run échoué (`fake-b`, run 2) est rejoué par `replayRun(scenario, run, { agent, context })`, avec un agent et une stratégie construits comme dans `deps`.

Artefacts versionnés, contenu exact :

| Fichier | Contenu |
|---|---|
| `docs/demo/h1-matrix/report.json` | `JSON.stringify(report, null, 2) + "\n"` (`toJSON` de #12, indentation 2, LF) |
| `docs/demo/h1-matrix/summary.csv` | `report.toCSV()` |
| `docs/demo/h1-matrix/runs.csv` | `report.toRunsCSV()` |

Production et vérification :

- Par défaut, le test lit chaque fichier (`readFileSync(new URL("../../../docs/demo/h1-matrix/<nom>", import.meta.url), "utf8")`) et assert son égalité exacte avec la chaîne produite. Toute dérive du format (clés, ordre, échappement, fin de ligne) fait échouer `npm run test`.
- Si `process.env.AGENT_CORE_WRITE_DEMO === "1"`, le test crée `docs/demo/h1-matrix/` (`mkdirSync(..., { recursive: true })`) et écrit les trois fichiers avant de les comparer. C'est la seule façon de les produire ; la suite par défaut n'écrit rien. Commande (PowerShell) : `npm run build; $env:AGENT_CORE_WRITE_DEMO = "1"; node --test tests/agent/testing/matrix-demo.test.ts; Remove-Item Env:AGENT_CORE_WRITE_DEMO`. En bash : `npm run build && AGENT_CORE_WRITE_DEMO=1 node --test tests/agent/testing/matrix-demo.test.ts`. Le message d'échec de la comparaison cite cette variable.
- Déterminisme : horloge injectée, fournisseurs scriptés, `fakeApp` neuf par run, ordre des runs fixé par `runMatrix`. `AgenticLLM` lit `Date.now` pour son budget (`deps.now` absent), mais aucun budget de durée n'est posé et cette lecture n'entre pas dans le rapport.
- Fins de ligne : `summary.csv` et `runs.csv` portent des CRLF (RFC 4180), `report.json` des LF. `.gitattributes`, créé, porte `docs/demo/** -text` : git ne convertit aucune fin de ligne de ces fichiers, et la comparaison octet à octet tient sur toute machine quel que soit `core.autocrlf`.
- Aucun `console.log`, ni dans `src/`, ni dans le test.

### Documentation (SPEC-8)

En anglais (langue du guide et du README), sans tiret cadratin (`docs/guide-agent-package.md:34`).

- `docs/guide-agent-package.md` : sous-section `### Evaluation matrix: runMatrix, report, replay` insérée à la fin de « Testing conventions », avant `## Branch and commit conventions`. Elle nomme `runMatrix`, `withMetrics`, `RateTable`, `summary`, `toJSON`, `toCSV`, `toRunsCSV`, `replayRun` et dit : le produit cartésien et les runs séquentiels ; un `MetricsCollector` par run posé par `withMetrics` (emplacement `src/metrics/application/use-cases/with-metrics.ts`) ; la `RateTable` en dollars par million de jetons, `null` pour un modèle non facturé ; absent ≠ zéro et aucun score composite (ADR-AGENT-0007) ; `toJSON` en données neuves ; `toCSV` et `toRunsCSV` en RFC 4180, CRLF, cellule vide pour `null`, colonnes d'axes nommées par leur clé, valeurs d'axes rendues par `String` (passer des libellés) ; `replayRun` et sa condition d'identité ; la démonstration `docs/demo/h1-matrix/` et sa régénération par `AGENT_CORE_WRITE_DEMO=1`.
- `docs/guide-agent-package.md:118-123` : l'arborescence de `testing/` gagne `matrix-csv.ts` et `replay-run.ts`. `docs/guide-agent-package.md:130` : la phrase situe `withMetrics` dans `metrics/application/use-cases/with-metrics.ts` au lieu de `llm/infrastructure/with-metrics.ts`.
- `README.md` : section `## Evaluating agents over a matrix` insérée avant le `---` qui précède `` ## Using the LLM layer (`./llm`) ``, avec un exemple de code (`runMatrix` avec `rates`, `report.summary`, `report.toJSON()`, `report.toCSV()`, `report.toRunsCSV()`, `replayRun` sur un run échoué) et un lien vers `docs/demo/h1-matrix/`. Elle nomme les mêmes huit symboles. `README.md:103` : la ligne `./testing` cite `runMatrix` et `replayRun`.

## Chemins nominal et d'erreur

| Élément | Nominal | Erreur ou absence |
|---|---|---|
| `toCSV` | une ligne par couple, colonnes d'axes, nombres en `String` (SPEC-1) | `null` : cellule vide ; virgule, guillemet, saut de ligne : champ entre guillemets, guillemets doublés (SPEC-1) |
| `toRunsCSV` | une ligne par exécution (SPEC-2) | run qui a levé : `error` échappé, `stopReason` vide ; `failures` vide : cellule vide ; valeur d'axe `null` : cellule vide (SPEC-2) |
| `replayRun` | mêmes `toolCalls`, `finalState`, `stopReason`, `passed`, `failures` (SPEC-3) | trace d'un run dont le fournisseur a levé : rejet `FakeLLMProvider: no scripted response for call #N` (SPEC-3) |
| `toJSON` | objets imbriqués neufs (SPEC-5) | `finalState`, `stopReason`, `content` `null` recopiés `null`, aussi après `JSON.parse` (SPEC-6) |
| démonstration | fichiers identiques à la sortie (SPEC-7) | fichier absent ou différent : échec qui nomme `AGENT_CORE_WRITE_DEMO` (SPEC-7) |

## Symétrie

- Écriture face à lecture : `toCSV` et `toRunsCSV` écrivent, TEST-1, TEST-2 et TEST-7 relisent la chaîne ou le fichier ; `runMatrix` écrit `trace.responses`, `replayRun` le relit, y compris depuis un rapport relu par `JSON.parse` (TEST-3).
- Présent face à absent : coût chiffré (`fake-a`) et coût `null` (`fake-b`) dans le même CSV (TEST-7) ; jetons présents et absents (TEST-1).
- Réussi face à échoué face à levé : run réussi et run échoué rejoués (TEST-3, TEST-7) ; run qui a levé, en CSV (TEST-2) et au rejeu (TEST-3).
- Résumé face à exécutions : `toCSV` et `toRunsCSV`, mêmes colonnes d'axes, même rendu de cellule.
- Aucune énumération modifiée (`StopReason` lu et rendu en texte), aucune base de données.

## Données touchées

Aucune base. Aucune variable d'environnement lue par `src/`. Le test de démonstration lit `process.env.AGENT_CORE_WRITE_DEMO` et lit, ou écrit sur demande, trois fichiers sous `docs/demo/h1-matrix/`. `.gitattributes` créé.

## Décisions et alternatives écartées

- **Second export nommé `toRunsCSV()`**, méthode sans paramètre, plutôt que `toCSV({ rows: "runs" })` : deux formes distinctes, deux noms autocomplétés ; un paramètre changerait la signature de `toCSV` fixée par l'issue.
- **CRLF et `\r\n` final** : RFC 4180 §2.1 (l'issue cite la RFC). Écarté : LF (plus courant sous Unix, hors norme).
- **Colonnes d'axes nommées par leur clé, sans préfixe** : l'issue demande « une colonne par clé d'axe » et un lecteur de tableur attend `model`. Écarté : préfixe `axis.` (lisibilité). Limite écrite : un axe nommé comme une colonne fixe (`runs`, `scenario`) donne deux colonnes de même nom ; la position les distingue.
- **Valeur d'axe rendue par `String`, `null` et `undefined` vides** : une règle, sans exception possible sur les valeurs courantes. Écarté : `JSON.stringify` (lève sur un cycle ou un `bigint`, rend `undefined` pour une fonction) ; un paramètre `label` (API en plus, non demandée).
- **`failures` joint par `"; "`** : une cellule par run ; le JSON garde le tableau exact.
- **`replayRun` force `model: FakeLLMProvider.MODEL_ID`** plutôt qu'un double qui accepte tout modèle : `FakeLLMProvider` ne change pas, et le modèle n'a aucun effet sur un script lu par curseur.
- **`replayRun` rejette au lieu de rendre un résultat d'erreur** : même contrat que `runScenario` ; l'appelant qui veut un résultat capté passe par `runMatrix`.
- **Démonstration = test + artefacts versionnés sous `docs/demo/h1-matrix/`** : la preuve est revérifiée à chaque `npm run test`, les fichiers se lisent sur GitHub, et `docs/` est hors du compte de taille. Écarté : `examples/` (paquets exécutables séparés, `examples/navigation/package.json`, et compté dans la taille) ; un script qui écrit sur disque (hors suite, dérive silencieuse).
- **Régénération par `AGENT_CORE_WRITE_DEMO=1`** plutôt qu'à la main : un fichier de référence écrit à la main dérive ; la variable n'est lue que par le test, jamais par le package.
- **`.gitattributes` `-text`** plutôt qu'une comparaison qui normalise les fins de ligne : la comparaison reste exacte, CRLF du CSV compris.
- **Correction de `guide:130`** dans ce lot : la section ajoutée situe `withMetrics` ; laisser l.130 ferait se contredire le guide. `ROADMAP.md:139` reste à #7.
- **Pas de nouvel ADR** : ADR-AGENT-0006 (`toJSON` / `toCSV`, le paquet émet des données) et ADR-AGENT-0007 (absent ≠ zéro, aucun score composite) sont appliqués tels quels.

## Ordre des commits et preuve de rouge

Un SPEC = un commit = un test. Ordre : SPEC-1 à SPEC-8.

- TEST-1 : rouge avant SPEC-1 (`report.toCSV is not a function`).
- TEST-2 : rouge avant SPEC-2 (`report.toRunsCSV is not a function`).
- TEST-3 : rouge avant SPEC-3 (`dist/agent/testing/replay-run.js` introuvable).
- TEST-4 : rouge avant SPEC-4 (`typeof testing.replayRun` vaut `"undefined"`).
- TEST-5, TEST-6 : pas de rouge possible, comportement livré par #12 ; verrous de non-régression. TEST-5 échouerait si `runData` rendait `run.combination`, `run.failures` ou `run.trace` eux-mêmes ; TEST-6 si l'un des trois champs était remplacé par `0`, `""` ou omis.
- TEST-7 : rouge avant la génération des artefacts (`ENOENT` sur `docs/demo/h1-matrix/report.json`), vert après `AGENT_CORE_WRITE_DEMO=1`, puis vert sans la variable.
- TEST-8 : rouge avant SPEC-8 (titre `### Evaluation matrix: runMatrix, report, replay` absent).

Gabarit des messages de commit (aucun `Co-Authored-By`) :

```
<type>(testing): <sujet>

Refs: #9
Session: <id>
Model: <modèle>
Authorship: ai
```

Types et sujets : SPEC-1 `feat(testing)` « exporter le résumé de matrice en CSV avec toCSV » ; SPEC-2 `feat(testing)` « exporter une ligne CSV par exécution avec toRunsCSV » ; SPEC-3 `feat(testing)` « rejouer une exécution depuis sa trace avec replayRun » ; SPEC-4 `feat(testing)` « servir replayRun par ./testing » ; SPEC-5 `test(testing)` « vérifier que toJSON copie combinaison, échecs et trace » ; SPEC-6 `test(testing)` « vérifier que toJSON recopie null la trace d'un run qui a levé » ; SPEC-7 `test(testing)` « démontrer la matrice H1 et versionner son rapport JSON et CSV » ; SPEC-8 `docs(testing)` « documenter la matrice, ses exports et replayRun ».

## Estimation de taille

Hors `docs/` et `*.md` (lignes ajoutées ou modifiées) :

| Fichier | Lignes |
|---|---|
| `src/agent/testing/matrix-csv.ts` | 55 |
| `src/agent/testing/run-matrix.ts` | 18 |
| `src/agent/testing/replay-run.ts` | 32 |
| `src/agent/testing/index.ts` | 1 |
| `tests/agent/testing/run-matrix.test.ts` (TEST-1 30, TEST-2 30, TEST-5 20, TEST-6 15) | 95 |
| `tests/agent/testing/replay-run.test.ts` | 50 |
| `tests/barrel-contract.test.ts` | 2 |
| `tests/agent/testing/matrix-demo.test.ts` | 100 |
| `scripts/repo-conventions.test.mjs` | 22 |
| `.gitattributes` | 2 |
| **Total** | **≈ 377** (fourchette 330 à 420) |

Sous le plafond de 400 en valeur centrale, dans la fourchette du pilote (260 à 380), avec un risque réel de dépassement porté par le test de démonstration et TEST-3. `docs/demo/h1-matrix/*` (environ 400 lignes de JSON) est sous `docs/`, hors compte.

Coupe de repli si la mesure dépasse 400 avant PR : sortir SPEC-2 (`toRunsCSV`, TEST-2, `runs.csv`, environ 50 lignes) dans une issue de suivi ; la preuve H1 garde `report.json` et `summary.csv`. À décider par le pilote.

## Hypothèses restantes

- La suite `.ts` tourne par le retrait de types de Node 22 (constaté : `package.json:36` et les tests existants) ; `node --test tests/agent/testing/matrix-demo.test.ts` l'utilise aussi.
- Aucun fichier `.gitattributes` n'existe ; s'il en apparaît un à l'intégration de `main`, la ligne `docs/demo/** -text` s'y ajoute.
- La correction de `guide:130` peut recouper #7 si #7 vise aussi le guide ; ici elle n'est faite que parce que la nouvelle section situe `withMetrics`.
