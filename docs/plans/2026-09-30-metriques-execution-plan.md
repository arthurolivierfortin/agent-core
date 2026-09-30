# Plan · métriques par exécution (tokensUsed, agrégation, coût, MetricsCollector) · #2

- Issue : #2 (T:feature) https://github.com/arthurolivierfortin/agent-core/issues/2, partie A du
  découpage (#8 = `withMetrics` en tête puis `runMatrix` ; #9 = `toCSV`, rejeu, démonstration).
- Checklist : `docs/specs/2026-09-30-metriques-execution-checklist.md`
- Spécification : `docs/specs/2026-09-30-metriques-execution-design.md`
- Estimation : `docs/plans/2026-09-30-metriques-execution-estimate.json`
- Branche : `feat/2-metriques-execution`, base `main` (`publication_branch` du manifeste). Elle existe
  déjà : c'est la branche du worktree
  `C:/Projects/Perso/agent-core/.claude/worktrees/feat+2-harnais-matrice`, au niveau de `origin/main`
  74876fc (constaté le 2026-09-30 : `git log --oneline origin/main..HEAD` et
  `git log --oneline HEAD..origin/main` vides).
- Toutes les commandes se lancent depuis la racine de ce worktree, chacune par son propre appel Bash,
  en avant-plan, `timeout` 600000 ms pour une installation, un build, un test ou un gate, 120000 ms
  sinon. Jamais `&&`, jamais `&` final, jamais `run_in_background`.
- Fichiers de travail : `<dossier_tmp>/agent-core-issue2-commit-msg.txt` (message de commit, réécrit
  à chaque tâche, relu par l'outil Read avant réécriture) et `<dossier_tmp>/agent-core-issue2-pr-body.md`
  (corps de PR). Jamais `%TEMP%` ni `/tmp`.
- Les commentaires `<!-- probe ... -->` qui précèdent certains blocs de code sont lus par la sonde du
  researcher (voir « Vérifications faites ») ; le builder les ignore.

## Ordre des tâches et dépendances

| Tâche | Élément | Dépend de | Pourquoi cet ordre |
|---|---|---|---|
| 0 | préparation (dépendances, référence de la suite) | aucune | le worktree n'avait pas de `node_modules/` (constaté) |
| 1 | SPEC-1 + TEST-1 | 0 | seule modification du moteur, indépendante du framework `metrics` |
| 2 | SPEC-2 + TEST-2 | 0 | crée les types, `aggregate` et le barrel `src/metrics/index.ts` |
| 3 | SPEC-3 + TEST-3 | 2 | réécrit `aggregate` et son fichier de test |
| 4 | SPEC-4 + TEST-4 | 2 | le collecteur importe les types ; le barrel existe |
| 5 | SPEC-5 + TEST-5 | 3, 4 | `total` délègue à `aggregate` avec coût ; `costUsd === 5` exige SPEC-3 |
| 6 | SPEC-6 + TEST-6 | 3, 5 | le verrou appelle `collector.total(rates)` et `root.aggregate(records, rates)` |
| 7 | gates GATE-1 à GATE-3 et contrôles de PR | 1 à 6 | |

Aucun `[DB-N]`.

## Vérifications faites par le researcher (sorties fraîches du 2026-09-30)

- `node --version` : `v22.19.0`. `python C:/Projects/dev-kit/scripts/manifest.py --project . --json` :
  `publication_branch` `main`, gates `GATE-1 build` `npm run build`, `GATE-2 typecheck`
  `npm run typecheck`, `GATE-3 test` `npm run test`, `derogations` `[]`.
- Référence de la suite, `npm run test` sur 74876fc (le `tsc` du checkout parent est trouvé par npm
  en remontant les dossiers ; `dist/` du worktree a été produit par ce build, dossier ignoré par git) :
  `# tests 143`, `# pass 142`, `# fail 0`, `# skipped 1`. `npm run typecheck` : code 0.
- Aucun des noms `aggregate`, `Rate`, `RateTable`, `UsageRecord`, `MetricsTotal`, `MetricsCollector`
  n'existe sous `src/`, `tests/`, `examples/` (Grep : seule occurrence du mot « aggregates » dans un
  commentaire de `src/testing/index.ts`) : pas de collision dans les `export *` de `src/index.ts`.
- `src/metrics/` ne contient que `infrastructure/.gitkeep`, `interfaces/.gitkeep`, `models/.gitkeep`,
  `services/.gitkeep` ; `src/metrics/application/` n'existe pas.
- Lignes citées : `AgentResult` (`src/agent/application/dtos/index.ts:110-118`), `toResult`
  (`src/agent/application/use-cases/step.ts:68-77`), le `deepEqual` à mettre à jour
  (`tests/agent/application/use-cases/agentic-llm.test.ts:157-162`), la liste `import type` de
  `tests/barrel-contract.test.ts:7-24`.
- Fins de ligne : copies de travail en CRLF, index en LF (`core.autocrlf=true`,
  `git ls-files --eol`). Les blocs « Remplacer » ci-dessous sont écrits en LF ; chacun a été vérifié
  présent **une seule fois** dans le fichier réel, fins de ligne normalisées.
- Sonde : le code de ce plan a été exécuté par le researcher sans rien écrire hors de
  `docs/plans/` : un script lisait chaque bloc précédé d'un commentaire `<!-- probe ... -->`,
  l'appliquait en mémoire sur les fichiers réels (remplacements vérifiés uniques), compilait avec le
  `typescript` du dépôt (`tsconfig.build.json` puis `tsconfig.json`, sorties gardées en mémoire)
  et lançait les fichiers de test via un chargeur en mémoire. Constats : build sans erreur à chaque
  étape ; typecheck (`src` + `tests`) sans erreur après chaque code de production ; chaque test
  rouge avant son code et vert après, avec les sorties citées tâche par tâche ; suite complète finale
  `# tests 160`, `# pass 159`, `# fail 0`, `# skipped 1`. Le cadre TAP d'un fichier qui ne se
  charge pas (tâches 2 et 4) a été observé avec `node --test` réel sur un fichier de sonde, supprimé
  depuis. Les numéros de ligne des champs `location:` ne sont pas cités : ils dépendent du retrait
  des types.

---

## Tâche 0 · préparation

1. `git branch --show-current` → sortie attendue : `feat/2-metriques-execution`.
2. `git log --oneline origin/main..HEAD` → sortie attendue : vide.
3. `git status --short` → sortie attendue, exactement ces quatre lignes non suivies (le plan en plus
   des trois fichiers constatés au lancement) :
   ```
   ?? docs/plans/2026-09-30-metriques-execution-estimate.json
   ?? docs/plans/2026-09-30-metriques-execution-plan.md
   ?? docs/specs/2026-09-30-metriques-execution-checklist.md
   ?? docs/specs/2026-09-30-metriques-execution-design.md
   ```
4. `npm ci` (timeout 600000) → sortie attendue : le script `prepare` s'exécute
   (`> tsc -p tsconfig.build.json`), puis `added 3 packages` (`@types/node`, `typescript`,
   `undici-types`, les trois entrées de `package-lock.json`), code de sortie 0.
5. `npm run test` (timeout 600000) → sortie attendue : fin TAP `# tests 143`, `# pass 142`,
   `# fail 0`, `# skipped 1` (le test ignoré est `tests/integration/ollama.integration.test.ts`,
   opt-in par `OLLAMA_INTEGRATION=1`, variable à ne pas poser). Si `# tests` diffère de 143, noter la
   valeur B et remplacer 143 par B dans la tâche 7.

Aucun commit dans cette tâche.

Chaque tâche 1 à 6 suit le même cycle : écrire le test, `npm run build`, lancer le fichier de test
(rouge attendu), écrire le code de production, `npm run build`, relancer (vert attendu), cocher les
deux lignes de la checklist, commiter. Le build est obligatoire avant chaque lancement : les tests
importent le code compilé depuis `dist/`, jamais `src/`.

---

## Tâche 1 · SPEC-1 · `AgentResult.tokensUsed`

### 1.1 Écrire TEST-1

Dans `tests/agent/application/use-cases/agentic-llm.test.ts` (outil Edit), remplacer :

<!-- probe op=edit path=tests/agent/application/use-cases/agentic-llm.test.ts stage=1t -->
```ts
  assert.deepEqual(result.toolCalls, [
    { id: "call-1", name: "navigate", arguments: { page: "reglages" } },
  ]);
});
```

par :

```ts
  assert.deepEqual(result.toolCalls, [
    { id: "call-1", name: "navigate", arguments: { page: "reglages" } },
  ]);
});

test("run reports the tokens the provider counted over the whole run", async () => {
  const navigate = navigateTool();
  const agent = new AgenticLLM(
    depsFor(
      [
        {
          ...callResponse("call-1", "navigate", { page: "reglages" }),
          usage: { tokensIn: 7, tokensOut: 5 },
        },
        { ...textResponse("tu y es"), usage: { tokensIn: 3, tokensOut: 2 } },
      ],
      [navigate],
    ),
  );

  const result = await agent.run("amene-moi aux reglages");

  assert.equal(result.tokensUsed, 17);
});

test("run reports zero tokens against a provider that reports no usage", async () => {
  const agent = new AgenticLLM(depsFor([textResponse("tu es deja aux reglages")], []));

  const result = await agent.run("ou suis-je");

  assert.equal(result.tokensUsed, 0);
});
```

Puis, dans le même fichier, remplacer :

<!-- probe op=edit path=tests/agent/application/use-cases/agentic-llm.test.ts stage=1t -->
```ts
    stopReason: "completed",
    iterations: 2,
  });
```

par :

```ts
    stopReason: "completed",
    iterations: 2,
    tokensUsed: 0,
  });
```

### 1.2 Constater l'échec

1. `npm run build` → sortie attendue : `> tsc -p tsconfig.build.json`, code 0.
2. `node --test tests/agent/application/use-cases/agentic-llm.test.ts` → sortie attendue :
   code de sortie 1, fin TAP `# tests 9`, `# pass 6`, `# fail 3`. Les trois échecs, et
   eux seuls :
   - `not ok 3 - run reports the tokens the provider counted over the whole run`,
     `AssertionError`, `undefined !== 17` ;
   - `not ok 4 - run reports zero tokens against a provider that reports no usage`,
     `AssertionError`, `undefined !== 0` ;
   - `not ok 7 - a caller can drive the loop itself, one iteration at a time`,
     `Expected values to be strictly deep-equal`, diff `-   tokensUsed: 0` (le champ manque au
     résultat de `toResult`).

   Les six autres cas restent `ok`. Le motif est le bon : `AgentResult` n'a pas encore de
   `tokensUsed`.

### 1.3 Écrire SPEC-1

Dans `src/agent/application/dtos/index.ts` (outil Edit), remplacer :

<!-- probe op=edit path=src/agent/application/dtos/index.ts stage=1p -->
```ts
  /** Model calls made, the landing one included. */
  iterations: number;
};
```

par :

```ts
  /** Model calls made, the landing one included. */
  iterations: number;
  /**
   * Sum of the tokens (input + output) the provider reported over the whole run, the landing call
   * included. 0 when the provider reports none: this is the budget counter behind
   * `Budget.maxTokens`, which cannot tell "absent" from zero. The metrics framework keeps that
   * distinction (`UsageRecord`, `MetricsTotal`).
   */
  tokensUsed: number;
};
```

Dans `src/agent/application/use-cases/step.ts` (outil Edit), remplacer :

<!-- probe op=edit path=src/agent/application/use-cases/step.ts stage=1p -->
```ts
    stopReason: state.stopReason ?? "error",
    iterations: state.iterations,
  };
```

par :

```ts
    stopReason: state.stopReason ?? "error",
    iterations: state.iterations,
    tokensUsed: state.tokensUsed,
  };
```

Aucune autre ligne de `step.ts` ne change.

### 1.4 Constater le succès

1. `npm run build` → sortie attendue : `> tsc -p tsconfig.build.json`, code 0.
2. `node --test tests/agent/application/use-cases/agentic-llm.test.ts` → sortie attendue :
   code de sortie 0, les neuf cas `ok` :
   ok 1 - run returns the agent's answer and why it stopped
   ok 2 - run drives a tool round trip to its answer
   ok 3 - run reports the tokens the provider counted over the whole run
   ok 4 - run reports zero tokens against a provider that reports no usage
   ok 5 - run lands on a written answer when the budget falls
   ok 6 - run still ends when the iteration bound is not a finite number
   ok 7 - a caller can drive the loop itself, one iteration at a time
   ok 8 - a state read before the run is over does not claim the agent completed
   ok 9 - two runs on the same instance do not share a conversation

   puis `# tests 9`, `# pass 9`, `# fail 0`.

### 1.5 Commit

1. Cocher `[SPEC-1]` et `[TEST-1]` dans la checklist (`- [ ]` → `- [x]`).
2. `git add src/agent/application/dtos/index.ts src/agent/application/use-cases/step.ts tests/agent/application/use-cases/agentic-llm.test.ts docs/specs/2026-09-30-metriques-execution-checklist.md docs/specs/2026-09-30-metriques-execution-design.md docs/plans/2026-09-30-metriques-execution-estimate.json docs/plans/2026-09-30-metriques-execution-plan.md`
3. Écrire `<dossier_tmp>/agent-core-issue2-commit-msg.txt` (outil Write) :
   ```
   feat(agent): exposer tokensUsed dans AgentResult

   toResult recopie AgentState.tokensUsed : somme des jetons rapportés
   sur toute l'exécution, atterrissage compris, 0 sans usage rapporté.
   Seule modification du moteur. Versionne la spécification, la
   checklist, l'estimation et le plan de l'issue.

   Refs: #2
   Session: <id de session>
   Model: <modèle du builder>
   Authorship: ai

   Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
   ```
4. `git commit -F <dossier_tmp>/agent-core-issue2-commit-msg.txt` → sortie attendue :
   `[feat/2-metriques-execution <sha>] feat(agent): exposer tokensUsed dans AgentResult` et
   `7 files changed`.

---

## Tâche 2 · SPEC-2 · types, `aggregate` (sommes) et barrel `metrics`

### 2.1 Écrire TEST-2

Créer `tests/metrics/services/aggregate.test.ts` (outil Write) avec exactement :

<!-- probe op=write path=tests/metrics/services/aggregate.test.ts stage=2t -->
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregate } from "../../../dist/metrics/index.js";
import type { UsageRecord } from "../../../dist/metrics/index.js";

