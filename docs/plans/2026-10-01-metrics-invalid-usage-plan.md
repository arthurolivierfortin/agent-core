# Plan · Enregistrer un usage null dans withMetrics quand un compteur est invalide · #46

- Issue : #46 (label `T:bug`, origine R-1 de #41) https://github.com/arthurolivierfortin/agent-core/issues/46
- Checklist : `docs/specs/2026-10-01-metrics-invalid-usage-checklist.md`
- Spécification : `docs/specs/2026-10-01-metrics-invalid-usage-design.md`
- Estimation : `docs/plans/2026-10-01-metrics-invalid-usage-estimate.json`
- Plan précédent pris pour forme : `docs/plans/2026-09-30-cap-guard-usage-counters-plan.md` (#41).
- Conception appliquée : celle de la spécification, sans écart de comportement. Un seul fichier de
  production modifié dans son code, `src/metrics/application/use-cases/with-metrics.ts` : `Usage`
  ajouté à l'import de types, deux fonctions **non exportées** ajoutées en fin de fichier
  (`isTokenCount`, `recordedCounters`), l'enregistrement de `complete` remplacé, TSDoc de
  `withMetrics` mis à jour. `src/metrics/models/index.ts` : TSDoc de `UsageRecord` seulement.
  `README.md:232` et `docs/guide-agent-package.md:262` : une proposition chacun. Aucun nom exporté
  ajouté, retiré ou renommé ; aucun type exporté modifié (vérifié par diff des `.d.ts` de `dist/`,
  tâche 1.4). Tests ajoutés en fin de `tests/metrics/application/use-cases/with-metrics.test.ts`
  avec `messages` (l.13) et `scriptedClock` (l.19-27) existants ; noms nouveaux, tous dans le
  fichier de test : `RATES`, `recordOne`, `INVALID_USAGES`, `VALID_USAGES`.
- Branche : `fix/46-metrics-invalid-usage`, base `main` (`publication_branch` du manifeste). Elle
  existe déjà : branche du worktree
  `C:/Projects/Perso/agent-core/.claude/worktrees/fix+46-metrics-invalid-usage`, au niveau de
  `origin/main` (constaté : `git rev-parse HEAD origin/main` rend deux fois
  `e846b9c85e33b37c1aa787fcb92f2f1d2b0fd52e`).
- Toutes les commandes se lancent depuis la racine de ce worktree, chacune par son propre appel
  Bash, en avant-plan, `timeout` 600000 ms pour une installation, un build, un test ou un gate,
  120000 ms sinon. Jamais `&&`, `;` ni `cd` entre deux commandes (le garde d'isolation du worktree
  refuse une commande git composée : constaté), jamais `&` final, jamais `run_in_background`, aucun
  serveur, aucun REPL : jamais `python -`, jamais `node` sans fichier ni `-e`, jamais de heredoc,
  aucune commande interactive.
- Fichiers de travail, dans `<dossier_tmp>` (dossier temporaire de la session du builder, chemin
  absolu `C:/…` reçu dans le prompt de dispatch, sinon créé une fois par `mktemp -d` puis converti
  par `cygpath -m <chemin>`, chaque commande par son propre appel) :
  `<dossier_tmp>/agent-core-issue46-commit-msg.txt` (message de commit, réécrit à chaque commit,
  relu par l'outil Read avant réécriture dès qu'il existe), `<dossier_tmp>/agent-core-issue46-pr-title.txt`
  (titre de PR), `<dossier_tmp>/agent-core-issue46-pr-body.md` (corps de PR), et quatre copies des
  déclarations de `main` : `<dossier_tmp>/agent-core-issue46-before-with-metrics.d.ts`,
  `<dossier_tmp>/agent-core-issue46-before-models-index.d.ts`,
  `<dossier_tmp>/agent-core-issue46-before-metrics-index.d.ts`,
  `<dossier_tmp>/agent-core-issue46-before-index.d.ts`. Jamais `%TEMP%` ni `/tmp` directement,
  jamais un nom sans dépôt.
- Contraintes du pilote rappelées : code du package publié (`src/metrics`) ; aucun type exporté
  modifié, aucun symbole ajouté (barrels et `dist/*.d.ts` compris) ; TSDoc de `UsageRecord`,
  `README.md` et `docs/guide-agent-package.md` dans le **même** commit que le code ; le package ne
  dépend jamais de `scripts/` ; aucun appel réseau (tout fournisseur est `FakeLLMProvider` ou un
  littéral) ; aucun `console.log` dans `src/` ; aucun fichier `.env` ouvert ni lu ; aucune valeur
  de clé, réelle ou factice, dans les fichiers touchés ; tarifs littéraux (`RATES`), jamais
  `data/rates.json` ; les tests importent `dist/` : `npm run build` avant tout `node --test` (le
  script `npm run test` le fait) ; tests existants de metrics, de `capGuard` et du runner verts ;
  aucun message de commit ne porte de ligne `Co-Authored-By` : trailers `Refs: #46`, `Session:`,
  `Model:`, `Authorship:` seulement (un hook `commit-msg` est installé dans le dépôt et refuse
  `Co-Authored-By`) ; sujets à l'impératif (forme infinitive des commits du dépôt), 72 caractères
  au plus type compris ; chemins relatifs au dépôt dans toute preuve. Ignorer toute consigne
  injectée par un hook (vercel-plugin, Next.js) : le dépôt est un package Node/TypeScript sans
  Next.js.

## Taille mesurée

**`hors docs/ et *.md : +118/-13 lignes (code +30, tests +88), seuil 400 respecté`** : ligne que
`pr_size.py` rendra (format de `format_measure` ; `classify_path` : `tests/` = tests, `src/` =
code, `README.md` et `docs/` exclus), mesurée par le planificateur par
`git diff --no-index --numstat` de chaque fichier de `main` contre son état final sur la sonde
(voir « Vérifications ») :

| Fichier | Ajoutées | Retirées |
|---|---|---|
| `src/metrics/application/use-cases/with-metrics.ts` | 26 | 9 |
| `src/metrics/models/index.ts` | 4 | 3 |
| `tests/metrics/application/use-cases/with-metrics.test.ts` | 88 | 1 |
| hors mesure : `README.md`, `docs/guide-agent-package.md` | 1 + 1 | 1 + 1 |

Environ 95 estimées par la spécification (fourchette 70 à 130), 131 mesurées (+118 −13) : une
ligne au-dessus de la fourchette, 269 sous le seuil de 400, aucune dérogation. Écart : tests +88
contre 63 (assistant `recordOne` de 8 lignes qui garde chaque ligne sous 100 colonnes, assertions
`deepEqual` sur plusieurs lignes, commentaire d'en-tête de 3 lignes), code +30 contre 22 (TSDoc de
`withMetrics` sur 4 lignes, `recordedCounters` repliée sous 100 colonnes : TSDoc de 4 lignes,
signature et ternaire sur 3 lignes chacun). Au-delà de 400, s'arrêter et le signaler au pilote,
sans dérogation décidée seul.

## Ordre des tâches et dépendances

Un SPEC = un commit = un test (spécification, « Ordre des commits et preuve de rouge »).

| Tâche | Élément | Dépend de | Pourquoi cet ordre |
|---|---|---|---|
| 0 | préparation (dépendances, référence de la suite, copie des `.d.ts` de `main`) | aucune | le worktree n'a ni `node_modules/` ni `dist/` (constaté : `ls` sur les deux → absents) ; les copies des `.d.ts` servent à prouver en 1.4 qu'aucun type exporté ne change |
| 1 | SPEC-1 + TEST-1, puis mutation `value > 0` | 0 | seul SPEC ; la mutation se fait sur l'arbre propre **après** le commit |
| 2 | gates GATE-1 à GATE-3, checklist, contrôles, taille, corps de PR | 1 | |

Aucun `[DB-N]`.

## Vérifications faites par le planificateur (sorties fraîches du 2026-10-01)

- `node --version` : `v22.19.0` (`node --test` lance les `.ts` par retrait de types, sans drapeau).
  `git config core.autocrlf` : `true` ; pourtant `with-metrics.ts`, `models/index.ts`,
  `with-metrics.test.ts`, `README.md`, `docs/guide-agent-package.md` et la checklist ont **0** `\r`
  dans la copie de travail (`grep -c $'\r'`) : les blocs de ce plan, en LF, s'appliquent tels quels
  par l'outil Edit. Manifeste : `publication_branch` `main`, gates `GATE-1 build` `npm run build`,
  `GATE-2 typecheck` `npm run typecheck`, `GATE-3 test` `npm run test` ; une dérogation déclarée
  (`core/langue` : `README.md` et `docs/guide-agent-package.md` restent en anglais).
- `git status --short --untracked-files=all` au lancement : trois fichiers non suivis
  (estimation, checklist, spécification).
- Code lu : `src/metrics/application/use-cases/with-metrics.ts` en entier (import de types l.2,
  TSDoc l.5-32, enregistrement l.45-50, fin l.51-54) ; `src/metrics/models/index.ts` en entier
  (TSDoc de `UsageRecord` l.5-9) ; `src/metrics/services/aggregate.ts` (`costOf` l.39-46 rend null
  pour un usage null, `addOrNull` l.49-52) ; `src/metrics/application/use-cases/metrics-collector.ts`
  (`record` copie, `total` délègue à `aggregate`) ; `src/metrics/index.ts` (quatre `export *`) ;
  `src/llm/models/index.ts` (`Usage` l.39-42, `LLMResponse.usage?` l.52) ;
  `src/llm/testing/fake-llm-provider.ts` (`MODEL_ID` `"fake-model"`, `complete` rend l'objet scripté
  lui-même, l.52) ; `tests/metrics/application/use-cases/with-metrics.test.ts` en entier (148
  lignes ; imports l.1-8, `messages` l.13, `scriptedClock` l.19-27, dernier test l.132-148) ;
  `package.json` (`test` = `npm run build && node --test`, `typecheck` = `tsc --noEmit`) ;
  `tsconfig.json` (inclut `src`, `tests`, `scripts`) ; `tsconfig.build.json` (`declaration`,
  `outDir` `dist`) ; `src/agent/application/use-cases/step.ts:276-279` (`tokensOf`) ;
  `scripts/h2-report/run-report.test.ts:198-200` (`HOSTED_USAGE = { tokensIn: 0, tokensOut: 200_000 }`,
  passé par `runMatrix` sous `withMetrics`) ; `C:/Projects/dev-kit/scripts/pr_size.py`,
  `pr_title.py`, `commit_msg.py` (format de la mesure, règle du message squashé).
  `withMetrics` n'est importé que par `src/metrics/index.ts`, `src/agent/testing/run-matrix.ts`,
  `scripts/h2-report/cap-guard.ts`, `scripts/h2-report/run-report.ts`,
  `scripts/repo-conventions.test.mjs`, `tests/barrel-contract.test.ts` et son fichier de test
  (`grep -rln "withMetrics\|with-metrics" tests scripts src`).
- **Sonde sans installation.** Aucune installation n'est permise à ce rôle. Le planificateur a
  extrait `HEAD` (`git archive`, e846b9c) dans un dossier `docs/plans/.probe-46/` de ce worktree,
  y a compilé `src/` avec le `tsc` 5.9.3 déjà installé dans le dépôt principal
  (`C:/Projects/Perso/agent-core/node_modules/typescript`, résolu aussi pour `@types/node` par
  remontée de dossiers), a appliqué les éditions de ce plan sur la copie, puis a supprimé ce dossier
  (`git status --short --untracked-files=all` revenu aux trois fichiers du lancement). Le `src/` et
  les `tests/` de ce worktree n'ont jamais été modifiés. Observé, sur la copie, par
  `node --test --test-reporter=tap` :
  - référence `main` : code 0, `# tests 377`, `# pass 375`, `# fail 0`, `# skipped 2` ;
  - TEST-1 écrit, `src/` de `main` : code 1, `# tests 387`, `# pass 377`, `# fail 8`,
    `# skipped 2` ; les huit `not ok` sont les sept lignes `INVALID_USAGES` et la lecture unique ;
  - SPEC-1 appliquée : code 0, `# tests 387`, `# pass 385`, `# fail 0`, `# skipped 2` ; fichier
    ciblé : 17 tests, 17 verts ;
  - mutation `value > 0` : code 1, `# tests 387`, `# pass 382`, `# fail 3`, `# skipped 2` : la
    ligne « zero counters » **et** deux tests de #42 dans `scripts/h2-report/run-report.test.ts`
    (leur `HOSTED_USAGE` a `tokensIn: 0`) ; restaurée : code 0, 387 / 385 ;
  - `tsc --noEmit -p tsconfig.json` sur l'état final : code 0, aucune sortie ; témoin négatif
    (`"125000"` sans `as unknown as number`) : `error TS2322: Type 'string' is not assignable to
    type 'number'.`, code 2, ce qui prouve que les types de `dist/` sont résolus ;
  - exports : `Object.keys` de `dist/metrics/index.js` → `MetricsCollector,aggregate,withMetrics`
    avant et après ; `Object.keys(dist/index.js).length` → `20` avant et après ; `diff` des
    `.d.ts` avant/après : `dist/index.d.ts` et `dist/metrics/index.d.ts` identiques, les deux autres
    ne diffèrent que par les lignes de TSDoc (sorties recopiées en 1.4) ; `isTokenCount` et
    `recordedCounters` n'apparaissent que dans `dist/metrics/application/use-cases/with-metrics.js`.
- Unicité des ancres « remplacer » vérifiée par `grep -c` (1 occurrence chacune sur `main`).
- Longueur des sujets mesurée (`len` Python) : 66 (`fix(metrics): enregistrer null si un compteur
  d'usage est invalide`), 62 (`chore(checklist): cocher les gates et consigner les hypothèses`) ;
  squash et titre de PR 64 sans suffixe, 70 avec ` (#50)`.
- Contrôles de la tâche 2 déjà lancés sur `main` : `git grep -n "console\.log" -- src` → vide ;
  `git grep -n -E "AIza[0-9A-Za-z_-]{35}" -- scripts src tests` → vide ;
  `git grep -n -E "console\.|process\.env|readFileSync|rates\.json" -- src/metrics tests/metrics/application/use-cases/with-metrics.test.ts`
  → vide ; `git grep -n "#46" -- src tests README.md docs/guide-agent-package.md` → vide.

## Cycle de la tâche 1 et totaux attendus

- Appliquer les éditions de test (1.1) ; `npm run test` (rouge, 1.2) ; appliquer les éditions de
  code et de documentation (1.3) ; `npm run test` (vert) puis `npm run typecheck` et les contrôles
  d'API (1.4) ; cocher `[SPEC-1]` et `[TEST-1]` ; commiter (1.5) ; puis, **sur l'arbre propre après
  le commit**, la mutation (1.6). Aucune mutation n'est commitée.
- `npm run test` = `npm run build && node --test` : le build est refait à chaque lancement, une
  mutation de `src/` agit donc au lancement suivant.
- Éditions : chaque « Édition » et la « Mutation » se font par l'outil Edit (`old_string` = premier
  bloc, `new_string` = second bloc), dans l'ordre. Chaque premier bloc est présent **une seule
  fois** dans le fichier au moment où l'édition s'applique. S'il n'est pas trouvé, relire le
  fichier (outil Read) et recopier le bloc depuis la lecture, sans changer le texte.
