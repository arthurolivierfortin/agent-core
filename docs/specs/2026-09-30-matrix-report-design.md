# Spécification · Rapport de matrice : `MatrixReport.summary` et `report.toJSON()` · #12

Date : 2026-09-30
Issue : https://github.com/arthurolivierfortin/agent-core/issues/12 (type feature ; lot 3 du découpage de #8)
Checklist : docs/specs/2026-09-30-matrix-report-checklist.md
Branche : `feat/12-matrix-report` (worktree `.claude/worktrees/feat+12-matrix-report`, `main` b1b691b intégrée : `runMatrix` livré par #8)
Continuité : docs/specs/2026-09-30-run-matrix-design.md (#8 : `runMatrix`, `MatrixRun`, `MatrixTrace`, `MatrixReport { runs }`) ; docs/specs/2026-09-30-run-matrix-checklist.md (hypothèse H5 : ordre des clés d'un `MatrixRun`)

## Objectif

Ajouter au rapport de `runMatrix` un résumé par couple (scénario × combinaison) qui émet séparément taux de succès, durée moyenne, jetons et coût, et une sérialisation `toJSON()` en données simples qui garde `null` pour toute mesure absente.

## Source de l'issue (corps relevé le 2026-09-30)

Découpage du 2026-09-30 de #8 en #11 (lot 1, `withMetrics`), #8 (lot 2, `runMatrix`) et #12 (lot 3, cette spécification). Dépend de #8 (fusionné, b1b691b).

Périmètre approuvé par le pilote, numéroté SPEC-1 à SPEC-3 :

1. `MatrixReport.summary` : une ligne par couple (scénario × combinaison), dans l'ordre d'exécution : `{ scenario, combination, runs, passed, successRate = passed / runs, meanDurationMs, tokensUsed (somme), costUsd (somme) }` ; `tokensUsed` et `costUsd` valent `null` dès qu'un run du couple a `null`. Aucun score composite (ADR-AGENT-0007, règle 3).
2. `report.toJSON()` : `{ runs, summary }` en tableaux neufs de données simples ; `JSON.parse(JSON.stringify(report))` les restitue ; un `costUsd` `null` reste `null`, jamais 0.
3. Le cas relevé par le juge de #8 : un prédicat `expect.finalState` qui lève (même `catch` que SPEC-5 de #8 : run `passed: false`, `error`, la matrice continue). Il tient dans le périmètre (un test d'environ 20 lignes, aucun code de production) : il est inclus ici et n'est pas reporté à #9.

Contraintes : `MatrixReport` reste le type de retour de `runMatrix` (étendu, pas remplacé) ; servi par `./testing` ; modèles factices seulement, aucun fournisseur hébergé dans les tests ; aucun `console.log` ; le package ne lit que `process.env` (rien n'est lu ici) ; `step.ts` inchangé ; `ROADMAP.md` non modifié ; PR sous 400 lignes hors `docs/` et `*.md`.

## État constaté dans le code (lecture du 2026-09-30, `main` b1b691b)

- `src/agent/testing/run-matrix.ts:55-57` : `MatrixReport<TState, TAxes>` = `{ readonly runs: readonly MatrixRun<TState, TAxes>[] }`, rien d'autre.
- `src/agent/testing/run-matrix.ts:116-125` : trois boucles imbriquées (`scenarios`, puis `combinations`, puis `run` de 1 à `options.runs`), chaque run poussé dans `runs` ; la fonction rend `{ runs }`. Les runs d'un même couple sont donc contigus dans `report.runs`, en blocs de `options.runs`.
- `src/agent/testing/run-matrix.ts:81-87` : `runs` est un entier ≥ 1, `scenarios` et chaque axe sont non vides, sinon `RangeError` avant tout run. Chaque couple a donc au moins un run : `passed / runs` et la moyenne des durées ne divisent jamais par 0.
- `src/agent/testing/run-matrix.ts:113` : un `MatrixRun` est construit par `{ ...outcome, combination, run, durationMs, tokensUsed, costUsd }`, d'où l'ordre de clés `scenario, passed, failures, error, trace, combination, run, durationMs, tokensUsed, costUsd`, différent de l'ordre de déclaration du type (l.38-53). C'est l'hypothèse H5 de la checklist de #8 : « #12 (`toJSON`) fixera l'ordre de sérialisation s'il en veut un ».
- `src/agent/testing/run-matrix.ts:10-12` : `Combination<TAxes>` n'est pas exporté ; `run-matrix.ts:133` : chaque combinaison est un objet construit une fois, clés dans l'ordre de `Object.keys(axes)`, la même référence étant posée sur tous les `MatrixRun` de la combinaison.
- `src/agent/testing/run-matrix.ts:104-109` : le `catch` de `runOne` couvre `deps`, `env`, le fournisseur et `runScenario` entier.
- `src/agent/testing/run-scenario.ts:34` et `:62` : `checkExpectation` appelle `expect.finalState(state)` après `agent.run`, hors de tout `try` : un prédicat qui lève fait rejeter `runScenario`, donc passe par le `catch` de `runOne`. Aucun test ne l'exerce (spécification de #8, « Exception pendant un run », dernière puce de la couverture).
- `src/agent/testing/index.ts:6` : `export * from "./run-matrix.js";` ; `src/testing/index.ts` sert ce barrel sous `./testing`. Un nouveau nom exporté par `run-matrix.ts` est donc servi par `./testing` sans autre ligne.
- `tests/agent/testing/run-matrix.test.ts` : aides `app`, `text(content, usage?)`, `call`, `navigate(usage?)`, `scenario(name, target, env?)`, `wiring`, `script(...responses)`, `matrix(options)` (un scénario « aller aux reglages », `axes: {}`, `runs: 1`), `scriptedClock` ; constantes `USAGE` (500 000 / 250 000) et `RATE` (2 $/M, 8 $/M), donc 3 $ par réponse portant `USAGE` et tarifée. Les aides `text` et `call` posent toujours une clé `usage`, `undefined` quand l'argument manque.
- `tests/barrel-contract.test.ts:249-269` : annote `MatrixReport<FakeAppState, { model: string[] }>` le résultat de `testing.runMatrix` ; l'ajout de membres à `MatrixReport` n'y casse rien.
- Aucun nom `summary`, `toJSON`, `successRate`, `MatrixSummaryRow` sous `src/` ni `tests/` (seul `summary` apparaît dans un commentaire de `src/context/strategies/sliding-window/sliding-window-strategy.ts:113`, sans rapport).
- ADR-AGENT-0007, règle 3 : « No composite score. […] Emit the dimensions separately: success rate, cost, latency. The trade-off belongs to the human. » ADR-AGENT-0006 : « The package emits data, it displays nothing » ; `toJSON()` y est prévu, `toCSV()` aussi (hors périmètre ici).
- Manifeste (`CLAUDE.md`, bloc `core-project`) : `GATE-1 build` `npm run build`, `GATE-2 typecheck` `npm run typecheck`, `GATE-3 test` `npm run test` ; `derogations: []`.

## Périmètre

Dans la PR :

- `src/agent/testing/run-matrix.ts` : type `MatrixSummaryRow`, membres `summary` et `toJSON` de `MatrixReport`, fonctions non exportées `summarize`, `sumOrNull`, `runData`, `rowData` (SPEC-1, SPEC-2).
- `tests/agent/testing/run-matrix.test.ts` : TEST-1, TEST-2, TEST-3 (SPEC-3 est un test seul).

Hors périmètre :

- `report.toCSV()`, rejeu, démonstration (issue C du premier découpage) ; guide, README, `ROADMAP.md`.
- Tout score composite, classement ou pondération entre dimensions (ADR-AGENT-0007, règle 3).
- Écart-type, médiane, percentiles de durée : seule la moyenne est demandée.
- Toute modification de `step.ts`, `run-scenario.ts`, `define-scenario.ts`, `fake-app.ts`, `withMetrics`, `MetricsCollector`, `aggregate`, et de la construction d'un `MatrixRun` dans `runOne` (l'ordre de ses clés reste celui de H5 dans `report.runs` ; `toJSON` fixe l'ordre de sérialisation).
- La limite acceptée de #8 sur `trace.toolCalls` reconstruit depuis les réponses sur le chemin d'erreur (appels d'une réponse d'atterrissage non dispatchés) : toujours non testée, inchangée.
- Rendre sérialisables des valeurs fournies par le consommateur (valeurs d'axes, `finalState`) : voir « Décisions ».
- `src/agent/testing/index.ts`, `src/testing/index.ts`, `tests/barrel-contract.test.ts` : inchangés (voir « Exports »).

## Conception

### Types (SPEC-1, SPEC-2)

```ts
/** One line per (scenario, combination) pair. Dimensions only, never combined (ADR-AGENT-0007 rule 3). */
export type MatrixSummaryRow<TAxes extends Record<string, readonly unknown[]>> = {
  readonly scenario: string;
  readonly combination: Combination<TAxes>;
  readonly runs: number;
  readonly passed: number;
  readonly successRate: number;
  readonly meanDurationMs: number;
  readonly tokensUsed: number | null;
  readonly costUsd: number | null;
};

export type MatrixReport<TState, TAxes extends Record<string, readonly unknown[]>> = {
  readonly runs: readonly MatrixRun<TState, TAxes>[];
  readonly summary: readonly MatrixSummaryRow<TAxes>[];                                   // SPEC-1
  toJSON(): { runs: MatrixRun<TState, TAxes>[]; summary: MatrixSummaryRow<TAxes>[] };     // SPEC-2
};
```

- `MatrixSummaryRow` est exporté par `run-matrix.ts`, donc servi par `./testing` (barrel `export *`). Son commentaire de type (anglais) cite la règle 3 d'ADR-AGENT-0007.
- Le type de retour de `toJSON` est écrit en ligne (tableaux mutables : ils appartiennent à l'appelant), sans nouveau nom exporté.
- `runMatrix` garde sa signature : `Promise<MatrixReport<TState, TAxes>>`.

### Résumé (SPEC-1)

- Dans la boucle de `runMatrix`, après la boucle `run` de chaque couple, `summary.push(summarize(runs.slice(runs.length - options.runs)))` ; `summary` est un tableau local créé à côté de `runs`. Une ligne par couple, dans l'ordre d'exécution (scénarios dans l'ordre de `scenarios`, combinaisons dans l'ordre du produit), y compris quand deux scénarios portent le même nom (le regroupement suit la boucle, pas une clé textuelle).
- `summarize(pair)`, fonction non exportée, `pair` = les `options.runs` runs du couple, rend dans cet ordre de clés :
  - `scenario` = `pair[0].scenario` ;
  - `combination` = `pair[0].combination` (même référence que les `MatrixRun` du couple et que l'argument de `deps`) ;
  - `runs` = `pair.length` ;
  - `passed` = nombre de runs de `pair` avec `passed === true` (un run qui a levé compte comme non réussi : son `passed` est `false`) ;
  - `successRate` = `passed / runs` ;
  - `meanDurationMs` = somme des `durationMs` de `pair` divisée par `runs` ;
  - `tokensUsed` = `sumOrNull(pair.map((r) => r.tokensUsed))` ;
  - `costUsd` = `sumOrNull(pair.map((r) => r.costUsd))`.
- `sumOrNull(values)`, fonction non exportée : `null` dès qu'une valeur est `null`, sinon la somme des valeurs dans l'ordre, en partant de 0. Un `null` n'est jamais compté pour 0 (ADR-AGENT-0007, règle 2 : absent ≠ zéro).
- Aucun autre champ : pas de score, pas de rang, pas de coût par succès.
- Le commentaire de conception de `runMatrix` (anglais) mentionne le résumé par couple, l'absence de score composite (ADR-AGENT-0007 règle 3) et renvoie à `docs/specs/2026-09-30-matrix-report-design.md (#12)` à côté du renvoi existant vers #8.
- Chemin d'erreur : aucun. `summarize` ne reçoit jamais un couple vide (contrôles de SPEC-1 de #8, `run-matrix.ts:81-87`) ; les runs qui ont levé y entrent comme les autres (`passed: false`, mesures des appels enregistrés).

### Sérialisation (SPEC-2)

- `runMatrix` rend `{ runs, summary, toJSON: () => ({ runs: runs.map(runData), summary: summary.map(rowData) }) }` : `toJSON` est une fonction fléchée fermée sur les tableaux locaux, sans `this` (elle marche aussi détachée du rapport). `JSON.stringify(report)` l'appelle et sérialise ce qu'elle rend.
- `runData(run)`, fonction non exportée, rend un objet neuf dont les clés suivent l'ordre de déclaration du type : `scenario, combination, run, passed, failures, error, durationMs, tokensUsed, costUsd, trace`, avec `combination` = `{ ...run.combination }` (objet neuf, clés dans l'ordre des axes), `failures` = `[...run.failures]`, et `trace` = objet neuf `{ toolCalls: [...trace.toolCalls], finalState: trace.finalState, stopReason: trace.stopReason, content: trace.content, responses: [...trace.responses] }`. Cela résout H5 de #8 pour la sérialisation.
- `rowData(row)`, fonction non exportée, rend un objet neuf aux clés `scenario, combination, runs, passed, successRate, meanDurationMs, tokensUsed, costUsd`, avec `combination` = `{ ...row.combination }`.
- Deux appels à `toJSON()` rendent des tableaux distincts ; modifier ce qu'il rend ne touche pas `report.runs` ni `report.summary`.
- Ce que `toJSON` copie : les tableaux et objets que le rapport possède (rapport, run, trace, ligne, combinaison, `failures`, `toolCalls`, `responses`). Ce qu'il porte par référence : les valeurs fournies par le consommateur ou par le fournisseur (valeurs d'axes, `finalState`, chaque `ToolCall`, chaque `LLMResponse`), que `JSON.stringify` sérialise selon ses propres règles.
- `null` reste `null` : `costUsd`, `tokensUsed`, `error`, `trace.finalState`, `trace.stopReason`, `trace.content` sont recopiés tels quels, jamais remplacés par 0 ou par une chaîne vide.
- Aller-retour : pour un rapport dont les valeurs du consommateur sont des données JSON (pas de `undefined`, de fonction, de `NaN`, d'instance de classe), `JSON.parse(JSON.stringify(report))` est égal en profondeur à `report.toJSON()`. Les mesures produites par `runMatrix` (`durationMs`, `meanDurationMs`, `successRate`, jetons, coût) sont des nombres finis ou `null`, donc sûres.

### Prédicat qui lève (SPEC-3)

- Aucun code de production : `run-scenario.ts:62` appelle le prédicat hors `try`, le `catch` de `runOne` (`run-matrix.ts:104-109`) le capte déjà. SPEC-3 livre le test qui fixe ce chemin.
- Comportement fixé : le run a `passed: false`, `failures: []`, `error` = message levé par le prédicat, `trace.finalState` = l'état capturé (la boucle a abouti, la navigation a eu lieu), `trace.responses` = toutes les réponses (mêmes références), `trace.toolCalls` = les appels des réponses reçues, `trace.stopReason` `null`, `trace.content` `null` ; le scénario suivant s'exécute et réussit ; la ligne de résumé du couple fautif a `passed` 0 et `successRate` 0.
- Perte d'information acceptée et écrite : sur ce chemin, `stopReason` et `content` valent `null` alors que la boucle a abouti (`runScenario` rejette avant de rendre son résultat). La corriger demanderait de modifier `runScenario`, hors périmètre.

### Exports

- `MatrixSummaryRow` rejoint `runMatrix`, `MatrixOptions`, `MatrixRun`, `MatrixTrace`, `MatrixReport` parmi les noms exportés par `run-matrix.ts` ; `summarize`, `sumOrNull`, `runData`, `rowData` restent privés. Aucune ligne de barrel ne change (`src/agent/testing/index.ts:6` porte déjà `export *`).
- Verrou : TEST-1 importe `type { MatrixSummaryRow }` depuis `../../../dist/agent/testing/index.js` (le barrel du harnais que `./testing` réexporte) et annote `report.summary` avec ; `npm run typecheck` (GATE-2) le vérifie. `tests/barrel-contract.test.ts` ne change pas : il annote déjà `MatrixReport` servi par `./testing`, qui porte `summary` et `toJSON`.

## Chemins nominal et d'erreur

| Élément | Nominal | Erreur ou absence |
|---|---|---|
| résumé | une ligne par couple, dans l'ordre, mesures agrégées (SPEC-1) | un run à `tokensUsed` ou `costUsd` `null` rend la somme du couple `null` (SPEC-1) ; un run qui a levé compte comme non réussi (SPEC-3) ; couple vide impossible (SPEC-1 de #8) |
| sérialisation | `{ runs, summary }` neufs, clés dans l'ordre du type (SPEC-2) | `null` conservé à l'aller-retour (SPEC-2) ; valeur non JSON du consommateur : sérialisée par `JSON.stringify` selon ses règles, non transformée (limite écrite) |
| prédicat | renvoie `false` : `failures` non vide, `error` `null` (#8) | lève : `passed: false`, `error`, `failures` `[]`, matrice poursuivie (SPEC-3) |

## Symétrie

- Écriture face à lecture : `runMatrix` écrit `summary`, TEST-1 le relit ligne par ligne ; `toJSON` écrit la forme sérialisée, TEST-2 la relit par `JSON.parse(JSON.stringify(report))`.
- Présent face à absent : jetons et coût présents (somme) et absents (`null`) dans le résumé (TEST-1) et à l'aller-retour (TEST-2).
- Réussi face à échoué face à levé : un couple mixte (TEST-1, `successRate` 0,5), un couple à 0 par prédicat qui lève (TEST-3).
- Rapport face à sérialisation : `toJSON().runs` égal en profondeur à `report.runs` mais distinct, idem pour `summary` (TEST-2).
- Aucune énumération modifiée (`StopReason` lu seulement), aucune base de données.

## Données touchées

Aucune base, aucun fichier lu ou écrit, aucune variable d'environnement lue. Aucun `console.log`. En mémoire : un tableau `summary` par rapport ; `toJSON` alloue des tableaux et objets neufs à chaque appel.

## Décisions et alternatives écartées

- **Résumé calculé dans la boucle de `runMatrix`**, pas regroupé après coup par clé `scenario + combination` : deux scénarios de même nom ou deux combinaisons égales en valeur restent deux lignes, et l'ordre d'exécution est garanti par construction. Écarté : `Map` sur une clé textuelle (fusionnerait à tort, dépend d'une sérialisation des valeurs d'axes).
- **`summary` calculé une fois, champ du rapport** plutôt qu'accesseur recalculé : le rapport est une donnée figée à la fin de `runMatrix` (issue : « `MatrixReport.summary` »).
- **Sommes, pas moyennes, pour jetons et coût** (liste du pilote) : `meanDurationMs` est la seule moyenne. Le lecteur divise par `runs` s'il veut un coût par run.
- **`null` contagieux dans les sommes** : une somme partielle serait un coût minoré lu comme exact, contraire à « absent ≠ zéro » (ADR-AGENT-0007).
- **Aucun score composite** (ADR-AGENT-0007, règle 3) : pas de coût par succès, pas de rang.
- **`toJSON` copie la structure du rapport, pas les valeurs du consommateur** : un `structuredClone` échouerait sur une fonction et changerait le prototype d'une instance passée en valeur d'axe (l'ADR-AGENT-0006 montre `memory: [slidingWindow(8)]`) ; une copie profonde générique n'a pas de définition sûre. Donner un libellé sérialisable à une valeur d'axe non JSON reste au consommateur (ou à `toCSV`, hors périmètre).
- **`toJSON` fixe l'ordre des clés, `runOne` n'est pas touché** : H5 de #8 laissait ce choix à #12 ; changer la construction de `MatrixRun` dans `runOne` toucherait du code livré sans bénéfice pour la sérialisation.
- **Fonction fléchée fermée sur les tableaux** plutôt que méthode lisant `this` : `const { toJSON } = report; toJSON()` marche.
- **`MatrixSummaryRow` exporté**, contrairement à `Combination` : c'est la ligne qu'un consommateur (l'interface prévue dans le dépôt de l'IDE, ADR-AGENT-0006) annotera ; retirer un export plus tard casserait, l'ajouter est additif, et le nom est demandé par l'usage, pas par symétrie.
- **Le test du prédicat qui lève entre ici** (point 3 du pilote) : environ 20 lignes, sans code de production, dans un budget estimé à environ 150 lignes.
- **Pas de nouvel ADR** : ADR-AGENT-0006 (le paquet émet des données, `toJSON`) et ADR-AGENT-0007 (absent ≠ zéro, pas de score composite) sont appliqués tels quels.

## Ordre des commits et preuve de rouge

Un SPEC = un commit = un test. Ordre : **SPEC-1, SPEC-2, SPEC-3**.

- TEST-1 : rouge avant SPEC-1 (`report.summary` indéfini : `TypeError` à l'exécution, et `MatrixSummaryRow` introuvable pour GATE-2).
- TEST-2 : rouge avant SPEC-2 (`report.toJSON` n'est pas une fonction).
- TEST-3 : pas de rouge possible, le comportement existe depuis SPEC-5 de #8 ; c'est un verrou de non-régression. Il échouerait sans le `catch` de `runOne` (`runMatrix` rejetterait avec le message du prédicat) et sans SPEC-1 (assertions sur `summary`). Le juge vérifie que le prédicat est bien appelé et lève (message présent dans `error`).

Gabarit des messages de commit (aucun `Co-Authored-By`) :

```
<type>(testing): <sujet>

Refs: #12
Session: <id>
Model: <modèle>
Authorship: ai
```

Types et sujets : SPEC-1 `feat(testing)` « résumer la matrice par couple scénario × combinaison » ; SPEC-2 `feat(testing)` « sérialiser le rapport de matrice avec toJSON » ; SPEC-3 `test(testing)` « fixer l'échec d'un prédicat finalState qui lève dans runMatrix ».

## Tests

Tous dans `tests/agent/testing/run-matrix.test.ts`, déterministes, sans réseau ni fournisseur hébergé : `FakeLLMProvider`, `fakeApp`, `defineScenario` et les aides existantes du fichier ; horloge à pas fixe `() => (t += 10)` (un run à deux `complete` résolus dure 50, un run à un seul dure 30 : deux lectures de `runMatrix` plus deux par appel résolu). Tarifs `RATE` sur le modèle `fake-model` : 3 $ par réponse portant `USAGE`, sommes exactes en virgule flottante (6 + 3 = 9).

Piège pour l'aller-retour (TEST-2) : les aides `text` et `call` posent une clé `usage` `undefined` quand l'usage manque, que `JSON.stringify` supprime ; `assert.deepEqual` (strict) distingue alors les deux objets. Toute réponse sans usage du test d'aller-retour est donc un littéral sans clé `usage` (`{ content: "tu y es", toolCalls: [] }`).

## Estimation de taille

Hors `docs/` et `*.md` : `run-matrix.ts` environ +50 lignes (type et commentaire 12, `summarize` et `sumOrNull` 15, `runData` et `rowData` 18, boucle et retour 5), `run-matrix.test.ts` environ +95 lignes (TEST-1 35, TEST-2 40, TEST-3 20) : environ 145 lignes, sous le plafond de 400. L'estimation du pilote (environ 120) est un peu plus basse ; l'écart vient de TEST-2 (ordre des clés et aller-retour).

## Hypothèses restantes

- Le titre exact de l'issue #12 n'a pas été relu (pas de shell `gh` pour le rédacteur ; le fichier de corps ne porte pas le titre) : l'en-tête de la checklist reprend l'intention du corps. Le pilote corrige l'en-tête s'il diffère, sans renuméroter.
- Deux scénarios de même nom donnent deux lignes de résumé distinctes : conséquence de la conception, non fixée par un test.