// Two measured calls to two different models.
const first: UsageRecord = { model: "m-a", tokensIn: 10, tokensOut: 4, durationMs: 100 };
const second: UsageRecord = { model: "m-b", tokensIn: 20, tokensOut: 6, durationMs: 50 };

test("aggregate of no record counts nothing, and prices nothing without a rate table", () => {
  assert.deepEqual(aggregate([]), {
    calls: 0,
    tokensIn: 0,
    tokensOut: 0,
    durationMs: 0,
    costUsd: null,
  });
});

test("aggregate sums the calls, the tokens and the durations of its records", () => {
  assert.deepEqual(aggregate([first, second]), {
    calls: 2,
    tokensIn: 30,
    tokensOut: 10,
    durationMs: 150,
    costUsd: null,
  });
});

test("one record without usage makes the token sums null rather than partial", () => {
  const total = aggregate([first, { ...second, tokensIn: null, tokensOut: null }]);

  assert.strictEqual(total.tokensIn, null);
  assert.strictEqual(total.tokensOut, null);
  assert.strictEqual(total.calls, 2);
  assert.strictEqual(total.durationMs, 150);
});

test("aggregate leaves the records it was given untouched", () => {
  const records: UsageRecord[] = [{ ...first }, { ...second, tokensIn: null, tokensOut: null }];
  const before = structuredClone(records);

  aggregate(records);

  assert.deepEqual(records, before);
});
```

### 2.2 Constater l'échec

1. `npm run build` → sortie attendue : `> tsc -p tsconfig.build.json`, code 0 (`tsconfig.build.json`
   ne compile que `src/`).
2. `node --test tests/metrics/services/aggregate.test.ts` → sortie attendue :
   code de sortie 1. Le fichier ne se charge pas : sur la sortie, en commentaires TAP,
   `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '<racine>\dist\metrics\index.js' imported from <racine>\tests\metrics\services\aggregate.test.ts`,
   puis un seul cas `not ok 1 - <chemin du fichier de test>` avec `failureType: 'testCodeFailure'`,
   `error: 'test failed'`, `code: 'ERR_TEST_FAILURE'`, et `# tests 1`, `# pass 0`, `# fail 1`.
   Le motif est le bon : le framework `metrics` n'existe pas encore dans `dist/`.

