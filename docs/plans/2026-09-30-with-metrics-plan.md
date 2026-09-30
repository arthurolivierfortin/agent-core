# Plan · `withMetrics`, décorateur de `LLMProvider` qui mesure chaque appel · #11

- Issue : #11 (T:feature) https://github.com/arthurolivierfortin/agent-core/issues/11, titre relu le
  2026-09-30 par `gh issue view 11` : « feat(metrics): withMetrics, décorateur de LLMProvider qui
  mesure chaque appel ». Lot 1 du découpage de #8 (#8 = `runMatrix`, #12 = summary et `toJSON`).
- Checklist : `docs/specs/2026-09-30-with-metrics-checklist.md`
- Spécification : `docs/specs/2026-09-30-with-metrics-design.md`
- Estimation : `docs/plans/2026-09-30-with-metrics-estimate.json`
- Conception appliquée : ADR-AGENT-0007 (décorateur, portée par instance, « absent n'est pas zéro »),
  ADR-AGENT-0017 (le modèle voyage avec l'appel), ADR-AGENT-0006 ; aucun nouvel ADR (spécification,
  « Décisions »).
- Branche : `feat/11-with-metrics`, base `main` (`publication_branch` du manifeste). Elle existe déjà :
  c'est la branche du worktree `C:/Projects/Perso/agent-core/.claude/worktrees/feat+11-with-metrics`,
  au niveau de `origin/main` fc3e35f (constaté le 2026-09-30 : `git rev-parse HEAD` et
  `git log -1 --format=%H origin/main` rendent tous deux `fc3e35f3ba70a2ade4985f3c13887197289e0fd2`).
- Toutes les commandes se lancent depuis la racine de ce worktree, chacune par son propre appel Bash,
  en avant-plan, `timeout` 600000 ms pour une installation, un build, un test ou un gate, 120000 ms
  sinon. Jamais `&&`, jamais `&` final, jamais `run_in_background`, aucun serveur.
- Fichiers de travail, dans `<dossier_tmp>` (dossier temporaire de la session du builder, chemin
  absolu `C:/…`) : `<dossier_tmp>/agent-core-issue11-commit-msg.txt` (message de commit, réécrit à
  chaque tâche, relu par l'outil Read avant réécriture) et `<dossier_tmp>/agent-core-issue11-pr-body.md`
  (corps de PR). Jamais `%TEMP%` ni `/tmp` directement, jamais un nom sans dépôt.
- Contraintes du pilote rappelées : `src/agent/application/use-cases/step.ts` inchangé ;
  `supportsStreaming()` rend `false` et aucune propriété `stream` ; aucun fournisseur hébergé dans
  les tests ; aucun `console.log` ; aucun fichier `.env` ouvert ni lu ; PR sous 400 lignes hors
  `docs/` et `*.md` (mesurée à la tâche 5) ; aucun message de commit ne porte de ligne
  `Co-Authored-By`.

## Ordre des tâches et dépendances

| Tâche | Élément | Dépend de | Pourquoi cet ordre |
|---|---|---|---|
| 0 | préparation (dépendances, référence de la suite) | aucune | le worktree n'a ni `node_modules/` ni `dist/` (constaté) |
| 1 | SPEC-1 + TEST-1 | 0 | crée `with-metrics.ts` et son fichier de test |
| 2 | SPEC-2 + TEST-2 | 1 | complète le commentaire de conception et le fichier de test de la tâche 1 |
| 3 | SPEC-3 + TEST-3 | 2 | idem ; le paragraphe s'insère après celui de SPEC-2 |
| 4 | SPEC-4 + TEST-4 | 1 | exporte le fichier créé à la tâche 1 ; faite en dernier pour que TEST-4 soit rouge avant SPEC-4 |
| 5 | gates GATE-1 à GATE-3, contrôles et corps de PR | 1 à 4 | |

Aucun `[DB-N]`.

## Vérifications faites par le researcher (sorties fraîches du 2026-09-30)

- `node --version` : `v22.19.0` (le retrait des types est actif par défaut : `node --test` lance les
  `.ts` sans drapeau). Manifeste : `publication_branch` `main`, gates `GATE-1 build`
  `npm run build`, `GATE-2 typecheck` `npm run typecheck`, `GATE-3 test` `npm run test`,
  `derogations` `[]`.
- `git status --short` au lancement : trois fichiers non suivis (`docs/plans/2026-09-30-with-metrics-estimate.json`,
  `docs/specs/2026-09-30-with-metrics-checklist.md`, `docs/specs/2026-09-30-with-metrics-design.md`).
- Grep `withMetrics` hors `docs/` : une seule occurrence, `ROADMAP.md:139` (arborescence indicative,
  voir « Risques ») ; aucune sous `src/`, `tests/`, `examples/` : pas de collision dans les
  `export *` de `src/metrics/index.ts` ni de `src/index.ts`.
- Code lu : `src/llm/interfaces/llm-provider.ts` (port, `stream?` « Present only if
  `supportsStreaming()` is true »), `src/llm/models/index.ts` (`Usage`, `LLMResponse.usage?`,
  `LLMChunk`, `ModelInfo`, `LLMError(code, message, options?)`), `src/metrics/models/index.ts`
  (`UsageRecord`), `src/metrics/application/use-cases/metrics-collector.ts` (`record`, `records`),
  `src/metrics/index.ts` (trois `export *`), `src/llm/testing/fake-llm-provider.ts` (`id = "fake"`,
  `MODEL_ID = "fake-model"`, refus `MODEL_NOT_FOUND` avant lecture du script, `Error` nu
  « FakeLLMProvider: no scripted response for call #N »), `src/llm/testing/provider-contract.ts`
  (deux `complete` : un modèle non déclaré qui doit lever `MODEL_NOT_FOUND`, puis le premier modèle
  déclaré ; contrôles de flux seulement si `supportsStreaming()` vaut `true`),
  `tests/barrel-contract.test.ts` (import de `LLMProvider` déjà présent l.14 ; test metrics
  l.197-207 ; dernier test l.212-224), `tests/metrics/application/use-cases/metrics-collector.test.ts`
  (convention d'import depuis `../../../../dist/…`).
- Sonde : tout le code de ce plan a été exécuté par le researcher dans une copie de l'arbre `HEAD`
  (`git archive HEAD`) placée dans un dossier temporaire de session, hors du dépôt, avec le
  `node_modules/` du checkout parent. Rien n'a été écrit dans le worktree hors de ce fichier.
  Constats, cités tâche par tâche ci-dessous :
  - référence sur fc3e35f : `npm run test` → `# tests 160`, `# pass 159`, `# fail 0`,
    `# skipped 1` ; `npm run typecheck` code 0 ;
  - chaque rouge, chaque vert et chaque mutation ont été observés avec `npm run build` puis
    `node --test <fichier>` ;
  - état final : `npm run build` code 0, `npm run typecheck` code 0, `npm run test` → `# tests 168`,
    `# pass 167`, `# fail 0`, `# skipped 1` ;
  - taille : `with-metrics.ts` 54 lignes, `with-metrics.test.ts` 148 lignes,
    `tests/barrel-contract.test.ts` +19/-1, `src/metrics/index.ts` +1/-0 : +222/-1 hors `docs/` et
    `*.md` (code +55, tests +167).
- Fins de ligne : copies de travail en CRLF, index en LF (`core.autocrlf=true`, `git ls-files --eol`
  sur `src/metrics/index.ts` et `tests/barrel-contract.test.ts` : `i/lf w/crlf`). Les blocs
  « Remplacer » ci-dessous sont écrits en LF ; chacun est présent **une seule fois** dans le fichier
  réel (vérifié sur la copie `HEAD`).

---

## Tâche 0 · préparation

1. `git branch --show-current` → sortie attendue : `feat/11-with-metrics`.
2. `git log --oneline origin/main..HEAD` → sortie attendue : vide.
3. `git status --short` → sortie attendue, exactement ces quatre lignes non suivies (ce plan en plus
   des trois fichiers constatés au lancement) :
   ```
   ?? docs/plans/2026-09-30-with-metrics-estimate.json
   ?? docs/plans/2026-09-30-with-metrics-plan.md
   ?? docs/specs/2026-09-30-with-metrics-checklist.md
   ?? docs/specs/2026-09-30-with-metrics-design.md
   ```
4. `npm ci` (timeout 600000) → sortie attendue : le script `prepare` s'exécute
   (`> tsc -p tsconfig.build.json`), puis `added 3 packages` (`@types/node`, `typescript`,
   `undici-types`, les trois entrées de `package-lock.json`), code de sortie 0. Sortie déduite du
   `package-lock.json` et de l'installation identique de #2, non relancée par le researcher.
5. `npm run test` (timeout 600000) → sortie attendue : fin TAP `# tests 160`, `# pass 159`,
   `# fail 0`, `# skipped 1` (le test ignoré est `tests/integration/ollama.integration.test.ts`,
   opt-in par `OLLAMA_INTEGRATION=1`, variable à ne pas poser). Si `# tests` diffère de 160, noter la
   valeur B et remplacer 160 par B, et 168 par B + 8, dans la tâche 5.

Aucun commit dans cette tâche.

Chaque tâche 1 à 4 suit le même cycle : écrire le test, `npm run build`, lancer le fichier de test,
écrire le code de production, `npm run build`, relancer, `npm run typecheck`, cocher les lignes de la
checklist, commiter. Le build est obligatoire avant chaque lancement : les tests importent le code
compilé depuis `dist/`, jamais `src/`. `npm run typecheck` lit les `.d.ts` de `dist/` : il se lance
toujours après un build.

---

## Tâche 1 · SPEC-1 · `withMetrics` : délégation et mesure d'un `complete` résolu

### 1.1 Écrire TEST-1

Créer `tests/metrics/application/use-cases/with-metrics.test.ts` (outil Write) :

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { withMetrics } from "../../../../dist/metrics/application/use-cases/with-metrics.js";
import { MetricsCollector } from "../../../../dist/metrics/index.js";
import { FakeLLMProvider } from "../../../../dist/testing/index.js";
import type { CompletionOptions } from "../../../../dist/llm/interfaces/index.js";
import type { LLMResponse, Message } from "../../../../dist/llm/models/index.js";

// Design: docs/specs/2026-09-30-with-metrics-design.md (#11). Every provider below is scripted,
// the fake or a literal written in this file: no hosted provider is ever called.

const messages: Message[] = [{ role: "user", content: "hi" }];

/**
 * A clock that hands out `values` in order and throws once they are used up: a decorator that
 * read the time more often than expected fails loudly instead of measuring garbage.
 */
function scriptedClock(values: number[]): () => number {
  let next = 0;
  return () => {
    if (next >= values.length) {
      throw new Error(`scripted clock exhausted after ${values.length} readings`);
    }
    return values[next++];
  };
}

test("withMetrics delegates to the provider and records each resolved call", async () => {
  const r1: LLMResponse = { content: "a", toolCalls: [], usage: { tokensIn: 7, tokensOut: 5 } };
  const r2: LLMResponse = { content: "b", toolCalls: [] };
  const fake = new FakeLLMProvider({ responses: [r1, r2] });
  const collector = new MetricsCollector();
  const clock = scriptedClock([1000, 1250, 2000, 2040]);
  const decorated = withMetrics(fake, collector, clock);
  const opts: CompletionOptions = { model: FakeLLMProvider.MODEL_ID };

  assert.strictEqual(decorated.id, "fake");
  assert.deepEqual(decorated.models(), fake.models());
  assert.strictEqual(await decorated.complete(messages, opts), r1);
  assert.strictEqual(await decorated.complete(messages, opts), r2);
  assert.strictEqual(fake.calls[0].messages, messages);
  assert.strictEqual(fake.calls[0].opts, opts);
  assert.deepEqual(collector.records(), [
    { model: "fake-model", tokensIn: 7, tokensOut: 5, durationMs: 250 },
    { model: "fake-model", tokensIn: null, tokensOut: null, durationMs: 40 },
  ]);
  // Four readings exactly: a fifth would have made a complete() reject, three would leave one.
  assert.throws(clock, /scripted clock exhausted after 4 readings/);
});

test("withMetrics reads Date.now when no clock is given", async () => {
  const collector = new MetricsCollector();
  const decorated = withMetrics(
    new FakeLLMProvider({ responses: [{ content: "ok", toolCalls: [] }] }),
    collector,
  );

  await decorated.complete(messages, { model: FakeLLMProvider.MODEL_ID });

  const records = collector.records();
  assert.strictEqual(records.length, 1);
  assert.strictEqual(Number.isFinite(records[0].durationMs), true);
});
```

### 1.2 Constater l'échec

1. `npm run build` → sortie attendue : `> tsc -p tsconfig.build.json`, code 0 (`tsconfig.build.json`
   ne compile que `src/`).
2. `node --test tests/metrics/application/use-cases/with-metrics.test.ts` → sortie attendue (observée
   par la sonde) : code de sortie 1 ; le fichier ne se charge pas,
   `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…\dist\metrics\application\use-cases\with-metrics.js'`,
   puis `not ok 1 - tests\\metrics\\application\\use-cases\\with-metrics.test.ts`
   (`failureType: 'testCodeFailure'`), fin TAP `# tests 1`, `# pass 0`, `# fail 1`. Le motif est le
   bon : `withMetrics` n'existe pas encore.

### 1.3 Écrire SPEC-1

Créer `src/metrics/application/use-cases/with-metrics.ts` (outil Write) :

```ts
import type { CompletionOptions, LLMProvider } from "../../../llm/interfaces/index.js";
import type { LLMResponse, Message, ModelInfo } from "../../../llm/models/index.js";
import type { MetricsCollector } from "./metrics-collector.js";

/**
 * Decorates `provider` so that every `complete` call that resolves leaves one record in
 * `collector` (ADR-AGENT-0007): the model the call asked for, `opts.model` (ADR-AGENT-0017),
 * the usage the provider reported, null when it reported none (absent is not zero), and how
 * long the call took on the clock `now`. The response comes back as is: the same object.
 *
 * The result is a new object literal of closures with exactly four own keys: `id`,
 * `supportsStreaming`, `models`, `complete`. Not a class, not a spread of the provider, not a
 * proxy: nothing else the provider carries shows through, and no method depends on `this`. The
 * provider itself is always called as a method, so one that relies on `this` keeps working.
 *
 * `now` defaults to `Date.now`, which is not monotonic: a system clock change during a call
 * skews its duration, and no bound hides it. Pass `() => performance.now()` for a monotonic one.
 *
 * Design: docs/specs/2026-09-30-with-metrics-design.md (#11).
 */
export function withMetrics(
  provider: LLMProvider,
  collector: MetricsCollector,
  now: () => number = Date.now,
): LLMProvider {
  return {
    id: provider.id,
    supportsStreaming: (): boolean => false,
    models: (): ModelInfo[] => provider.models(),
    complete: async (messages: Message[], opts: CompletionOptions): Promise<LLMResponse> => {
      const startedAt = now();
      const response = await provider.complete(messages, opts);
      collector.record({
        model: opts.model,
        tokensIn: response.usage?.tokensIn ?? null,
        tokensOut: response.usage?.tokensOut ?? null,
        durationMs: now() - startedAt,
      });
      return response;
    },
  };
}
```

Imports de types seulement (effacés à la compilation) : aucune dépendance d'exécution vers `llm`,
aucun import de `./testing`, de `fs` ni de `path`. `supportsStreaming: () => false` et le `await` nu
sont exigés dès ici par le type de retour et par le chemin nominal (spécification, « Ordre des
commits ») ; leurs règles écrites arrivent aux tâches 2 et 3.

### 1.4 Constater le succès

1. `npm run build` → sortie attendue : `> tsc -p tsconfig.build.json`, code 0.
2. `node --test tests/metrics/application/use-cases/with-metrics.test.ts` → sortie attendue :
   code 0, `ok 1 - withMetrics delegates to the provider and records each resolved call`,
   `ok 2 - withMetrics reads Date.now when no clock is given`, fin TAP `# tests 2`, `# pass 2`,
   `# fail 0`.
3. `npm run typecheck` → sortie attendue : `> tsc --noEmit`, code 0, aucune erreur.

### 1.5 Commit

1. Cocher `[SPEC-1]` et `[TEST-1]` dans `docs/specs/2026-09-30-with-metrics-checklist.md`
   (`- [ ]` → `- [x]`, rien d'autre).
2. `git add docs/specs/2026-09-30-with-metrics-design.md docs/specs/2026-09-30-with-metrics-checklist.md docs/plans/2026-09-30-with-metrics-estimate.json docs/plans/2026-09-30-with-metrics-plan.md src/metrics/application/use-cases/with-metrics.ts tests/metrics/application/use-cases/with-metrics.test.ts`
   → sortie attendue : vide ou avertissements `LF will be replaced by CRLF` seulement.
3. Écrire `<dossier_tmp>/agent-core-issue11-commit-msg.txt` (outil Write), en remplaçant `<id>` par
   l'identifiant de session du builder et `<modèle>` par son modèle :
   ```
   feat(metrics): mesurer chaque complete résolu avec withMetrics

   withMetrics(provider, collector, now = Date.now) rend un objet
   littéral neuf à quatre clés (id, supportsStreaming, models,
   complete). complete délègue avec les mêmes références, enregistre
   modèle, usage (null si absent) et durée, puis rend la réponse telle
   quelle. Versionne aussi la spécification, la checklist,
   l'estimation et le plan de l'issue.

   Refs: #11
   Session: <id>
   Model: <modèle>
   Authorship: ai
   ```
4. `git commit -F <dossier_tmp>/agent-core-issue11-commit-msg.txt` → sortie attendue :
   `[feat/11-with-metrics <sha>] feat(metrics): mesurer chaque complete résolu avec withMetrics`,
   `6 files changed`, deux `create mode` pour les fichiers de `src/` et `tests/` et quatre pour les
   documents.

---

## Tâche 2 · SPEC-2 · un appel qui lève n'enregistre rien et propage la même erreur

### 2.1 Écrire TEST-2

Dans `tests/metrics/application/use-cases/with-metrics.test.ts` (outil Edit), remplacer :

```ts
import { FakeLLMProvider } from "../../../../dist/testing/index.js";
import type { CompletionOptions } from "../../../../dist/llm/interfaces/index.js";
```

par :

```ts
import { FakeLLMProvider } from "../../../../dist/testing/index.js";
import { LLMError } from "../../../../dist/llm/index.js";
import type { CompletionOptions, LLMProvider } from "../../../../dist/llm/interfaces/index.js";
```

Puis, dans le même fichier, remplacer la fin du dernier test :

```ts
  const records = collector.records();
  assert.strictEqual(records.length, 1);
  assert.strictEqual(Number.isFinite(records[0].durationMs), true);
});
```

par :

```ts
  const records = collector.records();
  assert.strictEqual(records.length, 1);
  assert.strictEqual(Number.isFinite(records[0].durationMs), true);
});

test("a call the provider refuses records nothing and rejects with the provider's error", async () => {
  const collector = new MetricsCollector();
  const decorated = withMetrics(new FakeLLMProvider({ responses: [] }), collector);

  await assert.rejects(
    decorated.complete(messages, { model: "other-model" }),
    (err: unknown) => err instanceof LLMError && err.code === "MODEL_NOT_FOUND",
  );
  assert.deepEqual(collector.records(), []);
});

test("a provider error comes back as the very same reference, unwrapped", async () => {
  const boom = new LLMError("API_ERROR", "provider down");
  const failing: LLMProvider = {
    id: "failing",
    supportsStreaming: () => false,
    models: () => [{ id: "failing-model", supportsTools: false }],
    complete: async () => {
      throw boom;
    },
  };
  const collector = new MetricsCollector();

  await assert.rejects(
    withMetrics(failing, collector).complete(messages, { model: "failing-model" }),
    (err: unknown) => err === boom,
  );
  assert.deepEqual(collector.records(), []);
});

test("a failed call after a resolved one leaves the resolved one's record only", async () => {
  const collector = new MetricsCollector();
  const decorated = withMetrics(
    new FakeLLMProvider({ responses: [{ content: "only", toolCalls: [] }] }),
    collector,
  );
  const opts: CompletionOptions = { model: FakeLLMProvider.MODEL_ID };

  await decorated.complete(messages, opts);
  await assert.rejects(
    decorated.complete(messages, opts),
    (err: unknown) =>
      err instanceof Error && err.message.includes("no scripted response for call #2"),
  );
  assert.strictEqual(collector.records().length, 1);
});
```

### 2.2 Constater que le test passe déjà, puis qu'il n'est pas vide (mutation locale)

Le code de SPEC-1 (`await` puis `record`) satisfait déjà SPEC-2 : c'est prévu par la spécification
(« Ordre des commits et preuve de rouge »). La preuve que TEST-2 n'est pas vide est une mutation
locale, **jamais commitée**.

1. `npm run build` → sortie attendue : `> tsc -p tsconfig.build.json`, code 0.
2. `node --test tests/metrics/application/use-cases/with-metrics.test.ts` → sortie attendue :
   code 0, `ok 1` à `ok 5`, fin TAP `# tests 5`, `# pass 5`, `# fail 0`.
3. Mutation « `record` dans un `finally` ». Dans `src/metrics/application/use-cases/with-metrics.ts`
   (outil Edit), remplacer :
   ```ts
         const startedAt = now();
         const response = await provider.complete(messages, opts);
         collector.record({
           model: opts.model,
           tokensIn: response.usage?.tokensIn ?? null,
           tokensOut: response.usage?.tokensOut ?? null,
           durationMs: now() - startedAt,
         });
         return response;
   ```
   par :
   ```ts
         const startedAt = now();
         let response: LLMResponse | undefined;
         try {
           response = await provider.complete(messages, opts);
           return response;
         } finally {
           collector.record({
             model: opts.model,
             tokensIn: response?.usage?.tokensIn ?? null,
             tokensOut: response?.usage?.tokensOut ?? null,
             durationMs: now() - startedAt,
           });
         }
   ```
4. `npm run build` → sortie attendue : code 0.
5. `node --test tests/metrics/application/use-cases/with-metrics.test.ts` → sortie attendue
   (observée par la sonde) : code 1, `ok 1`, `ok 2`, puis
   `not ok 3 - a call the provider refuses records nothing and rejects with the provider's error`
   (`AssertionError`, diff `+ actual - expected` : un enregistrement au lieu de `[]`),
   `not ok 4 - a provider error comes back as the very same reference, unwrapped` (idem),
   `not ok 5 - a failed call after a resolved one leaves the resolved one's record only`
   (`expected: 1`, `actual: 2`) ; fin TAP `# tests 5`, `# pass 2`, `# fail 3`.
6. `git restore src/metrics/application/use-cases/with-metrics.ts` puis
   `git diff --stat -- src/metrics/application/use-cases/with-metrics.ts` → sortie attendue : vide
   (la mutation est retirée).

### 2.3 Écrire SPEC-2

Dans `src/metrics/application/use-cases/with-metrics.ts` (outil Edit), remplacer :

```ts
 * Design: docs/specs/2026-09-30-with-metrics-design.md (#11).
```

par :

```ts
 * A call that fails records nothing. When `provider.complete` rejects, the `await` below rethrows
 * the very same error, neither wrapped nor converted, and `collector.record` is never reached: no
 * `finally` records the call, no `catch` replaces its error. A `UsageRecord` cannot tell a failed
 * call from a resolved one, so counting it would skew both `calls` and `durationMs`.
 *
 * Design: docs/specs/2026-09-30-with-metrics-design.md (#11).
```

Le corps de `complete` ne change pas : le `await` nu, sans `try`, est la garantie par le code.

### 2.4 Constater le succès

1. `npm run build` → sortie attendue : code 0.
2. `node --test tests/metrics/application/use-cases/with-metrics.test.ts` → sortie attendue :
   code 0, `ok 1` à `ok 5`, `# tests 5`, `# pass 5`, `# fail 0`.
3. `npm run typecheck` → sortie attendue : `> tsc --noEmit`, code 0.

### 2.5 Commit

1. Cocher `[SPEC-2]` et `[TEST-2]` dans la checklist.
2. `git add docs/specs/2026-09-30-with-metrics-checklist.md src/metrics/application/use-cases/with-metrics.ts tests/metrics/application/use-cases/with-metrics.test.ts`
   → sortie attendue : vide ou avertissements de fin de ligne seulement.
3. Réécrire `<dossier_tmp>/agent-core-issue11-commit-msg.txt` (outil Read, puis Write) :
   ```
   feat(metrics): withMetrics n'enregistre rien d'un appel qui lève

   Un complete qui rejette ne laisse aucun enregistrement et fait
   rejeter le décorateur avec la même référence d'erreur, non
   enveloppée. TEST-2 passe dès son écriture (le await nu de SPEC-1
   suffit) ; preuve qu'il n'est pas vide, mutation locale non commitée :
   record déplacé dans un finally → 3 échecs sur 5 (tests 3, 4 et 5).

   Refs: #11
   Session: <id>
   Model: <modèle>
   Authorship: ai
   ```
4. `git commit -F <dossier_tmp>/agent-core-issue11-commit-msg.txt` → sortie attendue :
   `[feat/11-with-metrics <sha>] feat(metrics): withMetrics n'enregistre rien d'un appel qui lève`,
   `3 files changed`.

---

## Tâche 3 · SPEC-3 · `withMetrics` ne diffuse jamais en flux

### 3.1 Écrire TEST-3

Dans `tests/metrics/application/use-cases/with-metrics.test.ts` (outil Edit), remplacer :

```ts
import { FakeLLMProvider } from "../../../../dist/testing/index.js";
```

par :

```ts
import { FakeLLMProvider, checkProviderContract } from "../../../../dist/testing/index.js";
```

Puis, dans le même fichier, remplacer la fin du dernier test :

```ts
      err instanceof Error && err.message.includes("no scripted response for call #2"),
  );
  assert.strictEqual(collector.records().length, 1);
});
```

par :

```ts
      err instanceof Error && err.message.includes("no scripted response for call #2"),
  );
  assert.strictEqual(collector.records().length, 1);
});

test("the decorated fake passes the provider contract, and only its resolved call is recorded", async () => {
  const collector = new MetricsCollector();
  const decorated = withMetrics(
    new FakeLLMProvider({
      responses: [{ content: "hi", toolCalls: [], usage: { tokensIn: 1, tokensOut: 1 } }],
    }),
    collector,
  );

  const report = await checkProviderContract(decorated);

  assert.strictEqual(report.ok, true, JSON.stringify(report.checks, null, 2));
  const records = collector.records();
  assert.strictEqual(records.length, 1);
  assert.strictEqual(records[0].model, "fake-model");
  assert.strictEqual(records[0].tokensIn, 1);
  assert.strictEqual(records[0].tokensOut, 1);
});

test("a decorated provider never streams, even when the provider it wraps does", () => {
  const streaming: LLMProvider = {
    id: "streaming",
    supportsStreaming: () => true,
    models: () => [{ id: "streaming-model", supportsTools: false }],
    complete: async () => ({ content: "", toolCalls: [] }),
    async *stream() {
      yield { contentDelta: "", done: true };
    },
  };

  const decorated = withMetrics(streaming, new MetricsCollector());

  assert.strictEqual(decorated.supportsStreaming(), false);
  assert.strictEqual("stream" in decorated, false);
  assert.deepEqual(Object.keys(decorated).sort(), ["complete", "id", "models", "supportsStreaming"]);
});
```

`checkProviderContract` appelle `complete` deux fois à travers le décorateur : le modèle non déclaré
rejette (`MODEL_NOT_FOUND`, rien n'est enregistré), le second appel résout : d'où exactement un
enregistrement.

### 3.2 Constater que le test passe déjà, puis qu'il n'est pas vide (deux mutations locales)

1. `npm run build` → sortie attendue : code 0.
2. `node --test tests/metrics/application/use-cases/with-metrics.test.ts` → sortie attendue :
   code 0, `ok 1` à `ok 7`, fin TAP `# tests 7`, `# pass 7`, `# fail 0`.
3. Mutation A « déléguer `supportsStreaming` ». Dans `src/metrics/application/use-cases/with-metrics.ts`
   (outil Edit), remplacer `    supportsStreaming: (): boolean => false,` par
   `    supportsStreaming: (): boolean => provider.supportsStreaming(),`.
4. `npm run build` → code 0. `node --test tests/metrics/application/use-cases/with-metrics.test.ts`
   → sortie attendue (observée) : code 1, `ok 1` à `ok 6`,
   `not ok 7 - a decorated provider never streams, even when the provider it wraps does`
   (`AssertionError`, `expected: false`, `actual: true`) ; `# tests 7`, `# pass 6`, `# fail 1`.
5. `git restore src/metrics/application/use-cases/with-metrics.ts` → puis
   `git diff --stat -- src/metrics/application/use-cases/with-metrics.ts` → sortie attendue : vide.
6. Mutation B « ajouter une clé `stream` ». Dans le même fichier (outil Edit), remplacer
   `    models: (): ModelInfo[] => provider.models(),` par les deux lignes :
   ```ts
       models: (): ModelInfo[] => provider.models(),
       stream: provider.stream?.bind(provider),
   ```
7. `npm run build` → code 0. `node --test tests/metrics/application/use-cases/with-metrics.test.ts`
   → sortie attendue (observée) : code 1, `ok 1` à `ok 6`, `not ok 7 - …` (`AssertionError`,
   `expected: false`, `actual: true` : c'est `"stream" in decorated` qui échoue, `supportsStreaming()`
   rendant encore `false`) ; `# tests 7`, `# pass 6`, `# fail 1`.
8. `git restore src/metrics/application/use-cases/with-metrics.ts` puis
   `git diff --stat -- src/metrics/application/use-cases/with-metrics.ts` → sortie attendue : vide.

### 3.3 Écrire SPEC-3

Dans `src/metrics/application/use-cases/with-metrics.ts` (outil Edit), remplacer :

```ts
 * Design: docs/specs/2026-09-30-with-metrics-design.md (#11).
```

par :

```ts
 * It never streams, whatever the provider declares (pilot's decision, #11): `supportsStreaming()`
 * returns `false` and the object has no `stream` key. The port requires `stream` as soon as
 * `supportsStreaming()` is true, and delegating `stream` without measuring it would let calls
 * escape the metrics in silence, a total that understates the run without saying so. The loop
 * only ever calls `complete`. A measured provider that must stream will be a SPEC of its own,
 * with its test, never a default `true` nor an unmeasured `stream`.
 *
 * Design: docs/specs/2026-09-30-with-metrics-design.md (#11).
```

Le code ne change pas : `supportsStreaming: (): boolean => false` et l'objet littéral sans `stream`
sont la garantie par construction. Le fichier fait alors 54 lignes.

### 3.4 Constater le succès

1. `npm run build` → sortie attendue : code 0.
2. `node --test tests/metrics/application/use-cases/with-metrics.test.ts` → sortie attendue :
   code 0, `ok 1` à `ok 7`, `# tests 7`, `# pass 7`, `# fail 0`.
3. `npm run typecheck` → sortie attendue : `> tsc --noEmit`, code 0.

### 3.5 Commit

1. Cocher `[SPEC-3]` et `[TEST-3]` dans la checklist.
2. `git add docs/specs/2026-09-30-with-metrics-checklist.md src/metrics/application/use-cases/with-metrics.ts tests/metrics/application/use-cases/with-metrics.test.ts`.
3. Réécrire `<dossier_tmp>/agent-core-issue11-commit-msg.txt` (outil Read, puis Write) :
   ```
   feat(metrics): withMetrics ne diffuse jamais en flux

   supportsStreaming() rend false et l'objet rendu n'a aucune clé
   stream, quel que soit le fournisseur décoré (décision du pilote,
   écrite dans le commentaire de conception). checkProviderContract
   passe sur le décorateur. TEST-3 passe dès son écriture ; preuve
   qu'il n'est pas vide, mutations locales non commitées :
   supportsStreaming délégué → 1 échec sur 7 ; clé stream ajoutée →
   1 échec sur 7.

   Refs: #11
   Session: <id>
   Model: <modèle>
   Authorship: ai
   ```
4. `git commit -F <dossier_tmp>/agent-core-issue11-commit-msg.txt` → sortie attendue :
   `[feat/11-with-metrics <sha>] feat(metrics): withMetrics ne diffuse jamais en flux`,
   `3 files changed`.

---

## Tâche 4 · SPEC-4 · exporter `withMetrics` depuis le point d'entrée

### 4.1 Écrire TEST-4

Dans `tests/barrel-contract.test.ts` (outil Edit), remplacer :

```ts
  for (const name of ["aggregate", "MetricsCollector"]) {
    assert.equal(typeof surface[name], "function", `missing ${name}`);
  }
  for (const barrel of [llm, testing]) {
    const other = barrel as Record<string, unknown>;
    assert.equal(other.aggregate, undefined);
    assert.equal(other.MetricsCollector, undefined);
  }
```

par :

```ts
  for (const name of ["aggregate", "MetricsCollector", "withMetrics"]) {
    assert.equal(typeof surface[name], "function", `missing ${name}`);
  }
  for (const barrel of [llm, testing]) {
    const other = barrel as Record<string, unknown>;
    assert.equal(other.aggregate, undefined);
    assert.equal(other.MetricsCollector, undefined);
    assert.equal(other.withMetrics, undefined);
  }
```

Puis, dans le même fichier, remplacer la fin du fichier :

```ts
  assert.equal(fromCollector.calls, 1);
  assert.equal(fromFunction.calls, 1);
});
```

par :

```ts
  assert.equal(fromCollector.calls, 1);
  assert.equal(fromFunction.calls, 1);
});

// Same reasoning as the type tests above: what `withMetrics` returns is a type, so `node --test`
// cannot see it drift from the port. Annotating it `LLMProvider` pins it under `npm run typecheck`,
// and the record proves the decorator served by `.` really measures.
test("`.` exposes withMetrics, and what it returns is still an LLMProvider", async () => {
  const collector = new root.MetricsCollector();
  const measured: LLMProvider = root.withMetrics(
    new testing.FakeLLMProvider({ responses: [{ content: "ok", toolCalls: [] }] }),
    collector,
  );

  await measured.complete([{ role: "user", content: "hi" }], {
    model: testing.FakeLLMProvider.MODEL_ID,
  });

  assert.equal(collector.records().length, 1);
});
```

`LLMProvider` est déjà importé en type depuis `@arthurolivierfortin/agent-core` (l.14) : aucune ligne
d'import ne change. `tests/metrics/application/use-cases/with-metrics.test.ts` continue d'importer
`withMetrics` depuis `dist/metrics/application/use-cases/with-metrics.js` : il n'est pas modifié.

### 4.2 Constater l'échec

1. `npm run build` → sortie attendue : code 0.
2. `node --test tests/barrel-contract.test.ts` → sortie attendue (observée) : code 1, `ok 1` à
   `ok 15`, puis
   `not ok 16 - \`.\` exposes the metrics framework, and neither \`./llm\` nor \`./testing\` carries it`
   (`AssertionError`, message `missing withMetrics`, `expected: 'function'`, `actual: 'undefined'`),
   `ok 17`, puis
   `not ok 18 - \`.\` exposes withMetrics, and what it returns is still an LLMProvider`
   (`TypeError`, `root.withMetrics is not a function`) ; fin TAP `# tests 18`, `# pass 16`,
   `# fail 2`. Le motif est le bon : `.` ne sert pas encore `withMetrics`.
3. `npm run typecheck` → sortie attendue (observée) : code 2, une seule erreur,
   `tests/barrel-contract.test.ts(232,38): error TS2339: Property 'withMetrics' does not exist on type 'typeof import(".../dist/index", …)'`
   (le verrou de type est rouge lui aussi).

### 4.3 Écrire SPEC-4

Dans `src/metrics/index.ts` (outil Edit), remplacer :

```ts
export * from "./application/use-cases/metrics-collector.js";
```

par :

```ts
export * from "./application/use-cases/metrics-collector.js";
export * from "./application/use-cases/with-metrics.js";
```

`src/index.ts` le sert déjà par `export * from "./metrics/index.js";` : aucune ligne n'y change.
`src/llm/index.ts` et `src/testing/index.ts` ne changent pas.

### 4.4 Constater le succès

1. `npm run build` → sortie attendue : code 0.
2. `node --test tests/barrel-contract.test.ts` → sortie attendue : code 0, `ok 1` à `ok 18`,
   `# tests 18`, `# pass 18`, `# fail 0`.
3. `npm run typecheck` → sortie attendue : `> tsc --noEmit`, code 0, aucune erreur.

### 4.5 Commit

1. Cocher `[SPEC-4]` et `[TEST-4]` dans la checklist.
2. `git add docs/specs/2026-09-30-with-metrics-checklist.md src/metrics/index.ts tests/barrel-contract.test.ts`.
3. Réécrire `<dossier_tmp>/agent-core-issue11-commit-msg.txt` (outil Read, puis Write) :
   ```
   feat(metrics): exporter withMetrics depuis le point d'entrée

   src/metrics/index.ts réexporte with-metrics : withMetrics est servi
   par . et absent de ./llm et ./testing. Verrou dans
   barrel-contract.test.ts : valeur (typeof function, undefined
   ailleurs) et type (retour annoté LLMProvider, contrôlé par
   npm run typecheck).

   Refs: #11
   Session: <id>
   Model: <modèle>
   Authorship: ai
   ```
4. `git commit -F <dossier_tmp>/agent-core-issue11-commit-msg.txt` → sortie attendue :
   `[feat/11-with-metrics <sha>] feat(metrics): exporter withMetrics depuis le point d'entrée`,
   `3 files changed`.

---

## Tâche 5 · gates et contrôles de PR

Chaque gate par son propre appel, `timeout` 600000, dans cet ordre (le typecheck lit les `.d.ts`
de `dist/` produits par le build, et `tests/` importe `dist/`) :

| Gate | Commande | Sortie attendue |
|---|---|---|
| GATE-1 build | `npm run build` | `> tsc -p tsconfig.build.json`, code 0, aucune erreur |
| GATE-2 typecheck | `npm run typecheck` | `> tsc --noEmit`, code 0, aucune erreur |
| GATE-3 test | `npm run test` | fin TAP : `# tests 168`, `# pass 167`, `# fail 0`, `# skipped 1` (160 + 8 cas ajoutés : 2 à la tâche 1, 3 à la tâche 2, 2 à la tâche 3, 1 à la tâche 4) |

Puis, dans `docs/specs/2026-09-30-with-metrics-checklist.md` : cocher `[GATE-1]`, `[GATE-2]`,
`[GATE-3]`, et inscrire sous `## Hypothèses` les lignes H1 à H8 de la section « Hypothèses » de ce
plan, une par ligne, préfixées `- [H]`. `git add docs/specs/2026-09-30-with-metrics-checklist.md`,
message (outil Read puis Write sur `<dossier_tmp>/agent-core-issue11-commit-msg.txt`) :

```
chore(checklist): cocher les gates et consigner les hypothèses

Refs: #11
Session: <id>
Model: <modèle>
Authorship: ai
```

`git commit -F <dossier_tmp>/agent-core-issue11-commit-msg.txt` → sortie attendue : `1 file changed`.

Contrôles, chaque commande par son propre appel, résultats à recopier dans le corps de PR
(`<dossier_tmp>/agent-core-issue11-pr-body.md`) :

1. `git fetch origin` → sortie attendue : vide ou une ligne de mise à jour.
2. `git log --oneline HEAD..origin/main` → sortie attendue : vide (sinon : `main` a bougé, le
   signaler au pilote avant la PR, sans rebase ni merge décidé seul).
3. `git diff --name-only origin/main...HEAD` → sortie attendue, exactement ces 8 chemins (ordre de git) :
   ```
   docs/plans/2026-09-30-with-metrics-estimate.json
   docs/plans/2026-09-30-with-metrics-plan.md
   docs/specs/2026-09-30-with-metrics-checklist.md
   docs/specs/2026-09-30-with-metrics-design.md
   src/metrics/application/use-cases/with-metrics.ts
   src/metrics/index.ts
   tests/barrel-contract.test.ts
   tests/metrics/application/use-cases/with-metrics.test.ts
   ```
4. `git diff --stat origin/main...HEAD -- src/agent/application/use-cases/step.ts src/index.ts src/llm src/testing`
   → sortie attendue : vide (`step.ts`, `src/index.ts`, le port, le fake, `checkProviderContract` et
   les barrels `./llm` et `./testing` inchangés).
5. `git grep -n "console.log" -- src/metrics tests/metrics` → sortie attendue : vide, code 1.
6. `git grep -n -E "process\.env|\.env" -- src/metrics` → sortie attendue : vide, code 1.
7. `git grep -n "stream:" -- src/metrics` → sortie attendue : vide, code 1 (aucune clé `stream`
   dans le décorateur ; la sonde a constaté que le mot `stream` n'apparaît que dans les lignes de
   commentaire 24 à 29 de `with-metrics.ts`).
8. `git log --format=%B origin/main..HEAD` puis vérifier à la lecture : aucune ligne
   `Co-Authored-By`, cinq blocs de trailers `Refs: #11` / `Session:` / `Model:` / `Authorship: ai`.
9. `python C:/Projects/dev-kit/scripts/pr_size.py origin/main HEAD --body-file <dossier_tmp>/agent-core-issue11-pr-body.md`
   (après écriture du corps) → sortie attendue :
   `hors docs/ et *.md : +222/-1 lignes (code +55, tests +167), seuil 400 respecté`, code 0.
   Détail mesuré par la sonde : `src/metrics/application/use-cases/with-metrics.ts` +54,
   `src/metrics/index.ts` +1, `tests/metrics/application/use-cases/with-metrics.test.ts` +148,
   `tests/barrel-contract.test.ts` +19/-1. Recopier la ligne mesurée dans le corps de PR.

Corps de PR (outil Write sur `<dossier_tmp>/agent-core-issue11-pr-body.md`, gabarit des PR du
dépôt : Contexte, Changements, Vérifications, Métriques, Risques et suivi, Message de squash
proposé). Il porte obligatoirement :

- `Closes #11` dans « Contexte », et le rappel : lot 1 du découpage de #8 (#8 = `runMatrix`, qui
  consomme `withMetrics` ; #12 = summary et `toJSON`).
- Les trois gates avec leur dernière ligne de sortie, et la référence (160 tests sur fc3e35f, 8
  ajoutés).
- Les contrôles 2 à 9 ci-dessus avec leur résultat.
- Les preuves de non-vacuité de TEST-2 et TEST-3 (mutations et sorties des tâches 2.2 et 3.2), et
  le rouge de TEST-1 (`ERR_MODULE_NOT_FOUND`) et de TEST-4 (`# fail 2`, TS2339).
- La décision de streaming (SPEC-3) en une phrase, avec son coût accepté : un consommateur qui veut
  le flux appelle le fournisseur non décoré, dont les appels ne sont pas mesurés.
- **Toutes** les hypothèses H1 à H8 de ce plan, chacune nommée et recopiée en entier (aucune
  omise ni résumée en « autres hypothèses »).
- Aucun fichier `.env` ouvert ni lu ; aucun fournisseur hébergé appelé (seuls `FakeLLMProvider` et
  les deux fournisseurs littéraux du fichier de test) ; dérogations invoquées : aucune.
- Le message de squash proposé, sans ligne `Co-Authored-By`, trailers `Refs: #11` / `Session` /
  `Model` / `Authorship: ai`.

Relire le fichier (outil Read) dans l'appel qui précède immédiatement toute commande qui le publie.

---

## Hypothèses (à recopier toutes dans la checklist et dans la PR)

- **H1** · Les documents de l'issue (spécification, checklist, estimation, plan) entrent dans le
  commit de la tâche 1, même pratique que #2 et #1.
- **H2** · Portées de commit : `feat(metrics)` pour SPEC-1 à SPEC-4 (sujets repris de la
  spécification), `chore(checklist)` pour le cochage des gates et l'inscription des hypothèses.
- **H3** · Rédaction des commentaires de conception (anglais, le pourquoi) et des noms de tests
  choisie par ce plan dans le cadre fixé par la spécification (« Signature et forme », « Chemin
  d'erreur », « Streaming »). Le commentaire de SPEC-1 mentionne aussi l'horloge non monotone et
  `() => performance.now()` (spécification, « Décisions »).
- **H4** · Découpage des tests : TEST-1 en deux cas (horloge scriptée ; horloge par défaut),
  TEST-2 en trois (refus `MODEL_NOT_FOUND`, erreur `=== boom`, succès puis échec), TEST-3 en deux
  (contrat ; streaming), TEST-4 = un cas étendu et un cas neuf.
- **H5** · « L'horloge scriptée est épuisée (quatre appels exactement) » est vérifié par
  `assert.throws(clock, /scripted clock exhausted after 4 readings/)` après les deux `complete` :
  une cinquième lecture aurait fait rejeter un `complete`, trois laisseraient une valeur.
- **H6** · Le cas `MODEL_NOT_FOUND` de TEST-2 décore `new FakeLLMProvider({ responses: [] })` : le
  fake refuse le modèle avant de lire son script.
- **H7** · TEST-2 et TEST-3 passent dès leur écriture (prévu par la spécification) ; leur
  non-vacuité est prouvée par des mutations locales non commitées, décrites dans les corps de
  commit des tâches 2 et 3 : `record` dans un `finally` (3 échecs sur 5) ; `supportsStreaming`
  délégué (1 échec sur 7) ; clé `stream` ajoutée (1 échec sur 7).
- **H8** · Les rouges et verts des tâches 1 à 4 se constatent fichier par fichier
  (`node --test <fichier>` après `npm run build`) ; la suite complète ne tourne qu'aux tâches 0 et 5.

## Risques

- **`ROADMAP.md:139` diverge** : l'arborescence indicative place `withMetrics` dans
  `llm/infrastructure/with-metrics.ts`, alors que la spécification le place dans
  `src/metrics/application/use-cases/` (règle 4 de `docs/conventions/architecture.md`). La
  documentation est hors périmètre : la PR le signale dans « Risques et suivi », sans modifier
  `ROADMAP.md`.
- **En-tête de la checklist** : il porte le suffixe « (lot 1 de #8) » absent du titre réel de
  l'issue. Sans effet sur les identifiants ; `spec-writer` ou le pilote le corrige s'il le
  souhaite, le builder n'y touche pas.
- **`dist/` périmé** : les tests importent `dist/`, jamais `src/`. Lancer `node --test` sans
  `npm run build` juste avant, en particulier après un `git restore` de mutation, fait constater
  l'état précédent.
- **Mutation oubliée** : une mutation des tâches 2.2 ou 3.2 laissée dans le fichier serait
  commitée. Le `git diff --stat` vide après chaque `git restore` est la garde ; le contrôle 7 de la
  tâche 5 la double pour `stream`.
- **Verrou de type de TEST-4** : l'annotation `LLMProvider` n'est vérifiée que par GATE-2 ;
  `node --test` retire les types sans les contrôler. GATE-2 doit passer après GATE-1.
- **Fins de ligne** : copies de travail en CRLF ; les blocs « Remplacer » sont en LF. Si l'outil Edit
  ne trouve pas un bloc, relire le fichier (outil Read) et recopier le bloc depuis la lecture, sans
  changer le texte.
- **Horloge par défaut non monotone** : `Date.now` peut produire une durée fausse, voire négative,
  si l'horloge système change pendant un appel ; accepté par la spécification, documenté dans le
  commentaire, non testé (le cas par défaut ne vérifie que `Number.isFinite`).
