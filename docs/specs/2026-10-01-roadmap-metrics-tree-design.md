# Spécification · Aligner la carte `metrics/` de ROADMAP.md sur l'arbre réel, et le TSDoc de `MatrixRun.tokensUsed` sur #46 · #23

Date : 2026-10-01
Issue : https://github.com/arthurolivierfortin/agent-core/issues/23 (label `T:docs`)
Checklist : docs/specs/2026-10-01-roadmap-metrics-tree-checklist.md
Branche : `docs/23-roadmap-metrics-tree` (worktree `.claude/worktrees/docs+23-roadmap-metrics-tree`, `main` 4a4b8c2)
Continuité : docs/specs/2026-09-30-claude-md-design.md:37 (#7 : lignes périmées du sous-arbre `metrics/` laissées hors périmètre, « à ouvrir en issue séparée ») ; docs/specs/2026-10-01-metrics-invalid-usage-design.md (#46 : compteur d'usage invalide enregistré comme null).

## Objectif

Faire lister à la carte `metrics/` de `ROADMAP.md` exactement les fichiers `.ts` de `src/metrics/`, verrouillé par un test qui compare la carte à l'arbre réel, et dire dans le TSDoc de `MatrixRun.tokensUsed` qu'un compteur d'usage invalide le rend null, comme une absence d'usage.

## Source de l'issue

Corps de l'issue : la carte de `ROADMAP.md` liste encore `interfaces/metrics-collector.ts` et `infrastructure/collector.ts` sous `metrics/`, fichiers qui n'existent pas (`MetricsCollector` vit sous `metrics/application/`). Corriger la carte pour qu'elle reflète l'arbre réel de `src/metrics/` ; ajouter un cas au test de conventions si un verrou existe déjà pour cette zone.

Ajout décidé par le pilote : le TSDoc de `MatrixRun.tokensUsed` (`src/agent/testing/run-matrix.ts:50`) dit « Null as soon as one call reported no usage » ; depuis #46, un compteur d'usage invalide le rend aussi null. Commentaire seulement : aucun changement de comportement ni de type ; seul le TSDoc des `.d.ts` change.

Contraintes du pilote : langue de `ROADMAP.md` selon la dérogation `core/langue` du manifeste ; aucun appel réseau, aucun `.env` lu ; taille minime (seuil 400) ; commits de type `docs`, sans `Co-Authored-By`, sujets à l'impératif de 72 caractères au plus ; message de squash avec sujet et corps ; règle A4 (le corps de PR finit par le bloc de trailers) ; chemins relatifs au dépôt dans toute preuve.

## État constaté dans le code (lecture du 2026-10-01, `main` 4a4b8c2)

- `CLAUDE.md:13-16` : dérogation `core/langue` ; le corps de `ROADMAP.md`, document hérité de NATHAN, **reste en anglais, mises à jour comprises**. Tout texte ajouté à `ROADMAP.md` est donc en anglais ; cette spécification, la checklist et les messages des tests de conventions restent en français.
- `ROADMAP.md:123` : `## Full tree (target map, V1 → V4)` ; bloc de code l.127-172. Sous-arbre `metrics/`, l.151-156, suivi de `  voice/` l.157 :

  ```
    metrics/
      models/index.ts              UsageRecord · MetricsTotal · RateTable
      interfaces/metrics-collector.ts
      services/aggregate.ts        pure: records → MetricsTotal (with RateTable)
      application/use-cases/with-metrics.ts   withMetrics (LLMProvider → MetricsCollector decorator)
      infrastructure/collector.ts  MetricsCollector
  ```

  Aucune ligne `metrics/` ne porte de marque `[V2]`/`[V3]`/`[V4]` : tout le sous-arbre est V1, donc déjà livré.
- Arbre réel de `src/metrics/` (Glob) : `index.ts`, `models/index.ts`, `services/aggregate.ts`, `application/use-cases/metrics-collector.ts`, `application/use-cases/with-metrics.ts` ; plus `models/.gitkeep`, `services/.gitkeep`, `interfaces/.gitkeep`, `infrastructure/.gitkeep`. `interfaces/` et `infrastructure/` ne contiennent que `.gitkeep`.
- `src/metrics/application/use-cases/metrics-collector.ts:12` : `export class MetricsCollector`. `src/metrics/index.ts:3-6` réexporte les quatre autres fichiers ; `src/index.ts:13` réexporte `./metrics/index.js` (servi par `.`).
- `docs/guide-agent-package.md:105-110` : l'arborescence du guide porte les deux mêmes lignes périmées (`interfaces/metrics-collector.ts`, `infrastructure/collector.ts`) et liste `index.ts` sous `metrics/` (voir R-1).
- Verrou existant sur cette zone : `scripts/repo-conventions.test.mjs:271-290`, `TEST-4 (issue 7) ROADMAP place withMetrics sous metrics/application/use-cases`. Il délimite le sous-arbre par `lines.indexOf("  metrics/")` et la première ligne suivante commençant par `  voice/`, exige une ligne portant `application/use-cases/with-metrics.ts` et `withMetrics`, et l'existence de `src/metrics/application/use-cases/with-metrics.ts`. Il ne compare pas la carte à l'arbre : les deux lignes périmées passent. Imports disponibles : `existsSync`, `readdirSync`, `readFileSync` (l.7) ; aides `readRepoFile` (l.10-12), `splitLines` (l.14-16). Les autres tests de `ROADMAP.md` (l.106-163, 216-233) interdisent `IDE`, `blind`, `NATHAN`, `PMC/`, `TECH-19`, `January 2027`, `S7`, `DEV-xxx`, `DEV-NNN`, `nathan-agent-core`, `v1-decoupage-pr` : le texte ajouté par SPEC-1 n'en contient aucun.
- `src/agent/testing/run-matrix.ts:39-54` : type `MatrixRun`. L.50 : `  /** Null as soon as one call reported no usage: absent is not zero (ADR-AGENT-0007). */` ; l.51 : `  readonly tokensUsed: number | null;`. L.69-70 : `MatrixSummaryRow.tokensUsed`, « Sums over the pair's runs, null as soon as one run has null » (reste exact, voir Symétrie). L.150-151 : `tokensUsed` vaut null dès que `collector.total(...)` rend `tokensIn` ou `tokensOut` null.
- `src/metrics/application/use-cases/with-metrics.ts:54-71` (#46) : `isTokenCount` = `typeof value === "number" && Number.isInteger(value) && value >= 0` ; un usage absent, ou un compteur qui n'est pas un entier >= 0, est enregistré `tokensIn: null, tokensOut: null`. `src/metrics/services/aggregate.ts:49-52` : une somme reste null dès qu'un terme l'est. Le TSDoc de `UsageRecord` (`src/metrics/models/index.ts:5-10`) dit déjà « or a usage with a counter that is not an integer >= 0 (withMetrics, #46) ».
- `tsconfig.build.json` : `declaration: true`, `removeComments` non posé (défaut `false`) ; `MatrixRun` est un alias de type, effacé du `.js` : seul `dist/agent/testing/run-matrix.d.ts` porte son TSDoc.

## Périmètre

Dans la PR :

- `ROADMAP.md`, lignes du sous-arbre `metrics/` de la carte (SPEC-1).
- `scripts/repo-conventions.test.mjs` : un test ajouté juste après `TEST-4 (issue 7)` (TEST-1) et un test ajouté en fin de fichier avec sa constante (TEST-2).
- `src/agent/testing/run-matrix.ts`, TSDoc du champ `tokensUsed` de `MatrixRun` (SPEC-2).

Hors périmètre :

- Toute autre ligne de `ROADMAP.md`, y compris les autres sous-arbres de la carte, qui divergent aussi de l'arbre réel (R-2), et les paragraphes « Same pattern in each framework », « The 3 entry points », « The 4 bands » (l.174-180).
- `docs/guide-agent-package.md:105-110` (R-1).
- Le test `TEST-4 (issue 7)` : inchangé, il continue de passer.
- Le TSDoc de `MatrixSummaryRow.tokensUsed` (l.69), le champ `costUsd`, tout code exécutable, tout type, `src/metrics/`.

## Conception

### SPEC-1 · Carte `metrics/` de `ROADMAP.md` égale à l'arbre réel

Remplacer les cinq lignes `ROADMAP.md:152-156` (sous `  metrics/`, ligne l.151 inchangée) par exactement ces cinq lignes, en anglais (dérogation `core/langue`), dans cet ordre :

```
    models/index.ts              UsageRecord · MetricsTotal · RateTable
    services/aggregate.ts        pure: records → MetricsTotal (with RateTable)
    application/use-cases/metrics-collector.ts   MetricsCollector (class: the records of one run or batch)
    application/use-cases/with-metrics.ts   withMetrics (LLMProvider → MetricsCollector decorator)
    index.ts                     barrel of the framework, re-exported by "."
```

Effet : les lignes `interfaces/metrics-collector.ts` et `infrastructure/collector.ts` disparaissent ; `MetricsCollector` est placé sous `application/use-cases/metrics-collector.ts` ; `index.ts` est ajouté (il existe dans l'arbre, et l'arborescence du guide le liste déjà sous `metrics/`). Les lignes `models/index.ts`, `services/aggregate.ts` et `application/use-cases/with-metrics.ts` sont reprises à l'identique (la ligne `with-metrics` reste celle qu'exige `TEST-4 (issue 7)`). Les dossiers `interfaces/` et `infrastructure/`, vides hormis `.gitkeep`, ne figurent pas dans la carte, comme `llm/infrastructure/` (vide hormis `.gitkeep`) n'y figure pas (D2).

### SPEC-2 · TSDoc de `MatrixRun.tokensUsed`

Remplacer la seule ligne `src/agent/testing/run-matrix.ts:50` par ce bloc de quatre lignes, la ligne l.51 `  readonly tokensUsed: number | null;` restant identique :

```ts
  /**
   * Null as soon as one call reported no usage, or a usage counter that is not an integer >= 0
   * (withMetrics, #46): absent is not zero (ADR-AGENT-0007).
   */
```

Phrase rendue, lignes intérieures jointes par une espace : `Null as soon as one call reported no usage, or a usage counter that is not an integer >= 0 (withMetrics, #46): absent is not zero (ADR-AGENT-0007).` Plus longue ligne : 95 colonnes. Formulation alignée sur le TSDoc de `UsageRecord` (`src/metrics/models/index.ts:6-7`) et sur la règle `isTokenCount` de `withMetrics`. Aucun autre caractère du fichier ne change.

## Chemins nominal et d'erreur

Changement de documentation : aucun chemin d'exécution ne change. Le TSDoc de SPEC-2 décrit désormais les deux chemins qui rendent `tokensUsed` null : usage absent, compteur invalide. Pour les tests :

| Situation | TEST-1 | TEST-2 |
|---|---|---|
| carte et TSDoc conformes | vert | vert |
| la carte nomme un fichier absent de `src/metrics/` (état de `main`) | rouge, la différence nomme `interfaces/metrics-collector.ts` et `infrastructure/collector.ts` | sans effet |
| un fichier `.ts` de `src/metrics/` manque à la carte | rouge, la différence nomme le fichier | sans effet |
| une ligne du sous-arbre `metrics/` ne commence pas par un chemin `.ts` (dossier seul, ligne vide) | rouge, message dédié | sans effet |
| TSDoc d'origine ou phrase différente | sans effet | rouge, l'égalité affiche les deux phrases |
| type du champ modifié | sans effet | rouge (ligne `  readonly tokensUsed: number \| null;` introuvable dans `MatrixRun`) |

## Symétrie

- Lecture face à écriture : la carte (texte lu par un humain) et l'arbre (fichiers écrits par les PR de code) sont comparés par TEST-1 dans les deux sens : fichier de la carte absent de l'arbre, fichier de l'arbre absent de la carte.
- Même fait dans deux documents : l'arborescence de `docs/guide-agent-package.md:105-110` porte les mêmes lignes périmées ; laissée hors de la PR par la portée fixée, signalée en R-1.
- `MatrixRun.tokensUsed` face à `MatrixSummaryRow.tokensUsed` (l.69) : la ligne de résumé est null dès qu'un run l'est ; elle hérite donc du cas #46 sans changer de texte. `UsageRecord` (modèle) dit déjà #46 : après SPEC-2, modèle et run disent la même règle.
- Aucune énumération touchée ; aucune donnée écrite.

## Données touchées

Aucune base, aucune variable d'environnement, aucun `.env` lu, aucun appel réseau. Fichiers modifiés : `ROADMAP.md`, `scripts/repo-conventions.test.mjs`, `src/agent/testing/run-matrix.ts`. Artefact de build : `dist/agent/testing/run-matrix.d.ts` (TSDoc seulement, non versionné).

## Décisions et alternatives écartées

- **D1 · Un verrou existe, le cas s'ajoute à côté** : `TEST-4 (issue 7)` verrouille déjà la zone (sous-arbre `metrics/` de la carte). Le nouveau test compare la carte à l'arbre réel, comme le demande le pilote, au lieu d'ajouter des `!includes` sur les deux noms périmés : une interdiction de noms ne verrait pas le prochain fichier déplacé. `TEST-4 (issue 7)` est gardé tel quel (il porte aussi l'interdiction de `with-metrics` sous `llm/`, que l'égalité ne couvre pas).
- **D2 · Fichiers `.ts` seulement, pas les dossiers vides** : la carte liste des fichiers ; `interfaces/` et `infrastructure/` n'en contiennent aucun. Les montrer vides contredirait l'usage de la carte (`llm/infrastructure/`, vide, n'y figure pas), et un dossier ne se compare pas à une ligne de fichier. Écarté : ajouter `interfaces/` et `infrastructure/` comme lignes de dossier, avec une règle de test à deux régimes.
- **D3 · `index.ts` dans la carte** : l'égalité stricte sans exception est la règle la plus simple à vérifier ; le guide liste déjà `index.ts` sous `metrics/`. Écarté : exclure le barrel de la comparaison (exception à justifier dans le test, et carte toujours incomplète).
- **D4 · La carte reste une carte cible** : `## Full tree (target map, V1 → V4)` peut annoncer des fichiers futurs `[V2]`/`[V3]`/`[V4]`. Le sous-arbre `metrics/` n'en a aucun ; s'il en reçoit un, TEST-1 échouera et devra exclure les lignes marquées. Ce cas est nommé dans le message d'échec de l'égalité de TEST-1 plutôt que prévu par une règle aujourd'hui inutile.
- **D5 · Test du TSDoc par égalité de phrase** : précédent `TEST-10 (issue 35)` (phrase de #34 dans un en-tête, lignes de 100 colonnes au plus). Une égalité exacte est le seul critère qui échoue sur une phrase approchée. Écarté : une dérogation `definition-of-done/3` (le manifeste n'en porte pas, et ce rôle ne le modifie pas).
- **D6 · Types et scopes** : `docs(roadmap)` pour SPEC-1, `docs(testing)` pour SPEC-2 (dossier `agent/testing`, scope déjà employé par e846b9c) ; squash en `docs(metrics)`, le sujet commun des deux changements.

## Ordre des commits et preuves

Un SPEC = un commit = un test ; chaque test entre dans le commit de son SPEC. La spécification et la checklist entrent dans le commit de SPEC-1 (précédent P1 de #20, #31, #35, #46). Chemins relatifs au dépôt dans toute preuve.

Garde avant toute commande de test (précédent P6 de #26) : `node -e "process.exit(process.env.GEMINI_INTEGRATION === undefined ? 0 : 1)"` rend 0 ; sinon arrêter.

1. **SPEC-1** : écrire TEST-1 d'abord ; `node --test scripts/repo-conventions.test.mjs` échoue sur `TEST-1 (issue 23)` seul, la différence montrant `interfaces/metrics-collector.ts` et `infrastructure/collector.ts` d'un côté, `application/use-cases/metrics-collector.ts` et `index.ts` de l'autre (rouge montré). Puis modifier `ROADMAP.md` ; la même commande passe, `TEST-4 (issue 7)` compris. Après le commit, mutation A : retirer la ligne `    index.ts …` de la carte → `TEST-1 (issue 23)` rouge, `index.ts` nommé ; mutation B (arbre propre) : créer `src/metrics/interfaces/probe.ts` vide → rouge, `interfaces/probe.ts` nommé. Annulation : `git restore ROADMAP.md`, suppression de `src/metrics/interfaces/probe.ts`, `git status --short` vide.
2. **SPEC-2** : écrire TEST-2 d'abord ; `node --test scripts/repo-conventions.test.mjs` échoue sur `TEST-2 (issue 23)` seul (rouge montré). Puis remplacer le TSDoc ; la commande passe. `git diff -U0 HEAD -- src/agent/testing/run-matrix.ts` avant commit ne montre que des lignes de commentaire (`/**`, ` * `, ` */`) ; après `npm run build`, `dist/agent/testing/run-matrix.d.ts` contient `(withMetrics, #46): absent is not zero (ADR-AGENT-0007).` (sortie de `Select-String` ou `grep` montrée).
3. Gates : `npm run build`, `npm run typecheck`, `npm run test` ; aucun test existant ne change de statut, le total de tests augmente de 2.

Gabarit (aucun `Co-Authored-By`) :

```
<type>(<scope>): <sujet>

<corps : ce qui change et la preuve, chemins relatifs au dépôt>

Refs: #23
Session: <id>
Model: <modèle>
Authorship: ai
```

| SPEC | Sujet (impératif, 72 caractères au plus type compris) |
|---|---|
| 1 | `docs(roadmap): aligner la carte de metrics/ sur l'arbre réel` (60) |
| 2 | `docs(testing): compléter le TSDoc de MatrixRun.tokensUsed après #46` (67) |

### Message de squash proposé

```
docs(metrics): aligner la carte et le TSDoc de tokensUsed (#<PR>)

La carte de ROADMAP.md listait sous metrics/ deux fichiers absents,
interfaces/metrics-collector.ts et infrastructure/collector.ts. Elle
liste désormais les cinq fichiers .ts de src/metrics/, MetricsCollector
sous application/use-cases/metrics-collector.ts et le barrel index.ts.
Un test de scripts/repo-conventions.test.mjs compare la carte à
l'arbre réel, dans les deux sens.

Le TSDoc de MatrixRun.tokensUsed dit aussi, depuis #46, qu'un compteur
d'usage qui n'est pas un entier >= 0 le rend null. Commentaire
seulement : aucun type ni comportement ne change, seul
dist/agent/testing/run-matrix.d.ts suit. Un second test fixe la phrase.

Refs: #23
Session: <id>
Model: <modèle>
Authorship: ai
```

Sujet : 57 caractères sans le suffixe ; 63 avec ` (#NN)`. Rappel A4 : le corps de la PR se termine par le même bloc de trailers `Refs` / `Session` / `Model` / `Authorship`.

## Tests

**TEST-1** (exerce SPEC-1), `TEST-1 (issue 23) ROADMAP : la carte de metrics/ liste exactement les fichiers .ts de src/metrics/`, placé juste après `TEST-4 (issue 7)` dans `scripts/repo-conventions.test.mjs`. Critères : sous-arbre délimité comme dans `TEST-4 (issue 7)` (ligne `  metrics/` exclue, jusqu'à la première ligne suivante commençant par `  voice/`, exclue) ; chaque ligne du sous-arbre, rognée, a pour premier mot un chemin terminé par `.ts`, sinon échec avec un message qui cite la ligne ; la liste triée de ces chemins égale (`assert.deepEqual`) la liste triée des entrées de `readdirSync(new URL("../src/metrics/", import.meta.url), { recursive: true })` terminées par `.ts`, séparateurs `\` remplacés par `/` (Windows), avec un message qui dit qu'une ligne `[Vn]` future devra être exclue de la comparaison ; la ligne du chemin `application/use-cases/metrics-collector.ts` contient `MetricsCollector`. Lecture seule, aucun réseau, déterministe.

**TEST-2** (exerce SPEC-2), `TEST-2 (issue 23) le TSDoc de MatrixRun.tokensUsed couvre le compteur d'usage invalide de #46`, en fin de fichier, précédé d'une constante portant la phrase de SPEC-2. Critères : dans `src/agent/testing/run-matrix.ts`, entre la ligne qui commence par `export type MatrixRun<` et la première ligne `};` qui la suit, la ligne `  readonly tokensUsed: number | null;` existe ; la ligne qui la précède est `   */` ; le bloc ouvert par la dernière ligne `  /**` avant elle a des lignes intérieures qui, privées du préfixe `   * ` et jointes par une espace, égalent la phrase ; chaque ligne du bloc, de `  /**` à `   */`, fait 100 colonnes au plus. Lecture seule, déterministe.

## Estimation de taille

Hors `docs/` et `*.md`, lignes ajoutées et retirées :

| Fichier | Estimation |
|---|---|
| `scripts/repo-conventions.test.mjs` (TEST-1 environ 18 ; TEST-2 et constante environ 20) | +34 à +42 −0 |
| `src/agent/testing/run-matrix.ts` | +4 −1 |
| **Total** | **environ 45** (fourchette 35 à 60) |

`ROADMAP.md` : +5 −5 (exclu du compte, `*.md`). Très en dessous du plafond de 400 ; aucune dérogation. La mesure (`pr_size.py`) fait foi à la PR.

## Hypothèses restantes

- **R-1 · `docs/guide-agent-package.md:105-110`** : même erreur que la carte (`interfaces/metrics-collector.ts` l.107, `infrastructure/collector.ts` l.109, sans `metrics-collector.ts` ni `with-metrics.ts` sous `application/use-cases/`). Hors de la portée fixée par l'issue et le pilote. Options pour le pilote : (a) issue de suivi « aligner l'arborescence metrics/ du guide » ; (b) un `[SPEC-3]` dans cette PR (environ +3 −2 dans le guide, en anglais, et un test frère de TEST-1 sur le bloc `  metrics/` du guide, environ +15). Sans décision, la PR reste à SPEC-1 et SPEC-2.
- **R-2 · Autres sous-arbres de la carte** : constatés divergents de l'arbre réel, non corrigés ici : `llm/providers/ollama/ollama-adapter.ts` (réel `ollama-llm-provider.ts`), `llm/providers/gemini/gemini-adapter.ts` (réel `gemini-llm-provider.ts` et `gemini-wire.ts`), `llm/services/response-parser.ts` (absent, dossier vide hormis `.gitkeep`), `llm/testing/` absent de la carte, `agent/services/step.ts` (réel `agent/application/use-cases/step.ts`), `testing/fake-llm-provider.ts` et `testing/fake-app.ts · define-scenario.ts · run-scenario.ts · run-matrix.ts` sous `src/testing/` alors que ces fichiers vivent sous `src/llm/testing/` et `src/agent/testing/` (`src/testing/` ne contient que `index.ts`), « The 3 entry points » alors que `package.json` exporte aussi `./llm`. À ouvrir en issue de suivi si le pilote le veut ; TEST-1 pourra alors être généralisé.
- **R-3 · Carte cible et fichiers futurs** (D4) : si une ligne `[Vn]` est un jour ajoutée sous `metrics/`, TEST-1 échouera ; son message d'échec le dit.
- **Node** ≥ 22.18 (retrait de types sans drapeau ; `readdirSync` récursif, présent depuis Node 20.1), constaté v22.19.0 par #20.