### 2.3 Écrire SPEC-2

Créer `src/metrics/models/index.ts` (outil Write) avec exactement :

<!-- probe op=write path=src/metrics/models/index.ts stage=2p -->
```ts
// Metrics framework models.
// Pure types: no runtime dependency (placement rule, docs/conventions/architecture.md).
// The package measures; it never prices on its own. Rates come from the caller (ADR-AGENT-0007).

/**
 * One provider call, as measured. `tokensIn` and `tokensOut` are null when the provider reported
 * no usage: absent is not zero (ADR-AGENT-0007), and a total that counted it as 0 would
 * understate the run without saying so.
 */
export type UsageRecord = {
  /** The model the call went to, as carried by `CompletionOptions.model`. */
  model: string;
  tokensIn: number | null;
  tokensOut: number | null;
  /** How long the call took, measured by whoever records it. */
  durationMs: number;
};

/** A model's price, in US dollars per million tokens. The unit lives in the field names. */
export type Rate = {
  usdPerMillionTokensIn: number;
  usdPerMillionTokensOut: number;
};

/**
 * Rates keyed by model id, supplied by the caller: no price is hard-coded in the package
 * (ADR-AGENT-0007). A `null` rate marks a model that is not billed, a local one for instance.
 * Cost rule, applied by `aggregate`: a record whose model is not an own key of the table, whose
 * rate is null, or whose usage is null has a null cost, never 0.
 */
export type RateTable = Readonly<Record<string, Rate | null>>;

/**
 * What a list of records adds up to. A sum that depends on missing information is null rather
 * than partial: one record without usage nulls `tokensIn` and `tokensOut`, one record that
 * cannot be priced nulls `costUsd`.
 */
export type MetricsTotal = {
  calls: number;
  tokensIn: number | null;
  tokensOut: number | null;
  durationMs: number;
  /** US dollars. Null without a rate table, or as soon as one record cannot be priced. */
  costUsd: number | null;
};
```

Créer `src/metrics/services/aggregate.ts` (outil Write) avec exactement :

<!-- probe op=write path=src/metrics/services/aggregate.ts stage=2p -->
```ts
import type { MetricsTotal, RateTable, UsageRecord } from "../models/index.js";

/**
 * Add a list of call records up into one total. Pure: it reads its input, never changes it, and
 * never throws.
 *
 * `tokensIn` and `tokensOut` are summed independently, and each is null as soon as one record
 * carries null there: counting an absent usage as 0 would understate the total without saying so
 * (ADR-AGENT-0007, "absent is not zero"). With no record, every count is 0.
 *
 * `costUsd` is null: this function reads no rate, which is the "no rate table" case of the cost
 * rule stated on `RateTable`.
 */
export function aggregate(records: readonly UsageRecord[], rates?: RateTable): MetricsTotal {
  let tokensIn: number | null = 0;
  let tokensOut: number | null = 0;
  let durationMs = 0;
  for (const record of records) {
    tokensIn = addOrNull(tokensIn, record.tokensIn);
    tokensOut = addOrNull(tokensOut, record.tokensOut);
    durationMs += record.durationMs;
  }
  return { calls: records.length, tokensIn, tokensOut, durationMs, costUsd: null };
}

/** A sum that stays null once one of its terms is. */
function addOrNull(sum: number | null, term: number | null): number | null {
  if (sum === null || term === null) return null;
  return sum + term;
}
```

Créer `src/metrics/index.ts` (outil Write) avec exactement :

<!-- probe op=write path=src/metrics/index.ts stage=2p -->
```ts
// The metrics framework: what provider calls add up to, priced from a rate table the caller
// passes. No price ships with the package (ADR-AGENT-0007).
export * from "./models/index.js";
export * from "./services/aggregate.js";
```

Les `.gitkeep` de `src/metrics/models/` et `src/metrics/services/` restent en place.

### 2.4 Constater le succès

1. `npm run build` → sortie attendue : `> tsc -p tsconfig.build.json`, code 0.
2. `node --test tests/metrics/services/aggregate.test.ts` → sortie attendue :
   code de sortie 0, les quatre cas `ok` :
   ok 1 - aggregate of no record counts nothing, and prices nothing without a rate table
   ok 2 - aggregate sums the calls, the tokens and the durations of its records
   ok 3 - one record without usage makes the token sums null rather than partial
   ok 4 - aggregate leaves the records it was given untouched

   puis `# tests 4`, `# pass 4`, `# fail 0`.

### 2.5 Commit

