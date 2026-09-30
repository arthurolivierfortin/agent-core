# Plan · Rapport de matrice : `MatrixReport.summary` et `report.toJSON()` · #12

- Issue : #12 (T:feature) https://github.com/arthurolivierfortin/agent-core/issues/12, titre relu le
  2026-09-30 par `gh issue view 12` : « feat(testing): MatrixReport.summary et report.toJSON() »
  (labels `T:feature`, `S:in-progress`, état `OPEN`). Lot 3 du découpage de #8 : #11 (`withMetrics`)
  et #8 (`runMatrix`, b1b691b) sont fusionnés ; #9 suit.
- Checklist : `docs/specs/2026-09-30-matrix-report-checklist.md`
- Spécification : `docs/specs/2026-09-30-matrix-report-design.md`
- Estimation : `docs/plans/2026-09-30-matrix-report-estimate.json`
- Conception appliquée : ADR-AGENT-0006 (le paquet émet des données, `toJSON`), ADR-AGENT-0007
  (règle 2 « absent ≠ zéro », règle 3 « aucun score composite ») ; `docs/conventions/architecture.md`
  (`./testing` seulement) ; aucun nouvel ADR (spécification, « Décisions »).
- Branche : `feat/12-matrix-report`, base `main` (`publication_branch` du manifeste). Elle existe
  déjà : c'est la branche du worktree `C:/Projects/Perso/agent-core/.claude/worktrees/feat+12-matrix-report`,
  au niveau de `origin/main` (constaté le 2026-09-30 : `git rev-parse HEAD origin/main` rend deux
  fois `b1b691b9a2b302503585933ab9a4c7fca8dfe90d`).
- Toutes les commandes se lancent depuis la racine de ce worktree, chacune par son propre appel
  Bash, en avant-plan, `timeout` 600000 ms pour une installation, un build, un test ou un gate,
  120000 ms sinon. Jamais `&&`, jamais `&` final, jamais `run_in_background`, aucun serveur.
- Fichiers de travail, dans `<dossier_tmp>` (dossier temporaire de la session du builder, chemin
  absolu `C:/…`, reçu dans le prompt de dispatch, sinon créé une fois par `mktemp -d` puis
  `cygpath -m <chemin>`, chaque commande par son propre appel) :
  `<dossier_tmp>/agent-core-issue12-commit-msg.txt` (message de commit, réécrit à chaque tâche,
  relu par l'outil Read avant réécriture) et `<dossier_tmp>/agent-core-issue12-pr-body.md` (corps
  de PR). Jamais `%TEMP%` ni `/tmp` directement, jamais un nom sans dépôt.
- Contraintes du pilote rappelées : `src/agent/application/use-cases/step.ts`,
  `src/agent/testing/run-scenario.ts` et `ROADMAP.md` inchangés ; aucun fournisseur hébergé dans
  les tests (seul `FakeLLMProvider`) ; aucun `console.log` ; aucun fichier `.env` ouvert ni lu (le
  package ne lit que `process.env`, et rien ici ne le lit) ; `tokensUsed` et `costUsd` du résumé
  valent `null` dès qu'un run du couple a `null`, jamais 0 ; PR sous 400 lignes hors `docs/` et
  `*.md` (mesurée à la tâche 4) ; aucun message de commit ne porte de ligne `Co-Authored-By` :
  trailers `Refs: #12`, `Session:`, `Model:`, `Authorship:` seulement.

## Ordre des tâches et dépendances

Ordre des commits voulu par la spécification : SPEC-1, SPEC-2, SPEC-3.

| Tâche | Élément | Dépend de | Pourquoi cet ordre |
|---|---|---|---|
| 0 | préparation (dépendances, référence de la suite) | aucune | le worktree n'a ni `node_modules/` ni `dist/` (constaté : `ls node_modules dist` → `No such file or directory` deux fois) |
| 1 | SPEC-1 + TEST-1 | 0 | `summary` d'abord : `toJSON` (tâche 2) sérialise `summary` |
| 2 | SPEC-2 + TEST-2 | 1 | `rowData` lit les lignes de la tâche 1 |
| 3 | SPEC-3 + TEST-3 | 1 | TEST-3 lit `report.summary` (tâche 1) ; aucun code de production |
| 4 | gates GATE-1 à GATE-3, contrôles, taille, corps de PR | 1 à 3 | |

Aucun `[DB-N]`.

## Vérifications faites par le planificateur (sorties fraîches du 2026-09-30)

- `node --version` : `v22.19.0` (`node --test` lance les `.ts` sans drapeau). Manifeste :
  `publication_branch` `main`, gates `GATE-1 build` `npm run build`, `GATE-2 typecheck`
  `npm run typecheck`, `GATE-3 test` `npm run test`, `derogations` `[]`.
- `git status --short` au lancement : trois fichiers non suivis
  (`docs/plans/2026-09-30-matrix-report-estimate.json`, `docs/specs/2026-09-30-matrix-report-checklist.md`,
  `docs/specs/2026-09-30-matrix-report-design.md`).
- Code lu : `src/agent/testing/run-matrix.ts` en entier (`Combination` non exporté l.10-12,
  `MatrixReport` l.55-57, commentaire de conception l.59-77, boucle l.116-125, `return { runs }`
  l.125, `runOne` l.90-114), `src/agent/testing/run-scenario.ts` (`checkExpectation` appelle
  `expect.finalState(state)` l.62 hors de tout `try`), `src/agent/testing/define-scenario.ts`
  (`ScenarioExpectation.finalState?: (state: TState) => boolean`), `src/agent/testing/fake-app.ts`
  (`FakeAppState = { pages, current }`, données JSON), `src/agent/testing/index.ts`
  (`export * from "./run-matrix.js";`), `src/testing/index.ts`,
  `src/metrics/application/use-cases/with-metrics.ts` (deux lectures de `now` par `complete` résolu),
  `tests/agent/testing/run-matrix.test.ts` en entier (aides `app`, `text`, `call`, `navigate`,
  `scenario`, `wiring`, `script`, `matrix`, `scriptedClock`, constantes `USAGE` et `RATE`),
  `tests/barrel-contract.test.ts:249-269` (annote `MatrixReport<FakeAppState, { model: string[] }>`,
  ne construit aucun `MatrixReport` littéral), `package.json`, `tsconfig.json`, `tsconfig.build.json`.
