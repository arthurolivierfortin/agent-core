# Plan · `runMatrix`, scénarios sur le produit cartésien d'axes × N runs · #8

- Issue : #8 (T:feature) https://github.com/arthurolivierfortin/agent-core/issues/8, titre relu le
  2026-09-30 par `gh issue view 8` : « feat(testing): runMatrix, produit cartésien des axes × N runs,
  traces et rapport JSON » (labels `T:feature`, `S:in-progress`). Lot 2 du découpage : #11
  (`withMetrics`) est fusionné, #12 (`MatrixReport.summary`, `report.toJSON()`) suit.
- Checklist : `docs/specs/2026-09-30-run-matrix-checklist.md`
- Spécification : `docs/specs/2026-09-30-run-matrix-design.md`
- Estimation : `docs/plans/2026-09-30-run-matrix-estimate.json`
- Conception appliquée : ADR-AGENT-0006 (harnais, matrice, trace des échecs), ADR-AGENT-0007
  (collecteur par run, « absent n'est pas zéro »), `docs/conventions/architecture.md` (`./testing`
  seulement, fonction et non classe) ; aucun nouvel ADR (spécification, « Décisions »).
- Branche : `feat/8-run-matrix`, base `main` (`publication_branch` du manifeste). Elle existe déjà :
  c'est la branche du worktree `C:/Projects/Perso/agent-core/.claude/worktrees/feat+8-run-matrix`,
  au niveau de `origin/main` 300921e (constaté le 2026-09-30 : `git rev-parse HEAD origin/main`
  rend deux fois `300921ea04672f88a2a792bf2b60037a5368f3d2`).
- Toutes les commandes se lancent depuis la racine de ce worktree, chacune par son propre appel Bash,
  en avant-plan, `timeout` 600000 ms pour une installation, un build, un test ou un gate, 120000 ms
  sinon. Jamais `&&`, jamais `&` final, jamais `run_in_background`, aucun serveur.