1. Cocher `[SPEC-2]` et `[TEST-2]` dans la checklist.
2. `git add src/metrics/models/index.ts src/metrics/services/aggregate.ts src/metrics/index.ts tests/metrics/services/aggregate.test.ts docs/specs/2026-09-30-metriques-execution-checklist.md`
3. Réécrire `<dossier_tmp>/agent-core-issue2-commit-msg.txt` (outil Read, puis Write) :
   ```
   feat(metrics): agréger des enregistrements d'appels

   Types UsageRecord, Rate, RateTable, MetricsTotal et fonction pure
   aggregate : nombre d'appels, sommes des jetons (null dès qu'un
   usage manque) et des durées ; coût null, aucun tarif lu.

   Refs: #2
   Session: <id de session>
   Model: <modèle du builder>
   Authorship: ai

   Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
   ```
4. `git commit -F <dossier_tmp>/agent-core-issue2-commit-msg.txt` → sortie attendue :
   `feat(metrics): agréger des enregistrements d'appels` et `5 files changed`.

---

## Tâche 3 · SPEC-3 · règle de coût dans `aggregate`

### 3.1 Écrire TEST-3

Remplacer tout le contenu de `tests/metrics/services/aggregate.test.ts` (outil Read, puis Write) par
exactement :

<!-- probe op=write path=tests/metrics/services/aggregate.test.ts stage=3t -->
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregate } from "../../../dist/metrics/index.js";
import type { RateTable, UsageRecord } from "../../../dist/metrics/index.js";

// Two measured calls to two different models.
const first: UsageRecord = { model: "m-a", tokensIn: 10, tokensOut: 4, durationMs: 100 };
const second: UsageRecord = { model: "m-b", tokensIn: 20, tokensOut: 6, durationMs: 50 };

test("aggregate of no record counts nothing, and prices nothing without a rate table", () => {
  assert.deepEqual(aggregate([]), {
    calls: 0,
    tokensIn: 0,
    tokensOut: 0,
    durationMs: 0,
    costUsd: null,
  });
});

test("aggregate sums the calls, the tokens and the durations of its records", () => {
  assert.deepEqual(aggregate([first, second]), {
    calls: 2,
    tokensIn: 30,
    tokensOut: 10,
    durationMs: 150,
    costUsd: null,
  });
});

test("one record without usage makes the token sums null rather than partial", () => {
  const total = aggregate([first, { ...second, tokensIn: null, tokensOut: null }]);

  assert.strictEqual(total.tokensIn, null);
  assert.strictEqual(total.tokensOut, null);
  assert.strictEqual(total.calls, 2);
  assert.strictEqual(total.durationMs, 150);
});

test("aggregate leaves the records it was given untouched", () => {
  const records: UsageRecord[] = [{ ...first }, { ...second, tokensIn: null, tokensOut: null }];
  const before = structuredClone(records);

  aggregate(records);

  assert.deepEqual(records, before);
});

// Rates and token counts chosen so that every cost is exact in floating point.
const rates: RateTable = {
  "m-a": { usdPerMillionTokensIn: 2, usdPerMillionTokensOut: 8 },
  "m-b": { usdPerMillionTokensIn: 1, usdPerMillionTokensOut: 1 },
  "m-local": null,
};
// 500 000 tokens in at 2 $/M plus 250 000 out at 8 $/M: 3 $.
const priced: UsageRecord = { model: "m-a", tokensIn: 500_000, tokensOut: 250_000, durationMs: 10 };
// 1 000 000 tokens each way at 1 $/M: 2 $.
const pricedToo: UsageRecord = {
  model: "m-b",
  tokensIn: 1_000_000,
  tokensOut: 1_000_000,
  durationMs: 20,
};

test("a record costs its tokens at its model's rate per million, and costs add up", () => {
  assert.strictEqual(aggregate([priced], rates).costUsd, 3);
  assert.strictEqual(aggregate([priced, pricedToo], rates).costUsd, 5);
});

test("the cost is null, never 0, as soon as a rate or a usage is missing", () => {
  const unpriceable: [string, UsageRecord[], RateTable | undefined][] = [
    ["no rate table", [priced], undefined],
    ["a model absent from the table", [{ ...priced, model: "m-absent" }], rates],
    ["a model named after an Object.prototype key", [{ ...priced, model: "toString" }], rates],
    ["a model with a null rate", [{ ...priced, model: "m-local" }], rates],
    ["a record without usage", [{ ...priced, tokensIn: null, tokensOut: null }], rates],
    [
      "one unpriceable record after a priced one",
      [priced, { model: "m-absent", tokensIn: 1, tokensOut: 1, durationMs: 1 }],
      rates,
    ],
  ];
  for (const [why, records, table] of unpriceable) {
    assert.strictEqual(aggregate(records, table).costUsd, null, why);
  }
});

test("with a rate table and no record, nothing was spent", () => {
  assert.strictEqual(aggregate([], rates).costUsd, 0);
});
```

### 3.2 Constater l'échec

1. `npm run build` → sortie attendue : `> tsc -p tsconfig.build.json`, code 0.
2. `node --test tests/metrics/services/aggregate.test.ts` → sortie attendue :
   code de sortie 1, fin TAP `# tests 7`, `# pass 5`, `# fail 2`. Les deux échecs :
   - `not ok 5 - a record costs its tokens at its model's rate per million, and costs add up`,
     `AssertionError`, `null !== 3` ;
   - `not ok 7 - with a rate table and no record, nothing was spent`, `AssertionError`,
     `null !== 0`.

   `ok 6 - the cost is null, never 0, as soon as a rate or a usage is missing` passe déjà : sur
   l'état SPEC-2, `costUsd` vaut toujours `null` (voir hypothèse H4). Les quatre cas de TEST-2
   restent `ok`. Le motif est le bon : `aggregate` ne lit encore aucun tarif.

### 3.3 Écrire SPEC-3

Remplacer tout le contenu de `src/metrics/services/aggregate.ts` (outil Read, puis Write) par
exactement :