- Grep `MatrixReport|summary|toJSON|MatrixSummaryRow|successRate` sous `src/`, `tests/`,
  `examples/` hors `run-matrix.ts` : seulement `tests/barrel-contract.test.ts:29,263` (annotation
  de type) et des `summary` sans rapport (`sliding-window-strategy.ts:113`, `examples/web-chat/`).
- Sonde : tout le code de ce plan a été exécuté par le planificateur dans une copie de l'arbre
  `HEAD` (`git archive HEAD`) placée dans le dossier temporaire de sa session, hors du dépôt, avec
  une copie du `node_modules/` du checkout parent (aucune installation lancée), rejouée depuis la
  base en trois commits, un par tâche. Rien n'a été écrit dans le worktree hors de ce fichier.
  Constats :
  - référence sur b1b691b : `npm run test` → `# tests 178`, `# pass 177`, `# fail 0`, `# skipped 1` ;
  - chaque rouge et chaque vert des tâches 1 à 3 a été observé avec `npm run build` puis
    `node --test tests/agent/testing/run-matrix.test.ts`, et `npm run typecheck` après chaque vert
    (code 0) ; les sorties citées ci-dessous sont celles de la sonde ;
  - état final : `npm run build` code 0, `npm run typecheck` code 0, `npm run test` →
    `# tests 181`, `# pass 180`, `# fail 0`, `# skipped 1` ;
  - taille, par `python C:/Projects/dev-kit/scripts/pr_size.py <base> HEAD --repo <sonde>` :
    `hors docs/ et *.md : +196/-3 lignes (code +105, tests +91), seuil 400 respecté` ; détail
    (`git diff --numstat`) : tâche 1 `src/agent/testing/run-matrix.ts` +57/-2 et
    `tests/agent/testing/run-matrix.test.ts` +39/-1 ; tâche 2 `run-matrix.ts` +49/-1 et
    `run-matrix.test.ts` +35/-0 ; tâche 3 `run-matrix.test.ts` +17/-0 ; cumul `run-matrix.ts`
    +105/-2, `run-matrix.test.ts` +91/-1 ;
  - `git grep -n -E "^export " -- src/agent/testing/run-matrix.ts` sur l'état final : six lignes
    (`MatrixOptions` l.14, `MatrixTrace` l.28, `MatrixRun` l.38, `MatrixSummaryRow` l.59,
    `MatrixReport` l.73, `runMatrix` l.111).
- Fins de ligne : copies de travail en CRLF, index en LF (`core.autocrlf=true`,
  `git ls-files --eol` sur `src/agent/testing/run-matrix.ts` et `tests/agent/testing/run-matrix.test.ts` :
  `i/lf w/crlf`). Les blocs « Remplacer » ci-dessous sont écrits en LF ; chacun est présent **une
  seule fois** dans le fichier au moment où la tâche l'applique (vérifié par la sonde, qui échoue
  sur un bloc absent ou répété).

---

## Tâche 0 · préparation

1. `git branch --show-current` → sortie attendue : `feat/12-matrix-report`.
2. `git log --oneline origin/main..HEAD` → sortie attendue : vide.
3. `git status --short` → sortie attendue, exactement ces quatre lignes non suivies (ce plan en plus
   des trois fichiers constatés au lancement) :
   ```
   ?? docs/plans/2026-09-30-matrix-report-estimate.json
   ?? docs/plans/2026-09-30-matrix-report-plan.md
   ?? docs/specs/2026-09-30-matrix-report-checklist.md
   ?? docs/specs/2026-09-30-matrix-report-design.md
   ```
4. `npm ci` (timeout 600000) → sortie attendue : le script `prepare` s'exécute
   (`> tsc -p tsconfig.build.json`), puis `added 3 packages` (`@types/node`, `typescript`,
   `undici-types`, les trois dossiers du `node_modules/` du checkout parent), code 0. Sortie déduite
   du `package-lock.json` et des installations identiques de #11 et #8, non relancée par le
   planificateur (installation interdite à ce rôle).
5. `npm run test` (timeout 600000) → sortie attendue : fin TAP `# tests 178`, `# pass 177`,
   `# fail 0`, `# skipped 1` (le test ignoré est `tests/integration/ollama.integration.test.ts`,
   opt-in par `OLLAMA_INTEGRATION=1`, variable à ne pas poser). Si `# tests` diffère de 178, noter
   la valeur B et remplacer 181 par B + 3 à la tâche 4.

Aucun commit dans cette tâche.

Chaque tâche 1 à 3 suit le même cycle : écrire le test, `npm run build`, lancer le fichier de test
(rouge, sauf tâche 3), écrire le code de production (sauf tâche 3), `npm run build`, relancer
(vert), `npm run typecheck`, cocher les lignes de la checklist, commiter. Le build est obligatoire
avant chaque lancement : les tests importent le code compilé depuis `dist/`, jamais `src/`, et
`npm run typecheck` lit les `.d.ts` de `dist/`. Le typecheck échoue pendant la phase rouge
(membres absents) : c'est attendu, il ne se lance qu'après le vert.

---

## Tâche 1 · SPEC-1 · `MatrixReport.summary`, une ligne par couple (scénario, combinaison)

### 1.1 Écrire TEST-1

Dans `tests/agent/testing/run-matrix.test.ts` (outil Edit), remplacer la ligne 6 :

```ts
import type { FakeApp, FakeAppState } from "../../../dist/agent/testing/index.js";
```

par :

```ts
import type { FakeApp, FakeAppState, MatrixSummaryRow } from "../../../dist/agent/testing/index.js";
```

Puis (outil Edit) remplacer la fin du fichier :

```ts
  assert.deepEqual([run.error, run.trace.finalState, run.trace.responses, provider.calls.length], ["env broke", null, [], 0]);
});
```

par :

