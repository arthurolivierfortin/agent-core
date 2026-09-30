# Spécification · `runMatrix`, scénarios sur le produit cartésien d'axes · #8

Date : 2026-09-30
Issue : https://github.com/arthurolivierfortin/agent-core/issues/8 (type feature ; lot 2 du découpage de #8)
Checklist : docs/specs/2026-09-30-run-matrix-checklist.md
Branche : `feat/8-run-matrix` (worktree `.claude/worktrees/feat+8-run-matrix`, `main` 300921e intégrée : `withMetrics` livré par #11)
Continuité : docs/specs/2026-09-30-metriques-execution-design.md (#2 : `UsageRecord`, `aggregate`, `MetricsCollector`, `AgentResult.tokensUsed`) ; docs/specs/2026-09-30-with-metrics-design.md (#11 : `withMetrics`)

## Objectif

Livrer `runMatrix`, qui exécute chaque scénario sur chaque combinaison du produit cartésien d'axes, `runs` fois, et rend un `MatrixRun` par exécution avec son succès, ses mesures (durée, jetons, coût) et sa trace, y compris quand l'exécution lève.

## Source de l'issue (corps relevé le 2026-09-30)

Découpage du 2026-09-30 de #8 : #11 = lot 1 (`withMetrics`, fusionné), #8 = lot 2 (`runMatrix`, cette spécification), #12 = lot 3 (`MatrixReport.summary` et `report.toJSON()`). Conception figée : ADR-AGENT-0006 (harnais, matrice, trois règles) et ADR-AGENT-0007 (métriques par décorateur, portée par instance, absent ≠ zéro).

SPEC approuvés par le pilote, repris tels quels et numérotés SPEC-1 à SPEC-6 :

1. `RangeError` avant le premier run, sans appeler `deps` : `runs` non entier ou < 1, `scenarios` vide, axe sans valeur (messages fixés, voir « Chemin d'erreur »).
2. Produit cartésien des axes dans l'ordre de `Object.keys`, dernier axe variant le plus vite ; `axes` `{}` donne une combinaison `{}` ; combinaison typée par `TAxes` ; pour chaque scénario puis chaque combinaison, `runs` exécutions séquentielles ; `deps(combination)` une fois par run ; `env()` neuf par run via `runScenario` ; tous les scénarios partagent `TState`.
3. Un `MetricsCollector` neuf par run posé par `withMetrics(deps.llm, collector, now)` ; `durationMs` (horloge injectée `now` autour du run), `tokensUsed`, `costUsd` (règles et décision du pilote ci-dessous).
4. `MatrixRun.trace = { toolCalls, finalState, stopReason, content, responses }` ; `responses` capturées par un enregistreur local de `complete`, privé à `run-matrix.ts`, `supportsStreaming` `false` ; `finalState` capturé en enveloppant `scenario.env` ; `step.ts` inchangé.
5. Exception pendant un run (`deps`, `env` ou fournisseur qui lève) : run `passed: false`, `error` = message, `failures` `[]`, trace partielle, mesures des appels enregistrés avant l'erreur ; les runs suivants s'exécutent ; `error` `null` sans exception.
6. Export de `runMatrix`, `MatrixOptions`, `MatrixRun`, `MatrixTrace` et du type de retour (`MatrixReport`, sans `summary` ni `toJSON`) depuis `src/agent/testing/index.ts`, donc `./testing` ; absents de `.` et `./llm` ; verrou dans `tests/barrel-contract.test.ts`.

Contraintes : modèles factices seulement (`FakeLLMProvider`, `fakeApp`, fournisseurs littéraux écrits dans le fichier de test) ; aucun fournisseur hébergé ; aucun `console.log` ; le package ne lit que `process.env` (`runMatrix` n'en lit aucune variable) ; gates build, typecheck, test ; PR sous 400 lignes hors `docs/` et `*.md` ; `ROADMAP.md` non modifié.

### Écarts entre le corps de l'issue et la liste approuvée

La liste du pilote fait foi ; les écarts sont écrits pour que personne ne les découvre à la revue :

- `runIndex` du corps de l'issue s'appelle `run` (numéroté à partir de 1).
- `iterations` du corps de l'issue n'est pas un champ de `MatrixRun`. Sur un run qui aboutit, `trace.responses.length` vaut le nombre d'appels au modèle, donc `AgentResult.iterations` (`step.ts:224` et `:241` : une itération = un `complete` résolu).
- `error?` (optionnel) devient `error: string | null`, toujours présent : un champ absent et un champ `null` se lisent différemment en JSON (#12).

## État constaté dans le code (lecture du 2026-09-30, `main` 300921e)

- `src/agent/testing/run-scenario.ts:27-45` : `runScenario(scenario, deps: Omit<AgentDeps, "tools">)` appelle `scenario.env()` une fois, construit `new AgenticLLM({ ...deps, tools: env.tools })`, attend `agent.run(scenario.input)`, puis rend `ScenarioResult` = `{ scenario: scenario.name, passed, failures, toolCalls, stopReason, content, finalState: env.state }`. Aucun `try` : une exception de `env()`, du fournisseur ou d'un prédicat `expect.finalState` fait rejeter `runScenario`.
- `src/agent/testing/define-scenario.ts:34-49` : `Scenario<TState>` = `{ name, env: () => ScenarioEnv<TState>, input, expect }` ; `defineScenario` gèle une copie superficielle. `ScenarioEnv<TState>` = `{ state, tools }` (l.5-8).
- `src/agent/testing/fake-app.ts:30-33` : `fakeApp(config)` rend `{ state, tools }` avec `state` = `FakeAppState` neuf.
- `src/agent/testing/index.ts:3-5` réexporte `fake-app`, `define-scenario`, `run-scenario` ; `src/testing/index.ts:5` le sert sous `./testing` ; `src/index.ts` et `src/agent/index.ts` ne l'importent pas.
- `src/agent/application/use-cases/step.ts:37` et `:214` : la boucle n'appelle que `deps.llm.complete`. `:244` : `state.toolCalls` n'accumule que les appels d'outils des réponses hors atterrissage ; `:217` : la réponse d'atterrissage est gardée en texte seul, ses `toolCalls` ne sont ni dispatchés ni comptés. `:60` et `:282` : `initialState` lit `deps.now ?? Date.now` une fois par run.
- `src/agent/application/dtos/index.ts:110-125` : `AgentResult.tokensUsed` = compteur de budget, 0 quand le fournisseur ne rapporte aucun usage.
- `src/metrics/application/use-cases/with-metrics.ts:33-54` : `withMetrics(provider, collector, now = Date.now)` lit `now()` avant l'appel au fournisseur et après sa résolution, enregistre un `UsageRecord` par `complete` résolu, rien pour un appel qui rejette (`now()` lu une seule fois dans ce cas), rend la réponse (même référence).
- `src/metrics/application/use-cases/metrics-collector.ts:29-31` : `total(rates?)` = `aggregate(entries, rates)`. `src/metrics/services/aggregate.ts:19-31` : sans enregistrement, `tokensIn` et `tokensOut` valent 0 ; `costUsd` vaut `null` sans table, 0 avec une table ; `null` dès qu'un enregistrement n'a pas d'usage ou pas de tarif (clé propre absente ou tarif `null`).
- `src/llm/testing/fake-llm-provider.ts` : `MODEL_ID = "fake-model"` ; `complete` rend l'objet scripté lui-même ; lève un `Error` nu à la fin du script.
- `tests/agent/testing/run-scenario.test.ts:3-9` : les tests du harnais importent depuis `dist/`.
- `tests/barrel-contract.test.ts:55-70` : verrous « `./testing` exposes the scenario harness » et « `.` and `./llm` do not leak the testing surface » ; `:197-208` : `./testing` ne porte ni `withMetrics` ni `MetricsCollector`.
- `tsconfig.json:13` : `npm run typecheck` couvre `src` et `tests`, donc une annotation ou un `// @ts-expect-error` dans un test est vérifié par GATE-2.
- Aucun nom `runMatrix`, `MatrixRun`, `MatrixTrace`, `MatrixOptions`, `MatrixReport` sous `src/` ni `tests/`.
- Manifeste (`CLAUDE.md`, bloc `core-project`) : `GATE-1 build` `npm run build`, `GATE-2 typecheck` `npm run typecheck`, `GATE-3 test` `npm run test` ; `derogations: []`.

## Périmètre

Dans la PR :

- `src/agent/testing/run-matrix.ts` : `runMatrix`, ses types, l'enregistreur privé (SPEC-1 à SPEC-5).
- `src/agent/testing/index.ts` : une ligne d'export (SPEC-6).
- `tests/agent/testing/run-matrix.test.ts` (TEST-1 à TEST-5) et `tests/barrel-contract.test.ts` (TEST-6).

Hors périmètre :

- `MatrixReport.summary`, `report.toJSON()` (#12) ; `toCSV`, rejeu, démonstration (issue C du premier découpage) ; guide, README, `ROADMAP.md`.
- Toute modification de `step.ts`, `run-scenario.ts`, `define-scenario.ts`, `fake-app.ts`, `withMetrics`, `MetricsCollector`, `aggregate`, du port `LLMProvider` ou de `FakeLLMProvider`.
- Exécution parallèle des runs (écartée, voir « Décisions »).
- `deps` asynchrone, `deps` qui reçoit le scénario (voir « Décisions »).

## Conception

### Placement

| Fichier | Contenu | Règle appliquée |
|---|---|---|
| `src/agent/testing/run-matrix.ts` | `runMatrix`, `MatrixOptions`, `MatrixRun`, `MatrixTrace`, `MatrixReport`, alias non exporté `Combination`, fonctions non exportées `combinationsOf`, `recordResponses`, `messageOf` | harnais de l'agent, à côté de `runScenario` (`./testing`, jamais `.` : `docs/conventions/architecture.md:29`) ; fonction, pas classe (ADR-AGENT-0009) |
| `src/agent/testing/index.ts` | `export * from "./run-matrix.js";` (SPEC-6) | barrel du harnais |
| `tests/agent/testing/run-matrix.test.ts` | TEST-1 à TEST-5 | miroir du chemin source |
| `tests/barrel-contract.test.ts` | TEST-6 | verrou des points d'entrée |

Imports de `run-matrix.ts`, liste fermée : `import type { ToolCall, LLMResponse, Message } from "../../llm/models/index.js"`, `import type { CompletionOptions, LLMProvider } from "../../llm/interfaces/index.js"`, `import type { AgentDeps, StopReason } from "../application/dtos/index.js"`, `import { MetricsCollector, withMetrics } from "../../metrics/index.js"`, `import type { RateTable } from "../../metrics/index.js"`, `import type { Scenario, ScenarioEnv } from "./define-scenario.js"`, `import { runScenario } from "./run-scenario.js"` (le builder retire un type inutilisé). Aucun import de `fs`, `path`, `process`. Le fichier n'exporte que les cinq noms ci-dessus : `export *` depuis `./testing` ne doit porter ni `withMetrics` ni `MetricsCollector` (verrou existant `barrel-contract.test.ts:202-207`).

### Types (SPEC-2 à SPEC-5)

```ts
type Combination<TAxes extends Record<string, readonly unknown[]>> = {
  readonly [K in keyof TAxes]: TAxes[K][number];
};

export type MatrixOptions<TState, TAxes extends Record<string, readonly unknown[]>> = {
  readonly scenarios: readonly Scenario<TState>[];
  readonly axes: TAxes;
  readonly runs: number;
  readonly deps: (combination: Combination<TAxes>) => Omit<AgentDeps, "tools">;
  readonly rates?: RateTable;   // SPEC-3
  readonly now?: () => number;  // SPEC-3
};

export type MatrixTrace<TState> = {  // SPEC-4
  readonly toolCalls: readonly ToolCall[];
  readonly finalState: TState | null;
  readonly stopReason: StopReason | null;
  readonly content: string | null;
  readonly responses: readonly LLMResponse[];
};

export type MatrixRun<TState, TAxes extends Record<string, readonly unknown[]>> = {
  readonly scenario: string;              // scenario.name
  readonly combination: Combination<TAxes>;
  readonly run: number;                   // 1 à runs, par couple (scénario, combinaison)
  readonly passed: boolean;
  readonly failures: readonly string[];
  readonly error: string | null;          // SPEC-5
  readonly durationMs: number;            // SPEC-3
  readonly tokensUsed: number | null;     // SPEC-3
  readonly costUsd: number | null;        // SPEC-3
  readonly trace: MatrixTrace<TState>;    // SPEC-4
};

export type MatrixReport<TState, TAxes extends Record<string, readonly unknown[]>> = {
  readonly runs: readonly MatrixRun<TState, TAxes>[];
};

export async function runMatrix<TState, TAxes extends Record<string, readonly unknown[]>>(
  options: MatrixOptions<TState, TAxes>,
): Promise<MatrixReport<TState, TAxes>>;
```

- Chaque champ entre dans le type avec le SPEC qui le remplit (commentaire à droite) ; SPEC-2 livre `scenario`, `combination`, `run`, `passed`, `failures`, `scenarios`, `axes`, `runs`, `deps`.
- `Combination` n'est pas exporté (liste fermée du pilote) ; un consommateur le nomme `MatrixRun<S, A>["combination"]`. `tsc` émet l'alias local dans `run-matrix.d.ts`.
- Typage de la combinaison : avec `axes: { model: ["a", "b"], memory: [8, 20] }`, `TAxes` est inféré `{ model: string[]; memory: number[] }` et `deps` reçoit `{ readonly model: string; readonly memory: number }` ; un nom hors des axes est une erreur de compilation.
- `MatrixReport.runs` porte le même nom que `MatrixOptions.runs` (nombre) : l'un est le nombre demandé, l'autre la liste obtenue ; #12 ajoute `summary` et `toJSON` à `MatrixReport`.

### Chemin d'erreur avant le premier run (SPEC-1)

`runMatrix` est `async` : les contrôles lèvent dans son corps, donc la promesse rendue rejette. Contrôles, dans cet ordre, tous avant le premier appel à `options.deps` ou à un `scenario.env` :

1. `!Number.isInteger(options.runs) || options.runs < 1` → `new RangeError(\`runMatrix: runs must be an integer >= 1, got ${options.runs}\`)` (0, -1, 1.5, `NaN`, `Infinity` sont refusés ; message « got 1.5 », « got NaN »).
2. `options.scenarios.length === 0` → `new RangeError("runMatrix: scenarios must not be empty")`.
3. Pour chaque nom de `Object.keys(options.axes)`, dans l'ordre : tableau de longueur 0 → `new RangeError(\`runMatrix: axis '${name}' has no value\`)` pour le premier trouvé.

Raison : un produit vide ou un nombre de runs nul rendrait un rapport vide qu'on lirait comme « rien n'a échoué » ; un `runs` fractionnaire serait tronqué en silence par la boucle.

### Produit et ordre (SPEC-2)

- `combinationsOf(axes)` : part de `[{}]` et, pour chaque nom de `Object.keys(axes)` dans l'ordre, remplace la liste par `liste.flatMap((c) => valeurs.map((v) => ({ ...c, [nom]: v })))`. Le dernier axe varie donc le plus vite : `{ model: ["a", "b"], memory: [8, 20] }` donne `a/8, a/20, b/8, b/20`. `axes` `{}` donne `[{}]`. Chaque objet combinaison est construit une fois et la même référence est passée à `deps` et posée sur les `MatrixRun` de cette combinaison.
- Boucles imbriquées : `for (scenario of scenarios)`, `for (combination of combinations)`, `for (run = 1; run <= runs; run++)`, chaque run `await`é avant le suivant. Ordre de `report.runs` = ordre d'exécution. Nombre de runs = `scenarios.length × combinaisons × runs`.
- Un run : `const wiring = options.deps(combination)` (une fois par run : fournisseur, script factice et contexte neufs si la fabrique les crée), puis `runScenario(scenario, wiring)`, qui appelle `env()` une fois (état neuf, ADR-AGENT-0006 règle 1).
- `MatrixRun` de SPEC-2 : `{ scenario: result.scenario, combination, run, passed: result.passed, failures: result.failures }`.
- Tous les scénarios partagent `TState` (`scenarios: readonly Scenario<TState>[]`).

### Mesures (SPEC-3) : décision du pilote sur `tokensUsed`

- `const now = options.now ?? Date.now`, lu à l'appel de `runMatrix`.
- Par run : `const startedAt = now()` avant `options.deps(combination)` ; `const collector = new MetricsCollector()` neuf ; le fournisseur passé à la boucle est `withMetrics(wiring.llm, collector, now)` (même horloge) à la place de `wiring.llm` ; après la fin du run, `durationMs = now() - startedAt`. Lectures de `now` par run : 2, plus 2 par `complete` résolu et 1 par `complete` qui rejette (lues par `withMetrics`).
- `const total = collector.total(options.rates)` ; `costUsd = total.costUsd` tel quel : `null` sans `rates`, `null` dès qu'un appel n'a pas d'usage ou que son modèle n'a pas de tarif (clé absente ou `null`), jamais 0 pour un tarif manquant ; 0 avec `rates` et aucun appel enregistré (rien n'a été dépensé, règle d'`aggregate`).
- `tokensUsed = total.tokensIn === null || total.tokensOut === null ? null : total.tokensIn + total.tokensOut` ; 0 sans appel enregistré.

**Décision du pilote (2026-09-30).** `MatrixRun.tokensUsed` vient du collecteur du run, pas de `AgentResult.tokensUsed`.

**Raison.** `AgentResult.tokensUsed` est le compteur de budget du moteur (`maxTokens`) : il vaut 0 quand le fournisseur ne rapporte aucun usage (`dtos/index.ts:118-124`), ce qui ferait gagner à tort toute comparaison de jetons à un modèle local muet, exactement ce que la règle « absent ≠ zéro » d'ADR-AGENT-0007 refuse ; et il n'existe pas pour un run qui lève, faute d'`AgentResult`, alors que le collecteur garde les appels résolus avant l'erreur. Le collecteur donne donc la même source aux jetons et au coût, sur les deux chemins. Le commentaire de conception de `runMatrix` (anglais, au style du dépôt) porte cette décision et cette raison en résumé.

### Trace (SPEC-4)

- `recordResponses(provider, sink)`, fonction non exportée de `run-matrix.ts` : rend un objet littéral neuf `{ id: provider.id, supportsStreaming: () => false, models: () => provider.models(), complete }` dont `complete(messages, opts)` fait `const response = await provider.complete(messages, opts)`, `sink.push(response)`, `return response` (même référence ; un appel qui rejette ne pousse rien et propage la même erreur). `supportsStreaming` `false` et aucune clé `stream`, par la même raison que `withMetrics` (#11) : la boucle n'appelle que `complete`.
- Composition par run : `llm = recordResponses(withMetrics(wiring.llm, collector, now), responses)`, `responses` tableau neuf par run.
- `finalState` : `runMatrix` passe à `runScenario` `{ ...scenario, env: () => { captured = scenario.env(); return captured; } }` avec `let captured: ScenarioEnv<TState> | undefined` local au run. `step.ts`, `run-scenario.ts` et `define-scenario.ts` ne changent pas.
- Run qui aboutit : `trace = { toolCalls: result.toolCalls, finalState: result.finalState, stopReason: result.stopReason, content: result.content, responses }`. `result.finalState` est `captured.state` (même référence). `toolCalls` vient du `ScenarioResult`, donc exclut les `toolCalls` d'une réponse d'atterrissage (`step.ts:217`), que `responses` contient.

### Exception pendant un run (SPEC-5)

- `options.deps(combination)`, la décoration et `await runScenario(...)` sont dans un `try` ; la lecture `startedAt` le précède, la lecture de fin et le calcul des mesures le suivent (même code sur les deux chemins).
- `catch (err)` : `MatrixRun` = `{ scenario: scenario.name, combination, run, passed: false, failures: [], error: messageOf(err), durationMs, tokensUsed, costUsd, trace }` avec `messageOf(err)` = `err instanceof Error ? err.message : String(err)` et `trace` = `{ toolCalls: responses.flatMap((r) => r.toolCalls), finalState: captured === undefined ? null : captured.state, stopReason: null, content: null, responses }`. `tokensUsed` et `costUsd` suivent les règles de SPEC-3 sur les enregistrements faits avant l'erreur.
- Le run suivant s'exécute normalement ; `runMatrix` ne rejette pas pour une exception de run.
- Run sans exception : `error: null`.
- Couverture des trois sources : `deps` qui lève (`captured` indéfini, `responses` vide), `env()` qui lève (`captured` indéfini : l'affectation n'a pas lieu), fournisseur qui rejette (`captured` posé, `responses` et `toolCalls` des appels résolus avant). Un prédicat `expect.finalState` qui lève suit le même chemin.
- Limite acceptée : sur le chemin d'erreur, `toolCalls` est reconstruit depuis les réponses reçues ; si l'exception survient après un atterrissage dont la réponse nommait des outils (seul cas : un prédicat `expect.finalState` qui lève), ces appels non dispatchés y figurent. Aucun test ne la fixe.
- Hors `try` : une horloge `now` qui lève à la lecture de début ou de fin fait rejeter `runMatrix` (une horloge défaillante est une erreur du harnais, pas un résultat de run) ; une lecture faite par `withMetrics` est dans le `try` et devient l'`error` du run.

### Exports (SPEC-6)

- SPEC-6 ajoute `export * from "./run-matrix.js";` à `src/agent/testing/index.ts`. `src/testing/index.ts` le sert déjà via `export * from "../agent/testing/index.js"` : aucune autre ligne ne change. `src/index.ts`, `src/llm/index.ts`, `src/agent/index.ts` ne changent pas.
- Jusqu'à SPEC-6, `tests/agent/testing/run-matrix.test.ts` importe depuis `../../../dist/agent/testing/run-matrix.js` ; il n'est pas modifié par SPEC-6. TEST-6 est donc rouge avant SPEC-6.
- Verrou : valeur (`typeof testing.runMatrix === "function"`, `runMatrix` `undefined` sur `root` et `llm`) et types (`MatrixOptions`, `MatrixReport`, `MatrixRun`, `MatrixTrace` importés en `import type` depuis `@arthurolivierfortin/agent-core/testing` et annotant des valeurs produites par `testing.runMatrix`, contrôlés par `npm run typecheck`, méthode de `barrel-contract.test.ts:79-83`).

## Chemins nominal et d'erreur

| Élément | Nominal | Erreur |
|---|---|---|
| options | produit, runs, rapport | `RangeError` avant tout run (SPEC-1) |
| run | `MatrixRun` avec `passed` du scénario, `error` `null`, trace complète | exception de `deps`, `env`, fournisseur ou prédicat : `passed: false`, `error`, `failures` `[]`, trace partielle, matrice poursuivie (SPEC-5) |
| échec de prédicat | `passed: false`, `failures` non vide, `error` `null` | (n'est pas une exception) |
| mesures | `durationMs`, `tokensUsed`, `costUsd` depuis l'horloge et le collecteur | mêmes règles sur les appels enregistrés avant l'erreur ; `null`, jamais 0, pour un usage ou un tarif manquant |
| horloge | lue 2 fois par run par `runMatrix` | une lecture de `runMatrix` qui lève fait rejeter `runMatrix` (non testé) |

## Symétrie

- Écriture face à lecture : l'enregistreur écrit `responses`, `withMetrics` écrit le collecteur, `env` capturé écrit `finalState` ; TEST-3, TEST-4 et TEST-5 relisent chacun sur le `MatrixRun`.
- Nominal face à erreur : SPEC-2, SPEC-3, SPEC-4 (run qui aboutit) ont SPEC-5 (run qui lève) ; SPEC-1 est le chemin d'erreur des options, dont le nominal est SPEC-2.
- Présent face à absent : usage présent et absent (TEST-3), tarif présent, manquant et table absente (TEST-3), environnement créé ou non (TEST-4, TEST-5).
- Ordre : produit et runs (TEST-2) ; séquentialité vérifiée par l'état du fournisseur précédent à chaque appel de `deps` (TEST-2).
- Aucune énumération modifiée (`StopReason` inchangé, lu seulement), aucune base de données.

## Données touchées

Aucune base, aucun fichier lu ou écrit, aucune variable d'environnement lue. Aucun `console.log`. En mémoire : un collecteur, un tableau de réponses et un environnement par run, retenus par le rapport rendu.

## Décisions et alternatives écartées

- **Runs séquentiels** (issue et pilote) plutôt que `Promise.all` : un fournisseur local sert un appel à la fois, et un ordre d'exécution fixe rend le rapport reproductible avec des faux. Coût accepté : une matrice contre un fournisseur hébergé est lente.
- **`deps(combination)` synchrone**, rendant `Omit<AgentDeps, "tools">` (le type de `runScenario`) : aucune fabrique asynchrone n'est demandée ; élargir à `| Promise<…>` plus tard est additif. `deps` ne reçoit pas le scénario (signature fixée) : avec `FakeLLMProvider`, le script est donc le même pour tous les scénarios d'une matrice, ce que TEST-2 exploite (un scénario réussit, l'autre échoue sur le même script).
- **Enregistreur privé plutôt que champ de `step.ts`** : la trace des réponses est un besoin du harnais ; la boucle reste inchangée (pilote).
- **Enregistreur à l'extérieur de `withMetrics`** : la composition `withMetrics(deps.llm, collector, now)` est celle fixée par le pilote ; l'ordre inverse donnerait les mêmes données.
- **`finalState` par enveloppe de `scenario.env`** plutôt qu'un changement de `runScenario` : seule façon de lire l'état d'un run qui lève sans toucher `runScenario`.
- **`toolCalls` du `ScenarioResult` sur le chemin nominal** plutôt que `responses.flatMap` : garde la définition du moteur (appels dispatchés, atterrissage exclu) ; le chemin d'erreur n'a que les réponses (limite écrite dans « Exception pendant un run »).
- **`error: string | null`** plutôt que l'objet d'erreur : le rapport est une donnée sérialisable (#12, ADR-AGENT-0006 « the package emits data »).
- **`tokensUsed` depuis le collecteur** : décision du pilote, voir « Mesures ».
- **Pas de nouvel ADR** : ADR-AGENT-0006 (matrice, `runs`, trace des échecs) et ADR-AGENT-0007 (collecteur par run, absent ≠ zéro) sont appliqués tels quels.

## Ordre des commits et preuve de rouge

Un SPEC = un commit = un test. Ordre des commits : **SPEC-2, SPEC-1, SPEC-3, SPEC-4, SPEC-5, SPEC-6** (les numéros suivent la liste du pilote ; les contrôles de SPEC-1 portent sur une fonction qui doit d'abord exister, et les coder avant la boucle obligerait à livrer un corps provisoire).

- TEST-2 : rouge avant SPEC-2 (module `dist/agent/testing/run-matrix.js` absent).
- TEST-1 : rouge après SPEC-2 sans SPEC-1 : `runs: 0`, `NaN` ou `scenarios: []` rendent un rapport vide, `runs: 1.5` exécute un run et appelle `deps`, un axe vide rend un rapport vide ; aucun ne rejette.
- TEST-3 : rouge avant SPEC-3 (`durationMs`, `tokensUsed`, `costUsd` absents : typecheck et valeurs).
- TEST-4 : rouge avant SPEC-4 (`trace` absent).
- TEST-5 : rouge avant SPEC-5 (l'exception fait rejeter `runMatrix`).
- TEST-6 : rouge avant SPEC-6 (`testing.runMatrix` indéfini).

Gabarit des messages de commit (aucun `Co-Authored-By`) :

```
feat(testing): <sujet>

Refs: #8
Session: <id>
Model: <modèle>
Authorship: ai
```

Sujets : SPEC-2 « exécuter les scénarios sur le produit cartésien des axes avec runMatrix » ; SPEC-1 « refuser une matrice vide ou un nombre de runs invalide » ; SPEC-3 « mesurer durée, jetons et coût de chaque run » ; SPEC-4 « garder la trace de chaque run » ; SPEC-5 « faire d'une exception de run un échec sans arrêter la matrice » ; SPEC-6 « exporter runMatrix depuis ./testing ».

## Tests

Tous déterministes, sans réseau ni fournisseur hébergé : `FakeLLMProvider`, `fakeApp`, `defineScenario`, `defineAgent`, `SlidingWindowStrategy` et `HeuristicTokenCounter` importés depuis `dist/` ; un fournisseur littéral `LLMProvider` écrit dans le fichier de test pour le rejet en cours de run ; horloges injectées : scriptée (rend les valeurs d'un tableau dans l'ordre et lève « scripted clock exhausted after N readings » une fois épuisée) et à pas fixe (`() => (t += 10)`). Le seul test de l'horloge par défaut remplace `Date.now` par `t.mock.method(Date, "now", <horloge scriptée>)` (restauré à la fin du test par `node:test`) et vérifie la valeur de `durationMs` ; ses `deps` passent `now: () => 0` à la boucle pour que `initialState` (`step.ts:60`) ne lise pas `Date.now`. Tarifs choisis pour des coûts exacts en virgule flottante (500 000 jetons à 2 $/M et 250 000 à 8 $/M = 3 $).

## Estimation de taille

Hors `docs/` et `*.md` : `run-matrix.ts` environ 150 lignes (types et commentaires de conception compris), `src/agent/testing/index.ts` 1 ligne, `run-matrix.test.ts` environ 200 à 250 lignes, `barrel-contract.test.ts` environ 25 lignes : environ 375 à 425 lignes. L'estimation du pilote (environ 345) est plus basse ; le dépassement du plafond de 400 est un risque réel, porté surtout par les tests (TEST-2, TEST-3 et TEST-5 ont plusieurs cas). La mesure fait foi à la PR ; aucun nouveau découpage n'est proposé ici.

## Hypothèses restantes

- Le titre exact de l'issue #8 n'a pas été relu (pas de shell `gh` pour le rédacteur) : l'en-tête de la checklist reprend l'intention du corps relevé. Le pilote corrige l'en-tête s'il diffère, sans renuméroter.
- Les écarts `runIndex` → `run`, `iterations` absent et `error` toujours présent suivent la liste approuvée du pilote contre le corps de l'issue (voir « Écarts ») ; si le pilote veut `iterations`, c'est un SPEC ajouté (SPEC-7) avec son test.