<!-- probe op=write path=src/metrics/services/aggregate.ts stage=3p -->
```ts
import type { MetricsTotal, RateTable, UsageRecord } from "../models/index.js";

/** Rates are quoted per million tokens. */
const TOKENS_PER_MILLION = 1_000_000;

/**
 * Add a list of call records up into one total. Pure: it reads its input, never changes it, and
 * never throws; missing information comes out as null, never as 0.
 *
 * `tokensIn` and `tokensOut` are summed independently, and each is null as soon as one record
 * carries null there: counting an absent usage as 0 would understate the total without saying so
 * (ADR-AGENT-0007, "absent is not zero"). With no record, every count is 0.
 *
 * `costUsd` is priced from `rates` only, since the package knows no price (ADR-AGENT-0007). It is
 * null without a table, and null as soon as one record cannot be priced: never a partial sum of
 * the records that could be. With a table and no record it is 0: nothing was spent, and no rate
 * is missing.
 */
export function aggregate(records: readonly UsageRecord[], rates?: RateTable): MetricsTotal {
  let tokensIn: number | null = 0;
  let tokensOut: number | null = 0;
  let durationMs = 0;
  let costUsd: number | null = rates === undefined ? null : 0;
  for (const record of records) {
    tokensIn = addOrNull(tokensIn, record.tokensIn);
    tokensOut = addOrNull(tokensOut, record.tokensOut);
    durationMs += record.durationMs;
    costUsd = addOrNull(costUsd, costOf(record, rates));
  }
  return { calls: records.length, tokensIn, tokensOut, durationMs, costUsd };
}

/**
 * One record's cost in US dollars, or null when it cannot be priced: no table, a model that is
 * not an own key of the table, a null rate, or no usage. `Object.hasOwn` rather than `in` or an
 * `undefined` check, so a model named `toString` or `constructor` never inherits a price from
 * `Object.prototype`.
 */
function costOf(record: UsageRecord, rates: RateTable | undefined): number | null {
  if (rates === undefined || !Object.hasOwn(rates, record.model)) return null;
  const rate = rates[record.model];
  if (rate === null || record.tokensIn === null || record.tokensOut === null) return null;
  const usd =
    record.tokensIn * rate.usdPerMillionTokensIn + record.tokensOut * rate.usdPerMillionTokensOut;
  return usd / TOKENS_PER_MILLION;
}

/** A sum that stays null once one of its terms is. */
function addOrNull(sum: number | null, term: number | null): number | null {
  if (sum === null || term === null) return null;
  return sum + term;
}
```

### 3.4 Constater le succès

1. `npm run build` → sortie attendue : `> tsc -p tsconfig.build.json`, code 0.
2. `node --test tests/metrics/services/aggregate.test.ts` → sortie attendue :
   code de sortie 0, les sept cas `ok` :
   ok 1 - aggregate of no record counts nothing, and prices nothing without a rate table
   ok 2 - aggregate sums the calls, the tokens and the durations of its records
   ok 3 - one record without usage makes the token sums null rather than partial
   ok 4 - aggregate leaves the records it was given untouched
   ok 5 - a record costs its tokens at its model's rate per million, and costs add up
   ok 6 - the cost is null, never 0, as soon as a rate or a usage is missing
   ok 7 - with a rate table and no record, nothing was spent

   puis `# tests 7`, `# pass 7`, `# fail 0`.

### 3.5 Commit

1. Cocher `[SPEC-3]` et `[TEST-3]` dans la checklist.
2. `git add src/metrics/services/aggregate.ts tests/metrics/services/aggregate.test.ts docs/specs/2026-09-30-metriques-execution-checklist.md`
3. Réécrire `<dossier_tmp>/agent-core-issue2-commit-msg.txt` (outil Read, puis Write) :
   ```
   feat(metrics): chiffrer le coût depuis une table de tarifs injectée

   Coût d'un enregistrement = jetons × tarif par million ; null sans
   table, pour un modèle qui n'est pas une clé propre de la table,
   pour un tarif null ou un usage absent. Le total vaut null dès qu'un
   coût manque, 0 avec une table et aucun enregistrement.

   Refs: #2
   Session: <id de session>
   Model: <modèle du builder>
   Authorship: ai

   Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
   ```
4. `git commit -F <dossier_tmp>/agent-core-issue2-commit-msg.txt` → sortie attendue :
   `feat(metrics): chiffrer le coût depuis une table de tarifs injectée` et `3 files changed`.

---

## Tâche 4 · SPEC-4 · `MetricsCollector` (`record`, `records`)

### 4.1 Écrire TEST-4

Créer `tests/metrics/application/use-cases/metrics-collector.test.ts` (outil Write) avec exactement :

<!-- probe op=write path=tests/metrics/application/use-cases/metrics-collector.test.ts stage=4t -->
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { MetricsCollector } from "../../../../dist/metrics/index.js";
import type { UsageRecord } from "../../../../dist/metrics/index.js";

// A fresh object on each call, so no test can leak a mutation into another.
function recordA(): UsageRecord {
  return { model: "m-a", tokensIn: 500_000, tokensOut: 250_000, durationMs: 10 };
}

function recordB(): UsageRecord {
  return { model: "m-b", tokensIn: 1_000_000, tokensOut: 1_000_000, durationMs: 20 };
}

test("a new collector has recorded nothing", () => {
  assert.deepEqual(new MetricsCollector().records(), []);
});

test("records() gives back what was recorded, in recording order", () => {
  const collector = new MetricsCollector();
  const a = recordA();
  const b = recordB();

  collector.record(a);
  collector.record(b);

  assert.deepEqual(collector.records(), [a, b]);
});

test("nothing a caller holds can change what was recorded", () => {
  const collector = new MetricsCollector();
  const a = recordA();
  const b = recordB();
  const aAsRecorded = { ...a };
  collector.record(a);
  collector.record(b);

  const handedOut = collector.records();
  handedOut.push(recordA());
  handedOut[0].tokensIn = 0;
  a.tokensIn = 1;

  assert.deepEqual(collector.records(), [aAsRecorded, b]);
});

test("two collectors share nothing", () => {
  const used = new MetricsCollector();
  const untouched = new MetricsCollector();

  used.record(recordA());

  assert.deepEqual(untouched.records(), []);
});
```

### 4.2 Constater l'échec

1. `npm run build` → sortie attendue : `> tsc -p tsconfig.build.json`, code 0.
2. `node --test tests/metrics/application/use-cases/metrics-collector.test.ts` → sortie attendue :
   code de sortie 1. Le fichier ne se charge pas : sur la sortie, en commentaires TAP,
   `SyntaxError: The requested module '../../../../dist/metrics/index.js' does not provide an export named 'MetricsCollector'`,
   puis un seul cas `not ok 1 - <chemin du fichier de test>` avec `error: 'test failed'`, et
   `# tests 1`, `# pass 0`, `# fail 1`. Le motif est le bon : la classe n'existe pas.

### 4.3 Écrire SPEC-4

Créer `src/metrics/application/use-cases/metrics-collector.ts` (outil Write) avec exactement :

<!-- probe op=write path=src/metrics/application/use-cases/metrics-collector.ts stage=4p -->
```ts
import type { UsageRecord } from "../../models/index.js";

/**
 * Collects the records of provider calls, for one run or one batch of runs: the scope is the
 * instance (ADR-AGENT-0007, option C). No static or module-level state, so two collectors never
 * share a record, and there is no start or stop to forget.
 *
 * Nothing it holds is reachable from outside: `record` keeps a copy of what it is given, and
 * `records` hands out fresh copies, the same precaution as `FakeLLMProvider.models()`.
 */
export class MetricsCollector {
  private readonly entries: UsageRecord[] = [];

  /** Keep a copy of `entry`: changing that object afterwards does not change what was recorded. */
  record(entry: UsageRecord): void {
    this.entries.push({ ...entry });
  }

  /** A new array of copies on every call, in recording order. */
  records(): UsageRecord[] {
    return this.entries.map((entry) => ({ ...entry }));
  }
}
```

Remplacer tout le contenu de `src/metrics/index.ts` (outil Read, puis Write) par exactement :

<!-- probe op=write path=src/metrics/index.ts stage=4p -->
```ts
// The metrics framework: what provider calls add up to, priced from a rate table the caller
// passes. No price ships with the package (ADR-AGENT-0007).
export * from "./models/index.js";
export * from "./services/aggregate.js";
export * from "./application/use-cases/metrics-collector.js";
```