```ts
  assert.deepEqual([run.error, run.trace.finalState, run.trace.responses, provider.calls.length], ["env broke", null, [], 0]);
});

test("runMatrix sums each (scenario, combination) pair into one summary line, in the order the pairs ran", async () => {
  const scripts = [
    [navigate(USAGE), text("tu y es", USAGE)],
    [text("non", USAGE)],
    [navigate(USAGE), text("tu y es", USAGE)],
    [navigate(), text("tu y es")],
  ];
  let built = 0;
  let t = 0;
  const report = await runMatrix({
    scenarios: [scenario("aller aux reglages", "reglages")],
    axes: { model: ["a", "b"] },
    runs: 2,
    deps: () => wiring(new FakeLLMProvider({ responses: scripts[built++] })),
    rates: { "fake-model": RATE },
    now: () => (t += 10),
  });

  const summary: readonly MatrixSummaryRow<{ model: string[] }>[] = report.summary;
  assert.deepEqual(summary, [
    {
      scenario: "aller aux reglages", combination: { model: "a" }, runs: 2, passed: 1,
      successRate: 0.5, meanDurationMs: 40, tokensUsed: 2_250_000, costUsd: 9,
    },
    {
      scenario: "aller aux reglages", combination: { model: "b" }, runs: 2, passed: 2,
      successRate: 1, meanDurationMs: 50, tokensUsed: null, costUsd: null,
    },
  ]);
  assert.equal(summary[0].combination, report.runs[0].combination);
  assert.equal(summary[1].combination, report.runs[2].combination);

  const two = [scenario("aller aux reglages", "reglages"), scenario("aller au profil", "profil")];
  const { summary: lines } = await matrix({ scenarios: two });
  const rows = lines.map((r) => [r.scenario, r.runs, r.passed, r.successRate]);
  assert.deepEqual(rows, [["aller aux reglages", 1, 1, 1], ["aller au profil", 1, 0, 0]]);
});
```

Ce que chaque assertion fixe (TEST-1) :

- appel **direct** à `runMatrix` (pas `matrix()`) : `TAxes` est inféré `{ model: string[] }`, et
  l'annotation `readonly MatrixSummaryRow<{ model: string[] }>[]`, avec `MatrixSummaryRow` importé
  en `import type` depuis `../../../dist/agent/testing/index.js`, verrouille l'export et le typage
  (vérifié par GATE-2 ; `node --test` retire les types sans les contrôler) ;
- les quatre fakes sont rendus dans l'ordre des runs (a/1, a/2, b/1, b/2) par l'indice `built` ;
  durées sur l'horloge `() => (t += 10)` : un run à deux `complete` résolus lit l'horloge 6 fois
  (début, 2 × 2 par `withMetrics`, fin), donc 50 ; un run à un seul, 4 fois, donc 30 ;
  couple « a » : a/1 réussit (50 ms, 1 500 000 jetons, 6 $), a/2 échoue (« non » laisse
  `current === "accueil"` ; 30 ms, 750 000 jetons, 3 $) → `passed` 1, `successRate` 0,5,
  `meanDurationMs` 40, `tokensUsed` 2 250 000, `costUsd` 9 ; couple « b » : b/1 comme a/1, b/2 sans
  usage (`tokensUsed` et `costUsd` `null`) → `passed` 2, `successRate` 1, `meanDurationMs` 50,
  `tokensUsed` et `costUsd` **`null`, jamais 6 ni 1 500 000** (somme contagieuse) ;
- `assert.deepEqual` (strict) : aucune clé de plus ni de moins dans une ligne ;
- `combination` de la ligne = **même référence** que celle des runs du couple ;
- deux scénarios sur `axes: {}` et `runs: 1` : deux lignes dans l'ordre d'exécution, la seconde
  à 0 (« aller au profil » échoue sur le script qui navigue vers « reglages »).

### 1.2 Constater le rouge