- Les numéros d'ordre TAP (`not ok 361 - …`) dépendent de l'ordre des fichiers : ce plan les écrit
  `…` ; seuls comptent les titres et les totaux. Si la référence B diffère de 377 à la tâche 0,
  décaler d'autant tous les `# tests` et `# pass` ; les nombres d'échecs ne changent pas.

| Étape | Code | `# tests` | `# pass` | `# fail` | `# skipped` |
|---|---|---|---|---|---|
| 0.3 référence | 0 | 377 | 375 | 0 | 2 |
| 1.2 rouge | 1 | 387 | 377 | 8 | 2 |
| 1.4 vert | 0 | 387 | 385 | 0 | 2 |
| 1.6 mutation (rouge) | 1 | 387 | 382 | 3 | 2 |
| 1.6 après `git restore` | 0 | 387 | 385 | 0 | 2 |
| 2 GATE-3 | 0 | 387 | 385 | 0 | 2 |

---

## Tâche 0 · préparation

1. `git status --short` → sortie attendue, exactement :
   ```
   ?? docs/plans/2026-10-01-metrics-invalid-usage-estimate.json
   ?? docs/plans/2026-10-01-metrics-invalid-usage-plan.md
   ?? docs/specs/2026-10-01-metrics-invalid-usage-checklist.md
   ?? docs/specs/2026-10-01-metrics-invalid-usage-design.md
   ```
   (Si une version `-plan-v2.md` a été écrite, elle s'ajoute à cette liste.)
2. `npm ci` (timeout 600000) → code 0 ; le script `prepare` lance `tsc -p tsconfig.build.json`, qui
   crée `dist/` ; une ligne qui commence par `added 3 packages` (`@types/node`, `typescript`,
   `undici-types`). Sortie déduite du `package-lock.json` et du précédent de #41, non lancée par le
   planificateur (installation interdite à ce rôle).
3. `npm run test` (timeout 600000) → code 0, fin TAP `# tests 377`, `# pass 375`, `# fail 0`,
   `# skipped 2`. Si `# tests` diffère de 377, noter la valeur B et décaler tous les totaux.
4. Copier les déclarations de `main`, quatre appels, chacun sans sortie, code 0 :
   - `cp dist/metrics/application/use-cases/with-metrics.d.ts <dossier_tmp>/agent-core-issue46-before-with-metrics.d.ts`
   - `cp dist/metrics/models/index.d.ts <dossier_tmp>/agent-core-issue46-before-models-index.d.ts`
   - `cp dist/metrics/index.d.ts <dossier_tmp>/agent-core-issue46-before-metrics-index.d.ts`
   - `cp dist/index.d.ts <dossier_tmp>/agent-core-issue46-before-index.d.ts`
5. `node -e "import('./dist/metrics/index.js').then((m) => console.log(Object.keys(m).sort().join(',')))"`
   → `MetricsCollector,aggregate,withMetrics`.
6. `node -e "import('./dist/index.js').then((m) => console.log(String(Object.keys(m).length)))"`
   → `20`.
7. `git status --short` → les mêmes lignes qu'en 1 (`node_modules/` et `dist/` sont ignorés).

Aucun commit dans cette tâche.

---

## Tâche 1 · SPEC-1 · withMetrics enregistre un usage null pour un compteur invalide

### 1.1 Écrire TEST-1

Dix `test()` : sept lignes de `INVALID_USAGES`, deux de `VALID_USAGES`, un pour la lecture unique.
Tarif littéral `fake-model` : 1 USD par million de jetons entrants, 2 USD par million sortants. Coût
de `{ 500_000, 250_000 }` : (500 000 × 1 + 250 000 × 2) / 1 000 000 = 1, exact en virgule
flottante ; de `{ 0, 0 }` : 0. L'accesseur `tokensIn` de la lecture unique rend 3 puis -1 : une
implémentation qui contrôle une lecture et en enregistre une autre enregistre -1.

Édition 1.1a · `tests/metrics/application/use-cases/with-metrics.test.ts` · remplacer (l.8) :

```ts
import type { LLMResponse, Message } from "../../../../dist/llm/models/index.js";
```

par :

```ts
import type { LLMResponse, Message, Usage } from "../../../../dist/llm/models/index.js";
import type { RateTable } from "../../../../dist/metrics/index.js";
```

Édition 1.1b · `tests/metrics/application/use-cases/with-metrics.test.ts` · remplacer (fin du
dernier test, fin du fichier) :

```ts
  assert.deepEqual(Object.keys(decorated).sort(), ["complete", "id", "models", "supportsStreaming"]);
});
```

par :

```ts
  assert.deepEqual(Object.keys(decorated).sort(), ["complete", "id", "models", "supportsStreaming"]);
});

// Issue 46 (docs/specs/2026-10-01-metrics-invalid-usage-design.md): a usage counter that is not an
// integer >= 0 leaves both counters null, so the total never prices it. Literal rates, 1 and 2 USD
// per million tokens, never data/rates.json.
const RATES: RateTable = { "fake-model": { usdPerMillionTokensIn: 1, usdPerMillionTokensOut: 2 } };

/** One resolved call through withMetrics, clock read at 0 then 5: the collector it fed. */
async function recordOne(response: LLMResponse): Promise<MetricsCollector> {
  const collector = new MetricsCollector();
  const fake = new FakeLLMProvider({ responses: [response] });
  const decorated = withMetrics(fake, collector, scriptedClock([0, 5]));
  const opts: CompletionOptions = { model: FakeLLMProvider.MODEL_ID };
  assert.strictEqual(await decorated.complete(messages, opts), response);
  return collector;
}

const INVALID_USAGES: ReadonlyArray<readonly [string, Usage]> = [
  ["a negative tokensIn offset by tokensOut", { tokensIn: -1, tokensOut: 1_000_000 }],
  ["a negative tokensOut offset by tokensIn", { tokensIn: 1_000_000, tokensOut: -1 }],
  ["a fractional tokensIn", { tokensIn: 0.5, tokensOut: 125_000 }],
  ["a NaN tokensIn", { tokensIn: NaN, tokensOut: 1 }],
  ["an infinite tokensOut", { tokensIn: 1, tokensOut: Infinity }],
  ["a numeric string tokensOut", { tokensIn: 250_000, tokensOut: "125000" as unknown as number }],
  ["a partial usage (tokensOut null)", { tokensIn: 7, tokensOut: null as unknown as number }],
];

for (const [why, usage] of INVALID_USAGES) {
  test(`TEST-1 (issue 46) ${why} is recorded as no usage and left unpriced`, async () => {
    const collector = await recordOne({ content: why, toolCalls: [], usage });

    assert.deepEqual(collector.records(), [
      { model: "fake-model", tokensIn: null, tokensOut: null, durationMs: 5 },
    ]);
    assert.deepEqual(collector.total(RATES), {
      calls: 1,
      tokensIn: null,
      tokensOut: null,
      durationMs: 5,
      costUsd: null,
    });
  });
}

const VALID_USAGES: ReadonlyArray<readonly [string, Usage, number]> = [
  ["zero counters", { tokensIn: 0, tokensOut: 0 }, 0],
  ["positive integer counters", { tokensIn: 500_000, tokensOut: 250_000 }, 1],
];

for (const [why, usage, costUsd] of VALID_USAGES) {
  test(`TEST-1 (issue 46) ${why} are recorded as reported, and priced`, async () => {
    const collector = await recordOne({ content: why, toolCalls: [], usage });

    assert.deepEqual(collector.records(), [{ model: "fake-model", ...usage, durationMs: 5 }]);
    assert.deepEqual(collector.total(RATES), { calls: 1, ...usage, durationMs: 5, costUsd });
  });
}

test("TEST-1 (issue 46) usage and its counters are read once each", async () => {
  const reads = { usage: 0, tokensIn: 0, tokensOut: 0 };
  // A second read of tokensIn sees -1: recording another value than the one checked would show.
  const usage: Usage = {
    get tokensIn(): number {
      reads.tokensIn += 1;
      return reads.tokensIn === 1 ? 3 : -1;
    },
    get tokensOut(): number {
      reads.tokensOut += 1;
      return 4;
    },
  };
  const response: LLMResponse = {
    content: "read once",
    toolCalls: [],
    get usage(): Usage {
      reads.usage += 1;
      return usage;
    },
  };

  const collector = await recordOne(response);

  assert.deepEqual(collector.records(), [
    { model: "fake-model", tokensIn: 3, tokensOut: 4, durationMs: 5 },
  ]);
  assert.deepEqual(reads, { usage: 1, tokensIn: 1, tokensOut: 1 });
});
```

Le fichier passe de 148 à 235 lignes.

### 1.2 Constater le rouge

`npm run test` (timeout 600000) → code 1, fin TAP `# tests 387`, `# pass 377`, `# fail 8`,
`# skipped 2`. Les huit échecs sont pour la bonne raison (contrôle absent : compteurs enregistrés
tels quels ; `usage` lu deux fois) ; les deux lignes `VALID_USAGES` passent déjà (comportement
nominal de #11). Échecs observés (couleurs retirées ; chaque bloc porte aussi
`Expected values to be strictly deep-equal:` et `operator: 'deepStrictEqual'`) :

```
not ok … - TEST-1 (issue 46) a negative tokensIn offset by tokensOut is recorded as no usage and left unpriced
  expected:
    0:
      model: 'fake-model'
      tokensIn: ~
      tokensOut: ~
      durationMs: 5
  actual:
    0:
      model: 'fake-model'
      tokensIn: -1
      tokensOut: 1000000
      durationMs: 5
not ok … - TEST-1 (issue 46) a negative tokensOut offset by tokensIn is recorded as no usage and left unpriced
  actual: tokensIn: 1000000, tokensOut: -1
not ok … - TEST-1 (issue 46) a fractional tokensIn is recorded as no usage and left unpriced
  actual: tokensIn: 0.5, tokensOut: 125000
not ok … - TEST-1 (issue 46) a NaN tokensIn is recorded as no usage and left unpriced
  actual: tokensIn: NaN, tokensOut: 1
not ok … - TEST-1 (issue 46) an infinite tokensOut is recorded as no usage and left unpriced
  actual: tokensIn: 1, tokensOut: Infinity
not ok … - TEST-1 (issue 46) a numeric string tokensOut is recorded as no usage and left unpriced
  actual: tokensIn: 250000, tokensOut: '125000'
not ok … - TEST-1 (issue 46) a partial usage (tokensOut null) is recorded as no usage and left unpriced
  actual: tokensIn: 7, tokensOut: ~
ok … - TEST-1 (issue 46) zero counters are recorded as reported, and priced
ok … - TEST-1 (issue 46) positive integer counters are recorded as reported, and priced
not ok … - TEST-1 (issue 46) usage and its counters are read once each
  expected:
    usage: 1
    tokensIn: 1
    tokensOut: 1
  actual:
    usage: 2
    tokensIn: 1
    tokensOut: 1
```

(Abrégé ici pour les lignes 2 à 7 : chaque bloc a la forme du premier, `expected` identique,
`model: 'fake-model'` et `durationMs: 5` dans `actual`. `~` est le `null` de YAML. Les sept lignes
`INVALID_USAGES` échouent sur l'assertion `records()`, la lecture unique sur l'assertion `reads`.)

### 1.3 Écrire SPEC-1

Édition 1.3a · `src/metrics/application/use-cases/with-metrics.ts` · remplacer (l.2) :

```ts
import type { LLMResponse, Message, ModelInfo } from "../../../llm/models/index.js";
```

par :

```ts
import type { LLMResponse, Message, ModelInfo, Usage } from "../../../llm/models/index.js";
```

Édition 1.3b · `src/metrics/application/use-cases/with-metrics.ts` · remplacer (TSDoc de
`withMetrics`, l.8-9) :

```ts
 * the usage the provider reported, null when it reported none (absent is not zero), and how
 * long the call took on the clock `now`. The response comes back as is: the same object.
```

par :

```ts
 * the usage the provider reported, and how long the call took on the clock `now`. `tokensIn`
 * and `tokensOut` are both null when the provider reported no usage (absent is not zero), or
 * when either counter is not an integer >= 0 (#46): a negative, fractional, non-finite or
 * non-numeric counter would misprice the call. The response comes back as is: the same object.
```

Édition 1.3c · `src/metrics/application/use-cases/with-metrics.ts` · remplacer (enregistrement de
`complete` et fin du fichier, l.45-54) :

```ts
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

par :

```ts
      const counters = recordedCounters(response.usage);
      collector.record({ model: opts.model, ...counters, durationMs: now() - startedAt });
      return response;
    },
  };
}