### 4.4 Constater le succès

1. `npm run build` → sortie attendue : `> tsc -p tsconfig.build.json`, code 0.
2. `node --test tests/metrics/application/use-cases/metrics-collector.test.ts` → sortie attendue :
   code de sortie 0, les quatre cas `ok` :
   ok 1 - a new collector has recorded nothing
   ok 2 - records() gives back what was recorded, in recording order
   ok 3 - nothing a caller holds can change what was recorded
   ok 4 - two collectors share nothing

   puis `# tests 4`, `# pass 4`, `# fail 0`.

### 4.5 Commit

1. Cocher `[SPEC-4]` et `[TEST-4]` dans la checklist.
2. `git add src/metrics/application/use-cases/metrics-collector.ts src/metrics/index.ts tests/metrics/application/use-cases/metrics-collector.test.ts docs/specs/2026-09-30-metriques-execution-checklist.md`
3. Réécrire `<dossier_tmp>/agent-core-issue2-commit-msg.txt` (outil Read, puis Write) :
   ```
   feat(metrics): ajouter MetricsCollector (record, records)

   Collecteur à portée d'instance, sans état statique ni de module :
   record garde une copie, records rend un nouveau tableau de copies
   dans l'ordre d'enregistrement.

   Refs: #2
   Session: <id de session>
   Model: <modèle du builder>
   Authorship: ai

   Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
   ```
4. `git commit -F <dossier_tmp>/agent-core-issue2-commit-msg.txt` → sortie attendue :
   `feat(metrics): ajouter MetricsCollector (record, records)` et `4 files changed`.

---

## Tâche 5 · SPEC-5 · `MetricsCollector.total(rates?)`

### 5.1 Écrire TEST-5

Remplacer tout le contenu de `tests/metrics/application/use-cases/metrics-collector.test.ts`
(outil Read, puis Write) par exactement :

<!-- probe op=write path=tests/metrics/application/use-cases/metrics-collector.test.ts stage=5t -->
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { MetricsCollector, aggregate } from "../../../../dist/metrics/index.js";
import type { RateTable, UsageRecord } from "../../../../dist/metrics/index.js";

// A fresh object on each call, so no test can leak a mutation into another.
function recordA(): UsageRecord {
  return { model: "m-a", tokensIn: 500_000, tokensOut: 250_000, durationMs: 10 };
}

function recordB(): UsageRecord {
  return { model: "m-b", tokensIn: 1_000_000, tokensOut: 1_000_000, durationMs: 20 };
}

test("a new collector has recorded nothing", () => {
  assert.deepEqual(new MetricsCollector().records(), []);
});

test("records() gives back what was recorded, in recording order", () => {
  const collector = new MetricsCollector();
  const a = recordA();
  const b = recordB();

  collector.record(a);
  collector.record(b);

  assert.deepEqual(collector.records(), [a, b]);
});

test("nothing a caller holds can change what was recorded", () => {
  const collector = new MetricsCollector();
  const a = recordA();
  const b = recordB();
  const aAsRecorded = { ...a };
  collector.record(a);
  collector.record(b);

  const handedOut = collector.records();
  handedOut.push(recordA());
  handedOut[0].tokensIn = 0;
  a.tokensIn = 1;

  assert.deepEqual(collector.records(), [aAsRecorded, b]);
});

test("two collectors share nothing", () => {
  const used = new MetricsCollector();
  const untouched = new MetricsCollector();

  used.record(recordA());

  assert.deepEqual(untouched.records(), []);
});

// recordA costs 3 $ and recordB 2 $ at these rates.
const rates: RateTable = {
  "m-a": { usdPerMillionTokensIn: 2, usdPerMillionTokensOut: 8 },
  "m-b": { usdPerMillionTokensIn: 1, usdPerMillionTokensOut: 1 },
  "m-local": null,
};

test("a new collector totals to zero calls and no cost", () => {
  assert.deepEqual(new MetricsCollector().total(), {
    calls: 0,
    tokensIn: 0,
    tokensOut: 0,
    durationMs: 0,
    costUsd: null,
  });
});

test("total() is aggregate() over the collector's own records", () => {
  const collector = new MetricsCollector();
  collector.record(recordA());
  collector.record(recordB());

  const priced = collector.total(rates);

  assert.deepEqual(collector.total(), aggregate(collector.records()));
  assert.deepEqual(priced, aggregate(collector.records(), rates));
  assert.strictEqual(priced.costUsd, 5);
});
```

### 5.2 Constater l'échec

1. `npm run build` → sortie attendue : `> tsc -p tsconfig.build.json`, code 0.
2. `node --test tests/metrics/application/use-cases/metrics-collector.test.ts` → sortie attendue :
   code de sortie 1, fin TAP `# tests 6`, `# pass 4`, `# fail 2`. Les deux échecs :
   - `not ok 5 - a new collector totals to zero calls and no cost`, `TypeError`,
     `(intermediate value).total is not a function` ;
   - `not ok 6 - total() is aggregate() over the collector's own records`, `TypeError`,
     `collector.total is not a function`.

   Les quatre cas de TEST-4 restent `ok`. Le motif est le bon : `total` n'existe pas.

### 5.3 Écrire SPEC-5

Remplacer tout le contenu de `src/metrics/application/use-cases/metrics-collector.ts` (outil Read,
puis Write) par exactement :

<!-- probe op=write path=src/metrics/application/use-cases/metrics-collector.ts stage=5p -->
```ts
import { aggregate } from "../../services/aggregate.js";
import type { MetricsTotal, RateTable, UsageRecord } from "../../models/index.js";

/**
 * Collects the records of provider calls, for one run or one batch of runs: the scope is the
 * instance (ADR-AGENT-0007, option C). No static or module-level state, so two collectors never
 * share a record, and there is no start or stop to forget.
 *
 * Nothing it holds is reachable from outside: `record` keeps a copy of what it is given, and
 * `records` hands out fresh copies, the same precaution as `FakeLLMProvider.models()`.
 */
export class MetricsCollector {
  private readonly entries: UsageRecord[] = [];

  /** Keep a copy of `entry`: changing that object afterwards does not change what was recorded. */
  record(entry: UsageRecord): void {
    this.entries.push({ ...entry });
  }

  /** A new array of copies on every call, in recording order. */
  records(): UsageRecord[] {
    return this.entries.map((entry) => ({ ...entry }));
  }

  /**
   * What this collector's records add up to, priced from `rates` when given. The arithmetic is
   * `aggregate`'s alone, so the collector and the pure function can never disagree.
   */
  total(rates?: RateTable): MetricsTotal {
    return aggregate(this.entries, rates);
  }
}
```

### 5.4 Constater le succès

1. `npm run build` → sortie attendue : `> tsc -p tsconfig.build.json`, code 0.
2. `node --test tests/metrics/application/use-cases/metrics-collector.test.ts` → sortie attendue :
   code de sortie 0, les six cas `ok` :
   ok 1 - a new collector has recorded nothing
   ok 2 - records() gives back what was recorded, in recording order
   ok 3 - nothing a caller holds can change what was recorded
   ok 4 - two collectors share nothing
   ok 5 - a new collector totals to zero calls and no cost
   ok 6 - total() is aggregate() over the collector's own records

   puis `# tests 6`, `# pass 6`, `# fail 0`.