1. `npm run build` → sortie attendue : `> tsc -p tsconfig.build.json`, code 0.
2. `node --test tests/agent/testing/run-matrix.test.ts` → sortie attendue : code 1, `ok 1` à
   `ok 9` (tests de #8), puis
   `not ok 10 - runMatrix sums each (scenario, combination) pair into one summary line, in the order the pairs ran`,
   `error: |-`, `Expected values to be strictly deep-equal:`, `+ actual - expected`, `+ undefined`,
   `name: 'AssertionError'`, et en fin `# tests 10`, `# pass 9`, `# fail 1`. Bonne raison :
   `report.summary` n'existe pas (`undefined`).

### 1.3 Écrire SPEC-1

Dans `src/agent/testing/run-matrix.ts` (outil Edit, quatre remplacements).

(a) Remplacer :

```ts
export type MatrixReport<TState, TAxes extends Record<string, readonly unknown[]>> = {
  readonly runs: readonly MatrixRun<TState, TAxes>[];
};
```

par :

```ts
/**
 * One line per (scenario, combination) pair: every dimension apart, never folded into a composite
 * score (ADR-AGENT-0007 rule 3). The trade-off between them belongs to the reader.
 */
export type MatrixSummaryRow<TAxes extends Record<string, readonly unknown[]>> = {
  readonly scenario: string;
  /** The very object the pair's runs carry. */
  readonly combination: Combination<TAxes>;
  readonly runs: number;
  readonly passed: number;
  /** `passed / runs`. */
  readonly successRate: number;
  readonly meanDurationMs: number;
  /** Sums over the pair's runs, null as soon as one run has null: absent is not zero (ADR-AGENT-0007). */
  readonly tokensUsed: number | null;
  readonly costUsd: number | null;
};

export type MatrixReport<TState, TAxes extends Record<string, readonly unknown[]>> = {
  readonly runs: readonly MatrixRun<TState, TAxes>[];
  /** One line per (scenario, combination) pair, in the order the pairs ran. */
  readonly summary: readonly MatrixSummaryRow<TAxes>[];
};
```

(b) Remplacer (fin du commentaire de conception de `runMatrix`) :

```ts
 *
 * Design: docs/specs/2026-09-30-run-matrix-design.md (#8).
 */
```

par :

```ts
 *
 * Each (scenario, combination) pair is summed up into one `summary` line as soon as its runs are
 * done, so the lines follow the order the pairs ran, and two pairs never merge even when their
 * names or values are equal. Success rate, mean duration, tokens and cost stay side by side, never
 * combined into a score (ADR-AGENT-0007 rule 3).
 *
 * Design: docs/specs/2026-09-30-run-matrix-design.md (#8),
 * docs/specs/2026-09-30-matrix-report-design.md (#12).
 */
```

(c) Remplacer :

```ts
  const runs: MatrixRun<TState, TAxes>[] = [];
```

par :

```ts
  const runs: MatrixRun<TState, TAxes>[] = [];
  const summary: MatrixSummaryRow<TAxes>[] = [];
```

(d) Remplacer :

```ts
        runs.push(await runOne(scenario, combination, run));
      }
    }
  }
  return { runs };
}
```

par :

```ts
        runs.push(await runOne(scenario, combination, run));
      }
      summary.push(summarize(runs.slice(runs.length - options.runs)));
    }
  }
  return { runs, summary };
}

/** The line of one pair, its runs in order. Never empty: `runMatrix` refuses `runs < 1` before any run. */
function summarize<TState, TAxes extends Record<string, readonly unknown[]>>(
  pair: readonly MatrixRun<TState, TAxes>[],
): MatrixSummaryRow<TAxes> {
  const passed = pair.filter((r) => r.passed).length;
  return {
    scenario: pair[0].scenario,
    combination: pair[0].combination,
    runs: pair.length,
    passed,
    successRate: passed / pair.length,
    meanDurationMs: pair.reduce((sum, r) => sum + r.durationMs, 0) / pair.length,
    tokensUsed: sumOrNull(pair.map((r) => r.tokensUsed)),
    costUsd: sumOrNull(pair.map((r) => r.costUsd)),
  };
}

/** Null as soon as one value is null: a partial sum would read as an exact total, understated. */
function sumOrNull(values: readonly (number | null)[]): number | null {
  let sum = 0;
  for (const value of values) {
    if (value === null) return null;
    sum += value;
  }
  return sum;
}
```

Noms définitifs : type exporté `MatrixSummaryRow`, membre `summary`, fonctions non exportées
`summarize(pair)` et `sumOrNull(values)`, tableau local `summary`. `runOne` et la construction
d'un `MatrixRun` ne changent pas.

### 1.4 Constater le vert

1. `npm run build` → sortie attendue : `> tsc -p tsconfig.build.json`, code 0.
2. `node --test tests/agent/testing/run-matrix.test.ts` → sortie attendue : code 0, `ok 1` à
   `ok 10`, dont
   `ok 10 - runMatrix sums each (scenario, combination) pair into one summary line, in the order the pairs ran`,
   `# tests 10`, `# pass 10`, `# fail 0`.
3. `npm run typecheck` → sortie attendue : `> tsc --noEmit`, code 0, aucune erreur. (Avant 1.3,
   la sonde a observé `error TS2339: Property 'summary' does not exist on type 'MatrixReport<…>'` :
   le verrou de type est réel.)

### 1.5 Commit

1. Cocher `[SPEC-1]` et `[TEST-1]` dans `docs/specs/2026-09-30-matrix-report-checklist.md`
   (`- [ ]` → `- [x]`, rien d'autre).
2. `git add docs/specs/2026-09-30-matrix-report-design.md docs/specs/2026-09-30-matrix-report-checklist.md docs/plans/2026-09-30-matrix-report-estimate.json docs/plans/2026-09-30-matrix-report-plan.md src/agent/testing/run-matrix.ts tests/agent/testing/run-matrix.test.ts`
   → sortie attendue : vide ou avertissements `LF will be replaced by CRLF` seulement.
3. Écrire `<dossier_tmp>/agent-core-issue12-commit-msg.txt` (outil Write ; outil Read d'abord si
   le fichier existe), en remplaçant `<id>` par l'identifiant de session du builder et `<modèle>`
   par l'identifiant de son modèle :
   ```
   feat(testing): résumer la matrice par couple scénario × combinaison

   MatrixReport.summary porte une ligne par couple (scénario,
   combinaison), dans l'ordre d'exécution : runs, passed, successRate,
   meanDurationMs, et les sommes tokensUsed et costUsd, null dès qu'un
   run du couple a null (absent n'est pas zéro). Aucun score composite
   (ADR-AGENT-0007, règle 3). Versionne aussi la spécification, la
   checklist, l'estimation et le plan de l'issue.

   Refs: #12
   Session: <id>
   Model: <modèle>
   Authorship: ai
   ```
4. `git commit -F <dossier_tmp>/agent-core-issue12-commit-msg.txt` → sortie attendue :
   `[feat/12-matrix-report <sha>] feat(testing): résumer la matrice par couple scénario × combinaison`,
   `6 files changed`, quatre `create mode` (les quatre documents).

---

## Tâche 2 · SPEC-2 · `report.toJSON()`, données simples neuves, `null` conservé

### 2.1 Écrire TEST-2

Dans `tests/agent/testing/run-matrix.test.ts` (outil Edit), remplacer la fin de TEST-1 :

```ts
  assert.deepEqual(rows, [["aller aux reglages", 1, 1, 1], ["aller au profil", 1, 0, 0]]);
});
```

par :

```ts
  assert.deepEqual(rows, [["aller aux reglages", 1, 1, 1], ["aller au profil", 1, 0, 0]]);
});

test("report.toJSON() hands back fresh plain data, keys in the order of the types, null kept null", async () => {
  let t = 0;
  const report = await matrix({
    axes: { model: ["a", "b"] },
    deps: ({ model }) => {
      const landing: LLMResponse = { content: "tu y es", toolCalls: [] };
      const responses = model === "a" ? [navigate(USAGE), text("tu y es", USAGE)] : [landing];
      return wiring(new FakeLLMProvider({ responses }));
    },
    rates: { "fake-model": RATE },
    now: () => (t += 10),
  });

  const json = report.toJSON();
  assert.deepEqual(Object.keys(json), ["runs", "summary"]);
  assert.notEqual(json.runs, report.runs);
  assert.notEqual(json.summary, report.summary);
  assert.notEqual(json.runs[0], report.runs[0]);
  assert.notEqual(json.summary[0], report.summary[0]);
  assert.notEqual(report.toJSON().runs, json.runs);
  assert.deepEqual(json.runs, report.runs);
  assert.deepEqual(json.summary, report.summary);
  const runKeys = ["scenario", "combination", "run", "passed", "failures", "error", "durationMs", "tokensUsed", "costUsd", "trace"];
  assert.deepEqual(Object.keys(json.runs[0]), runKeys);
  assert.deepEqual(Object.keys(json.runs[0].trace), ["toolCalls", "finalState", "stopReason", "content", "responses"]);
  const rowKeys = ["scenario", "combination", "runs", "passed", "successRate", "meanDurationMs", "tokensUsed", "costUsd"];
  assert.deepEqual(Object.keys(json.summary[0]), rowKeys);

  const parsed = JSON.parse(JSON.stringify(report));
  assert.deepEqual(parsed, json);
  assert.deepEqual([parsed.runs[0].costUsd, parsed.summary[0].costUsd], [6, 6]);
  assert.deepEqual([parsed.runs[1].costUsd, parsed.runs[1].tokensUsed], [null, null]);
  assert.deepEqual([parsed.summary[1].costUsd, parsed.summary[1].tokensUsed], [null, null]);
});
```

Ce que chaque assertion fixe (TEST-2) :

- piège de l'aller-retour (spécification, « Tests ») : la réponse du modèle « b » est un **littéral
  sans clé `usage`** (`landing`), pas `text("tu y es")` dont la clé `usage: undefined` serait
  supprimée par `JSON.stringify` et ferait échouer `assert.deepEqual(parsed, json)` (strict) ; les
  réponses du modèle « a » portent `USAGE`, clé définie ;
- deux runs : « a » réussit (6 $, 1 500 000 jetons), « b » échoue sans usage (`tokensUsed`,
  `costUsd` `null`) ; deux lignes de résumé, la seconde à `null` ;
- clés du résultat exactement `["runs", "summary"]` (pas de `toJSON` recopié) ; tableaux et objets
  neufs à chaque appel (`notEqual` strict de `node:assert/strict`) ; contenu égal en profondeur au
  rapport ; ordre des clés d'un run, de sa trace et d'une ligne = ordre de déclaration des types
  (H5 de #8 résolu pour la sérialisation) ;
- `JSON.stringify(report)` appelle `toJSON` ; l'aller-retour restitue `json` à l'identique ;
  `costUsd` 6 présent, `null` restitué `null`, jamais 0.

### 2.2 Constater le rouge

1. `npm run build` → sortie attendue : `> tsc -p tsconfig.build.json`, code 0.
2. `node --test tests/agent/testing/run-matrix.test.ts` → sortie attendue : code 1, `ok 1` à
   `ok 10`, puis
   `not ok 11 - report.toJSON() hands back fresh plain data, keys in the order of the types, null kept null`,
   `error: 'report.toJSON is not a function'`, `name: 'TypeError'`, et en fin `# tests 11`,
   `# pass 10`, `# fail 1`. Bonne raison : `toJSON` n'existe pas.

### 2.3 Écrire SPEC-2

Dans `src/agent/testing/run-matrix.ts` (outil Edit, quatre remplacements).

(a) Remplacer :

```ts
  readonly summary: readonly MatrixSummaryRow<TAxes>[];
};
```

par :

```ts
  readonly summary: readonly MatrixSummaryRow<TAxes>[];
  /** Fresh plain data on every call, keys in the order of the types, every null kept null (ADR-AGENT-0006). */
  toJSON(): { runs: MatrixRun<TState, TAxes>[]; summary: MatrixSummaryRow<TAxes>[] };
};
```

(b) Remplacer (paragraphe ajouté à la tâche 1 dans le commentaire de `runMatrix`) :

```ts
 * combined into a score (ADR-AGENT-0007 rule 3).
 *
```

par :

```ts
 * combined into a score (ADR-AGENT-0007 rule 3).
 *
 * `toJSON()` copies what the report owns (arrays, runs, traces, lines, combinations) and passes on
 * as is what the consumer or the provider gave (axis values, final states, calls, responses): a
 * generic deep copy has no safe definition for a function or a class instance given as an axis
 * value. An arrow closed over the arrays, so it works detached from the report too.
 *
```

(c) Remplacer :

```ts
  return { runs, summary };
}
```

par :

```ts
  return { runs, summary, toJSON: () => ({ runs: runs.map(runData), summary: summary.map(rowData) }) };
}
```

(d) Remplacer :

```ts
/** Null as soon as one value is null: a partial sum would read as an exact total, understated. */
```

par :

```ts
/** A run as new plain data, keys in the order `MatrixRun` declares them, whatever order `runOne` built. */
function runData<TState, TAxes extends Record<string, readonly unknown[]>>(
  run: MatrixRun<TState, TAxes>,
): MatrixRun<TState, TAxes> {
  const { trace } = run;
  return {
    scenario: run.scenario,
    combination: { ...run.combination },
    run: run.run,
    passed: run.passed,
    failures: [...run.failures],
    error: run.error,
    durationMs: run.durationMs,
    tokensUsed: run.tokensUsed,
    costUsd: run.costUsd,
    trace: {
      toolCalls: [...trace.toolCalls],
      finalState: trace.finalState,
      stopReason: trace.stopReason,
      content: trace.content,
      responses: [...trace.responses],
    },
  };
}

/** A summary line as new plain data, keys in the order `MatrixSummaryRow` declares them. */
function rowData<TAxes extends Record<string, readonly unknown[]>>(
  row: MatrixSummaryRow<TAxes>,
): MatrixSummaryRow<TAxes> {
  return {
    scenario: row.scenario,
    combination: { ...row.combination },
    runs: row.runs,
    passed: row.passed,
    successRate: row.successRate,
    meanDurationMs: row.meanDurationMs,
    tokensUsed: row.tokensUsed,
    costUsd: row.costUsd,
  };
}

/** Null as soon as one value is null: a partial sum would read as an exact total, understated. */
```

Noms définitifs : membre `toJSON`, fonctions non exportées `runData(run)` et `rowData(row)`. Toute
valeur `null` (`costUsd`, `tokensUsed`, `error`, `finalState`, `stopReason`, `content`) est
recopiée telle quelle. La construction d'un `MatrixRun` dans `runOne` ne change pas.

### 2.4 Constater le vert

1. `npm run build` → sortie attendue : `> tsc -p tsconfig.build.json`, code 0.
2. `node --test tests/agent/testing/run-matrix.test.ts` → sortie attendue : code 0, `ok 1` à
   `ok 11`, dont
   `ok 11 - report.toJSON() hands back fresh plain data, keys in the order of the types, null kept null`,
   `# tests 11`, `# pass 11`, `# fail 0`.
3. `npm run typecheck` → sortie attendue : `> tsc --noEmit`, code 0, aucune erreur.

### 2.5 Commit

1. Cocher `[SPEC-2]` et `[TEST-2]` dans `docs/specs/2026-09-30-matrix-report-checklist.md`.
2. `git add docs/specs/2026-09-30-matrix-report-checklist.md src/agent/testing/run-matrix.ts tests/agent/testing/run-matrix.test.ts`
   → sortie attendue : vide ou avertissements `LF will be replaced by CRLF` seulement.
3. Écrire `<dossier_tmp>/agent-core-issue12-commit-msg.txt` (outil Read puis Write) :
   ```
   feat(testing): sérialiser le rapport de matrice avec toJSON

   report.toJSON() rend { runs, summary } en tableaux et objets neufs à
   chaque appel, clés dans l'ordre de déclaration des types (le
   MatrixRun construit par runOne est inchangé) ; toute mesure null
   reste null, jamais 0. Fonction fléchée fermée sur les tableaux, sans
   this : JSON.stringify(report) la sérialise.

   Refs: #12
   Session: <id>
   Model: <modèle>
   Authorship: ai
   ```
4. `git commit -F <dossier_tmp>/agent-core-issue12-commit-msg.txt` → sortie attendue :
   `[feat/12-matrix-report <sha>] feat(testing): sérialiser le rapport de matrice avec toJSON`,
   `3 files changed`.

---

## Tâche 3 · SPEC-3 · un prédicat `expect.finalState` qui lève dans `runMatrix`

Aucun code de production : `run-scenario.ts:62` appelle le prédicat hors `try`, le `catch` de
`runOne` (`run-matrix.ts`, bloc `catch (err)`) le capte déjà (SPEC-5 de #8). **TEST-3 est un test
de non-régression : il n'a pas de rouge** (hypothèse H3). `src/` n'est pas modifié dans cette tâche.

### 3.1 Écrire TEST-3

Dans `tests/agent/testing/run-matrix.test.ts` (outil Edit), remplacer la fin de TEST-2 :

```ts
  assert.deepEqual([parsed.summary[1].costUsd, parsed.summary[1].tokensUsed], [null, null]);
});
```

par :

```ts
  assert.deepEqual([parsed.summary[1].costUsd, parsed.summary[1].tokensUsed], [null, null]);
});

test("a finalState predicate that throws fails its run with the error, and the matrix goes on", async () => {
  const [r1, r2] = [navigate(), text("tu y es")];
  const expect = { finalState: (): boolean => { throw new Error("predicate broke"); } };
  const throwing = defineScenario({ name: "predicat qui leve", env: app, input: "amene-moi a la page reglages", expect });
  const report = await matrix({ scenarios: [throwing, scenario("aller aux reglages", "reglages")], deps: script(r1, r2) });

  const [thrown, next] = report.runs;
  assert.deepEqual([thrown.passed, thrown.failures, thrown.error], [false, [], "predicate broke"]);
  assert.equal(thrown.trace.finalState?.current, "reglages");
  assert.equal(thrown.trace.responses.length, 2);
  [r1, r2].forEach((response, i) => assert.equal(thrown.trace.responses[i], response));
  assert.deepEqual(thrown.trace.toolCalls, r1.toolCalls);
  assert.deepEqual([thrown.trace.stopReason, thrown.trace.content], [null, null]);
  assert.deepEqual([next.passed, next.error], [true, null]);
  assert.deepEqual(report.summary.map((r) => [r.passed, r.successRate]), [[0, 0], [1, 1]]);
});
```

Ce que chaque assertion fixe (TEST-3) : `runMatrix` résout (un `await` qui rejetterait ferait
échouer le test) ; le prédicat est bien appelé et lève (`error` = « predicate broke », message qui
n'existe nulle part ailleurs) ; `passed: false`, `failures: []` ; la navigation a eu lieu
(`finalState.current` « reglages ») ; toutes les réponses, mêmes références ; `toolCalls`
reconstruit depuis les réponses = `r1.toolCalls` (r2 n'en a pas) ; `stopReason` et `content`
`null` (perte d'information acceptée par la spécification) ; le scénario suivant s'exécute et
réussit ; ligne de résumé du couple fautif à `passed` 0, `successRate` 0.

### 3.2 Constater le vert (pas de rouge possible)

1. `npm run build` → sortie attendue : `> tsc -p tsconfig.build.json`, code 0.
2. `node --test tests/agent/testing/run-matrix.test.ts` → sortie attendue : code 0, `ok 1` à
   `ok 12`, dont
   `ok 12 - a finalState predicate that throws fails its run with the error, and the matrix goes on`,
   `# tests 12`, `# pass 12`, `# fail 0`.
3. `npm run typecheck` → sortie attendue : `> tsc --noEmit`, code 0, aucune erreur.

Écrire dans le corps de PR (tâche 4) que TEST-3 n'a pas de rouge : le comportement existe depuis
SPEC-5 de #8 ; le test échouerait sans le `catch` de `runOne` (`runMatrix` rejetterait avec
« predicate broke ») et sans SPEC-1 (`report.summary` indéfini).

### 3.3 Commit

1. Cocher `[SPEC-3]` et `[TEST-3]` dans `docs/specs/2026-09-30-matrix-report-checklist.md`.
2. `git add docs/specs/2026-09-30-matrix-report-checklist.md tests/agent/testing/run-matrix.test.ts`
   → sortie attendue : vide ou avertissements `LF will be replaced by CRLF` seulement.
3. Écrire `<dossier_tmp>/agent-core-issue12-commit-msg.txt` (outil Read puis Write) :
   ```
   test(testing): fixer l'échec d'un prédicat finalState qui lève dans runMatrix

   Un prédicat expect.finalState qui lève passe par le catch de runOne :
   le run échoue avec l'erreur levée, failures vide, trace partielle
   (état final et réponses gardés, stopReason et content null), la
   matrice continue, et la ligne de résumé du couple est à 0. Test de
   non-régression, aucun code de production.

   Refs: #12
   Session: <id>
   Model: <modèle>
   Authorship: ai
   ```
4. `git commit -F <dossier_tmp>/agent-core-issue12-commit-msg.txt` → sortie attendue :
   `[feat/12-matrix-report <sha>] test(testing): fixer l'échec d'un prédicat finalState qui lève dans runMatrix`,
   `2 files changed`.

---

## Tâche 4 · gates, contrôles, taille et corps de PR

Chaque gate par son propre appel, `timeout` 600000, dans cet ordre (le typecheck lit les `.d.ts`
de `dist/` produits par le build, et `tests/` importe `dist/`) :

| Gate | Commande | Sortie attendue |
|---|---|---|
| GATE-1 build | `npm run build` | `> tsc -p tsconfig.build.json`, code 0, aucune erreur |
| GATE-2 typecheck | `npm run typecheck` | `> tsc --noEmit`, code 0, aucune erreur |
| GATE-3 test | `npm run test` | fin TAP : `# tests 181`, `# pass 180`, `# fail 0`, `# skipped 1` (178 + 3 cas, un par tâche 1 à 3) |

Puis, dans `docs/specs/2026-09-30-matrix-report-checklist.md` : cocher `[GATE-1]`, `[GATE-2]`,
`[GATE-3]`, et inscrire sous `## Hypothèses` les lignes H1 à H15 de la section « Hypothèses » de ce
plan, une par ligne, préfixées `- [H]`. `git add docs/specs/2026-09-30-matrix-report-checklist.md`,
message (outil Read puis Write sur `<dossier_tmp>/agent-core-issue12-commit-msg.txt`) :

```
chore(checklist): cocher les gates et consigner les hypothèses

Refs: #12
Session: <id>
Model: <modèle>
Authorship: ai
```

`git commit -F <dossier_tmp>/agent-core-issue12-commit-msg.txt` → sortie attendue : `1 file changed`.

Contrôles, chaque commande par son propre appel, résultats à recopier dans le corps de PR
(`<dossier_tmp>/agent-core-issue12-pr-body.md`), chemins relatifs au dépôt dans toute preuve :

1. `git fetch origin` → sortie attendue : vide ou une ligne de mise à jour.
2. `git log --oneline HEAD..origin/main` → sortie attendue : vide (sinon : `main` a bougé, le
   signaler au pilote avant la PR, sans rebase ni merge décidé seul).
3. `git diff --name-only origin/main...HEAD` → sortie attendue, exactement ces 6 chemins :
   ```
   docs/plans/2026-09-30-matrix-report-estimate.json
   docs/plans/2026-09-30-matrix-report-plan.md
   docs/specs/2026-09-30-matrix-report-checklist.md
   docs/specs/2026-09-30-matrix-report-design.md
   src/agent/testing/run-matrix.ts
   tests/agent/testing/run-matrix.test.ts
   ```
4. `git diff --stat origin/main...HEAD -- src/agent/application/use-cases/step.ts src/agent/testing/run-scenario.ts src/agent/testing/index.ts src/testing/index.ts tests/barrel-contract.test.ts ROADMAP.md`
   → sortie attendue : vide.
5. `git grep -n "console.log" -- src/agent/testing tests/agent/testing` → sortie attendue : vide,
   code 1.
6. `git grep -n -E "process\.env|dotenv|['\"]\.env" -- src/agent/testing/run-matrix.ts tests/agent/testing/run-matrix.test.ts`
   → sortie attendue : vide, code 1.
7. `git grep -n -E "^export " -- src/agent/testing/run-matrix.ts` → sortie attendue, exactement six
   lignes : `export type MatrixOptions` (l.14), `export type MatrixTrace` (l.28),
   `export type MatrixRun` (l.38), `export type MatrixSummaryRow` (l.59), `export type MatrixReport`
   (l.73), `export async function runMatrix` (l.111). `summarize`, `sumOrNull`, `runData`, `rowData`
   restent non exportés.
8. `git log --format=%B origin/main..HEAD` puis vérifier à la lecture : aucune ligne
   `Co-Authored-By`, quatre blocs de trailers `Refs: #12` / `Session:` / `Model:` / `Authorship: ai`.
9. `python C:/Projects/dev-kit/scripts/pr_size.py origin/main HEAD --body-file <dossier_tmp>/agent-core-issue12-pr-body.md`
   (après écriture du corps) → sortie attendue :
   `hors docs/ et *.md : +196/-3 lignes (code +105, tests +91), seuil 400 respecté`, code 0.
   Détail mesuré par la sonde : `src/agent/testing/run-matrix.ts` +105/-2,
   `tests/agent/testing/run-matrix.test.ts` +91/-1. Recopier la ligne mesurée dans le corps de PR.
   Si la mesure dépasse 400, s'arrêter et le signaler au pilote.

Corps de PR (outil Write sur `<dossier_tmp>/agent-core-issue12-pr-body.md`, sections du dépôt :
Contexte, Changements, Vérifications, Métriques, Risques et suivi, Message de squash proposé). Il
porte obligatoirement :

- `Closes #12` dans « Contexte », et le rappel : lot 3 du découpage de #8 (#11 et #8 fusionnés ;
  #9 suit) ; SPEC-3 = cas relevé par le juge de #8, inclus ici.
- Les trois gates avec leur dernière ligne de sortie, et la référence (178 tests sur b1b691b, 3
  ajoutés).
- Les contrôles 2 à 9 ci-dessus avec leur résultat.
- Le rouge de TEST-1 (étape 1.2, `AssertionError`, `+ undefined`) et de TEST-2 (étape 2.2,
  `TypeError: report.toJSON is not a function`), et l'absence de rouge de TEST-3 avec sa raison
  (étape 3.2).
- **Toutes** les hypothèses H1 à H15 de ce plan, chacune nommée et recopiée en entier (aucune
  omise ni résumée en « autres hypothèses »), plus les deux hypothèses restantes de la
  spécification.
- Aucun fichier `.env` ouvert ni lu ; aucun fournisseur hébergé appelé (seul `FakeLLMProvider`) ;
  aucun `console.log` ; `step.ts`, `run-scenario.ts` et `ROADMAP.md` inchangés ; dérogations
  invoquées : aucune.
- Le message de squash proposé, sans ligne `Co-Authored-By`, trailers `Refs: #12` / `Session` /
  `Model` / `Authorship: ai`.

Relire le fichier (outil Read) dans l'appel qui précède immédiatement toute commande qui le publie.

---

## Hypothèses (à recopier toutes dans la checklist et dans la PR)

- **H1** · Les documents de l'issue (spécification, checklist, estimation, plan) entrent dans le
  commit de la tâche 1, même pratique que #11 et #8.
- **H2** · Types de commit : `feat(testing)` pour SPEC-1 et SPEC-2, `test(testing)` pour SPEC-3
  (sujets repris de la spécification), `chore(checklist)` pour le cochage des gates et
  l'inscription des hypothèses.
- **H3** · SPEC-3 est un test de non-régression : TEST-3 n'a pas de rouge (observé par la sonde :
  vert dès son ajout). Le comportement existe depuis SPEC-5 de #8 ; l'assertion `error` =
  « predicate broke » prouve que le prédicat est appelé et lève.
- **H4** · Le rouge de TEST-1 est une `AssertionError` (`+ undefined`) au premier `deepEqual`, et non
  un `TypeError` comme l'annonce la spécification : même raison (`report.summary` absent), seul
  l'ordre des assertions en décide. Le rouge de type (`TS2339 … 'summary' does not exist`) a été
  observé par la sonde ; le typecheck ne se lance qu'après le vert.
- **H5** · `passed` se compte par `pair.filter((r) => r.passed).length`, équivalent à
  « `passed === true` » puisque `MatrixRun.passed` est un `boolean`.
- **H6** · `successRate` et `meanDurationMs` divisent par `pair.length`, égal à `runs` de la ligne
  et à `options.runs` (tranche de `runs.slice(runs.length - options.runs)`).
- **H7** · Emplacement des fonctions non exportées : `summarize`, `runData`, `rowData`, `sumOrNull`
  entre `runMatrix` et `combinationsOf`, dans cet ordre.
- **H8** · Seule la première moitié de TEST-1 appelle `runMatrix` directement (typage inféré
  `{ model: string[] }`, exigé par la checklist) ; la seconde moitié de TEST-1, TEST-2 et TEST-3
  passent par l'aide `matrix()`. Dans TEST-2, `deps` déstructure `{ model }` (type `unknown` sous
  `Options`) et le compare à `"a"`.
- **H9** · TEST-1 rend ses quatre fakes par un indice `built` dans un tableau `scripts`, dans l'ordre
  des runs a/1, a/2, b/1, b/2 (produit cartésien, runs contigus).
- **H10** · Dans TEST-2, la réponse sans usage est un littéral annoté `LLMResponse`, sans clé
  `usage` (piège écrit dans la checklist) ; les réponses du modèle « a » passent par les aides
  `navigate(USAGE)` et `text("tu y es", USAGE)`, dont la clé `usage` est définie.
- **H11** · L'ordre des clés d'un `MatrixRun` dans `report.runs` reste celui de H5 de #8 ; seul
  `toJSON` fixe l'ordre de sérialisation (`runOne` inchangé).
- **H12** · Le commentaire de conception de `runMatrix` s'étend en deux temps : paragraphe du résumé
  et renvoi vers la spécification de #12 à la tâche 1, paragraphe de `toJSON` à la tâche 2.
- **H13** · Rédaction des commentaires (anglais, le pourquoi), des noms de tests et du scénario
  « predicat qui leve » choisie par ce plan dans le cadre fixé par la spécification.
- **H14** · Les rouges et verts des tâches 1 à 3 se constatent sur le fichier
  (`node --test tests/agent/testing/run-matrix.test.ts` après `npm run build`) ; la suite complète ne
  tourne qu'aux tâches 0 et 4.
- **H15** · La PR porte `Closes #12` : #12 est le dernier lot de #8 pour `summary` et `toJSON`.

## Risques

- **`dist/` périmé** : les tests importent `dist/`, jamais `src/`. Lancer `node --test` sans
  `npm run build` juste avant fait constater l'état précédent.
- **Verrou de type** : l'annotation `MatrixSummaryRow<{ model: string[] }>` de TEST-1 n'est vérifiée
  que par GATE-2 ; `node --test` retire les types sans les contrôler. GATE-2 doit passer après
  GATE-1.
- **Aller-retour JSON** : TEST-2 suppose que `FakeAppState` et les réponses scriptées sont des
  données JSON (vrai aujourd'hui : `{ pages, current }`, réponses littérales). Une aide future qui
  poserait `usage: undefined` dans ce test casserait `deepEqual(parsed, json)`.
- **Horloge** : les durées 40 et 50 de TEST-1 supposent deux lectures de `now` par `complete`
  résolu dans `withMetrics` et deux dans `runOne` ; un changement de ces lectures décale les
  moyennes (même dépendance que les tests de #8).
- **En-tête de la checklist** : « rapport de matrice, MatrixReport.summary et report.toJSON() (lot 3
  de #8) » diffère du titre réel de l'issue (relu par `gh issue view 12`). Sans effet sur les
  identifiants ; le pilote le corrige s'il le souhaite, le builder n'y touche pas.
- **Fins de ligne** : copies de travail en CRLF ; les blocs « Remplacer » sont en LF. Si l'outil Edit
  ne trouve pas un bloc, relire le fichier (outil Read) et recopier le bloc depuis la lecture, sans
  changer le texte.