- Fichiers de travail, dans `<dossier_tmp>` (dossier temporaire de la session du builder, chemin
  absolu `C:/…`, reçu dans le prompt de dispatch, sinon créé une fois par `mktemp -d` puis
  `cygpath -m <chemin>`, chaque commande par son propre appel) :
  `<dossier_tmp>/agent-core-issue8-commit-msg.txt` (message de commit, réécrit à chaque tâche, relu
  par l'outil Read avant réécriture) et `<dossier_tmp>/agent-core-issue8-pr-body.md` (corps de PR).
  Jamais `%TEMP%` ni `/tmp` directement, jamais un nom sans dépôt.
- Contraintes du pilote rappelées : `src/agent/application/use-cases/step.ts` et
  `src/agent/testing/run-scenario.ts` inchangés ; `ROADMAP.md` non modifié ; aucun fournisseur
  hébergé dans les tests ; aucun `console.log` ; aucun fichier `.env` ouvert ni lu ; horloge par
  défaut testée par une horloge factice posée sur `Date.now` et une valeur vérifiée ; PR sous 400
  lignes hors `docs/` et `*.md` (mesurée à la tâche 7) ; aucun message de commit ne porte de ligne
  `Co-Authored-By`.

## Ordre des tâches et dépendances

Ordre des commits voulu par la spécification : SPEC-2, SPEC-1, SPEC-3, SPEC-4, SPEC-5, SPEC-6.

| Tâche | Élément | Dépend de | Pourquoi cet ordre |
|---|---|---|---|
| 0 | préparation (dépendances, référence de la suite) | aucune | le worktree n'a ni `node_modules/` ni `dist/` (constaté : `ls` ne les liste pas) |
| 1 | SPEC-2 + TEST-2 | 0 | crée `run-matrix.ts` et son fichier de test ; les contrôles de SPEC-1 portent sur une fonction qui doit d'abord exister |
| 2 | SPEC-1 + TEST-1 | 1 | ajoute les contrôles avant la boucle de la tâche 1 |
| 3 | SPEC-3 + TEST-3 | 2 | mesures autour du run de la tâche 1 |
| 4 | SPEC-4 + TEST-4 | 3 | l'enregistreur se pose sur le fournisseur décoré par `withMetrics` (tâche 3) |
| 5 | SPEC-5 + TEST-5 | 4 | le chemin d'erreur relit `responses` et l'environnement capturé (tâche 4) |
| 6 | SPEC-6 + TEST-6 | 5 | export depuis `./testing`, en dernier pour que TEST-6 soit rouge avant |
| 7 | gates GATE-1 à GATE-3, contrôles, taille, corps de PR | 1 à 6 | |

Aucun `[DB-N]`.

## Vérifications faites par le planificateur (sorties fraîches du 2026-09-30)

- `node --version` : `v22.19.0` (`node --test` lance les `.ts` sans drapeau). Manifeste :
  `publication_branch` `main`, gates `GATE-1 build` `npm run build`, `GATE-2 typecheck`
  `npm run typecheck`, `GATE-3 test` `npm run test`, `derogations` `[]`.
- `git status --short` au lancement : trois fichiers non suivis (`docs/plans/2026-09-30-run-matrix-estimate.json`,
  `docs/specs/2026-09-30-run-matrix-checklist.md`, `docs/specs/2026-09-30-run-matrix-design.md`).
- Code lu : `src/agent/testing/run-scenario.ts` (`runScenario(scenario, deps)`, `env()` appelé une
  fois, `ScenarioResult`), `define-scenario.ts` (`Scenario`, `ScenarioEnv`, `defineScenario` gèle
  une copie), `fake-app.ts` (`fakeApp`, `FakeApp`, `FakeAppState`), `src/agent/testing/index.ts`
  (trois `export *`), `src/testing/index.ts`, `src/agent/application/dtos/index.ts` (`AgentDeps`,
  `StopReason`, `AgentResult.tokensUsed`), `step.ts` (`clock(deps)` = `deps.now ?? Date.now`, lu par
  `initialState` et par la borne `maxDurationMs` seulement ; atterrissage `land` sans dispatch),
  `src/metrics/application/use-cases/with-metrics.ts` (deux lectures de `now` par `complete`
  résolu, une par rejet), `metrics-collector.ts`, `src/metrics/services/aggregate.ts`,
  `src/metrics/index.ts`, `src/llm/interfaces/llm-provider.ts`, `src/llm/models/index.ts`
  (`LLMResponse`, `ToolCall`, `Usage`, `LLMError(code, message)`), `src/llm/testing/fake-llm-provider.ts`
  (`MODEL_ID = "fake-model"`, `calls`, rend l'objet scripté lui-même), `tests/agent/testing/run-scenario.test.ts`
  (imports depuis `dist/`), `tests/barrel-contract.test.ts`, `tsconfig.json` (`include: ["src", "tests"]`),
  `tsconfig.build.json` (`include: ["src"]`, le build ne compile pas `tests/`).
- Grep `Date.now` sous `src/` : seulement `step.ts:282` (`clock`) et la valeur par défaut de
  `withMetrics` ; aucun `runMatrix`, `MatrixRun`, `MatrixTrace`, `MatrixOptions`, `MatrixReport`
  sous `src/` ni `tests/`.
- Sonde : tout le code de ce plan a été exécuté par le planificateur dans une copie de l'arbre `HEAD`
  (`git archive HEAD`) placée dans un dossier temporaire de session hors du dépôt, avec le
  `node_modules/` du checkout parent (aucune installation lancée). Rien n'a été écrit dans le
  worktree hors de ce fichier. Constats :
  - référence sur 300921e : `npm run test` → `# tests 168`, `# pass 167`, `# fail 0`, `# skipped 1` ;
  - chaque rouge et chaque vert des tâches 1 à 6 a été observé avec `npm run build` puis
    `node --test <fichier>`, et `npm run typecheck` après chaque vert (code 0) ; les sorties citées
    ci-dessous sont celles de la sonde ;
  - état final : `npm run build` code 0, `npm run typecheck` code 0, `npm run test` → `# tests 178`,
    `# pass 177`, `# fail 0`, `# skipped 1` ;
  - taille, par `python C:/Projects/dev-kit/scripts/pr_size.py` sur la sonde :
    `hors docs/ et *.md : +397/-0 lignes (code +155, tests +242), seuil 400 respecté` ; détail
    `src/agent/testing/run-matrix.ts` +154, `src/agent/testing/index.ts` +1,
    `tests/agent/testing/run-matrix.test.ts` +215, `tests/barrel-contract.test.ts` +27.
- Fins de ligne : copies de travail en CRLF, index en LF (`core.autocrlf=true`, `git ls-files --eol`
  sur `src/agent/testing/index.ts` et `tests/barrel-contract.test.ts` : `i/lf w/crlf`). Les blocs
  « Remplacer » ci-dessous sont écrits en LF ; chacun est présent **une seule fois** dans le fichier
  réel (vérifié sur la copie `HEAD`).

---

## Tâche 0 · préparation

1. `git branch --show-current` → sortie attendue : `feat/8-run-matrix`.
2. `git log --oneline origin/main..HEAD` → sortie attendue : vide.
3. `git status --short` → sortie attendue, exactement ces quatre lignes non suivies (ce plan en plus
   des trois fichiers constatés au lancement) :
   ```
   ?? docs/plans/2026-09-30-run-matrix-estimate.json
   ?? docs/plans/2026-09-30-run-matrix-plan.md
   ?? docs/specs/2026-09-30-run-matrix-checklist.md
   ?? docs/specs/2026-09-30-run-matrix-design.md
   ```
4. `npm ci` (timeout 600000) → sortie attendue : le script `prepare` s'exécute
   (`> tsc -p tsconfig.build.json`), puis `added 3 packages` (`@types/node`, `typescript`,
   `undici-types`, les trois dossiers du `node_modules/` du checkout parent), code 0. Sortie déduite
   du `package-lock.json` et de l'installation identique de #11, non relancée par le planificateur.
5. `npm run test` (timeout 600000) → sortie attendue : fin TAP `# tests 168`, `# pass 167`,
   `# fail 0`, `# skipped 1` (le test ignoré est `tests/integration/ollama.integration.test.ts`,
   opt-in par `OLLAMA_INTEGRATION=1`, variable à ne pas poser). Si `# tests` diffère de 168, noter
   la valeur B et remplacer 168 par B, et 178 par B + 10, à la tâche 7.

Aucun commit dans cette tâche.

Chaque tâche 1 à 6 suit le même cycle : écrire le test, `npm run build`, lancer le fichier de test
(rouge), écrire le code de production, `npm run build`, relancer (vert), `npm run typecheck`, cocher
les lignes de la checklist, commiter. Le build est obligatoire avant chaque lancement : les tests
importent le code compilé depuis `dist/`, jamais `src/`, et `npm run typecheck` lit les `.d.ts` de
`dist/`. Le typecheck échoue pendant la phase rouge (propriétés absentes) : c'est attendu, il ne se
lance qu'après le vert.

---

## Tâche 1 · SPEC-2 · `runMatrix` : produit cartésien des axes, runs séquentiels

### 1.1 Écrire TEST-2

Créer `tests/agent/testing/run-matrix.test.ts` (outil Write), contenu exact :

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { defineAgent } from "../../../dist/agent/index.js";
import type { AgentDeps } from "../../../dist/agent/index.js";
import { defineScenario, fakeApp } from "../../../dist/agent/testing/index.js";
import type { FakeApp, FakeAppState } from "../../../dist/agent/testing/index.js";
import { runMatrix } from "../../../dist/agent/testing/run-matrix.js";
import type { MatrixOptions } from "../../../dist/agent/testing/run-matrix.js";
import { HeuristicTokenCounter, SlidingWindowStrategy } from "../../../dist/context/index.js";
import type { LLMProvider, LLMResponse, Usage } from "../../../dist/llm/index.js";
import { FakeLLMProvider } from "../../../dist/testing/index.js";

type Wiring = Omit<AgentDeps, "tools">;
type Options = MatrixOptions<FakeAppState, Record<string, readonly unknown[]>>;

const PAGES = ["accueil", "reglages", "profil"];

const app = (): FakeApp => fakeApp({ pages: PAGES, current: "accueil" });
const text = (content: string, usage?: Usage): LLMResponse => ({ content, toolCalls: [], usage });
const call = (name: string, args: Record<string, unknown>, usage?: Usage): LLMResponse => ({
  content: "",
  toolCalls: [{ id: `call-${name}`, name, arguments: args }],
  usage,
});
const navigate = (usage?: Usage): LLMResponse => call("navigate", { page: "reglages" }, usage);

function scenario(name: string, target: string, env: () => FakeApp = app) {
  const expect = { finalState: (state: FakeAppState) => state.current === target };
  return defineScenario({ name, env, input: `amene-moi a la page ${target}`, expect });
}

function wiring(llm: LLMProvider, extra: Partial<Wiring> = {}): Wiring {
  const agent = defineAgent({ name: "navigateur", prompt: "Tu aides a naviguer.", tools: [] });
  const context = new SlidingWindowStrategy({ maxTokens: 100_000, counter: new HeuristicTokenCounter() });
  return { agent, llm, context, ...extra };
}

/** A `deps` that hands every run a fresh fake, scripted with `responses`. */
const script = (...responses: LLMResponse[]) => () => wiring(new FakeLLMProvider({ responses }));

/** « aller aux reglages », no axis, one run, scripted to succeed, unless `options` says otherwise. */
function matrix(options: Partial<Options>) {
  const scenarios = [scenario("aller aux reglages", "reglages")];
  const deps = script(navigate(), text("tu y es"));
  return runMatrix<FakeAppState, Options["axes"]>({ scenarios, axes: {}, runs: 1, deps, ...options });
}

test("runMatrix runs every scenario on every combination, runs times, in order; no axis is one combination", async () => {
  const envCalls = { reglages: 0, profil: 0 };
  const counted = (page: "reglages" | "profil") => () => { envCalls[page]++; return app(); };
  const seen: object[] = [];
  const before: (number | undefined)[] = [];
  let previous: FakeLLMProvider | undefined;

  const { runs } = await runMatrix({
    scenarios: [
      scenario("aller aux reglages", "reglages", counted("reglages")),
      scenario("aller au profil", "profil", counted("profil")),
    ],
    axes: { model: ["a", "b"], memory: [8, 20] },
    runs: 2,
    deps: (combination) => {
      const model: string = combination.model;
      const memory: number = combination.memory;
      // @ts-expect-error `temperature` is not one of the axes.
      void [model, memory, combination.temperature];
      seen.push(combination);
      before.push(previous?.calls.length);
      previous = new FakeLLMProvider({ responses: [navigate(), text("tu y es")] });
      return wiring(previous);
    },
  });

  const expected = ["aller aux reglages", "aller au profil"].flatMap((name) =>
    ["a|8", "a|20", "b|8", "b|20"].flatMap((values) => [`${name}|${values}|1`, `${name}|${values}|2`]),
  );
  assert.deepEqual(runs.map((r) => `${r.scenario}|${r.combination.model}|${r.combination.memory}|${r.run}`), expected);
  const failed = ["finalState: predicate returned false"];
  assert.deepEqual(runs.map((r) => [r.passed, r.failures]), [...Array(8).fill([true, []]), ...Array(8).fill([false, failed])]);
  assert.equal(seen.length, 16);
  runs.forEach((r, i) => assert.equal(seen[i], r.combination));
  assert.deepEqual(before, [undefined, ...Array(15).fill(2)]);
  assert.deepEqual(envCalls, { reglages: 8, profil: 8 });

  const empty: object[] = [];
  const alone = await matrix({ deps: (combination) => { empty.push(combination); return script(text("ok"))(); } });
  assert.deepEqual(alone.runs.map((r) => r.combination), [{}]);
  assert.deepEqual(empty, [{}]);
});
```

Ce que chaque assertion fixe (TEST-2) : l'ordre `scenario|model|memory|run` des 16 runs ; `passed`
et `failures` des deux scénarios sur le même script ; 16 appels de `deps`, chacun avec la
**même référence** que la `combination` du run correspondant ; runs séquentiels (`before` : à chaque
appel de `deps` après le premier, le fake précédent a déjà `calls.length === 2`) ; 8 appels de
chaque `env` ; typage de la combinaison (`string`, `number`, `// @ts-expect-error` sur un nom hors
axes, contrôlé par GATE-2) ; `axes: {}` → une seule combinaison `{}`, `deps` appelé une fois avec `{}`.

### 1.2 Constater le rouge

1. `npm run build` → sortie attendue : `> tsc -p tsconfig.build.json`, code 0.
2. `node --test tests/agent/testing/run-matrix.test.ts` → sortie attendue : code 1,
   `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…\dist\agent\testing\run-matrix.js' imported from …\tests\agent\testing\run-matrix.test.ts`,
   `not ok 1 - tests\agent\testing\run-matrix.test.ts`, `# tests 1`, `# pass 0`, `# fail 1`.
   Bonne raison : le module n'existe pas.

### 1.3 Écrire SPEC-2

Créer `src/agent/testing/run-matrix.ts` (outil Write), contenu exact :

```ts
import type { AgentDeps } from "../application/dtos/index.js";
import type { Scenario } from "./define-scenario.js";
import { runScenario } from "./run-scenario.js";

/** One value per axis. Not exported: a consumer names it `MatrixRun<S, A>["combination"]`. */
type Combination<TAxes extends Record<string, readonly unknown[]>> = {
  readonly [K in keyof TAxes]: TAxes[K][number];
};

export type MatrixOptions<TState, TAxes extends Record<string, readonly unknown[]>> = {
  readonly scenarios: readonly Scenario<TState>[];
  readonly axes: TAxes;
  /** Runs per (scenario, combination) pair: an integer, at least 1. */
  readonly runs: number;
  /** Called once per run, so each run gets a fresh provider if this builds one. */
  readonly deps: (combination: Combination<TAxes>) => Omit<AgentDeps, "tools">;
};

export type MatrixRun<TState, TAxes extends Record<string, readonly unknown[]>> = {
  readonly scenario: string;
  /** The very object `deps` received. */
  readonly combination: Combination<TAxes>;
  /** 1 to `runs`, per (scenario, combination) pair. */
  readonly run: number;
  readonly passed: boolean;
  readonly failures: readonly string[];
};

export type MatrixReport<TState, TAxes extends Record<string, readonly unknown[]>> = {
  readonly runs: readonly MatrixRun<TState, TAxes>[];
};

/**
 * Run every scenario on every combination of `axes` (their Cartesian product, the last axis
 * varying fastest), `runs` times each, one after the other, and report every run in that order
 * (ADR-AGENT-0006). Sequential: a local provider serves one call at a time, and a fixed order
 * keeps a report against fakes reproducible.
 *
 * Design: docs/specs/2026-09-30-run-matrix-design.md (#8).
 */
export async function runMatrix<TState, TAxes extends Record<string, readonly unknown[]>>(
  options: MatrixOptions<TState, TAxes>,
): Promise<MatrixReport<TState, TAxes>> {
  const runOne = async (scenario: Scenario<TState>, combination: Combination<TAxes>, run: number) => {
    const result = await runScenario(scenario, options.deps(combination));
    return { scenario: result.scenario, combination, run, passed: result.passed, failures: result.failures };
  };

  const runs: MatrixRun<TState, TAxes>[] = [];
  const combinations = combinationsOf(options.axes);
  for (const scenario of options.scenarios) {
    for (const combination of combinations) {
      for (let run = 1; run <= options.runs; run++) {
        runs.push(await runOne(scenario, combination, run));
      }
    }
  }
  return { runs };
}

function combinationsOf<TAxes extends Record<string, readonly unknown[]>>(
  axes: TAxes,
): Combination<TAxes>[] {
  let combinations: Record<string, unknown>[] = [{}];
  for (const name of Object.keys(axes)) {
    combinations = combinations.flatMap((c) => axes[name].map((value) => ({ ...c, [name]: value })));
  }
  return combinations as Combination<TAxes>[];
}
```

### 1.4 Constater le vert

1. `npm run build` → sortie attendue : `> tsc -p tsconfig.build.json`, code 0.
2. `node --test tests/agent/testing/run-matrix.test.ts` → sortie attendue : code 0,
   `ok 1 - runMatrix runs every scenario on every combination, runs times, in order; no axis is one combination`,
   `# tests 1`, `# pass 1`, `# fail 0`.
3. `npm run typecheck` → sortie attendue : `> tsc --noEmit`, code 0, aucune erreur.

### 1.5 Commit

1. Cocher `[SPEC-2]` et `[TEST-2]` dans `docs/specs/2026-09-30-run-matrix-checklist.md`
   (`- [ ]` → `- [x]`, rien d'autre).
2. `git add docs/specs/2026-09-30-run-matrix-design.md docs/specs/2026-09-30-run-matrix-checklist.md docs/plans/2026-09-30-run-matrix-estimate.json docs/plans/2026-09-30-run-matrix-plan.md src/agent/testing/run-matrix.ts tests/agent/testing/run-matrix.test.ts`
   → sortie attendue : vide ou avertissements `LF will be replaced by CRLF` seulement.
3. Écrire `<dossier_tmp>/agent-core-issue8-commit-msg.txt` (outil Write ; outil Read d'abord si le
   fichier existe), en remplaçant `<id>` par l'identifiant de session du builder et `<modèle>` par
   l'identifiant de son modèle :
   ```
   feat(testing): exécuter les scénarios sur le produit cartésien des axes avec runMatrix

   runMatrix construit le produit cartésien des axes (ordre de
   Object.keys, dernier axe le plus rapide, {} pour aucun axe), puis
   exécute chaque scénario sur chaque combinaison, runs fois, un run
   après l'autre ; deps(combination) est appelé une fois par run et
   la même combinaison est posée sur le MatrixRun. Versionne aussi la
   spécification, la checklist, l'estimation et le plan de l'issue.

   Refs: #8
   Session: <id>
   Model: <modèle>
   Authorship: ai
   ```
4. `git commit -F <dossier_tmp>/agent-core-issue8-commit-msg.txt` → sortie attendue :
   `[feat/8-run-matrix <sha>] feat(testing): exécuter les scénarios sur le produit cartésien des axes avec runMatrix`,
   `6 files changed`, six `create mode` (deux sous `src/` et `tests/`, quatre documents).

---

## Tâche 2 · SPEC-1 · `RangeError` avant tout run

### 2.1 Écrire TEST-1

Dans `tests/agent/testing/run-matrix.test.ts` (outil Edit), remplacer :

```ts
  const alone = await matrix({ deps: (combination) => { empty.push(combination); return script(text("ok"))(); } });
  assert.deepEqual(alone.runs.map((r) => r.combination), [{}]);
  assert.deepEqual(empty, [{}]);
});
```

par :

```ts
  const alone = await matrix({ deps: (combination) => { empty.push(combination); return script(text("ok"))(); } });
  assert.deepEqual(alone.runs.map((r) => r.combination), [{}]);
  assert.deepEqual(empty, [{}]);
});

test("runMatrix refuses options that would yield an empty or truncated report, before any run", async () => {
  const cases: [Partial<Options>, string][] = [
    [{ runs: 0 }, "runMatrix: runs must be an integer >= 1, got 0"],
    [{ runs: 1.5 }, "runMatrix: runs must be an integer >= 1, got 1.5"],
    [{ runs: NaN }, "runMatrix: runs must be an integer >= 1, got NaN"],
    [{ scenarios: [] }, "runMatrix: scenarios must not be empty"],
    [{ axes: { model: ["a"], memory: [] } }, "runMatrix: axis 'memory' has no value"],
  ];
  for (const [override, message] of cases) {
    const calls = { deps: 0, env: 0 };
    const env = () => { calls.env++; return app(); };
    const deps = () => { calls.deps++; return script(text("ok"))(); };
    const options = { scenarios: [scenario("aller aux reglages", "reglages", env)], axes: { model: ["a"] }, deps };

    await assert.rejects(matrix({ ...options, ...override }), { name: "RangeError", message });
    assert.deepEqual(calls, { deps: 0, env: 0 }, message);
  }
});
```

La base valide de chaque cas est un scénario `fakeApp` compté, `axes` `{ model: ["a"] }`, `runs` 1
(défaut de `matrix`) ; chaque cas remplace une seule option.

### 2.2 Constater le rouge

1. `npm run build` → code 0.
2. `node --test tests/agent/testing/run-matrix.test.ts` → sortie attendue : code 1, `ok 1 - …`,
   `not ok 2 - runMatrix refuses options that would yield an empty or truncated report, before any run`
   avec `error: 'Missing expected rejection (RangeError).'`, `expected: name: 'RangeError'`,
   `message: 'runMatrix: runs must be an integer >= 1, got 0'`, `operator: 'rejects'` ; `# tests 2`,
   `# pass 1`, `# fail 1`. Bonne raison : sans contrôle, `runs: 0` rend un rapport vide au lieu de
   rejeter.

### 2.3 Écrire SPEC-1

Remplacer tout le contenu de `src/agent/testing/run-matrix.ts` (outil Read, puis Write) par :

```ts
import type { AgentDeps } from "../application/dtos/index.js";
import type { Scenario } from "./define-scenario.js";
import { runScenario } from "./run-scenario.js";

/** One value per axis. Not exported: a consumer names it `MatrixRun<S, A>["combination"]`. */
type Combination<TAxes extends Record<string, readonly unknown[]>> = {
  readonly [K in keyof TAxes]: TAxes[K][number];
};

export type MatrixOptions<TState, TAxes extends Record<string, readonly unknown[]>> = {
  readonly scenarios: readonly Scenario<TState>[];
  readonly axes: TAxes;
  /** Runs per (scenario, combination) pair: an integer, at least 1. */
  readonly runs: number;
  /** Called once per run, so each run gets a fresh provider if this builds one. */
  readonly deps: (combination: Combination<TAxes>) => Omit<AgentDeps, "tools">;
};

export type MatrixRun<TState, TAxes extends Record<string, readonly unknown[]>> = {
  readonly scenario: string;
  /** The very object `deps` received. */
  readonly combination: Combination<TAxes>;
  /** 1 to `runs`, per (scenario, combination) pair. */
  readonly run: number;
  readonly passed: boolean;
  readonly failures: readonly string[];
};

export type MatrixReport<TState, TAxes extends Record<string, readonly unknown[]>> = {
  readonly runs: readonly MatrixRun<TState, TAxes>[];
};

/**
 * Run every scenario on every combination of `axes` (their Cartesian product, the last axis
 * varying fastest), `runs` times each, one after the other, and report every run in that order
 * (ADR-AGENT-0006). Sequential: a local provider serves one call at a time, and a fixed order
 * keeps a report against fakes reproducible. Options that would yield an empty report, which
 * reads as "nothing failed", are refused before any run.
 *
 * Design: docs/specs/2026-09-30-run-matrix-design.md (#8).
 */
export async function runMatrix<TState, TAxes extends Record<string, readonly unknown[]>>(
  options: MatrixOptions<TState, TAxes>,
): Promise<MatrixReport<TState, TAxes>> {
  if (!Number.isInteger(options.runs) || options.runs < 1) {
    throw new RangeError(`runMatrix: runs must be an integer >= 1, got ${options.runs}`);
  }
  if (options.scenarios.length === 0) throw new RangeError("runMatrix: scenarios must not be empty");
  for (const name of Object.keys(options.axes)) {
    if (options.axes[name].length === 0) throw new RangeError(`runMatrix: axis '${name}' has no value`);
  }

  const runOne = async (scenario: Scenario<TState>, combination: Combination<TAxes>, run: number) => {
    const result = await runScenario(scenario, options.deps(combination));
    return { scenario: result.scenario, combination, run, passed: result.passed, failures: result.failures };
  };

  const runs: MatrixRun<TState, TAxes>[] = [];
  const combinations = combinationsOf(options.axes);
  for (const scenario of options.scenarios) {
    for (const combination of combinations) {
      for (let run = 1; run <= options.runs; run++) {
        runs.push(await runOne(scenario, combination, run));
      }
    }
  }
  return { runs };
}

function combinationsOf<TAxes extends Record<string, readonly unknown[]>>(
  axes: TAxes,
): Combination<TAxes>[] {
  let combinations: Record<string, unknown>[] = [{}];
  for (const name of Object.keys(axes)) {
    combinations = combinations.flatMap((c) => axes[name].map((value) => ({ ...c, [name]: value })));
  }
  return combinations as Combination<TAxes>[];
}
```

`runMatrix` étant `async`, un `throw` dans son corps fait rejeter la promesse rendue, avant le
premier appel à `options.deps` ou à un `env`.

### 2.4 Constater le vert

1. `npm run build` → code 0.
2. `node --test tests/agent/testing/run-matrix.test.ts` → sortie attendue : code 0, `ok 1 - …`,
   `ok 2 - runMatrix refuses options that would yield an empty or truncated report, before any run`,
   `# tests 2`, `# pass 2`, `# fail 0`.
3. `npm run typecheck` → `> tsc --noEmit`, code 0.

### 2.5 Commit

1. Cocher `[SPEC-1]` et `[TEST-1]` dans la checklist.
2. `git add docs/specs/2026-09-30-run-matrix-checklist.md src/agent/testing/run-matrix.ts tests/agent/testing/run-matrix.test.ts`
   → sortie attendue : vide ou avertissements CRLF seulement.
3. Réécrire `<dossier_tmp>/agent-core-issue8-commit-msg.txt` (outil Read, puis Write) :
   ```
   feat(testing): refuser une matrice vide ou un nombre de runs invalide

   runMatrix rejette avec un RangeError, avant tout appel à deps ou à
   un env, un runs non entier ou inférieur à 1, une liste de scénarios
   vide, puis le premier axe sans valeur : un rapport vide se lirait
   comme « rien n'a échoué ».

   Refs: #8
   Session: <id>
   Model: <modèle>
   Authorship: ai
   ```
4. `git commit -F <dossier_tmp>/agent-core-issue8-commit-msg.txt` → sortie attendue :
   `[feat/8-run-matrix <sha>] feat(testing): refuser une matrice vide ou un nombre de runs invalide`,
   `3 files changed`.

---

## Tâche 3 · SPEC-3 · durée, jetons et coût de chaque run

### 3.1 Écrire TEST-3

Dans `tests/agent/testing/run-matrix.test.ts` (outil Edit), trois remplacements.

a. Remplacer :

```ts
const PAGES = ["accueil", "reglages", "profil"];
```

par :

```ts
const PAGES = ["accueil", "reglages", "profil"];
const USAGE: Usage = { tokensIn: 500_000, tokensOut: 250_000 };
const RATE = { usdPerMillionTokensIn: 2, usdPerMillionTokensOut: 8 };
```

b. Remplacer :

```ts
  return runMatrix<FakeAppState, Options["axes"]>({ scenarios, axes: {}, runs: 1, deps, ...options });
}
```

par :

```ts
  return runMatrix<FakeAppState, Options["axes"]>({ scenarios, axes: {}, runs: 1, deps, ...options });
}

/** Hands out `values` in order, then throws: a test can tell exactly how often it was read. */
function scriptedClock(values: number[]): () => number {
  let readings = 0;
  return () => {
    if (readings === values.length) throw new Error(`scripted clock exhausted after ${readings} readings`);
    return values[readings++];
  };
}
```

c. Remplacer :

```ts
    await assert.rejects(matrix({ ...options, ...override }), { name: "RangeError", message });
    assert.deepEqual(calls, { deps: 0, env: 0 }, message);
  }
});
```

par :

```ts
    await assert.rejects(matrix({ ...options, ...override }), { name: "RangeError", message });
    assert.deepEqual(calls, { deps: 0, env: 0 }, message);
  }
});

test("runMatrix measures each run's duration, tokens and cost on the injected clock", async () => {
  const clock = scriptedClock([1000, 1010, 1030, 1040, 1100, 1500]);
  const deps = script(navigate(USAGE), text("tu y es", USAGE));
  const [run] = (await matrix({ deps, rates: { "fake-model": RATE }, now: clock })).runs;

  assert.deepEqual([run.durationMs, run.tokensUsed, run.costUsd], [500, 1_500_000, 6]);
  assert.throws(clock, /scripted clock exhausted after 6 readings/);
});

test("runMatrix reports null, never 0, for a missing usage or rate, with a fresh collector per run", async () => {
  const measure = async (usage: Usage | undefined, options: Partial<Options>) => {
    const { runs } = await matrix({ deps: script(navigate(usage), text("tu y es", usage)), ...options });
    return runs.map((r) => [r.tokensUsed, r.costUsd]);
  };

  assert.deepEqual(await measure(undefined, { rates: { "fake-model": RATE } }), [[null, null]]);
  assert.deepEqual(await measure(USAGE, { runs: 2 }), [[1_500_000, null], [1_500_000, null]]);
  assert.deepEqual(await measure(USAGE, { rates: { "other-model": RATE } }), [[1_500_000, null]]);
});

test("runMatrix measures on Date.now when no clock is given", async (t) => {
  const dateNow = t.mock.method(Date, "now", scriptedClock([100, 110, 150, 400]));
  const deps = () => wiring(new FakeLLMProvider({ responses: [text("tu y es")] }), { now: () => 0 });
  const [run] = (await matrix({ deps })).runs;

  assert.equal(run.durationMs, 300);
  assert.equal(dateNow.mock.callCount(), 4);
});
```

Arithmétique fixée : lectures de l'horloge = début du run (1000), début et fin du premier
`complete` (1010, 1030), début et fin du second (1040, 1100), fin du run (1500) → `durationMs`
1500 − 1000 = 500 ; deux appels à 500 000 + 250 000 jetons → 1 500 000 ; coût par appel
(500 000 × 2 + 250 000 × 8) / 1 000 000 = 3 $, deux appels → 6. Une septième lecture lèverait :
`assert.throws(clock, …)` prouve six lectures exactement. Horloge par défaut : `deps` passe
`now: () => 0` à la boucle, donc `initialState` (`step.ts:60`) ne lit pas `Date.now` ; les quatre
lectures du mock sont début de run (100), début et fin de l'unique `complete` (110, 150), fin de
run (400) → 300. `t.mock.method` est restauré par `node:test` à la fin du test.

### 3.2 Constater le rouge

1. `npm run build` → code 0.
2. `node --test tests/agent/testing/run-matrix.test.ts` → sortie attendue : code 1, `ok 1`, `ok 2`,
   `not ok 3 - runMatrix measures each run's duration, tokens and cost on the injected clock`
   (`Expected values to be strictly deep-equal`, actual `[undefined, undefined, undefined]`, expected
   `[500, 1500000, 6]`), `not ok 4 - runMatrix reports null, never 0, …` (actual `[[undefined, undefined]]`,
   expected `[[null, null]]`), `not ok 5 - runMatrix measures on Date.now when no clock is given`
   (`undefined !== 300`) ; `# tests 5`, `# pass 2`, `# fail 3`. Bonne raison : `durationMs`,
   `tokensUsed` et `costUsd` n'existent pas encore.

### 3.3 Écrire SPEC-3

Remplacer tout le contenu de `src/agent/testing/run-matrix.ts` (outil Read, puis Write) par :

```ts
import { MetricsCollector, withMetrics } from "../../metrics/index.js";
import type { RateTable } from "../../metrics/index.js";
import type { AgentDeps } from "../application/dtos/index.js";
import type { Scenario } from "./define-scenario.js";
import { runScenario } from "./run-scenario.js";

/** One value per axis. Not exported: a consumer names it `MatrixRun<S, A>["combination"]`. */
type Combination<TAxes extends Record<string, readonly unknown[]>> = {
  readonly [K in keyof TAxes]: TAxes[K][number];
};

export type MatrixOptions<TState, TAxes extends Record<string, readonly unknown[]>> = {
  readonly scenarios: readonly Scenario<TState>[];
  readonly axes: TAxes;
  /** Runs per (scenario, combination) pair: an integer, at least 1. */
  readonly runs: number;
  /** Called once per run, so each run gets a fresh provider if this builds one. */
  readonly deps: (combination: Combination<TAxes>) => Omit<AgentDeps, "tools">;
  /** Prices `costUsd`; without it every cost is null (ADR-AGENT-0007). */
  readonly rates?: RateTable;
  /** The clock of `durationMs` and of every call's record. Defaults to `Date.now`. */
  readonly now?: () => number;
};

export type MatrixRun<TState, TAxes extends Record<string, readonly unknown[]>> = {
  readonly scenario: string;
  /** The very object `deps` received. */
  readonly combination: Combination<TAxes>;
  /** 1 to `runs`, per (scenario, combination) pair. */
  readonly run: number;
  readonly passed: boolean;
  readonly failures: readonly string[];
  readonly durationMs: number;
  /** Null as soon as one call reported no usage: absent is not zero (ADR-AGENT-0007). */
  readonly tokensUsed: number | null;
  readonly costUsd: number | null;
};

export type MatrixReport<TState, TAxes extends Record<string, readonly unknown[]>> = {
  readonly runs: readonly MatrixRun<TState, TAxes>[];
};

/**
 * Run every scenario on every combination of `axes` (their Cartesian product, the last axis
 * varying fastest), `runs` times each, one after the other, and report every run in that order
 * (ADR-AGENT-0006). Sequential: a local provider serves one call at a time, and a fixed order
 * keeps a report against fakes reproducible. Options that would yield an empty report, which
 * reads as "nothing failed", are refused before any run.
 *
 * Each run is measured by its own `MetricsCollector`, fed by `withMetrics` on `now`.
 * `tokensUsed` comes from that collector, never from `AgentResult.tokensUsed` (pilot's
 * decision): that one is the budget counter, 0 when the provider reports no usage, against
 * ADR-AGENT-0007's "absent is not zero", and it does not exist for a run that throws, while the
 * collector keeps the calls resolved before the error.
 *
 * Design: docs/specs/2026-09-30-run-matrix-design.md (#8).
 */
export async function runMatrix<TState, TAxes extends Record<string, readonly unknown[]>>(
  options: MatrixOptions<TState, TAxes>,
): Promise<MatrixReport<TState, TAxes>> {
  if (!Number.isInteger(options.runs) || options.runs < 1) {
    throw new RangeError(`runMatrix: runs must be an integer >= 1, got ${options.runs}`);
  }
  if (options.scenarios.length === 0) throw new RangeError("runMatrix: scenarios must not be empty");
  for (const name of Object.keys(options.axes)) {
    if (options.axes[name].length === 0) throw new RangeError(`runMatrix: axis '${name}' has no value`);
  }
  const now = options.now ?? Date.now;

  const runOne = async (scenario: Scenario<TState>, combination: Combination<TAxes>, run: number) => {
    const collector = new MetricsCollector();
    const startedAt = now();
    const wiring = options.deps(combination);
    const llm = withMetrics(wiring.llm, collector, now);
    const result = await runScenario(scenario, { ...wiring, llm });
    const outcome = { scenario: result.scenario, passed: result.passed, failures: result.failures };
    const durationMs = now() - startedAt;
    const { tokensIn, tokensOut, costUsd } = collector.total(options.rates);
    const tokensUsed = tokensIn === null || tokensOut === null ? null : tokensIn + tokensOut;
    return { ...outcome, combination, run, durationMs, tokensUsed, costUsd };
  };

  const runs: MatrixRun<TState, TAxes>[] = [];
  const combinations = combinationsOf(options.axes);
  for (const scenario of options.scenarios) {
    for (const combination of combinations) {
      for (let run = 1; run <= options.runs; run++) {
        runs.push(await runOne(scenario, combination, run));
      }
    }
  }
  return { runs };
}

function combinationsOf<TAxes extends Record<string, readonly unknown[]>>(
  axes: TAxes,
): Combination<TAxes>[] {
  let combinations: Record<string, unknown>[] = [{}];
  for (const name of Object.keys(axes)) {
    combinations = combinations.flatMap((c) => axes[name].map((value) => ({ ...c, [name]: value })));
  }
  return combinations as Combination<TAxes>[];
}
```

`now` est lu à l'appel de `runMatrix` (`options.now ?? Date.now`), donc le mock de `Date.now` posé
avant l'appel est celui qu'utilisent `runOne` et `withMetrics`.

### 3.4 Constater le vert

1. `npm run build` → code 0.
2. `node --test tests/agent/testing/run-matrix.test.ts` → sortie attendue : code 0, `ok 1` à `ok 5`,
   `# tests 5`, `# pass 5`, `# fail 0`.
3. `npm run typecheck` → `> tsc --noEmit`, code 0.

### 3.5 Commit

1. Cocher `[SPEC-3]` et `[TEST-3]` dans la checklist.
2. `git add docs/specs/2026-09-30-run-matrix-checklist.md src/agent/testing/run-matrix.ts tests/agent/testing/run-matrix.test.ts`.
3. Réécrire `<dossier_tmp>/agent-core-issue8-commit-msg.txt` (outil Read, puis Write) :
   ```
   feat(testing): mesurer durée, jetons et coût de chaque run

   Chaque run reçoit un MetricsCollector neuf, posé par
   withMetrics(deps.llm, collector, now) ; durationMs est lu sur la
   même horloge (options.now, sinon Date.now) autour du run. tokensUsed
   et costUsd viennent du total du collecteur, null dès qu'un usage ou
   un tarif manque, jamais de AgentResult.tokensUsed (décision du
   pilote : ce compteur de budget vaut 0 sans usage et n'existe pas
   pour un run qui lève).

   Refs: #8
   Session: <id>
   Model: <modèle>
   Authorship: ai
   ```
4. `git commit -F <dossier_tmp>/agent-core-issue8-commit-msg.txt` → sortie attendue :
   `[feat/8-run-matrix <sha>] feat(testing): mesurer durée, jetons et coût de chaque run`,
   `3 files changed`.

---

## Tâche 4 · SPEC-4 · trace de chaque run

### 4.1 Écrire TEST-4

Dans `tests/agent/testing/run-matrix.test.ts` (outil Edit), remplacer :

```ts
  assert.equal(run.durationMs, 300);
  assert.equal(dateNow.mock.callCount(), 4);
});
```

par :

```ts
  assert.equal(run.durationMs, 300);
  assert.equal(dateNow.mock.callCount(), 4);
});

test("runMatrix keeps each run's trace: the very responses, the dispatched calls, the final state", async () => {
  const created: FakeApp[] = [];
  const env = () => { const made = app(); created.push(made); return made; };
  const [r1, r2] = [navigate(), text("tu y es")];
  const { trace } = (await matrix({ scenarios: [scenario("aller aux reglages", "reglages", env)], deps: script(r1, r2) })).runs[0];

  assert.equal(trace.responses.length, 2);
  [r1, r2].forEach((response, i) => assert.equal(trace.responses[i], response));
  assert.deepEqual(trace.toolCalls, r1.toolCalls);
  assert.equal(trace.finalState, created[0].state);
  assert.deepEqual([trace.finalState?.current, trace.stopReason, trace.content], ["reglages", "completed", "tu y es"]);
});

test("a landing's calls are in the trace's responses, not in its dispatched toolCalls", async () => {
  const fake = () => new FakeLLMProvider({ responses: [navigate(), call("getCurrentPage", {})] });
  const { trace } = (await matrix({ deps: () => wiring(fake(), { budget: { maxIterations: 1 } }) })).runs[0];

  assert.equal(trace.stopReason, "budget");
  assert.equal(trace.responses.length, 2);
  assert.deepEqual(trace.toolCalls.map((c) => c.name), ["navigate"]);
});
```

`assert.equal` est strict (`node:assert/strict`) : `trace.responses[i] === r1/r2` et
`trace.finalState === created[0].state` sont des égalités de référence. Second cas :
`maxIterations: 1` → la première itération dispatche `navigate`, la seconde est un atterrissage dont
la réponse nomme `getCurrentPage` sans dispatch (`step.ts:217`).

### 4.2 Constater le rouge

1. `npm run build` → code 0.
2. `node --test tests/agent/testing/run-matrix.test.ts` → sortie attendue : code 1, `ok 1` à `ok 5`,
   `not ok 6 - runMatrix keeps each run's trace: …` (`TypeError`, `Cannot read properties of undefined (reading 'responses')`),
   `not ok 7 - a landing's calls are in the trace's responses, …` (`TypeError`,
   `Cannot read properties of undefined (reading 'stopReason')`) ; `# tests 7`, `# pass 5`,
   `# fail 2`. Bonne raison : `trace` n'existe pas encore.

### 4.3 Écrire SPEC-4

Remplacer tout le contenu de `src/agent/testing/run-matrix.ts` (outil Read, puis Write) par :

```ts
import type { LLMProvider } from "../../llm/interfaces/index.js";
import type { LLMResponse, ToolCall } from "../../llm/models/index.js";
import { MetricsCollector, withMetrics } from "../../metrics/index.js";
import type { RateTable } from "../../metrics/index.js";
import type { AgentDeps, StopReason } from "../application/dtos/index.js";
import type { Scenario, ScenarioEnv } from "./define-scenario.js";
import { runScenario } from "./run-scenario.js";

/** One value per axis. Not exported: a consumer names it `MatrixRun<S, A>["combination"]`. */
type Combination<TAxes extends Record<string, readonly unknown[]>> = {
  readonly [K in keyof TAxes]: TAxes[K][number];
};

export type MatrixOptions<TState, TAxes extends Record<string, readonly unknown[]>> = {
  readonly scenarios: readonly Scenario<TState>[];
  readonly axes: TAxes;
  /** Runs per (scenario, combination) pair: an integer, at least 1. */
  readonly runs: number;
  /** Called once per run, so each run gets a fresh provider if this builds one. */
  readonly deps: (combination: Combination<TAxes>) => Omit<AgentDeps, "tools">;
  /** Prices `costUsd`; without it every cost is null (ADR-AGENT-0007). */
  readonly rates?: RateTable;
  /** The clock of `durationMs` and of every call's record. Defaults to `Date.now`. */
  readonly now?: () => number;
};

/** What one run left behind, whether it passed, failed or threw (ADR-AGENT-0006 rule 3). */
export type MatrixTrace<TState> = {
  readonly toolCalls: readonly ToolCall[];
  /** Null, like `stopReason` and `content`, when the run threw before it could be read. */
  readonly finalState: TState | null;
  readonly stopReason: StopReason | null;
  readonly content: string | null;
  /** Every response the provider resolved, in order, the landing one included: the same objects. */
  readonly responses: readonly LLMResponse[];
};

export type MatrixRun<TState, TAxes extends Record<string, readonly unknown[]>> = {
  readonly scenario: string;
  /** The very object `deps` received. */
  readonly combination: Combination<TAxes>;
  /** 1 to `runs`, per (scenario, combination) pair. */
  readonly run: number;
  readonly passed: boolean;
  readonly failures: readonly string[];
  readonly durationMs: number;
  /** Null as soon as one call reported no usage: absent is not zero (ADR-AGENT-0007). */
  readonly tokensUsed: number | null;
  readonly costUsd: number | null;
  readonly trace: MatrixTrace<TState>;
};

export type MatrixReport<TState, TAxes extends Record<string, readonly unknown[]>> = {
  readonly runs: readonly MatrixRun<TState, TAxes>[];
};

/**
 * Run every scenario on every combination of `axes` (their Cartesian product, the last axis
 * varying fastest), `runs` times each, one after the other, and report every run in that order
 * (ADR-AGENT-0006). Sequential: a local provider serves one call at a time, and a fixed order
 * keeps a report against fakes reproducible. Options that would yield an empty report, which
 * reads as "nothing failed", are refused before any run.
 *
 * Each run is measured by its own `MetricsCollector`, fed by `withMetrics` on `now`.
 * `tokensUsed` comes from that collector, never from `AgentResult.tokensUsed` (pilot's
 * decision): that one is the budget counter, 0 when the provider reports no usage, against
 * ADR-AGENT-0007's "absent is not zero", and it does not exist for a run that throws, while the
 * collector keeps the calls resolved before the error.
 *
 * `step.ts` and `runScenario` stay untouched: responses are recorded by wrapping the provider,
 * the final state by wrapping `env`.
 *
 * Design: docs/specs/2026-09-30-run-matrix-design.md (#8).
 */
export async function runMatrix<TState, TAxes extends Record<string, readonly unknown[]>>(
  options: MatrixOptions<TState, TAxes>,
): Promise<MatrixReport<TState, TAxes>> {
  if (!Number.isInteger(options.runs) || options.runs < 1) {
    throw new RangeError(`runMatrix: runs must be an integer >= 1, got ${options.runs}`);
  }
  if (options.scenarios.length === 0) throw new RangeError("runMatrix: scenarios must not be empty");
  for (const name of Object.keys(options.axes)) {
    if (options.axes[name].length === 0) throw new RangeError(`runMatrix: axis '${name}' has no value`);
  }
  const now = options.now ?? Date.now;

  const runOne = async (scenario: Scenario<TState>, combination: Combination<TAxes>, run: number) => {
    const collector = new MetricsCollector();
    const responses: LLMResponse[] = [];
    let captured: ScenarioEnv<TState> | undefined;
    const startedAt = now();
    const wiring = options.deps(combination);
    const llm = recordResponses(withMetrics(wiring.llm, collector, now), responses);
    const env = () => { captured = scenario.env(); return captured; };
    const result = await runScenario({ ...scenario, env }, { ...wiring, llm });
    const { toolCalls, finalState, stopReason, content, passed, failures } = result;
    const trace = { toolCalls, finalState, stopReason, content, responses };
    const outcome = { scenario: result.scenario, passed, failures, trace };
    const durationMs = now() - startedAt;
    const { tokensIn, tokensOut, costUsd } = collector.total(options.rates);
    const tokensUsed = tokensIn === null || tokensOut === null ? null : tokensIn + tokensOut;
    return { ...outcome, combination, run, durationMs, tokensUsed, costUsd };
  };

  const runs: MatrixRun<TState, TAxes>[] = [];
  const combinations = combinationsOf(options.axes);
  for (const scenario of options.scenarios) {
    for (const combination of combinations) {
      for (let run = 1; run <= options.runs; run++) {
        runs.push(await runOne(scenario, combination, run));
      }
    }
  }
  return { runs };
}

function combinationsOf<TAxes extends Record<string, readonly unknown[]>>(
  axes: TAxes,
): Combination<TAxes>[] {
  let combinations: Record<string, unknown>[] = [{}];
  for (const name of Object.keys(axes)) {
    combinations = combinations.flatMap((c) => axes[name].map((value) => ({ ...c, [name]: value })));
  }
  return combinations as Combination<TAxes>[];
}

/** Pushes every response `provider` resolves to `sink`, the same object. Never streams, like `withMetrics`. */
function recordResponses(provider: LLMProvider, sink: LLMResponse[]): LLMProvider {
  return {
    id: provider.id,
    supportsStreaming: () => false,
    models: () => provider.models(),
    complete: async (messages, opts) => {
      const response = await provider.complete(messages, opts);
      sink.push(response);
      return response;
    },
  };
}
```

`recordResponses` rend un objet littéral à quatre clés, sans clé `stream` ; un `complete` qui
rejette ne pousse rien et propage la même erreur (aucun `try`). `captured` n'est relu qu'à la
tâche 5 (chemin d'erreur) ; sur le chemin nominal, `result.finalState` est déjà `captured.state`.

### 4.4 Constater le vert

1. `npm run build` → code 0.
2. `node --test tests/agent/testing/run-matrix.test.ts` → sortie attendue : code 0, `ok 1` à `ok 7`,
   `# tests 7`, `# pass 7`, `# fail 0`.
3. `npm run typecheck` → `> tsc --noEmit`, code 0.
4. `git diff --stat -- src/agent/application/use-cases/step.ts src/agent/testing/run-scenario.ts`
   → sortie attendue : vide.

### 4.5 Commit

1. Cocher `[SPEC-4]` et `[TEST-4]` dans la checklist.
2. `git add docs/specs/2026-09-30-run-matrix-checklist.md src/agent/testing/run-matrix.ts tests/agent/testing/run-matrix.test.ts`.
3. Réécrire `<dossier_tmp>/agent-core-issue8-commit-msg.txt` (outil Read, puis Write) :
   ```
   feat(testing): garder la trace de chaque run

   MatrixRun.trace porte toolCalls, finalState, stopReason, content et
   responses. Les réponses résolues sont enregistrées (mêmes
   références) par recordResponses, enregistreur privé posé autour du
   fournisseur mesuré, sans stream ; l'environnement est capturé en
   enveloppant scenario.env. step.ts et runScenario sont inchangés.

   Refs: #8
   Session: <id>
   Model: <modèle>
   Authorship: ai
   ```
4. `git commit -F <dossier_tmp>/agent-core-issue8-commit-msg.txt` → sortie attendue :
   `[feat/8-run-matrix <sha>] feat(testing): garder la trace de chaque run`, `3 files changed`.

---

## Tâche 5 · SPEC-5 · une exception de run devient un échec, la matrice continue

### 5.1 Écrire TEST-5

Dans `tests/agent/testing/run-matrix.test.ts` (outil Edit), deux remplacements.

a. Remplacer :

```ts
import { HeuristicTokenCounter, SlidingWindowStrategy } from "../../../dist/context/index.js";
```

par :

```ts
import { HeuristicTokenCounter, SlidingWindowStrategy } from "../../../dist/context/index.js";
import { LLMError } from "../../../dist/llm/index.js";
```

b. Remplacer :

```ts
  assert.equal(trace.stopReason, "budget");
  assert.equal(trace.responses.length, 2);
  assert.deepEqual(trace.toolCalls.map((c) => c.name), ["navigate"]);
});
```

par :

```ts
  assert.equal(trace.stopReason, "budget");
  assert.equal(trace.responses.length, 2);
  assert.deepEqual(trace.toolCalls.map((c) => c.name), ["navigate"]);
});

test("a provider that rejects mid-run fails that run with a partial trace, and the matrix goes on", async () => {
  const r1 = navigate(USAGE);
  let completions = 0;
  const failing: LLMProvider = {
    id: "literal",
    supportsStreaming: () => false,
    models: () => [{ id: "m-a", supportsTools: true }],
    complete: async () => {
      if (++completions === 1) return r1;
      throw new LLMError("API_ERROR", "provider down");
    },
  };
  let wirings = 0;
  let t = 0;
  const deps = () => (++wirings === 1 ? wiring(failing) : script(navigate(), text("tu y es"))());
  const [first, second] = (await matrix({ runs: 2, deps, rates: { "m-a": RATE }, now: () => (t += 10) })).runs;

  const { trace, ...measured } = first;
  assert.deepEqual(measured, {
    scenario: "aller aux reglages", combination: {}, run: 1, passed: false, failures: [],
    error: "provider down", durationMs: 40, tokensUsed: 750_000, costUsd: 3,
  });
  const finalState = { pages: PAGES, current: "reglages" };
  assert.deepEqual(trace, { toolCalls: r1.toolCalls, finalState, stopReason: null, content: null, responses: [r1] });
  assert.equal(trace.responses[0], r1);
  assert.deepEqual([second.passed, second.error], [true, null]);
});

test("a deps or an env that throws becomes that run's error, with what was recorded before", async () => {
  let envCalls = 0;
  const counted = [scenario("aller aux reglages", "reglages", () => { envCalls++; return app(); })];
  const [lost] = (await matrix({ scenarios: counted, deps: () => { throw "no wiring"; } })).runs;
  const { finalState, responses, toolCalls } = lost.trace;
  assert.deepEqual(
    [lost.error, finalState, responses, toolCalls, lost.tokensUsed, lost.costUsd, envCalls],
    ["no wiring", null, [], [], 0, null, 0],
  );

  const provider = new FakeLLMProvider({ responses: [text("tu y es")] });
  const broken = [scenario("aller aux reglages", "reglages", () => { throw new Error("env broke"); })];
  const [run] = (await matrix({ scenarios: broken, deps: () => wiring(provider) })).runs;
  assert.deepEqual([run.error, run.trace.finalState, run.trace.responses, provider.calls.length], ["env broke", null, [], 0]);
});
```

Arithmétique fixée (run 1, horloge `+10` par lecture) : début du run 10, premier `complete` 20 et
30 (résolu, enregistré), second `complete` 40 (rejeté : `withMetrics` ne relit pas l'horloge), fin
du run 50 → `durationMs` 40 ; un enregistrement de 500 000 + 250 000 jetons au modèle `m-a` (premier
modèle déclaré par le fournisseur littéral, la boucle n'en nomme aucun) → `tokensUsed` 750 000,
`costUsd` 3. Le fournisseur littéral est écrit dans le fichier de test : aucun fournisseur hébergé.
`deps` qui lève `"no wiring"` (une chaîne) : `messageOf` rend `String(err)` ; aucun appel enregistré
→ `tokensUsed` 0, `costUsd` `null` sans `rates` (règle d'`aggregate`).

### 5.2 Constater le rouge

1. `npm run build` → code 0.
2. `node --test tests/agent/testing/run-matrix.test.ts` → sortie attendue : code 1, `ok 1` à `ok 7`,
   `not ok 8 - a provider that rejects mid-run fails that run with a partial trace, and the matrix goes on`
   (`error: 'provider down'`, `code: 'API_ERROR'`, `name: 'LLMError'`, levée par `runMatrix`),
   `not ok 9 - a deps or an env that throws becomes that run's error, with what was recorded before`
   (`error: 'no wiring'`) ; `# tests 9`, `# pass 7`, `# fail 2`. Bonne raison : l'exception d'un run
   fait encore rejeter `runMatrix`.

### 5.3 Écrire SPEC-5

Remplacer tout le contenu de `src/agent/testing/run-matrix.ts` (outil Read, puis Write) par :

```ts
import type { LLMProvider } from "../../llm/interfaces/index.js";
import type { LLMResponse, ToolCall } from "../../llm/models/index.js";
import { MetricsCollector, withMetrics } from "../../metrics/index.js";
import type { RateTable } from "../../metrics/index.js";
import type { AgentDeps, StopReason } from "../application/dtos/index.js";
import type { Scenario, ScenarioEnv } from "./define-scenario.js";
import { runScenario } from "./run-scenario.js";

/** One value per axis. Not exported: a consumer names it `MatrixRun<S, A>["combination"]`. */
type Combination<TAxes extends Record<string, readonly unknown[]>> = {
  readonly [K in keyof TAxes]: TAxes[K][number];
};

export type MatrixOptions<TState, TAxes extends Record<string, readonly unknown[]>> = {
  readonly scenarios: readonly Scenario<TState>[];
  readonly axes: TAxes;
  /** Runs per (scenario, combination) pair: an integer, at least 1. */
  readonly runs: number;
  /** Called once per run, so each run gets a fresh provider if this builds one. */
  readonly deps: (combination: Combination<TAxes>) => Omit<AgentDeps, "tools">;
  /** Prices `costUsd`; without it every cost is null (ADR-AGENT-0007). */
  readonly rates?: RateTable;
  /** The clock of `durationMs` and of every call's record. Defaults to `Date.now`. */
  readonly now?: () => number;
};

/** What one run left behind, whether it passed, failed or threw (ADR-AGENT-0006 rule 3). */
export type MatrixTrace<TState> = {
  readonly toolCalls: readonly ToolCall[];
  /** Null, like `stopReason` and `content`, when the run threw before it could be read. */
  readonly finalState: TState | null;
  readonly stopReason: StopReason | null;
  readonly content: string | null;
  /** Every response the provider resolved, in order, the landing one included: the same objects. */
  readonly responses: readonly LLMResponse[];
};

export type MatrixRun<TState, TAxes extends Record<string, readonly unknown[]>> = {
  readonly scenario: string;
  /** The very object `deps` received. */
  readonly combination: Combination<TAxes>;
  /** 1 to `runs`, per (scenario, combination) pair. */
  readonly run: number;
  readonly passed: boolean;
  readonly failures: readonly string[];
  /** The message of what the run threw, null when it threw nothing. */
  readonly error: string | null;
  readonly durationMs: number;
  /** Null as soon as one call reported no usage: absent is not zero (ADR-AGENT-0007). */
  readonly tokensUsed: number | null;
  readonly costUsd: number | null;
  readonly trace: MatrixTrace<TState>;
};

export type MatrixReport<TState, TAxes extends Record<string, readonly unknown[]>> = {
  readonly runs: readonly MatrixRun<TState, TAxes>[];
};

/**
 * Run every scenario on every combination of `axes` (their Cartesian product, the last axis
 * varying fastest), `runs` times each, one after the other, and report every run in that order
 * (ADR-AGENT-0006). Sequential: a local provider serves one call at a time, and a fixed order
 * keeps a report against fakes reproducible. Options that would yield an empty report, which
 * reads as "nothing failed", are refused before any run.
 *
 * Each run is measured by its own `MetricsCollector`, fed by `withMetrics` on `now`.
 * `tokensUsed` comes from that collector, never from `AgentResult.tokensUsed` (pilot's
 * decision): that one is the budget counter, 0 when the provider reports no usage, against
 * ADR-AGENT-0007's "absent is not zero", and it does not exist for a run that throws, while the
 * collector keeps the calls resolved before the error.
 *
 * A run that throws (`deps`, `env`, the provider, a predicate) fails with its `error` and a
 * partial trace, and the matrix goes on. `step.ts` and `runScenario` stay untouched: responses
 * are recorded by wrapping the provider, the final state by wrapping `env`.
 *
 * Design: docs/specs/2026-09-30-run-matrix-design.md (#8).
 */
export async function runMatrix<TState, TAxes extends Record<string, readonly unknown[]>>(
  options: MatrixOptions<TState, TAxes>,
): Promise<MatrixReport<TState, TAxes>> {
  if (!Number.isInteger(options.runs) || options.runs < 1) {
    throw new RangeError(`runMatrix: runs must be an integer >= 1, got ${options.runs}`);
  }
  if (options.scenarios.length === 0) throw new RangeError("runMatrix: scenarios must not be empty");
  for (const name of Object.keys(options.axes)) {
    if (options.axes[name].length === 0) throw new RangeError(`runMatrix: axis '${name}' has no value`);
  }
  const now = options.now ?? Date.now;

  const runOne = async (scenario: Scenario<TState>, combination: Combination<TAxes>, run: number) => {
    const collector = new MetricsCollector();
    const responses: LLMResponse[] = [];
    let captured: ScenarioEnv<TState> | undefined;
    let outcome: Pick<MatrixRun<TState, TAxes>, "scenario" | "passed" | "failures" | "error" | "trace">;
    const startedAt = now();
    try {
      const wiring = options.deps(combination);
      const llm = recordResponses(withMetrics(wiring.llm, collector, now), responses);
      const env = () => { captured = scenario.env(); return captured; };
      const result = await runScenario({ ...scenario, env }, { ...wiring, llm });
      const { toolCalls, finalState, stopReason, content, passed, failures } = result;
      const trace = { toolCalls, finalState, stopReason, content, responses };
      outcome = { scenario: result.scenario, passed, failures, error: null, trace };
    } catch (err) {
      const toolCalls = responses.flatMap((response) => response.toolCalls);
      const finalState = captured === undefined ? null : captured.state;
      const trace = { toolCalls, finalState, stopReason: null, content: null, responses };
      outcome = { scenario: scenario.name, passed: false, failures: [], error: messageOf(err), trace };
    }
    const durationMs = now() - startedAt;
    const { tokensIn, tokensOut, costUsd } = collector.total(options.rates);
    const tokensUsed = tokensIn === null || tokensOut === null ? null : tokensIn + tokensOut;
    return { ...outcome, combination, run, durationMs, tokensUsed, costUsd };
  };

  const runs: MatrixRun<TState, TAxes>[] = [];
  const combinations = combinationsOf(options.axes);
  for (const scenario of options.scenarios) {
    for (const combination of combinations) {
      for (let run = 1; run <= options.runs; run++) {
        runs.push(await runOne(scenario, combination, run));
      }
    }
  }
  return { runs };
}

function combinationsOf<TAxes extends Record<string, readonly unknown[]>>(
  axes: TAxes,
): Combination<TAxes>[] {
  let combinations: Record<string, unknown>[] = [{}];
  for (const name of Object.keys(axes)) {
    combinations = combinations.flatMap((c) => axes[name].map((value) => ({ ...c, [name]: value })));
  }
  return combinations as Combination<TAxes>[];
}

/** Pushes every response `provider` resolves to `sink`, the same object. Never streams, like `withMetrics`. */
function recordResponses(provider: LLMProvider, sink: LLMResponse[]): LLMProvider {
  return {
    id: provider.id,
    supportsStreaming: () => false,
    models: () => provider.models(),
    complete: async (messages, opts) => {
      const response = await provider.complete(messages, opts);
      sink.push(response);
      return response;
    },
  };
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
```

La lecture `startedAt` précède le `try`, la lecture de fin et le calcul des mesures le suivent :
même code sur les deux chemins. Une horloge qui lève à ces deux lectures fait rejeter `runMatrix`
(hors `try`, décision de la spécification, non testée).

### 5.4 Constater le vert

1. `npm run build` → code 0.
2. `node --test tests/agent/testing/run-matrix.test.ts` → sortie attendue : code 0, `ok 1` à `ok 9`,
   `# tests 9`, `# pass 9`, `# fail 0`.
3. `npm run typecheck` → `> tsc --noEmit`, code 0.

### 5.5 Commit

1. Cocher `[SPEC-5]` et `[TEST-5]` dans la checklist.
2. `git add docs/specs/2026-09-30-run-matrix-checklist.md src/agent/testing/run-matrix.ts tests/agent/testing/run-matrix.test.ts`.
3. Réécrire `<dossier_tmp>/agent-core-issue8-commit-msg.txt` (outil Read, puis Write) :
   ```
   feat(testing): faire d'une exception de run un échec sans arrêter la matrice

   deps, la décoration du fournisseur et runScenario passent dans un
   try : une exception rend un run passed false, failures [], error =
   message, trace partielle (réponses reçues, état capturé ou null) et
   les mesures des appels enregistrés avant l'erreur ; le run suivant
   s'exécute. error vaut null sur un run sans exception.

   Refs: #8
   Session: <id>
   Model: <modèle>
   Authorship: ai
   ```
4. `git commit -F <dossier_tmp>/agent-core-issue8-commit-msg.txt` → sortie attendue :
   `[feat/8-run-matrix <sha>] feat(testing): faire d'une exception de run un échec sans arrêter la matrice`,
   `3 files changed`.

---

## Tâche 6 · SPEC-6 · export depuis `./testing`

### 6.1 Écrire TEST-6

Dans `tests/barrel-contract.test.ts` (outil Edit), quatre remplacements.

a. Remplacer :

```ts
} from "@arthurolivierfortin/agent-core";
```

par :

```ts
} from "@arthurolivierfortin/agent-core";
import type { FakeAppState, MatrixOptions, MatrixReport, MatrixRun, MatrixTrace } from "@arthurolivierfortin/agent-core/testing";
```

b. Remplacer :

```ts
  assert.equal(typeof testing.runScenario, "function");
});
```

par :

```ts
  assert.equal(typeof testing.runScenario, "function");
  assert.equal(typeof testing.runMatrix, "function");
});
```

c. Remplacer :

```ts
    assert.equal(surface.runScenario, undefined);
```

par :

```ts
    assert.equal(surface.runScenario, undefined);
    assert.equal(surface.runMatrix, undefined);
```

d. Remplacer :

```ts
  assert.equal(collector.records().length, 1);
});
```

par :

```ts
  assert.equal(collector.records().length, 1);
});

// Same reasoning as the type tests above: the matrix's types annotate what `testing.runMatrix`
// itself consumed or produced, and the gate that enforces it is `npm run typecheck`.
test("`./testing` exposes runMatrix and the types of its options and report", async () => {
  const env = () => testing.fakeApp({ pages: ["accueil"], current: "accueil" });
  const options: MatrixOptions<FakeAppState, { model: string[] }> = {
    scenarios: [testing.defineScenario({ name: "rester a l'accueil", env, input: "bonjour", expect: {} })],
    axes: { model: [testing.FakeLLMProvider.MODEL_ID] },
    runs: 1,
    deps: (combination) => ({
      agent: root.defineAgent({ name: "navigateur", prompt: "Tu aides.", tools: [] }),
      llm: new testing.FakeLLMProvider({ responses: [{ content: "bonjour", toolCalls: [] }] }),
      context: new root.SlidingWindowStrategy({ maxTokens: 1_000, counter: new root.HeuristicTokenCounter() }),
      model: combination.model,
    }),
  };

  const report: MatrixReport<FakeAppState, { model: string[] }> = await testing.runMatrix(options);
  const run: MatrixRun<FakeAppState, { model: string[] }> = report.runs[0];
  const trace: MatrixTrace<FakeAppState> = run.trace;

  assert.equal(run.passed, true);
  assert.equal(trace.stopReason, "completed");
});
```

Chacun des quatre blocs à remplacer est présent une seule fois dans le fichier (vérifié sur `HEAD`).
`tests/agent/testing/run-matrix.test.ts` n'est pas modifié : il importe toujours depuis
`dist/agent/testing/run-matrix.js`.

### 6.2 Constater le rouge

1. `npm run build` → code 0.
2. `node --test tests/barrel-contract.test.ts` → sortie attendue : code 1,
   `not ok 5 - \`./testing\` exposes the scenario harness` (`expected: 'function'`,
   `actual: 'undefined'`),
   `not ok 19 - \`./testing\` exposes runMatrix and the types of its options and report`
   (`TypeError`, `testing.runMatrix is not a function`) ; `# tests 19`, `# pass 17`, `# fail 2`.
   Bonne raison : `./testing` ne sert pas encore `runMatrix`.

### 6.3 Écrire SPEC-6

Dans `src/agent/testing/index.ts` (outil Edit), remplacer :

```ts
export * from "./run-scenario.js";
```

par :

```ts
export * from "./run-scenario.js";
export * from "./run-matrix.js";
```

`src/testing/index.ts` le sert déjà via `export * from "../agent/testing/index.js"` ; `src/index.ts`,
`src/llm/index.ts`, `src/agent/index.ts` et `src/testing/index.ts` ne changent pas. `run-matrix.ts`
n'exporte que `MatrixOptions`, `MatrixTrace`, `MatrixRun`, `MatrixReport` et `runMatrix` (il
importe `withMetrics` et `MetricsCollector` sans les réexporter : le verrou existant
« neither `./llm` nor `./testing` carries it » reste vert).

### 6.4 Constater le vert

1. `npm run build` → code 0.
2. `node --test tests/barrel-contract.test.ts` → sortie attendue : code 0, `ok 1` à `ok 19`,
   `# tests 19`, `# pass 19`, `# fail 0`.
3. `npm run typecheck` → `> tsc --noEmit`, code 0 (les annotations `MatrixOptions`, `MatrixReport`,
   `MatrixRun`, `MatrixTrace` importées de `@arthurolivierfortin/agent-core/testing` sont résolues).

### 6.5 Commit

1. Cocher `[SPEC-6]` et `[TEST-6]` dans la checklist.
2. `git add docs/specs/2026-09-30-run-matrix-checklist.md src/agent/testing/index.ts tests/barrel-contract.test.ts`.
3. Réécrire `<dossier_tmp>/agent-core-issue8-commit-msg.txt` (outil Read, puis Write) :
   ```
   feat(testing): exporter runMatrix depuis ./testing

   src/agent/testing/index.ts réexporte run-matrix.js : runMatrix et
   les types MatrixOptions, MatrixRun, MatrixTrace, MatrixReport sont
   servis par ./testing, absents de . et de ./llm. Verrou valeur et
   types dans tests/barrel-contract.test.ts.

   Refs: #8
   Session: <id>
   Model: <modèle>
   Authorship: ai
   ```
4. `git commit -F <dossier_tmp>/agent-core-issue8-commit-msg.txt` → sortie attendue :
   `[feat/8-run-matrix <sha>] feat(testing): exporter runMatrix depuis ./testing`, `3 files changed`.

---

## Tâche 7 · gates, contrôles, taille et corps de PR

Chaque gate par son propre appel, `timeout` 600000, dans cet ordre (le typecheck lit les `.d.ts`
de `dist/` produits par le build, et `tests/` importe `dist/`) :

| Gate | Commande | Sortie attendue |
|---|---|---|
| GATE-1 build | `npm run build` | `> tsc -p tsconfig.build.json`, code 0, aucune erreur |
| GATE-2 typecheck | `npm run typecheck` | `> tsc --noEmit`, code 0, aucune erreur |
| GATE-3 test | `npm run test` | fin TAP : `# tests 178`, `# pass 177`, `# fail 0`, `# skipped 1` (168 + 10 cas : 1 à la tâche 1, 1 à la tâche 2, 3 à la tâche 3, 2 à la tâche 4, 2 à la tâche 5, 1 à la tâche 6) |

Puis, dans `docs/specs/2026-09-30-run-matrix-checklist.md` : cocher `[GATE-1]`, `[GATE-2]`,
`[GATE-3]`, et inscrire sous `## Hypothèses` les lignes H1 à H14 de la section « Hypothèses » de ce
plan, une par ligne, préfixées `- [H]`. `git add docs/specs/2026-09-30-run-matrix-checklist.md`,
message (outil Read puis Write sur `<dossier_tmp>/agent-core-issue8-commit-msg.txt`) :

```
chore(checklist): cocher les gates et consigner les hypothèses

Refs: #8
Session: <id>
Model: <modèle>
Authorship: ai
```

`git commit -F <dossier_tmp>/agent-core-issue8-commit-msg.txt` → sortie attendue : `1 file changed`.

Contrôles, chaque commande par son propre appel, résultats à recopier dans le corps de PR
(`<dossier_tmp>/agent-core-issue8-pr-body.md`) :

1. `git fetch origin` → sortie attendue : vide ou une ligne de mise à jour.
2. `git log --oneline HEAD..origin/main` → sortie attendue : vide (sinon : `main` a bougé, le
   signaler au pilote avant la PR, sans rebase ni merge décidé seul).
3. `git diff --name-only origin/main...HEAD` → sortie attendue, exactement ces 8 chemins :
   ```
   docs/plans/2026-09-30-run-matrix-estimate.json
   docs/plans/2026-09-30-run-matrix-plan.md
   docs/specs/2026-09-30-run-matrix-checklist.md
   docs/specs/2026-09-30-run-matrix-design.md
   src/agent/testing/index.ts
   src/agent/testing/run-matrix.ts
   tests/agent/testing/run-matrix.test.ts
   tests/barrel-contract.test.ts
   ```
4. `git diff --stat origin/main...HEAD -- src/agent/application/use-cases/step.ts src/agent/testing/run-scenario.ts src/index.ts src/llm/index.ts src/agent/index.ts src/testing/index.ts ROADMAP.md`
   → sortie attendue : vide.
5. `git grep -n "console.log" -- src/agent/testing tests/agent/testing tests/barrel-contract.test.ts`
   → sortie attendue : vide, code 1.
6. `git grep -n -E "process\.env|dotenv|['\"]\.env" -- src/agent/testing/run-matrix.ts tests/agent/testing/run-matrix.test.ts`
   → sortie attendue : vide, code 1 (le motif évite `scenario.env()`, qui n'est pas une lecture de
   fichier `.env`).
7. `git grep -n -E "stream:|stream\(" -- src/agent/testing/run-matrix.ts` → sortie attendue : vide,
   code 1 (aucune clé `stream` dans l'enregistreur).
8. `git grep -n -E "^export " -- src/agent/testing/run-matrix.ts` → sortie attendue, exactement cinq
   lignes : `export type MatrixOptions`, `export type MatrixTrace`, `export type MatrixRun`,
   `export type MatrixReport`, `export async function runMatrix` (lignes 14, 28, 38, 55, 78).
9. `git log --format=%B origin/main..HEAD` puis vérifier à la lecture : aucune ligne
   `Co-Authored-By`, sept blocs de trailers `Refs: #8` / `Session:` / `Model:` / `Authorship: ai`.
10. `python C:/Projects/dev-kit/scripts/pr_size.py origin/main HEAD --body-file <dossier_tmp>/agent-core-issue8-pr-body.md`
    (après écriture du corps) → sortie attendue :
    `hors docs/ et *.md : +397/-0 lignes (code +155, tests +242), seuil 400 respecté`, code 0.
    Détail mesuré par la sonde : `src/agent/testing/run-matrix.ts` +154,
    `src/agent/testing/index.ts` +1, `tests/agent/testing/run-matrix.test.ts` +215,
    `tests/barrel-contract.test.ts` +27. Recopier la ligne mesurée dans le corps de PR. Si la mesure
    dépasse 400 (code différent du plan), ne pas couper de test : s'arrêter et le signaler au pilote.

Corps de PR (outil Write sur `<dossier_tmp>/agent-core-issue8-pr-body.md`, gabarit des PR du dépôt :
Contexte, Changements, Vérifications, Métriques, Risques et suivi, Message de squash proposé). Il
porte obligatoirement :

- `Closes #8` dans « Contexte », et le rappel : lot 2 du découpage (#11 `withMetrics` fusionné ;
  #12 = `MatrixReport.summary` et `report.toJSON()`, la partie « rapport JSON » du titre de #8).
- Les trois gates avec leur dernière ligne de sortie, et la référence (168 tests sur 300921e, 10
  ajoutés).
- Les contrôles 2 à 10 ci-dessus avec leur résultat.
- Le rouge de chaque test avant son SPEC (sorties des étapes 1.2, 2.2, 3.2, 4.2, 5.2, 6.2).
- La décision du pilote sur `tokensUsed` (collecteur du run, jamais `AgentResult.tokensUsed`) en une
  phrase avec sa raison, et les écarts au corps de l'issue (`runIndex` → `run`, pas d'`iterations`,
  `error: string | null` toujours présent).
- **Toutes** les hypothèses H1 à H14 de ce plan, chacune nommée et recopiée en entier (aucune
  omise ni résumée en « autres hypothèses »).
- Aucun fichier `.env` ouvert ni lu ; aucun fournisseur hébergé appelé (seuls `FakeLLMProvider` et
  le fournisseur littéral de TEST-5) ; dérogations invoquées : aucune.
- Le message de squash proposé, sans ligne `Co-Authored-By`, trailers `Refs: #8` / `Session` /
  `Model` / `Authorship: ai`.

Relire le fichier (outil Read) dans l'appel qui précède immédiatement toute commande qui le publie.

---

## Hypothèses (à recopier toutes dans la checklist et dans la PR)

- **H1** · Les documents de l'issue (spécification, checklist, estimation, plan) entrent dans le
  commit de la tâche 1, même pratique que #11.
- **H2** · Portées de commit : `feat(testing)` pour SPEC-2, SPEC-1, SPEC-3, SPEC-4, SPEC-5, SPEC-6
  (sujets repris de la spécification), `chore(checklist)` pour le cochage des gates et
  l'inscription des hypothèses.
- **H3** · `runOne`, closure locale non exportée de `runMatrix`, porte un run (mesures, `try`,
  trace) ; elle s'ajoute aux fonctions non exportées nommées par la spécification
  (`combinationsOf`, `recordResponses`, `messageOf`). Aucun autre nom n'est exporté.
- **H4** · `recordResponses` type `complete(messages, opts)` par le contexte (type de retour
  `LLMProvider`) : `Message` et `CompletionOptions` ne sont pas importés (la spécification prévoit
  que le builder retire un type inutilisé).
- **H5** · Ordre des clés d'un `MatrixRun` construit par `{ ...outcome, combination, run, durationMs, tokensUsed, costUsd }` :
  `scenario`, `passed`, `failures`, `error`, `trace`, `combination`, `run`, `durationMs`,
  `tokensUsed`, `costUsd`, différent de l'ordre de déclaration du type. Aucun test n'en dépend ;
  #12 (`toJSON`) fixera l'ordre de sérialisation s'il en veut un.
- **H6** · TEST-1 valide le rejet par `assert.rejects(p, { name: "RangeError", message })` (nom et
  message exact), pas par `instanceof RangeError`.
- **H7** · Découpage des tests : TEST-2 en un cas (matrice de 16 runs, puis `axes: {}`), TEST-1 en
  un cas paramétré (cinq options), TEST-3 en trois (horloge injectée ; absents `null` et collecteur
  neuf ; horloge par défaut), TEST-4 en deux (trace nominale ; atterrissage), TEST-5 en deux
  (fournisseur qui rejette puis run suivant ; `deps` puis `env` qui lèvent), TEST-6 = deux cas
  étendus et un cas neuf. L'aide `matrix()` pose les valeurs par défaut (un scénario « aller aux
  reglages », `axes: {}`, `runs: 1`, script qui réussit), choisie pour la sobriété de taille.
- **H8** · Séquentialité (TEST-2) : `deps` enregistre `previous?.calls.length` à chaque appel et
  l'assertion est faite après `runMatrix`, pas dans `deps` (une assertion levée dans `deps` serait
  captée par le `try` de SPEC-5).
- **H9** · Horloge par défaut (TEST-3, consigne du pilote) : `Date.now` est remplacé par
  `t.mock.method(Date, "now", scriptedClock([100, 110, 150, 400]))` et la valeur `durationMs` 300
  et `callCount()` 4 sont vérifiées ; `deps` passe `now: () => 0` à la boucle pour que
  `initialState` ne lise pas `Date.now`.
- **H10** · Le commentaire de `MatrixTrace.finalState` (« Null … when the run threw ») entre avec
  SPEC-4, qui déclare le type nullable (checklist) ; le chemin qui produit `null` arrive avec SPEC-5.
- **H11** · Style compact retenu pour tenir sous 400 lignes : corps de bloc sur une ligne
  (`() => { calls.env++; return app(); }` dans les tests, `const env = () => { captured = scenario.env(); return captured; };`
  dans le code), `if` de garde sur une ligne pour `scenarios` et pour un axe vide, lignes de test
  jusqu'à environ 125 caractères (le dépôt n'a pas de formateur ; `barrel-contract.test.ts` a déjà
  des lignes de plus de 100 caractères).
- **H12** · Rédaction des commentaires de conception (anglais, le pourquoi), des noms de tests, des
  noms de scénarios (« aller aux reglages », « aller au profil », « rester a l'accueil »), des
  entrées et des prompts choisie par ce plan dans le cadre fixé par la spécification.
- **H13** · Les rouges et verts des tâches 1 à 6 se constatent fichier par fichier
  (`node --test <fichier>` après `npm run build`) ; la suite complète ne tourne qu'aux tâches 0 et 7.
- **H14** · La PR porte `Closes #8` : le découpage confie `summary` et `toJSON` (le « rapport JSON »
  du titre de #8) à #12. Si le pilote veut garder #8 ouverte jusqu'à #12, il remplace par `Refs: #8`.

## Risques

- **Marge de taille de 3 lignes** : 397 lignes mesurées pour un seuil de 400. Une demande de revue
  qui ajoute plus de 3 lignes hors `docs/` et `*.md` fait dépasser. La coupe la plus petite serait
  de déplacer SPEC-6 (export et verrou, +28 lignes) vers #12 ; ce n'est pas au builder d'en
  décider : il s'arrête et le signale au pilote.
- **En-tête de la checklist** : « runMatrix, scénarios sur le produit cartésien d'axes × N runs (lot
  2 de #8) » diffère du titre réel de l'issue (relu par `gh issue view 8`). Sans effet sur les
  identifiants ; `spec-writer` ou le pilote le corrige s'il le souhaite, le builder n'y touche pas.
- **`dist/` périmé** : les tests importent `dist/`, jamais `src/`. Lancer `node --test` sans
  `npm run build` juste avant fait constater l'état précédent.
- **Verrous de type** : le `// @ts-expect-error` de TEST-2, les annotations `string`/`number` de la
  combinaison et les annotations de TEST-6 ne sont vérifiés que par GATE-2 ; `node --test` retire
  les types sans les contrôler. GATE-2 doit passer après GATE-1.
- **Horloge par défaut** : le test compte les lectures de `Date.now` pendant tout le run ; il
  suppose qu'aucun autre composant du run (fake, `SlidingWindowStrategy`, `HeuristicTokenCounter`)
  ne lit `Date.now` (grep du 2026-09-30 : seuls `step.ts:282` et la valeur par défaut de
  `withMetrics` le font). Un futur composant qui lirait `Date.now` casserait `callCount() === 4`.
- **Limite acceptée du chemin d'erreur** (spécification) : `trace.toolCalls` y est reconstruit
  depuis les réponses reçues ; un prédicat `expect.finalState` qui lève après un atterrissage nommant
  des outils y ferait figurer des appels non dispatchés. Non testé, écrit dans la spécification.
- **Horloge qui lève à la lecture de début ou de fin** : fait rejeter `runMatrix` (hors `try`),
  décision de la spécification, non testée.
- **Fins de ligne** : copies de travail en CRLF ; les blocs « Remplacer » sont en LF. Si l'outil Edit
  ne trouve pas un bloc, relire le fichier (outil Read) et recopier le bloc depuis la lecture, sans
  changer le texte.