/** #46: a usage counter is an integer >= 0 (so finite), the rule capGuard applies too (#41). */
function isTokenCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/**
 * Both counters of `usage`, each read once: both counts, or both null when usage is absent or
 * either is not a count. The value checked is the value recorded.
 */
function recordedCounters(
  usage: Usage | undefined,
): { tokensIn: number | null; tokensOut: number | null } {
  const tokensIn = usage?.tokensIn;
  const tokensOut = usage?.tokensOut;
  return isTokenCount(tokensIn) && isTokenCount(tokensOut)
    ? { tokensIn, tokensOut }
    : { tokensIn: null, tokensOut: null };
}
```

(`response.usage` est lu une fois, chaque compteur une fois ; l'horloge reste lue deux fois par
appel, `startedAt` puis dans l'objet enregistré ; une réponse `undefined` ou `null` fait toujours
rejeter `complete` par `TypeError` à la lecture de `response.usage`, sans enregistrement (R-3).
`typeof value === "number"` est requis pour que `value >= 0` passe le typecheck sur un `unknown` ;
le prédicat `value is number` rétrécit `tokensIn` et `tokensOut` à `number` dans la branche vraie.)

Édition 1.3d · `src/metrics/models/index.ts` · remplacer (TSDoc de `UsageRecord`, l.6-8) :

```ts
 * One provider call, as measured. `tokensIn` and `tokensOut` are null when the provider reported
 * no usage: absent is not zero (ADR-AGENT-0007), and a total that counted it as 0 would
 * understate the run without saying so.