### 5.5 Commit

1. Cocher `[SPEC-5]` et `[TEST-5]` dans la checklist.
2. `git add src/metrics/application/use-cases/metrics-collector.ts tests/metrics/application/use-cases/metrics-collector.test.ts docs/specs/2026-09-30-metriques-execution-checklist.md`
3. Réécrire `<dossier_tmp>/agent-core-issue2-commit-msg.txt` (outil Read, puis Write) :
   ```
   feat(metrics): totaliser un MetricsCollector par aggregate

   total(rates?) rend aggregate des enregistrements de l'instance,
   sans arithmétique propre au collecteur.

   Refs: #2
   Session: <id de session>
   Model: <modèle du builder>
   Authorship: ai

   Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
   ```
4. `git commit -F <dossier_tmp>/agent-core-issue2-commit-msg.txt` → sortie attendue :
   `feat(metrics): totaliser un MetricsCollector par aggregate` et `3 files changed`.

---

## Tâche 6 · SPEC-6 · exposer `metrics` depuis `.`

### 6.1 Écrire TEST-6

Dans `tests/barrel-contract.test.ts` (outil Edit), remplacer :

<!-- probe op=edit path=tests/barrel-contract.test.ts stage=6t -->
```ts
  LLMProvider,
  ModelInfo,
  SlidingWindowReport,
```

par :

```ts
  LLMProvider,
  MetricsTotal,
  ModelInfo,
  Rate,
  RateTable,
  SlidingWindowReport,
```

Puis remplacer :

<!-- probe op=edit path=tests/barrel-contract.test.ts stage=6t -->
```ts
  ToolResult,
} from "@arthurolivierfortin/agent-core";
```

par :

```ts
  ToolResult,
  UsageRecord,
} from "@arthurolivierfortin/agent-core";
```

Puis remplacer la fin du fichier :

<!-- probe op=edit path=tests/barrel-contract.test.ts stage=6t -->
```ts
  assert.equal(start.iterations, 0);
  assert.equal(result.content, "bonjour");
  assert.equal(reason, "completed");
});
```

par :

```ts
  assert.equal(start.iterations, 0);
  assert.equal(result.content, "bonjour");
  assert.equal(reason, "completed");
});

test("`.` exposes the metrics framework, and neither `./llm` nor `./testing` carries it", () => {
  const surface = root as Record<string, unknown>;
  for (const name of ["aggregate", "MetricsCollector"]) {
    assert.equal(typeof surface[name], "function", `missing ${name}`);
  }
  for (const barrel of [llm, testing]) {
    const other = barrel as Record<string, unknown>;
    assert.equal(other.aggregate, undefined);
    assert.equal(other.MetricsCollector, undefined);
  }
});

// Same reasoning as the type tests above: these names are types, so `node --test` cannot see them
// leave the barrel. The table is annotated where it is passed to the package, the records and the
// totals where the package hands them back, and the gate that enforces it is `npm run typecheck`.
test("`.` exposes the metrics types a caller needs to record and price calls", () => {
  const rate: Rate = { usdPerMillionTokensIn: 2, usdPerMillionTokensOut: 8 };
  const rates: RateTable = { "m-a": rate };
  const collector = new root.MetricsCollector();
  collector.record({ model: "m-a", tokensIn: 500_000, tokensOut: 250_000, durationMs: 10 });

  const records: UsageRecord[] = collector.records();
  const fromCollector: MetricsTotal = collector.total(rates);
  const fromFunction: MetricsTotal = root.aggregate(records, rates);

  assert.equal(fromCollector.calls, 1);
  assert.equal(fromFunction.calls, 1);
});
```

### 6.2 Constater l'échec

1. `npm run build` → sortie attendue : `> tsc -p tsconfig.build.json`, code 0.
2. `node --test tests/barrel-contract.test.ts` → sortie attendue :
   code de sortie 1, fin TAP `# tests 17`, `# pass 15`, `# fail 2`. Les deux échecs :
   - `` not ok 16 - `.` exposes the metrics framework, and neither `./llm` nor `./testing` carries it ``,
     `AssertionError`, message `missing aggregate`, `expected: 'function'`, `actual: 'undefined'` ;
   - `` not ok 17 - `.` exposes the metrics types a caller needs to record and price calls ``,
     `TypeError`, `root.MetricsCollector is not a constructor`.

   Les quinze cas existants restent `ok`. Le motif est le bon : `.` ne réexporte pas `metrics`.

### 6.3 Écrire SPEC-6

Dans `src/index.ts` (outil Edit), remplacer :

<!-- probe op=edit path=src/index.ts stage=6p -->
```ts
export * from "./agent/index.js";
```

par :

```ts
export * from "./agent/index.js";
// metrics/ turns provider calls into totals: pure, disk-free, priced only from a rate table the
// caller passes (ADR-AGENT-0007). Served by `.`; neither ./llm nor ./testing re-exports it.
export * from "./metrics/index.js";
```

`src/llm/index.ts` et `src/testing/index.ts` ne changent pas.

### 6.4 Constater le succès

1. `npm run build` → sortie attendue : `> tsc -p tsconfig.build.json`, code 0.
2. `node --test tests/barrel-contract.test.ts` → sortie attendue :
   code de sortie 0, `ok 1` à `ok 17`, dont
   `` ok 16 - `.` exposes the metrics framework, and neither `./llm` nor `./testing` carries it `` et
   `` ok 17 - `.` exposes the metrics types a caller needs to record and price calls ``, puis
   `# tests 17`, `# pass 17`, `# fail 0`.

### 6.5 Commit

1. Cocher `[SPEC-6]` et `[TEST-6]` dans la checklist.
2. `git add src/index.ts tests/barrel-contract.test.ts docs/specs/2026-09-30-metriques-execution-checklist.md`
3. Réécrire `<dossier_tmp>/agent-core-issue2-commit-msg.txt` (outil Read, puis Write) :
   ```
   feat(metrics): exposer le framework metrics depuis .

   aggregate, MetricsCollector et les types UsageRecord, Rate,
   RateTable, MetricsTotal sont servis par l'entrée principale ;
   ./llm et ./testing ne les portent pas. Verrou dans
   barrel-contract (valeurs à l'exécution, types par typecheck).

   Refs: #2
   Session: <id de session>
   Model: <modèle du builder>
   Authorship: ai

   Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
   ```
4. `git commit -F <dossier_tmp>/agent-core-issue2-commit-msg.txt` → sortie attendue :
   `feat(metrics): exposer le framework metrics depuis .` et `3 files changed`.

---

## Tâche 7 · gates et contrôles de PR

Chaque gate par son propre appel, `timeout` 600000, dans cet ordre (le typecheck lit les `.d.ts`
de `dist/` produits par le build, et `tests/` importe `dist/`) :

