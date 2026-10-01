# Spécification · Enregistrer un usage null dans withMetrics quand un compteur est invalide · #46

Date : 2026-10-01
Issue : https://github.com/arthurolivierfortin/agent-core/issues/46 (label `T:bug` ; reprend R-1 de docs/specs/2026-09-30-cap-guard-usage-counters-design.md, #41)
Checklist : docs/specs/2026-10-01-metrics-invalid-usage-checklist.md
Branche : `fix/46-metrics-invalid-usage` (worktree `.claude/worktrees/fix+46-metrics-invalid-usage`, `main` e846b9c)
Continuité : docs/specs/2026-09-30-with-metrics-design.md (#11 : `withMetrics`) ; docs/specs/2026-09-30-metriques-execution-design.md (#2 : `UsageRecord`, `aggregate`, `MetricsCollector`) ; docs/specs/2026-09-30-cap-guard-usage-counters-design.md (#41 : règle « entier fini ≥ 0 » dans `capGuard`, R-1 déclaré hors périmètre)

## Objectif

Faire enregistrer par `withMetrics` un usage null (`tokensIn` et `tokensOut` tous deux `null`) dès qu'un compteur d'usage d'un appel résolu n'est pas un entier fini ≥ 0, pour que le coût et les jetons d'un run ne soient jamais valorisés à partir d'un compteur négatif, fractionnaire, non fini ou non numérique.

## Source de l'issue

Corps de l'issue : résidu R-1 de #41. `capGuard` est étanche, mais `withMetrics` et `aggregate` valorisent encore des compteurs non entiers, négatifs ou non finis au tarif : le coût du run coupé peut être faux dans `runs.truncated.csv`. Attendu :

1. `withMetrics` enregistre un usage null quand un compteur n'est pas un entier fini ≥ 0 ;
2. `aggregate` rend un coût null pour un usage null (règle existante, à vérifier) ;
3. des tests sur les deux.

Contraintes du pilote : code du package publié (`src/`) ; le package ne dépend jamais de `scripts/` ; aucun appel réseau dans la suite ; aucun `console.log` dans `src/` ; aucun `.env` lu ; la valeur d'une clé n'apparaît nulle part ; PR sous 400 lignes hors `docs/` et `*.md` ; gates build, typecheck, test ; Node 22.

## État constaté dans le code (lecture du 2026-10-01, `main` e846b9c)

- `src/metrics/application/use-cases/with-metrics.ts:42-52` : `complete` attend `provider.complete`, puis `collector.record({ model: opts.model, tokensIn: response.usage?.tokensIn ?? null, tokensOut: response.usage?.tokensOut ?? null, durationMs: now() - startedAt })` (l.45-50). Aucun contrôle de type, de signe, de finitude ni d'intégralité ; `response.usage` est lu deux fois ; un usage partiel (`{ tokensIn: 7 }` sans `tokensOut`) donne `{ tokensIn: 7, tokensOut: null }`. TSDoc l.5-31 : « the usage the provider reported, null when it reported none (absent is not zero) ».
- `src/metrics/services/aggregate.ts:39-46` (`costOf`) : l.42 `if (rate === null || record.tokensIn === null || record.tokensOut === null) return null;` puis multiplication sans contrôle (l.43-45). Au tarif 1 / 2 USD par million, `{ tokensIn: -1, tokensOut: 1_000_000 }` vaut 1,999999 USD (fini, sous-estimé) ; `{ tokensIn: 250_000, tokensOut: "125000" }` vaut 0,5 (chaîne convertie). `addOrNull` (l.49-52) additionne les jetons sans contrôle non plus.
- **Règle d'`aggregate` vérifiée** : un usage null donne un coût null (l.42), verrouillé par `tests/metrics/services/aggregate.test.ts:75` (ligne « a record without usage » de la table l.69-85) ; un usage null rend les sommes de jetons null, verrouillé par `tests/metrics/services/aggregate.test.ts:30-37`. Le point 2 de l'issue est donc déjà vrai et testé ; il n'appelle aucun changement de code.
- `src/metrics/models/index.ts:5-17` : `UsageRecord = { model: string; tokensIn: number | null; tokensOut: number | null; durationMs: number }`, TSDoc « null when the provider reported no usage ». `MetricsTotal` (l.33-45) : un enregistrement sans usage rend `tokensIn` et `tokensOut` null, un enregistrement non tarifable rend `costUsd` null.
- `src/metrics/application/use-cases/metrics-collector.ts:16-31` : `record` copie l'entrée sans contrôle ; `total(rates)` délègue à `aggregate`.
- `src/metrics/index.ts:3-6` exporte `models`, `aggregate`, `MetricsCollector`, `withMetrics` ; aucun autre symbole.
- `src/llm/models/index.ts:38-53` : `Usage = { tokensIn: number; tokensOut: number }`, `LLMResponse.usage?: Usage`.
- `src/agent/testing/run-matrix.ts:137` : chaque run passe par `withMetrics(wiring.llm, collector, now)` ; l.150-151 : `collector.total(options.rates)`, `tokensUsed = tokensIn === null || tokensOut === null ? null : tokensIn + tokensOut` ; l.188-189 : la ligne de `summary` additionne par `sumOrNull`. `src/agent/testing/matrix-csv.ts:29` : `null` s'écrit en cellule vide.
- `scripts/h2-report/run-report.ts:165-185` : le run hébergé passe par `capGuard`, que `runMatrix` place sous `withMetrics` ; `runs.truncated.csv` est `report.toRunsCSV()` (l.185).
- `scripts/h2-report/cap-guard.ts:39-50` : `isCount(value: unknown): value is number` (`typeof value === "number" && Number.isInteger(value) && value >= 0`) et `usageCounters(response)`, non exportés ; `capGuard` importe le package depuis `../../dist/index.js` (l.3-5), jamais l'inverse.
- Sources réelles de compteurs : `src/llm/providers/gemini/gemini-wire.ts:184-191` (`toUsage`, contrôle par `typeof` seul : un compteur négatif, fractionnaire ou `NaN` passe) ; `src/llm/providers/ollama/ollama-llm-provider.ts:200-205` (même contrôle, deux compteurs ou aucun).
- `src/agent/application/use-cases/step.ts:276-279` (`tokensOf`) additionne aussi les compteurs sans contrôle pour le budget `maxTokens` (voir R-2).
- `tests/metrics/application/use-cases/with-metrics.test.ts` : imports l.1-8 (`FakeLLMProvider`, `MetricsCollector`, types `CompletionOptions`, `LLMProvider`, `LLMResponse`, `Message`) ; `messages` l.13 ; `scriptedClock(values)` l.19-27 ; aucun test sur un usage invalide. `FakeLLMProvider` (`src/llm/testing/fake-llm-provider.ts:52`) rend l'objet scripté lui-même et ne lit pas son `usage`.
- Documentation publique : `README.md:232` et `docs/guide-agent-package.md:262` disent « A missing usage or rate reads `null` » ; anglais conservé (dérogation `core/langue` du manifeste).

## Périmètre

Dans la PR :

- `src/metrics/application/use-cases/with-metrics.ts` (SPEC-1) ;
- `src/metrics/models/index.ts`, TSDoc de `UsageRecord` seulement (SPEC-1) ;
- `README.md:232` et `docs/guide-agent-package.md:262`, une proposition chacun (SPEC-1) ;
- `tests/metrics/application/use-cases/with-metrics.test.ts` (TEST-1).

Hors périmètre :

- Le code d'`aggregate` et de `MetricsCollector` (voir D3 et R-1) ; `tests/metrics/services/aggregate.test.ts` reste inchangé.
- Tout `scripts/`, dont `capGuard` et son `isCount` (voir D2) ; `run-report.ts`, `docs/rapport-h2.md`.
- `step.ts` et son budget `maxTokens` (R-2) ; `toUsage` de Gemini et d'Ollama (R-4) ; `runMatrix`, `matrix-csv.ts`.
- Une réponse illisible (`undefined`, `null`, accesseur qui lève) : comportement inchangé (R-3).
- Les barrels, les types exportés, `package.json`, `tsconfig*.json`, `data/rates.json`.

## Conception

### SPEC-1 · `withMetrics` enregistre un usage null pour un compteur invalide

Deux fonctions **non exportées** ajoutées en fin de `src/metrics/application/use-cases/with-metrics.ts`, et `Usage` ajouté à l'import de types de la l.2 :

```ts
/** #46: a usage counter is an integer >= 0 (so finite), the rule capGuard applies too (#41). */
function isTokenCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/** Both counters of `usage`, each read once: both counts, or both null when usage is absent or either is not a count. */
function recordedCounters(usage: Usage | undefined): { tokensIn: number | null; tokensOut: number | null } {
  const tokensIn = usage?.tokensIn;
  const tokensOut = usage?.tokensOut;
  return isTokenCount(tokensIn) && isTokenCount(tokensOut) ? { tokensIn, tokensOut } : { tokensIn: null, tokensOut: null };
}
```

Dans `complete`, l'enregistrement (l.45-50) devient :

```ts
const counters = recordedCounters(response.usage);
collector.record({ model: opts.model, ...counters, durationMs: now() - startedAt });
```

`response.usage` est lu une fois, chaque compteur une fois : la valeur contrôlée est celle qui est enregistrée. L'horloge est toujours lue deux fois par appel. La réponse est rendue telle quelle (même référence) ; un appel qui rejette n'enregistre toujours rien.

Le TSDoc de `withMetrics` (l.6-9) remplace « the usage the provider reported, null when it reported none (absent is not zero) » par : « the usage the provider reported, with tokensIn and tokensOut both null when it reported none (absent is not zero) or when either counter is not an integer >= 0 (#46): a negative, fractional, non-finite or non-numeric counter would misprice the call ». Le TSDoc de `UsageRecord` (`src/metrics/models/index.ts:6-8`) remplace « null when the provider reported no usage » par « both null when the provider reported no usage, or a usage with a counter that is not an integer >= 0 (withMetrics, #46) ». `README.md:232` et `docs/guide-agent-package.md:262` remplacent « A missing usage or rate » par « A missing usage, a usage with a counter that is not an integer >= 0, or a missing rate ».

### Effet sur l'API publique

- **Types exportés** : aucun changement. `withMetrics(provider, collector, now?)`, `UsageRecord`, `MetricsTotal`, `RateTable`, `Usage`, `LLMResponse` gardent leur forme. **Aucun symbole nouveau** : `isTokenCount` et `recordedCounters` restent privés au module, rien n'entre dans `src/metrics/index.ts` ni dans le barrel `.`.
- **Sémantique d'un enregistrement** : un appel résolu dont `usage` est absent, ou dont un compteur n'est pas un entier fini ≥ 0, laisse `{ tokensIn: null, tokensOut: null }`. Les deux compteurs sont null ensemble, jamais l'un seul : un usage dont un compteur est invalide n'est pas digne de confiance pour l'autre. Conséquence à noter : un usage partiel (`{ tokensIn: 7 }` d'un fournisseur maison) donnait `{ 7, null }`, il donne `{ null, null }`. Ollama et Gemini rendent les deux compteurs ou aucun : pour eux, ce cas ne se présente pas.
- **Agrégats** (`aggregate`, `MetricsCollector.total`) : code inchangé ; leur règle existante s'applique à l'enregistrement null. `calls` et `durationMs` comptent l'appel ; `tokensIn` et `tokensOut` du total deviennent null dès qu'un appel du lot avait un compteur invalide (au lieu d'une somme fausse) ; `costUsd` devient null avec une table de tarifs (au lieu d'un coût sous-estimé ou converti), et reste null sans table.
- **Tokens totaux et matrice** : `MatrixRun.tokensUsed` et `costUsd` du run sont null (run-matrix.ts:150-151), la ligne de `summary` de la paire aussi (`sumOrNull`), et `toRunsCSV` / `toCSV` écrivent des cellules vides (matrix-csv.ts:29). Dans le rapport H2, le run coupé par un compteur invalide montre un coût vide dans `runs.truncated.csv`, cohérent avec `cut: unclassified` de `TRUNCATED.txt` et avec `spentUsd()` de `capGuard` qui n'a pas compté cet appel.
- **Version** : correction de comportement, sans changement de signature ; relève d'un correctif (patch).

## Chemins nominal et d'erreur

| Usage de la réponse résolue | Avant #46 (enregistrement) | Après #46 (enregistrement) | Coût avec tarif |
|---|---|---|---|
| absent | `{ null, null }` | inchangé | null (inchangé) |
| deux entiers ≥ 0, zéro compris | tels quels | inchangé | tarifé (inchangé) |
| `{ -1, 1_000_000 }` (négatif compensé) | `{ -1, 1_000_000 }` | `{ null, null }` | 1,999999 → null |
| `{ 0.5, 125_000 }` (fractionnaire) | tel quel | `{ null, null }` | 0,2500005 → null |
| `NaN` ou `Infinity` | tel quel | `{ null, null }` | `NaN` / `Infinity` → null |
| `"125000"` (chaîne) | tel quel | `{ null, null }` | 0,5 converti → null |
| `{ 7, null }` (partiel) | `{ 7, null }` | `{ null, null }` | null (inchangé) |
| réponse `undefined`, `null`, accesseur qui lève | rejet, rien enregistré | inchangé (R-3) | — |
| `provider.complete` rejette | rejet, rien enregistré | inchangé | — |

## Symétrie

- Écriture face à lecture : `withMetrics` écrit l'enregistrement ; `aggregate` (via `MetricsCollector.total`) le lit et rend null pour un usage null (règle vérifiée, aggregate.ts:42) ; `runMatrix` lit `total` et `matrix-csv.ts` écrit la cellule vide. TEST-1 vérifie l'écriture (`records()`) et la lecture (`total(rates)`) dans le même test.
- Chemin nominal face au chemin d'erreur : compteurs valides, zéro compris, enregistrés tels quels et tarifés (`VALID_USAGES` de TEST-1) face à compteurs invalides enregistrés null (`INVALID_USAGES`). Le chemin de rejet du fournisseur est inchangé et déjà verrouillé (with-metrics.test.ts:66-111).
- Règle « entier fini ≥ 0 » sur ses deux couches : `capGuard` (scripts/, #41) décide de couper et de compter la dépense ; `withMetrics` (src/, #46) décide de l'enregistrement. Même définition, écrite deux fois (D2).
- Aucune énumération touchée.

## Données touchées

Aucune base, aucun fichier écrit, aucune variable d'environnement lue ni posée. Tarifs des tests : un littéral du fichier de test, jamais `data/rates.json`. Aucune clé, réelle ou factice, dans les fichiers touchés.

## Décisions et alternatives écartées

- **D1 · Les deux compteurs null ensemble** plutôt que null compteur par compteur : l'issue dit « usage null », et `capGuard` (#41) traite l'usage comme un tout (`usageCounters` rend `null` dès qu'un compteur échoue). Compter l'autre compteur garderait une moitié de mesure d'une réponse dont l'usage est faux.
- **D2 · Règle dupliquée, non partagée** : `isTokenCount` privé dans `src/`, `isCount` de `capGuard` inchangé dans `scripts/`. Le package ne peut pas importer `scripts/`. L'alternative, exporter la règle depuis le package pour que `capGuard` l'importe de `dist/`, est écartée : elle ajoute un symbole public (contrat semver, verrou de barrel `tests/barrel-contract.test.ts` à modifier) pour une expression d'une ligne, et touche `scripts/`, un second sous-système hors de l'issue. Le risque de dérive est borné : même définition mot pour mot, chaque copie verrouillée par ses propres tests (cap-guard.test.ts TEST-1 de #41, with-metrics.test.ts TEST-1 de #46), commentaire de `isTokenCount` qui cite #41.
- **D3 · `aggregate` inchangé** : l'attendu de l'issue limite `aggregate` à la vérification de la règle existante, faite ci-dessus (aggregate.ts:42, aggregate.test.ts:30-37 et :75). Ajouter le contrôle dans `aggregate` changerait le résultat d'une fonction publique pure pour un appelant direct, au-delà de l'issue ; le seul producteur d'enregistrements du package, `withMetrics`, est fermé par SPEC-1. Écart déclaré en R-1. Aucun test nouveau sur `aggregate` seul : un test vert avant comme après ne prouverait rien ; la vérification d'`aggregate` sur un enregistrement produit par `withMetrics` est l'assertion `total(rates)` de TEST-1, rouge avant SPEC-1.
- **D4 · Fonctions privées dans `with-metrics.ts`** plutôt qu'un fichier de `services/` : un nouveau fichier de `services/` devrait rester hors du barrel pour ne rien exporter, ce qu'aucune convention du dépôt n'exige ailleurs ; le précédent de #41 garde la règle privée au module qui l'applique.
- **D5 · `-0` accepté**, comme D2 de #41 (`Number.isInteger(-0)` et `-0 >= 0` sont vrais) : enregistré `-0`, tarifé 0, écrit `0` par `String`.
- **D6 · Type `fix`** : label `T:bug`, et le changement corrige une valeur fausse observable (`costUsd`, `tokensIn`, `tokensOut`, `tokensUsed`). Scope `metrics`.

## Ordre des commits et preuve de rouge

Un SPEC = un commit = un test. La spécification et la checklist entrent dans le commit de SPEC-1 (précédent P1 de #20, #35, #39, #41). Preuves par `npm run test`, chemins relatifs au dépôt dans toute preuve ; la sortie doit montrer les titres `TEST-1 (issue 46)`.

- Rouge avant SPEC-1 (TEST-1 écrit, `with-metrics.ts` non modifié) : les 7 lignes de `INVALID_USAGES` échouent sur le `deepEqual` de `records()` ; la lecture unique échoue (`usage` lu 2 fois) ; les 2 lignes de `VALID_USAGES` passent (comportement nominal déjà vrai) : 8 échecs, 2 réussites parmi les 10 tests ajoutés.
- Vert après SPEC-1 : les 10 passent ; aucun test existant ne change de statut.
- Mutation, **après le commit de SPEC-1**, sur l'arbre propre : remplacer `value >= 0` par `value > 0` dans `isTokenCount` fait échouer la ligne « zero counters » de `VALID_USAGES` ; annulée par `git restore src/metrics/application/use-cases/with-metrics.ts`, `git diff --stat -- src/metrics/application/use-cases/with-metrics.ts` vide ensuite ; sortie montrée dans le rapport du builder et dans la description de la PR.

Gabarit (aucun `Co-Authored-By`) :

```
<type>(<scope>): <sujet>

<corps : ce qui change et la preuve de rouge, chemins relatifs au dépôt>

Refs: #46
Session: <id>
Model: <modèle>
Authorship: ai
```

| SPEC | Sujet (impératif, 72 caractères au plus type compris) |
|---|---|
| 1 | `fix(metrics): enregistrer null si un compteur d'usage est invalide` (66) |

### Message de squash proposé

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

Sujet : 64 caractères sans le suffixe ; 70 avec ` (#NN)`. Rappel A4 : le corps de la PR se termine par le même bloc de trailers `Refs` / `Session` / `Model` / `Authorship`.

## Tests

Déterministes, sans réseau, sans fournisseur réel (ni `GeminiLLMProvider`, ni `OllamaLLMProvider`), sans variable d'environnement, horloge `scriptedClock([0, 5])` du fichier. Ajoutés en fin de `tests/metrics/application/use-cases/with-metrics.test.ts`, titres en anglais comme leurs voisins, préfixés `TEST-1 (issue 46)`, sans `#`. `Usage` entre dans l'import de types de `../../../../dist/llm/models/index.js` (l.8), `RateTable` par un import de types de `../../../../dist/metrics/index.js`. Constante `RATES: RateTable = { "fake-model": { usdPerMillionTokensIn: 1, usdPerMillionTokensOut: 2 } }`. Aucun test existant n'est modifié.

**TEST-1** (exerce SPEC-1), un `test()` par ligne de chaque table et un pour la lecture unique, soit 10 :

- Table `INVALID_USAGES` (7 lignes `[why, usage]`) : `{ tokensIn: -1, tokensOut: 1_000_000 }` ; `{ tokensIn: 1_000_000, tokensOut: -1 }` ; `{ tokensIn: 0.5, tokensOut: 125_000 }` ; `{ tokensIn: NaN, tokensOut: 1 }` ; `{ tokensIn: 1, tokensOut: Infinity }` ; `{ tokensIn: 250_000, tokensOut: "125000" as unknown as number }` ; `{ tokensIn: 7, tokensOut: null as unknown as number }`. Pour chaque ligne : `response = { content: why, toolCalls: [], usage }`, `withMetrics(new FakeLLMProvider({ responses: [response] }), collector, scriptedClock([0, 5]))` ; `complete(messages, { model: FakeLLMProvider.MODEL_ID })` rend `response` (même référence) ; `collector.records()` égale `[{ model: "fake-model", tokensIn: null, tokensOut: null, durationMs: 5 }]` ; `collector.total(RATES)` égale `{ calls: 1, tokensIn: null, tokensOut: null, durationMs: 5, costUsd: null }`.
- Table `VALID_USAGES` (2 lignes `[why, usage, costUsd]`) : `{ tokensIn: 0, tokensOut: 0 }` coût `0` ; `{ tokensIn: 500_000, tokensOut: 250_000 }` coût `1` (exact en virgule flottante). Mêmes conditions : `records()` égale `[{ model: "fake-model", ...usage, durationMs: 5 }]` ; `total(RATES)` égale `{ calls: 1, ...usage, durationMs: 5, costUsd }`.
- Lecture unique : une réponse dont l'accesseur `usage` compte ses lectures et rend un objet dont l'accesseur `tokensIn` rend `3` à la première lecture puis `-1`, et `tokensOut` rend `4`, chacun comptant ses lectures ; après `complete`, `records()` égale `[{ model: "fake-model", tokensIn: 3, tokensOut: 4, durationMs: 5 }]` et les compteurs de lectures égalent `{ usage: 1, tokensIn: 1, tokensOut: 1 }`.

## Estimation de taille

Hors `docs/` et `*.md`, lignes ajoutées et retirées :

| Fichier | Estimation |
|---|---|
| `src/metrics/application/use-cases/with-metrics.ts` (import +1 −1 ; TSDoc +3 −1 ; enregistrement +2 −4 ; `isTokenCount` 5 ; `recordedCounters` 7 ; lignes vides 2) | +20 −6 |
| `src/metrics/models/index.ts` (TSDoc de `UsageRecord`) | +2 −2 |
| `tests/metrics/application/use-cases/with-metrics.test.ts` (imports +2 −1 ; `RATES` 3 ; `INVALID_USAGES` 9 + boucle 12 ; `VALID_USAGES` 4 + boucle 11 ; lecture unique 22) | +63 −1 |
| **Total** | **environ 95** (fourchette 70 à 130) |

`README.md` et `docs/guide-agent-package.md` (une proposition chacun) sont hors mesure. Très en dessous du plafond de 400 ; aucune dérogation. La mesure (`pr_size.py`) fait foi à la PR.

## Hypothèses restantes

- **R-1 · `aggregate` et `MetricsCollector.record` appelés directement** avec un enregistrement construit par le consommateur (`{ tokensIn: -1, … }`) valorisent encore ce compteur : le type le déclare `number | null` et le package n'y contrôle rien. Hors périmètre par l'attendu de l'issue (D3) ; à rouvrir en issue si le pilote veut un `aggregate` qui refuse ces compteurs.
- **R-2 · Budget `maxTokens`** : `tokensOf` (`src/agent/application/use-cases/step.ts:276-279`) additionne les compteurs sans contrôle ; un compteur négatif retarde l'arrêt sur budget, un `NaN` le rend inopérant (`NaN >= maxTokens` est faux). Défaut distinct de la mesure, hors périmètre ; à ouvrir en issue.
- **R-3 · Réponse illisible** : un fournisseur qui résout `undefined` ou `null`, ou dont l'accesseur `usage` lève, fait toujours rejeter `complete` sans enregistrement. Sous `capGuard`, celui-ci rejette déjà et coupe (#41) avant que `withMetrics` ne lise ; hors H2, le comportement reste celui de #11.
- **R-4 · `toUsage` de Gemini et d'Ollama** contrôlent par `typeof` seul : un compteur négatif ou fractionnaire, s'il arrivait, est désormais enregistré null par `withMetrics` et coupé par `capGuard` ; aucune réponse connue n'en porte.
- **R-5 · Dérive des deux copies de la règle** (D2) : bornée par les tests des deux côtés ; un changement de la règle devra toucher les deux fichiers.
- **Node** ≥ 22.18 (retrait de types sans drapeau), constaté v22.19.0 par #20.