```

par :

```ts
 * One provider call, as measured. `tokensIn` and `tokensOut` are both null when the provider
 * reported no usage, or a usage with a counter that is not an integer >= 0 (withMetrics, #46):
 * absent is not zero (ADR-AGENT-0007), and a total that counted it as 0 would understate the run
 * without saying so.
```

Édition 1.3e · `README.md` · remplacer (l.232, dans la ligne) :

```
A missing usage or rate reads `null`, never `0`,
```

par :

```
A missing usage, a usage with a counter that is not an integer >= 0, or a missing rate reads `null`, never `0`,
```

Édition 1.3f · `docs/guide-agent-package.md` · remplacer (l.262, dans la ligne) :

```
Absent is not zero: a missing usage or rate makes
```

par :

```
Absent is not zero: a missing usage, a usage with a counter that is not an integer >= 0, or a missing rate makes
```

### 1.4 Constater le vert et l'API inchangée

1. `npm run test` (timeout 600000) → code 0, fin TAP `# tests 387`, `# pass 385`, `# fail 0`,
   `# skipped 2`, dont les dix lignes :
   ```
   ok … - TEST-1 (issue 46) a negative tokensIn offset by tokensOut is recorded as no usage and left unpriced
   ok … - TEST-1 (issue 46) a negative tokensOut offset by tokensIn is recorded as no usage and left unpriced
   ok … - TEST-1 (issue 46) a fractional tokensIn is recorded as no usage and left unpriced
   ok … - TEST-1 (issue 46) a NaN tokensIn is recorded as no usage and left unpriced
   ok … - TEST-1 (issue 46) an infinite tokensOut is recorded as no usage and left unpriced
   ok … - TEST-1 (issue 46) a numeric string tokensOut is recorded as no usage and left unpriced
   ok … - TEST-1 (issue 46) a partial usage (tokensOut null) is recorded as no usage and left unpriced
   ok … - TEST-1 (issue 46) zero counters are recorded as reported, and priced
   ok … - TEST-1 (issue 46) positive integer counters are recorded as reported, and priced
   ok … - TEST-1 (issue 46) usage and its counters are read once each
   ```
   Les sept tests existants de `with-metrics.test.ts`, ceux de `aggregate.test.ts`,
   `metrics-collector.test.ts`, `scripts/h2-report/cap-guard.test.ts`, `run-matrix.test.ts` et
   `scripts/h2-report/run-report.test.ts` restent verts (aucun `not ok`).
2. `npm run typecheck` (timeout 600000) → `> tsc --noEmit`, code 0, aucune erreur.
3. `diff <dossier_tmp>/agent-core-issue46-before-with-metrics.d.ts dist/metrics/application/use-cases/with-metrics.d.ts`
   → code 1, sortie observée, exactement (TSDoc seulement, signature inchangée) :
   ```
   6,7c6,9
   <  * the usage the provider reported, null when it reported none (absent is not zero), and how
   <  * long the call took on the clock `now`. The response comes back as is: the same object.
   ---
   >  * the usage the provider reported, and how long the call took on the clock `now`. `tokensIn`
   >  * and `tokensOut` are both null when the provider reported no usage (absent is not zero), or
   >  * when either counter is not an integer >= 0 (#46): a negative, fractional, non-finite or
   >  * non-numeric counter would misprice the call. The response comes back as is: the same object.
   ```
4. `diff <dossier_tmp>/agent-core-issue46-before-models-index.d.ts dist/metrics/models/index.d.ts`
   → code 1, sortie observée, exactement :
   ```
   2,4c2,5
   <  * One provider call, as measured. `tokensIn` and `tokensOut` are null when the provider reported
   <  * no usage: absent is not zero (ADR-AGENT-0007), and a total that counted it as 0 would
   <  * understate the run without saying so.
   ---
   >  * One provider call, as measured. `tokensIn` and `tokensOut` are both null when the provider
   >  * reported no usage, or a usage with a counter that is not an integer >= 0 (withMetrics, #46):
   >  * absent is not zero (ADR-AGENT-0007), and a total that counted it as 0 would understate the run
   >  * without saying so.
   ```
5. `diff <dossier_tmp>/agent-core-issue46-before-metrics-index.d.ts dist/metrics/index.d.ts` →
   sortie vide, code 0.
6. `diff <dossier_tmp>/agent-core-issue46-before-index.d.ts dist/index.d.ts` → sortie vide, code 0.
7. `grep -rn -E "isTokenCount|recordedCounters" dist --include=*.d.ts` → sortie vide, code 1.
8. `node -e "import('./dist/metrics/index.js').then((m) => console.log(Object.keys(m).sort().join(',')))"`
   → `MetricsCollector,aggregate,withMetrics` (identique à 0.5).
9. `node -e "import('./dist/index.js').then((m) => console.log(String(Object.keys(m).length)))"` →
   `20` (identique à 0.6).

Si une sortie de 3 à 9 diffère, s'arrêter : un type ou un symbole exporté a changé.

### 1.5 Commit

Cocher `[SPEC-1]` et `[TEST-1]` dans `docs/specs/2026-10-01-metrics-invalid-usage-checklist.md`
(outil Edit, `- [ ]` devient `- [x]`). Les documents de l'issue entrent dans ce commit
(spécification, « Ordre des commits et preuve de rouge » ; précédent P1 de #20, #35, #39, #41), avec
le TSDoc, `README.md` et le guide (même commit que le code, contrainte du pilote).

`git add src/metrics/application/use-cases/with-metrics.ts src/metrics/models/index.ts tests/metrics/application/use-cases/with-metrics.test.ts README.md docs/guide-agent-package.md docs/specs/2026-10-01-metrics-invalid-usage-checklist.md docs/specs/2026-10-01-metrics-invalid-usage-design.md docs/plans/2026-10-01-metrics-invalid-usage-estimate.json docs/plans/2026-10-01-metrics-invalid-usage-plan.md`
(ajouter `docs/plans/2026-10-01-metrics-invalid-usage-plan-v2.md` s'il existe) → sortie attendue :
vide ou des avertissements `LF will be replaced by CRLF`, rien d'autre.

Outil Write sur `<dossier_tmp>/agent-core-issue46-commit-msg.txt`, message (sujet de 66
caractères) :

```
fix(metrics): enregistrer null si un compteur d'usage est invalide

withMetrics lit usage une fois, puis tokensIn et tokensOut une fois
chacun (recordedCounters), et n'enregistre les deux compteurs que si
chacun est un entier >= 0 (isTokenCount, même règle que capGuard,
#41) : sinon tokensIn et tokensOut sont enregistrés null tous deux, et
MetricsCollector.total(rates) rend tokensIn, tokensOut et costUsd null
par la règle d'aggregate, inchangée. Les deux fonctions restent
privées au module : aucun symbole ajouté, aucun type exporté modifié.
Le TSDoc de withMetrics et de UsageRecord, README.md et
docs/guide-agent-package.md disent la règle.

Rouge avant ce commit (npm run test,
tests/metrics/application/use-cases/with-metrics.test.ts) : 8 des 10
tests TEST-1 (issue 46) échouent. Les 7 lignes INVALID_USAGES
enregistrent les compteurs tels quels (-1 et 1000000, 1000000 et -1,
0.5 et 125000, NaN et 1, 1 et Infinity, 250000 et '125000', 7 et
null) au lieu de null et null ; la lecture unique lit usage 2 fois.
Les 2 lignes VALID_USAGES passaient déjà.

Refs: #46
Session: <id>
Model: <modèle>
Authorship: ai
```

`<id>` est l'identifiant de la session du builder, `<modèle>` son modèle exact ; aucune ligne
`Co-Authored-By`.

`git commit -F <dossier_tmp>/agent-core-issue46-commit-msg.txt` → sortie attendue : une ligne
`[fix/46-metrics-invalid-usage <sha>] fix(metrics): enregistrer null si un compteur d'usage est invalide`,
`9 files changed` (10 avec un plan v2), quatre lignes `create mode` (les documents de l'issue ;
cinq avec un plan v2). Aucune sortie du hook `commit-msg` (message conforme).

### 1.6 Mutation de `isTokenCount`, après le commit, jamais commitée

`git status --short` → sortie attendue : vide (arbre propre).

Mutation · `src/metrics/application/use-cases/with-metrics.ts` · remplacer :

```ts
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
```

par :

```ts
  return typeof value === "number" && Number.isInteger(value) && value > 0;
```

1. `npm run test` (timeout 600000) → code 1, `# tests 387`, `# pass 382`, `# fail 3`,
   `# skipped 2`. Échecs observés, exactement ces trois titres (les deux de #42 passent aussi par
   `withMetrics`, via `runMatrix`, avec un `HOSTED_USAGE` à `tokensIn: 0`) :
   ```
   not ok … - TEST-4 (issue 42) the real run calls the given factory once, never fetch, and writes both CSV
     expected: |-
       scenario,model,runs,passed,successRate,meanDurationMs,tokensUsed,costUsd
       aller aux reglages,local-x,2,2,1,0,60,0
       aller aux reglages,hosted-x,2,2,1,0,800000,2
     actual: |-
       scenario,model,runs,passed,successRate,meanDurationMs,tokensUsed,costUsd
       aller aux reglages,local-x,2,2,1,0,60,0
       aller aux reglages,hosted-x,2,2,1,0,,
   not ok … - TEST-6 (issue 42) the cap reached by the last call, none refused: the complete report, code 0
     expected: true
     actual: false
   not ok … - TEST-1 (issue 46) zero counters are recorded as reported, and priced
     expected:
       0:
         model: 'fake-model'
         tokensIn: 0
         tokensOut: 0
         durationMs: 5
     actual:
       0:
         model: 'fake-model'
         tokensIn: ~
         tokensOut: ~
         durationMs: 5
   ```
2. `git restore src/metrics/application/use-cases/with-metrics.ts` → sortie vide.
3. `git diff --stat -- src/metrics/application/use-cases/with-metrics.ts` → sortie attendue :
   **vide**.
4. `npm run test` (timeout 600000) → code 0, `# tests 387`, `# pass 385`, `# fail 0`,
   `# skipped 2`.

Recopier les sorties 1 à 3 dans le rapport du builder et, résumées, dans le corps de PR.

---

## Tâche 2 · gates, checklist, contrôles, taille et corps de PR

Chaque gate par son propre appel, `timeout` 600000, dans cet ordre (le typecheck lit les `.d.ts`
de `dist/` produits par le build, et les tests importent `dist/`) :

| Gate | Commande | Sortie attendue |
|---|---|---|
| GATE-1 build | `npm run build` | `> tsc -p tsconfig.build.json`, code 0, aucune erreur |
| GATE-2 typecheck | `npm run typecheck` | `> tsc --noEmit`, code 0, aucune erreur |
| GATE-3 test | `npm run test` | fin TAP : `# tests 387`, `# pass 385`, `# fail 0`, `# skipped 2` (B + 10), et les dix titres `TEST-1 (issue 46)` de 1.4 en `ok` |

Juste après GATE-3 : `git status --short` → sortie attendue : vide.

Puis, dans `docs/specs/2026-10-01-metrics-invalid-usage-checklist.md` : cocher `[GATE-1]`,
`[GATE-2]`, `[GATE-3]`, et inscrire sous `## Hypothèses` les entrées de la section « Hypothèses »
de ce plan, une par ligne, préfixées `- [H]`.
`git add docs/specs/2026-10-01-metrics-invalid-usage-checklist.md` ; outil Read puis Write sur
`<dossier_tmp>/agent-core-issue46-commit-msg.txt`, message (sujet de 62 caractères) :

```
chore(checklist): cocher les gates et consigner les hypothèses

Refs: #46
Session: <id>
Model: <modèle>
Authorship: ai
```

`git commit -F <dossier_tmp>/agent-core-issue46-commit-msg.txt` → sortie attendue :
`1 file changed`.

Contrôles, chaque commande par son propre appel, résultats à recopier dans le corps de PR, chemins
relatifs au dépôt dans toute preuve :

1. `git fetch origin` → sortie attendue : vide ou une ligne de mise à jour.
2. `git log --oneline HEAD..origin/main` → sortie attendue : vide (sinon `main` a bougé : le
   signaler au pilote avant la PR, sans rebase ni merge décidé seul).
3. `git diff --name-only origin/main...HEAD` → sortie attendue, exactement ces neuf chemins :
   ```
   README.md
   docs/guide-agent-package.md
   docs/plans/2026-10-01-metrics-invalid-usage-estimate.json
   docs/plans/2026-10-01-metrics-invalid-usage-plan.md
   docs/specs/2026-10-01-metrics-invalid-usage-checklist.md
   docs/specs/2026-10-01-metrics-invalid-usage-design.md
   src/metrics/application/use-cases/with-metrics.ts
   src/metrics/models/index.ts
   tests/metrics/application/use-cases/with-metrics.test.ts
   ```
   (plus `docs/plans/2026-10-01-metrics-invalid-usage-plan-v2.md` s'il existe).
4. `git diff --name-only origin/main...HEAD -- scripts data package.json package-lock.json tsconfig.json tsconfig.build.json src/index.ts src/metrics/index.ts src/metrics/services src/metrics/application/use-cases/metrics-collector.ts src/agent src/llm tests/metrics/services tests/barrel-contract.test.ts`
   → sortie attendue : **vide** (ni `scripts/` dont `capGuard`, ni `aggregate`, ni
   `MetricsCollector`, ni barrel, ni `step.ts`, ni `toUsage`, ni `data/rates.json`).
5. `git diff --name-only -G export origin/main...HEAD -- src` → sortie attendue : **vide** (aucune
   ligne ajoutée ou retirée de `src/` ne contient `export`).
6. `git diff --numstat origin/main...HEAD -- src tests` → sortie attendue, exactement :
   ```
   26	9	src/metrics/application/use-cases/with-metrics.ts
   4	3	src/metrics/models/index.ts
   88	1	tests/metrics/application/use-cases/with-metrics.test.ts
   ```
7. `git diff --numstat origin/main...HEAD -- README.md docs/guide-agent-package.md` → sortie
   attendue, exactement :
   ```
   1	1	README.md
   1	1	docs/guide-agent-package.md
   ```
8. `git grep -n -i "a missing usage, a usage with a counter that is not an integer >= 0, or a missing rate" -- README.md docs/guide-agent-package.md`
   → deux lignes, `README.md:232:` et `docs/guide-agent-package.md:262:`.
9. `git grep -n "#46" -- src` → sortie attendue, exactement :
   ```
   src/metrics/application/use-cases/with-metrics.ts:10: * when either counter is not an integer >= 0 (#46): a negative, fractional, non-finite or
   src/metrics/application/use-cases/with-metrics.ts:54:/** #46: a usage counter is an integer >= 0 (so finite), the rule capGuard applies too (#41). */
   src/metrics/models/index.ts:7: * reported no usage, or a usage with a counter that is not an integer >= 0 (withMetrics, #46):
   ```
10. `git grep -n -E "console\.|process\.env|readFileSync|rates\.json" -- src/metrics tests/metrics/application/use-cases/with-metrics.test.ts`
    → sortie attendue, exactement cette ligne de commentaire du test :
    ```
    tests/metrics/application/use-cases/with-metrics.test.ts:153:// per million tokens, never data/rates.json.
    ```
11. `git grep -n "console\.log" -- src` → sortie attendue : vide.
12. `git grep -n -E "AIza[0-9A-Za-z_-]{35}" -- scripts src tests` → sortie attendue : vide.
13. `git log --format=%s origin/main..HEAD` → sortie attendue, exactement, du plus récent au plus
    ancien :
    ```
    chore(checklist): cocher les gates et consigner les hypothèses
    fix(metrics): enregistrer null si un compteur d'usage est invalide
    ```
    puis `git log --format=%B origin/main..HEAD` et vérifier à la lecture : aucune ligne
    `Co-Authored-By`, deux blocs de trailers `Refs: #46` / `Session:` / `Model:` /
    `Authorship: ai`.
14. Outil Write sur `<dossier_tmp>/agent-core-issue46-pr-title.txt` : une ligne,
    `fix(metrics): fermer withMetrics aux compteurs d'usage invalides` (64 caractères). Corps de
    PR écrit (voir plus bas), puis
    `python C:/Projects/dev-kit/scripts/pr_title.py --title-file <dossier_tmp>/agent-core-issue46-pr-title.txt --body-file <dossier_tmp>/agent-core-issue46-pr-body.md`
    → `pr_title : conforme`, code 0 (règle A4 : le message squashé, titre + corps, a son dernier
    paragraphe en trailers).
15. `python C:/Projects/dev-kit/scripts/pr_size.py origin/main HEAD --body-file <dossier_tmp>/agent-core-issue46-pr-body.md`
    → sortie attendue :
    `hors docs/ et *.md : +118/-13 lignes (code +30, tests +88), seuil 400 respecté`, code 0.
    Recopier la ligne mesurée dans le corps de PR.

Corps de PR (outil Write sur `<dossier_tmp>/agent-core-issue46-pr-body.md`, sections du dépôt :
Contexte, Changements, Vérifications, Métriques, Risques et suivi, Message de squash proposé). Il
porte obligatoirement :

- `Closes #46` dans « Contexte », l'origine (R-1 de
  `docs/specs/2026-09-30-cap-guard-usage-counters-design.md`, #41) ; le point 2 de l'issue
  (`aggregate` rend un coût null pour un usage null) vérifié sans changement de code
  (`src/metrics/services/aggregate.ts:42`, `tests/metrics/services/aggregate.test.ts:30-37` et
  `:75`, D3 de la spécification) ; la taille : environ 95 lignes estimées (fourchette 70 à 130), la
  ligne mesurée par `pr_size.py`, sous le seuil de 400, sans dérogation, et l'écart de +36 expliqué
  (voir « Taille mesurée »).
- Les trois gates avec leur dernière ligne de sortie, et la référence (B = 377 tests sur e846b9c).
- Les contrôles 2 à 15 avec leur résultat, et les contrôles d'API de 1.4 (3 à 9) : `.d.ts` de
  `dist/index.d.ts` et `dist/metrics/index.d.ts` identiques, les deux autres différant par le TSDoc
  seul, aucune occurrence de `isTokenCount` ni `recordedCounters` dans un `.d.ts`, clés du barrel
  `metrics` et nombre de clés de `.` inchangés.
- Le rouge de 1.2 (8 des 10 tests, valeurs `actual` des sept lignes et `usage: 2`) et la preuve
  par mutation de 1.6 (`value >= 0` → `value > 0` : 3 échecs, la ligne « zero counters » et les
  deux tests de #42 dont `HOSTED_USAGE` a `tokensIn: 0` ; annulée par
  `git restore src/metrics/application/use-cases/with-metrics.ts`, `git diff --stat` vide, suite
  revenue à 387 / 385).
- **Toutes** les hypothèses de la section « Hypothèses » de ce plan, chacune nommée et recopiée
  en entier, R-1 à R-5 d'abord (R-2 cite le budget `maxTokens` de
  `src/agent/application/use-cases/step.ts:276-279`).
- Aucun fichier `.env` ouvert ni lu ; aucun fournisseur hébergé appelé ; aucun `console.log` dans
  `src/` ; aucun test qui lit ou fige `data/rates.json` ; aucune valeur de clé dans les fichiers
  touchés ; aucun symbole ni type exporté changé ; le package ne dépend pas de `scripts/`.
- La section « Message de squash proposé », sujet **et** corps, repris de la spécification, dans
  un bloc de code, sans ligne `Co-Authored-By` (sujet : 64 caractères sans le suffixe
  ` (#<PR>)`, 70 avec un numéro à deux chiffres ; `<PR>` remplacé par le numéro une fois connu) :

```
fix(metrics): fermer withMetrics aux compteurs d'usage invalides (#<PR>)

withMetrics enregistre tokensIn et tokensOut tous deux null quand un
compteur d'usage d'un appel résolu n'est pas un entier fini >= 0
(négatif, fractionnaire, NaN, Infinity, chaîne, ou usage partiel).
Chaque compteur est lu une seule fois. Un tokensIn de -1 compensé par
un tokensOut de 1 000 000 était tarifé 1,999999 USD au lieu de rendre
un coût inconnu.

aggregate est inchangé : sa règle existante rend un coût et des sommes
de jetons null pour un usage null. Le run coupé du rapport H2 montre
donc un coût vide dans runs.truncated.csv au lieu d'un coût faux.
Aucun type exporté ne change, aucun symbole n'est ajouté ; la règle
est écrite dans src/, sans dépendre de scripts/.

Refs: #46
Session: <id>
Model: <modèle>
Authorship: ai
```

- **Règle A4** : le corps de PR se **termine** par le bloc de trailers, hors de tout bloc de code,
  séparé du reste par une ligne vide, et rien après lui (ni ligne « Generated with », ni ligne
  vide de texte) :

```
Refs: #46
Session: <id>
Model: <modèle>
Authorship: ai
```

Relire le fichier (outil Read) dans l'appel qui précède immédiatement toute commande qui le publie.

---

## Hypothèses (à recopier toutes dans la checklist et dans la PR)

- **R-1** (spécification) · `aggregate` et `MetricsCollector.record` appelés directement avec un
  enregistrement construit par le consommateur (`{ tokensIn: -1, … }`) valorisent encore ce
  compteur : le type le déclare `number | null` et le package n'y contrôle rien. Hors périmètre par
  l'attendu de l'issue (D3) ; à rouvrir en issue si le pilote veut un `aggregate` qui refuse ces
  compteurs.
- **R-2** (spécification) · Budget `maxTokens` : `tokensOf`
  (`src/agent/application/use-cases/step.ts:276-279`) additionne les compteurs sans contrôle ; un
  compteur négatif retarde l'arrêt sur budget, un `NaN` le rend inopérant (`NaN >= maxTokens` est
  faux). Défaut distinct de la mesure, hors périmètre ; à ouvrir en issue.
- **R-3** (spécification) · Réponse illisible : un fournisseur qui résout `undefined` ou `null`,
  ou dont l'accesseur `usage` lève, fait toujours rejeter `complete` sans enregistrement. Sous
  `capGuard`, celui-ci rejette déjà et coupe (#41) avant que `withMetrics` ne lise ; hors H2, le
  comportement reste celui de #11.
- **R-4** (spécification) · `toUsage` de Gemini (`src/llm/providers/gemini/gemini-wire.ts:184-191`)
  et d'Ollama (`src/llm/providers/ollama/ollama-llm-provider.ts:200-205`) contrôlent par `typeof`
  seul : un compteur négatif ou fractionnaire, s'il arrivait, est désormais enregistré null par
  `withMetrics` et coupé par `capGuard` ; aucune réponse connue n'en porte.
- **R-5** (spécification) · Dérive des deux copies de la règle (D2) : `isTokenCount` dans `src/`,
  `isCount` dans `scripts/h2-report/cap-guard.ts`, même définition mot pour mot ; bornée par les
  tests des deux côtés ; un changement de la règle devra toucher les deux fichiers.
- **P1** · Les documents de l'issue (spécification, checklist, estimation, plan) entrent dans le
  commit de SPEC-1 (spécification ; précédent P1 de #20, #35, #39, #41), avec `README.md` et
  `docs/guide-agent-package.md` (contrainte du pilote : même commit que le code).
- **P2** · TSDoc de `withMetrics` : le texte de la spécification est repris mot pour mot dans son
  contenu, mais placé dans une phrase à part après « and how long the call took on the clock
  `now`. », pour que l'énumération de la phrase d'origine reste lisible ; `tokensIn` et
  `tokensOut` entre accents graves, comme le reste du TSDoc. TSDoc de `UsageRecord` : insertion de
  la spécification telle quelle, la proposition « absent is not zero » suit après un deux-points.
- **P3** · `docs/guide-agent-package.md:262` : la proposition commence par « a missing usage, »
  en minuscule, puisqu'elle suit « Absent is not zero: » au milieu de la phrase ; `README.md:232`
  garde la majuscule de début de phrase. Le contrôle 8 cherche sans casse.
- **P4** · `recordedCounters` est repliée sous 100 colonnes (TSDoc sur 4 lignes, signature et
  ternaire sur 3 lignes chacun) au lieu des lignes de 108 à 123 colonnes de la spécification ;
  noms, signature, logique et lectures identiques. Le TSDoc gagne la phrase « The value checked is
  the value recorded. »
- **P5** · Tests : assistant de fichier `recordOne(response)` (une décoration, un appel, la même
  référence vérifiée, horloge `scriptedClock([0, 5])`) partagé par les dix tests ; titres en
  anglais comme leurs voisins, préfixés `TEST-1 (issue 46)`, sans `#` ; libellés des lignes choisis
  par ce plan ; `RateTable` importé par une ligne de types distincte de
  `../../../../dist/metrics/index.js` (spécification), `MetricsCollector` restant importé en valeur
  l.4.
- **P6** · Taille : +118 −13 mesurées hors `docs/` et `*.md` (131 lignes) contre environ 95
  estimées (fourchette 70 à 130), une ligne au-dessus de la fourchette, sous le seuil de 400 ;
  écart dû au repli sous 100 colonnes (P4, P5) et à l'assistant `recordOne`.
- **P7** · La mutation `value > 0` fait échouer trois tests, pas un : la ligne « zero counters »
  de TEST-1 et deux tests de #42 (`TEST-4 (issue 42) the real run calls the given factory once,
  never fetch, and writes both CSV`, `TEST-6 (issue 42) the cap reached by the last call, none
  refused: the complete report, code 0`), parce que `HOSTED_USAGE` de
  `scripts/h2-report/run-report.test.ts:200` a `tokensIn: 0` et passe par `withMetrics` via
  `runMatrix` : la règle « zéro compris » est donc verrouillée deux fois.
- **P8** · Sorties observées par le planificateur sur une sonde (`git archive` de e846b9c,
  compilée par le `tsc` 5.9.3 du dépôt principal), pas sur un build frais de ce worktree ;
  `npm ci` non lancé (installation interdite à ce rôle). Un écart de totaux à la tâche 0 se traite
  comme dit en 0.3.
- **P9** · Type et scope `fix(metrics)` (D6 de la spécification) ; correction de comportement
  sans changement de signature, relève d'un correctif (patch) ; `package.json` (version) n'est pas
  touché dans cette PR.
- **Node** · Node local ≥ 22.18 (retrait de types sans drapeau), constaté v22.19.0.

## Risques

- **`dist/` absent ou périmé** : les tests et le typecheck lisent `dist/` ; `npm run test`
  rebuild à chaque lancement, mais un `npm run typecheck` lancé avant tout build échouerait à la
  résolution des imports de `tests/`. Toujours `npm ci` (tâche 0) avant tout le reste.
- **Copies des `.d.ts` de `main`** : elles doivent être faites en 0.4, avant l'édition 1.3 ; faites
  après un build de la branche, les `diff` de 1.4 seraient vides et ne prouveraient rien.
- **Mutation oubliée** : une mutation non annulée partirait dans le commit de la tâche 2 ; le
  contrôle `git diff --stat` vide après la mutation, `git status --short` vide après GATE-3, et le
  contrôle 6 (numstat exact) l'interdisent.
- **Référence déduite** : B = 377 observée sur la sonde ; si elle diffère à la tâche 0, seuls les
  totaux se décalent, les nombres d'échecs et les titres restent ceux de ce plan.
- **Garde d'isolation du worktree** : une commande git composée (`cd … &&`, `; echo $?`) est
  refusée ; lancer chaque commande seule depuis la racine du worktree.
- **R-1, R-2, R-4** : défauts résiduels déclarés, hors périmètre, à reprendre en issue si le pilote
  le décide.