| Gate | Commande | Sortie attendue |
|---|---|---|
| GATE-1 build | `npm run build` | `> tsc -p tsconfig.build.json`, code 0, aucune erreur |
| GATE-2 typecheck | `npm run typecheck` | `> tsc --noEmit`, code 0, aucune erreur |
| GATE-3 test | `npm run test` | fin TAP : `# tests 160`, `# pass 159`, `# fail 0`, `# skipped 1` (143 + 17 cas ajoutés : 2 à la tâche 1, 4 à la tâche 2, 3 à la tâche 3, 4 à la tâche 4, 2 à la tâche 5, 2 à la tâche 6) |

Cocher `[GATE-1]`, `[GATE-2]`, `[GATE-3]` dans la checklist, puis
`git add docs/specs/2026-09-30-metriques-execution-checklist.md` et commit
`chore(checklist): cocher les gates` (mêmes trailers) : sortie attendue `1 file changed`.

Contrôles à recopier tels quels dans le corps de PR (`<dossier_tmp>/agent-core-issue2-pr-body.md`),
chaque commande par son propre appel :

1. `git diff --name-only origin/main...HEAD` → sortie attendue, exactement ces 15 chemins (ordre de git) :
   ```
   docs/plans/2026-09-30-metriques-execution-estimate.json
   docs/plans/2026-09-30-metriques-execution-plan.md
   docs/specs/2026-09-30-metriques-execution-checklist.md
   docs/specs/2026-09-30-metriques-execution-design.md
   src/agent/application/dtos/index.ts
   src/agent/application/use-cases/step.ts
   src/index.ts
   src/metrics/application/use-cases/metrics-collector.ts
   src/metrics/index.ts
   src/metrics/models/index.ts
   src/metrics/services/aggregate.ts
   tests/agent/application/use-cases/agentic-llm.test.ts
   tests/barrel-contract.test.ts
   tests/metrics/application/use-cases/metrics-collector.test.ts
   tests/metrics/services/aggregate.test.ts
   ```
2. `git diff origin/main...HEAD -- src/agent/application/use-cases/step.ts` → sortie attendue : une
   seule ligne ajoutée, `+    tokensUsed: state.tokensUsed,`, aucune ligne retirée.
3. `git grep -n "console.log" -- src/metrics` → sortie attendue : vide, code 1.
4. `git grep -n -E "usdPerMillionTokens(In|Out): [0-9]" -- src` → sortie attendue : vide, code 1
   (aucun tarif codé en dur dans le package ; les tarifs n'apparaissent que sous `tests/`).
5. `git fetch origin` puis
   `python C:/Projects/dev-kit/scripts/pr_size.py origin/main HEAD --body-file <dossier_tmp>/agent-core-issue2-pr-body.md`
   → sortie attendue : `hors docs/ et *.md : +378/-0 lignes (code +145, tests +233), seuil 400 respecté`,
   code 0 (aucune déclaration de dépassement exigée). Détail mesuré par la sonde, lignes ajoutées,
   aucune retirée : `src/agent/application/dtos/index.ts` +7, `src/agent/application/use-cases/step.ts`
   +1, `src/index.ts` +3, `src/metrics/index.ts` +5, `src/metrics/models/index.ts` +45,
   `src/metrics/services/aggregate.ts` +52, `src/metrics/application/use-cases/metrics-collector.ts`
   +32, `tests/agent/application/use-cases/agentic-llm.test.ts` +29, `tests/barrel-contract.test.ts`
   +33, `tests/metrics/services/aggregate.test.ts` +89,
   `tests/metrics/application/use-cases/metrics-collector.test.ts` +82. Recopier la ligne mesurée
   dans le corps de PR.
6. Déclarer dans le corps de PR : aucun fichier `.env` ouvert ni lu ; aucun fournisseur hébergé
   appelé (seul `FakeLLMProvider` dans TEST-1) ; `withMetrics` hors périmètre, en tête de #8, avec la
   question « `withMetrics` et le streaming » de la spécification transmise à #8.

---

## Hypothèses (à recopier dans la PR)

- **H1** · Types et portées de commit : `feat(agent)` pour SPEC-1 (seul fichier moteur touché),
  `feat(metrics)` pour SPEC-2 à SPEC-6, `chore(checklist)` pour le cochage des gates.
- **H2** · La spécification, la checklist, l'estimation et le plan entrent dans le commit de la
  tâche 1 (même pratique que #5 pour l'issue #1).
- **H3** · Rédaction des commentaires TSDoc (anglais, le pourquoi) choisie par ce plan dans le cadre
  fixé par la spécification (« Types (SPEC-2) », « Règle de coût »).
- **H4** · TEST-3 est livré en trois cas ; le cas « null, jamais 0 » passe déjà sur l'état SPEC-2
  (`costUsd` y vaut toujours `null`). Il reste un vrai test : il échoue contre toute implémentation
  qui chiffrerait un modèle absent à 0 ou lirait `rates["toString"]` (coût `NaN`). Les deux autres
  cas de TEST-3 sont rouges avant SPEC-3.
- **H5** · Les rouges et verts des tâches 1 à 6 se constatent fichier par fichier
  (`node --test <fichier>` après `npm run build`) ; la suite complète ne tourne qu'aux gates.
- **H6** · Les `.gitkeep` de `src/metrics/models/` et `src/metrics/services/` restent en place
  (spécification, « Placement »).

## Risques

- **Marge de taille courte** : 378 lignes mesurées pour un plafond de 400. Toute ligne ajoutée
  hors du plan (commentaire, cas de test) consomme cette marge ; un dépassement exigerait la
  déclaration `pr_size` et une décision du pilote (aucune dérogation prévue).
- **`dist/` périmé** : les tests importent `dist/`, jamais `src/`. Lancer `node --test` sans
  `npm run build` juste avant fait constater un rouge ou un vert sur l'étape précédente.
- **Verrou des types de TEST-6** : `UsageRecord`, `Rate`, `RateTable`, `MetricsTotal` ne sont
  vérifiés que par GATE-2 (`npm run typecheck`) ; `node --test` retire les types sans les contrôler.
  GATE-2 doit passer après GATE-1 (il lit les `.d.ts` de `dist/`).
- **Fins de ligne** : copies de travail en CRLF ; les blocs « Remplacer » sont en LF. Si l'outil Edit
  ne trouve pas un bloc, relire le fichier (outil Read) et recopier le bloc depuis la lecture, sans
  changer le texte.
- **Asymétrie `tokensUsed`** : `AgentResult.tokensUsed` vaut 0 sans usage rapporté, alors que les
  métriques distinguent `null` de 0 ; c'est voulu par la spécification, et #8 doit choisir sa source
  pour `MatrixRun.tokensUsed` en le sachant.
- **TEST-3 partiellement vert avant SPEC-3** (H4) : un relecteur peut le relever ; la justification
  est dans H4 et doit être recopiée dans la PR.
- **`tsc` du checkout parent** : avant `npm ci`, `npm run build` trouvait `tsc` dans
  `C:/Projects/Perso/agent-core/node_modules/` (constaté) ; après `npm ci`, le worktree a le sien.
  Si `npm ci` échoue, s'arrêter plutôt que de continuer sur l'outillage du checkout parent.
