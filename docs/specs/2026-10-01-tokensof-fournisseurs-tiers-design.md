# Spécification · Faire refuser par `tokensOf` l'usage invalide de tout fournisseur · #60

Date : 2026-10-01
Issue : https://github.com/arthurolivierfortin/agent-core/issues/60 (label `T:bug`, `origine: #46` ; reprend R-1 de docs/specs/2026-10-01-budget-usage-invalide-design.md, relevé par le juge à la revue de la PR #59)
Checklist : docs/specs/2026-10-01-tokensof-fournisseurs-tiers-checklist.md
Branche : `fix/60-tokensof-tiers` (worktree `.claude/worktrees/fix-60-tokensof-tiers`, `main` 4ab989d)
Continuité : docs/specs/2026-10-01-budget-usage-invalide-design.md (#51 : `isTokenCount` dans `src/llm/services/token-count.ts`, appliqué par `toUsage` de Gemini et d'Ollama) ; docs/specs/2026-10-01-metrics-invalid-usage-design.md (#46 : même règle dans `withMetrics`) ; docs/specs/2026-09-30-cap-guard-usage-counters-design.md (#41 : même règle dans `capGuard`).

## Objectif

Faire appliquer par `tokensOf` (`src/agent/application/use-cases/step.ts`) la règle `isTokenCount` aux deux compteurs d'un usage et à leur somme, pour qu'un `LLMProvider` écrit hors du package ou un `FakeLLMProvider` scripté qui rend un compteur `NaN`, négatif, fractionnaire ou infini ne rende plus le budget `maxTokens` inopérant.

## Source de l'issue

Corps de l'issue #60, transmis tel quel par le pilote (le rédacteur n'a pas d'outil de commande et n'a pas pu exécuter `gh issue view 60`, voir R-3) :

> Suivi R-1 relevé par le juge à la revue de la PR #59 (#51), hors périmètre de cette PR. `tokensOf` (src/agent/application/use-cases/step.ts) additionne sans contrôle les compteurs d'usage rendus par un `LLMProvider` tiers ou par `FakeLLMProvider`. La PR #59 a assaini `toUsage` de Gemini et d'Ollama (règle « entier fini ≥ 0 » dans src/llm/services/token-count.ts), mais un fournisseur écrit hors du package peut encore rendre un NaN ou un négatif et rendre le budget `maxTokens` inopérant.
>
> Ce qui est attendu : `tokensOf` applique la même règle `isTokenCount` à chaque compteur avant de l'additionner ; un compteur invalide est ignoré, jamais compté 0. Tests sur le budget avec un fournisseur factice qui rend NaN, négatif, fractionnaire et infini. Aucun type exporté ne change.
>
> Critère de sortie : un fournisseur factice rendant NaN n'empêche plus l'arrêt sur `maxTokens`, prouvé par test.

Contraintes du pilote : code du package publié (`src/`) ; le package ne lit que `process.env`, jamais un fichier `.env` ; aucun fournisseur hébergé appelé dans la suite ; jetons et coût absents ou `null` quand la donnée manque, jamais 0 inventé ; aucun type exporté ne change ; tout nouveau fichier `.ts` de `src/` dans la carte de `ROADMAP.md`, tout nouveau dossier de code dans le guide.

## État constaté dans le code (lecture du 2026-10-01, `main` 4ab989d)

- `src/agent/application/use-cases/step.ts:276-279` (`tokensOf`, non exporté, sans TSDoc) : `if (usage === undefined) return 0; return usage.tokensIn + usage.tokensOut;`. Appelé par `land` (l.225) et `advance` (l.242), les deux seuls endroits où `tokensUsed` grandit. `isOverBudget` l.160-161 : `state.tokensUsed >= maxTokens`, toujours faux pour `NaN` et pour `-Infinity`. `initialState` l.61 : `tokensUsed: 0`.
- `step.ts` l.1-3 importe déjà de `../../../llm/models/index.js` et `../../../llm/interfaces/index.js` : la dépendance `agent → llm` existe.
- `src/llm/services/token-count.ts:8-10` : `isTokenCount(value: unknown): value is number`, `typeof value === "number" && Number.isInteger(value) && value >= 0`. N'importe rien. En-tête l.1-2 : « the rule every usage counter obeys before it leaves a provider adapter, the one capGuard (#41) and withMetrics (#46) apply too. Served by no barrel: the adapters import it relatively. » Importé par `gemini-wire.ts:21` et `ollama-llm-provider.ts:12`. Listé dans `ROADMAP.md:137` et `docs/guide-agent-package.md:81` (« served by no barrel »).
- `src/llm/testing/fake-llm-provider.ts:44-53` : `complete` rend la réponse scriptée telle quelle, `usage` compris, sans contrôle. C'est le « fournisseur factice » des tests.
- `src/agent/application/dtos/index.ts` : `Budget.maxTokens` l.41-42 (« A provider that reports none never trips it. »), `AgentState.tokensUsed: number` l.97-98 (« Stays 0 against a provider that reports none. »), `AgentResult.tokensUsed: number` l.118-124 (« 0 when the provider reports none: this is the budget counter behind `Budget.maxTokens`, which cannot tell "absent" from zero. The metrics framework keeps that distinction (`UsageRecord`, `MetricsTotal`). »). Les deux champs sont des `number` non optionnels de types exportés.
- La distinction « absent » face à 0 est déjà tenue par la couche métriques : `withMetrics` enregistre `{ tokensIn: null, tokensOut: null }` pour un usage absent ou invalide (`src/metrics/application/use-cases/with-metrics.ts:63-71`) ; `MatrixRun.tokensUsed: number | null` vient de ce collecteur et jamais de `AgentResult.tokensUsed` (`src/agent/testing/run-matrix.ts:54`, l.97, l.154).
- Les 19 imports de `src/llm/` écrits hors de `src/llm/` passent tous par un `index.js` (`llm/models`, `llm/interfaces`, `llm/testing`).
- Tests existants : `tests/agent/application/use-cases/step.test.ts:448-467` (budget `maxTokens: 10` avec `FakeLLMProvider`, usage `{ 7, 5 }`, `tokensUsed` 12) ; l.798-830 (`TEST-3 (issue 51)`, même budget par l'adaptateur Ollama) ; `tests/agent/application/use-cases/agentic-llm.test.ts:101-127` (somme 17 sur deux appels ; `tokensUsed` 0 sans usage). Assistants de `step.test.ts` : `wideContext` l.23, `textResponse` l.27, `callResponse` l.31, `navigateTool` l.36, `agentWith` l.98, `driveWithStep` l.108 ; import de types l.13-18 depuis `../../../../dist/llm/index.js` (`Usage` y est exporté : `tests/agent/testing/matrix-demo.test.ts:10`).
- Aucun test de convention ne cite les phrases TSDoc de `tokensUsed`, de `maxTokens` ni l'en-tête de `token-count.ts` (recherche dans `scripts/` et `tests/`).

## Périmètre

Dans la PR :

- `src/agent/application/use-cases/step.ts` : import de `isTokenCount`, `tokensOf` et son TSDoc (SPEC-1) ;
- `src/agent/application/dtos/index.ts` : TSDoc de `Budget.maxTokens`, `AgentState.tokensUsed`, `AgentResult.tokensUsed` seulement (SPEC-1) ;
- `src/llm/services/token-count.ts` : commentaire d'en-tête seulement (SPEC-1) ;
- `tests/agent/application/use-cases/step.test.ts` (TEST-1).

Hors périmètre :

- `isTokenCount` lui-même, les adaptateurs Gemini et Ollama, `withMetrics`, `capGuard`, `FakeLLMProvider`, `checkProviderContract` : inchangés.
- Les barrels, `package.json`, `tsconfig*.json`, `README.md`, `ROADMAP.md`, `docs/guide-agent-package.md`, les ADR : aucun fichier ni dossier créé (voir D2), donc rien à ajouter à la carte ni au guide.
- La forme de tout type exporté, dont `AgentState.tokensUsed` et `AgentResult.tokensUsed` qui restent `number` (voir D3).
- Un `usage` à `null` rendu par un fournisseur JavaScript : hors du contrat `Usage | undefined`, non testé (R-4).

## Conception

### SPEC-1 · `tokensOf` applique `isTokenCount` aux compteurs et à leur somme

Dans `step.ts`, après l'import de types de `../../../llm/models/index.js` (l.3), ajouter :

```ts
import { isTokenCount } from "../../../llm/services/token-count.js";
```

`tokensOf` devient (TSDoc en anglais, comme le reste de `src/`) :

```ts
/**
 * The tokens one call adds to the budget. Both counters, and their sum, must be integers >= 0
 * (isTokenCount, the rule the shipped adapters apply), else the call adds nothing, exactly as if
 * the provider had reported no usage. A provider written outside the package, or a scripted fake,
 * can still hand back NaN, a negative, a fraction or Infinity, and one such value would keep
 * maxTokens from ever falling (#60). The valid partner of an invalid counter is not counted
 * either: a usage with one wrong counter is not trusted for the other.
 */
function tokensOf(usage: Usage | undefined): number {
  const tokensIn = usage?.tokensIn;
  const tokensOut = usage?.tokensOut;
  if (!isTokenCount(tokensIn) || !isTokenCount(tokensOut)) return 0;
  const total = tokensIn + tokensOut;
  // Two valid counters may still sum past Number.MAX_VALUE, to Infinity.
  if (!isTokenCount(total)) return 0;
  return total;
}
```

Chaque compteur est lu une fois ; un usage absent passe par le même chemin qu'un usage invalide (`isTokenCount(undefined)` est faux), ce qui remplace l'ancien `if (usage === undefined) return 0;` sans changer son résultat. `land` et `advance` ne changent pas : ils appellent déjà `tokensOf`.

TSDoc des types de `src/agent/application/dtos/index.ts`, mots exacts, forme des types inchangée :

- `Budget.maxTokens` (l.41) devient : « Bound on the tokens the provider reported. A provider that reports none never trips it, and a call whose usage has a counter, or a sum, that is not an integer >= 0 counts as reporting none. »
- `AgentState.tokensUsed` (l.97) devient : « Sum of the tokens the provider reported. Stays 0 against a provider that reports none; a call whose usage has a counter, or a sum, that is not an integer >= 0 adds nothing. »
- `AgentResult.tokensUsed` (l.118-123) : la phrase « A call whose usage has a counter, or a sum, that is not an integer >= 0 adds nothing, as if unreported. » s'insère après « …which cannot tell "absent" from zero. » ; le reste du TSDoc est conservé mot pour mot.

En-tête de `src/llm/services/token-count.ts` (l.1-2), commentaire seulement, la fonction ne change pas :

```ts
// #51: the rule every usage counter obeys before it leaves a provider adapter, the one capGuard
// (#41) and withMetrics (#46) apply too, and the one the agent loop applies before adding usage
// to its token budget (#60). Served by no barrel: the adapters and step.ts import it relatively.
```

### Sémantique tranchée de « ignoré, jamais compté 0 »

- **Apport d'un appel** : la somme `tokensIn + tokensOut` quand les deux compteurs et la somme passent `isTokenCount` ; sinon l'appel n'apporte rien à `tokensUsed`, exactement comme un appel sans usage.
- **Compteur valide accompagnant un invalide** : non compté (D1). `{ tokensIn: NaN, tokensOut: 5 }` apporte 0 et non 5 ; `{ tokensIn: 20, tokensOut: -15 }` apporte 0 et non 5 ni 20.
- **« Jamais compté 0 »** se lit ainsi : aucun compteur invalide n'est remplacé par 0 pour former une somme partielle (`{ NaN, 5 }` n'est pas lu `{ 0, 5 }`), et aucun usage n'est fabriqué. Pour une somme courante, « l'appel n'apporte rien » s'écrit `+ 0` : la valeur de retour `0` de `tokensOf` est l'élément neutre de l'addition, pas une donnée inventée, comme elle l'est déjà pour un usage absent.
- **Budget** : un usage invalide ne fait jamais tomber `maxTokens` à lui seul et ne retire rien aux appels valides ; le budget tombe sur la somme des usages valides.
- **`tokensUsed` sans aucun usage valide** : reste 0 (valeur de `initialState`, l.61), comme aujourd'hui pour un fournisseur qui ne rapporte rien (`agentic-llm.test.ts:121-127`). La règle projet « absent ou `null`, jamais 0 » est tenue par la couche métriques, qui seule distingue l'absence (D3).

### Effet sur l'API publique

- **Types exportés** : aucun changement de forme. `tokensOf` n'est pas exporté ; `isTokenCount` n'entre dans aucun barrel ; aucun symbole n'est ajouté ni retiré (`tests/barrel-contract.test.ts` inchangé).
- **Sémantique** : `AgentState.tokensUsed`, `AgentResult.tokensUsed` et l'arrêt sur `maxTokens` ignorent désormais l'usage invalide de tout fournisseur. Pour les adaptateurs du dépôt, un seul cas change : Ollama ou Gemini rendant deux compteurs entiers dont la somme déborde (`1e308` et `1e308`) apportait `Infinity`, il n'apporte plus rien.
- **Métriques et rapport H2** : inchangés (`withMetrics` et `run-matrix` ne lisent pas `tokensOf`).
- **Version** : correction de comportement sans changement de signature ; correctif (patch).

## Chemins nominal et d'erreur

Script de TEST-1 : appel `navigate` `{ page: "reglages" }` avec l'usage de la ligne, appel `navigate` `{ page: "profil" }` avec `{ 6, 6 }`, texte `"je conclus ici"` avec `{ 1, 1 }` ; `budget: { maxTokens: 10 }`.

| Usage du premier appel | Avant #60 (`stopReason`, `tokensUsed`, `lastContent`, appels) | Après #60 |
|---|---|---|
| `{ NaN, 5 }` | `completed`, `NaN`, `"je conclus ici"`, 3 | `budget`, 14, `"je conclus ici"`, 3 |
| `{ 20, -15 }` (somme 5, entière) | `budget`, 19, `"je conclus ici"`, 3 | idem |
| `{ 7, -20 }` (somme négative) | `completed`, 1, `"je conclus ici"`, 3 | idem |
| `{ 0.5, 4.5 }` (somme 5, entière) | `budget`, 19, `"je conclus ici"`, 3 | idem |
| `{ 7, Infinity }` | `budget`, `Infinity`, `""`, 2 | idem |
| `{ 7, -Infinity }` | `completed`, `-Infinity`, `"je conclus ici"`, 3 | idem |
| `{ 1e308, 1e308 }` (somme `Infinity`) | `budget`, `Infinity`, `""`, 2 | idem |
| `{ "7", 5 }` (non numérique, JavaScript) | `budget`, `"07512"`, `""`, 2 | idem |
| `{ 7, 5 }` valide (test existant l.448, script à deux réponses) | `budget`, 12 | inchangé |
| absent (test existant `agentic-llm.test.ts:121`) | `tokensUsed` 0 | inchangé |

« idem » : `budget`, 14, `"je conclus ici"`, 3. Appel d'atterrissage au compteur invalide (deuxième test de TEST-1) : appel `navigate` `{ 6, 6 }` puis texte `"je conclus ici"` avec `{ NaN, 1 }`, `maxTokens: 10`. Avant : `tokensUsed` `NaN`. Après : `budget`, 12, 2 appels.

## Symétrie

- Écriture face à lecture : les fournisseurs écrivent `LLMResponse.usage` ; `tokensOf` le lit pour `tokensUsed` et le budget (SPEC-1), `withMetrics` pour les métriques (inchangé). Après #60, les deux lecteurs rejettent le même usage invalide : `withMetrics` enregistre `{ null, null }`, `tokensOf` n'apporte rien.
- Les deux écritures de `tokensUsed` : `advance` (appel ordinaire) et `land` (appel d'atterrissage) passent par `tokensOf` ; TEST-1 exerce les deux (table sur `advance`, test d'atterrissage sur `land`).
- Chemin nominal face au chemin d'erreur : dans chaque ligne de la table, le deuxième et le troisième appel sont valides et comptés (12 puis 2) face au premier, ignoré ; le chemin nominal seul reste verrouillé par `step.test.ts:448-467` et `agentic-llm.test.ts:101-119`.
- Règle « entier ≥ 0 » sur ses couches : adaptateurs (#51, source), boucle (#60, budget), `withMetrics` (#46, enregistrement), `capGuard` (#41, coupure). Une seule définition pour les deux premières (`token-count.ts`), deux copies identiques pour les deux autres (R-2).
- Aucune énumération touchée.

## Données touchées

Aucune base, aucun fichier écrit, aucune variable d'environnement lue ni posée. Les tests passent par `FakeLLMProvider` ; aucun appel réseau, aucune clé.

## Dépendances

Aucune dépendance. (#46, origine, est livrée par la PR #50 ; #51, dont #60 reprend R-1, est livrée par la PR #59, commit 419617a sur `main`.)

## Décisions et alternatives écartées

- **D1 · Usage entier ignoré** si l'un des compteurs ou leur somme échoue `isTokenCount`, plutôt qu'un contrôle compteur par compteur qui garderait le compteur valide. L'issue dit « à chaque compteur » et « un compteur invalide est ignoré » : chaque compteur est bien contrôlé, et ce qui est ignoré est l'usage qui le porte. Raisons : (1) même résultat pour tout fournisseur, ce que l'issue vise (« la même règle ») : la même réponse Ollama `{ 20, -15 }` rend `usage` absent par l'adaptateur (#51) et apporte donc 0 ; si `tokensOf` gardait le 20 d'un fournisseur tiers, la boucle compterait différemment deux fournisseurs pour les mêmes compteurs ; (2) même choix que `withMetrics` (#46, D1), `capGuard` (#41) et `toUsage` (#51, D1) : un usage dont un compteur est faux n'est pas digne de confiance pour l'autre ; (3) garder un compteur seul revient à lire l'autre comme 0, ce que l'issue interdit. Coût accepté : le budget peut tomber plus tard qu'avec un contrôle par compteur (`{ NaN, 5 }` n'apporte pas 5).
- **D2 · Import direct de `src/llm/services/token-count.ts` depuis `step.ts`**, sans nouveau fichier. Sens des dépendances vérifié : `agent → llm` est le sens autorisé, l'agent étant la racine de composition qui dépend légitimement de toutes les couches (`docs/decisions/ADR-AGENT-0012-framework-independence-core-kernel-subpaths.md:46` et l.50) ; `step.ts` importe déjà `llm/models` et `llm/interfaces` ; `token-count.ts` n'importe rien, donc aucun cycle et `llm` reste une feuille (ADR-AGENT-0012:62). Côté couches (`docs/decisions/ADR-AGENT-0001-hexagonal-architecture-use-cases-functions.md:49-52` et l.59-63) : un cas d'usage appelle une fonction pure de `services/`, ce que la règle permet ; la seule interdiction de la règle, « `services/` n'importe jamais `interfaces/` », n'est pas en jeu. Écart assumé : c'est le premier import de `src/llm/` écrit hors de `src/llm/` qui ne passe pas par un `index.js` ; aucune règle écrite ne l'interdit (`docs/guide-agent-package.md:215` vise les consommateurs du paquet, et aucun outil de contrôle des frontières n'existe dans le dépôt), et le coût est déclaré en R-1. Alternatives écartées :
  - exporter `isTokenCount` par `./llm` : ajoute un symbole public (contrat semver, `tests/barrel-contract.test.ts`) pour une expression d'une ligne, déjà écarté par #51 (D2) ;
  - copie privée dans `step.ts` ou nouveau `src/agent/services/token-count.ts` : quatrième définition de la règle (R-2), alors que l'issue demande « la même règle `isTokenCount` » ;
  - déplacer la règle dans `src/core/` : `core/index.ts` est réexporté par `src/llm/index.ts` (`ROADMAP.md:132`), la règle deviendrait publique ;
  - créer un barrel interne `src/llm/services/index.ts` : nouveau fichier à cartographier, barrel qui ne sert aucun point d'entrée, et ne résout pas R-1.
- **D3 · `tokensUsed` reste un `number` à 0 sans usage valide.** Rendre `undefined` ou `null` changerait la forme de `AgentState.tokensUsed` et `AgentResult.tokensUsed`, deux types exportés, ce que l'issue exclut. Le TSDoc de `AgentResult.tokensUsed` déclare déjà ce compteur comme celui du budget, qui ne distingue pas l'absence de zéro, et renvoie aux métriques pour cette distinction ; `withMetrics` (`{ null, null }`) et `MatrixRun.tokensUsed` (`null`) tiennent la règle « jamais 0 inventé » côté mesure. #60 ne fait qu'étendre « usage absent » à « usage invalide » dans ce compteur.
- **D4 · Somme contrôlée** en plus des deux compteurs, comme D4 de #51 pour Gemini : deux entiers valides peuvent sommer à `Infinity`, qui n'est pas un compte. Écarté : laisser `Infinity` faire tomber le budget, ce qui le ferait tomber sur un usage faux et rendrait `tokensUsed` `Infinity`.
- **D5 · Tests par `FakeLLMProvider`**, le fournisseur factice que nomme l'issue ; c'est aussi le seul chemin qui livre à `tokensOf` un usage non assaini, puisque les adaptateurs du dépôt l'assainissent depuis #51. Les valeurs non sérialisables en JSON (`NaN`, `Infinity`) passent telles quelles en mémoire.
- **D6 · Ligne non numérique `"7"`** ajoutée aux quatre familles de l'issue : un fournisseur JavaScript peut la rendre, et l'ancien `tokensOf` concaténait alors des chaînes (`tokensUsed` `"07512"`) ; `isTokenCount` la couvre sans code de plus.
- **D7 · Type `fix`, scope `agent`** : label `T:bug`, la valeur fausse observable est `AgentResult.tokensUsed` et l'arrêt sur `maxTokens`, tous deux dans `src/agent/`.

## Ordre des commits et preuve de rouge

Un SPEC, un commit. La spécification et la checklist entrent dans le commit de SPEC-1 (précédent P1 de #20, #35, #39, #41, #46, #51). Preuves par `npm run build` puis `npm run test` ; la sortie montre les titres `TEST-1 (issue 60)`.

- Rouge avant SPEC-1 (TEST-1 écrit, `step.ts` non modifié) : les 9 tests ajoutés échouent (valeurs « Avant » du tableau) ; aucun autre test ne change de statut.
- Vert après SPEC-1 : les 9 passent ; aucun test existant ne change de statut.
- Mutations, après le commit de SPEC-1, sur l'arbre propre, chacune annulée par `git restore src/agent/application/use-cases/step.ts` puis `git diff --stat -- src/agent/application/use-cases/step.ts` vide :
  1. `if (!isTokenCount(tokensIn) || !isTokenCount(tokensOut)) return 0;` remplacé par `if (tokensIn === undefined || tokensOut === undefined) return 0;` (garde le rétrécissement de type, donc compile) : échouent au moins les lignes `{ 20, -15 }` et `{ 0.5, 4.5 }` (somme entière, `tokensUsed` 19) ;
  2. retrait de `if (!isTokenCount(total)) return 0;` : échoue au moins la ligne `{ 1e308, 1e308 }`.
  Sorties montrées dans le rapport du builder et dans la description de la PR.

Gabarit (aucun `Co-Authored-By`) :

```
<type>(<scope>): <sujet>

<corps : ce qui change et la preuve de rouge, chemins relatifs au dépôt>

Refs: #60
Session: <id>
Model: <modèle>
Authorship: ai
```

| SPEC | Sujet (impératif, 72 caractères au plus type compris) |
|---|---|
| 1 | `fix(agent): borner tokensOf aux compteurs d'usage valides` (57) |

### Message de squash proposé

```
fix(agent): borner tokensOf aux compteurs d'usage valides (#<PR>)

tokensOf applique isTokenCount (src/llm/services/token-count.ts) aux
deux compteurs d'un usage et à leur somme : un usage dont l'un n'est
pas un entier fini >= 0 (NaN, négatif, fractionnaire, infini, non
numérique) n'apporte rien à tokensUsed, comme un usage absent. Un
fournisseur écrit hors du package ou un FakeLLMProvider scripté ne
rend plus le budget maxTokens inopérant.

Aucun type exporté ne change ; tokensUsed reste 0 sans usage valide,
les métriques gardent null. Seul effet sur les adaptateurs du dépôt :
deux compteurs dont la somme déborde n'apportent plus Infinity.

Refs: #60
Session: <id>
Model: <modèle>
Authorship: ai
```

Sujet : 57 caractères sans le suffixe ; 63 avec ` (#NN)`. Le corps de la PR se termine par le même bloc de trailers.

## Tests

Déterministes, sans réseau, sans fournisseur réel ni clé, sans variable d'environnement. Titres en anglais comme leurs voisins, préfixés `TEST-1 (issue 60)`, sans `#`, ajoutés en fin de `tests/agent/application/use-cases/step.test.ts`. Aucun test existant n'est modifié ; `Usage` est ajouté à l'import de types l.13-18 (`../../../../dist/llm/index.js`).

**TEST-1** (exerce SPEC-1), 9 tests.

Table `INVALID_USAGES` (8 lignes `[why, usage]`, un `test()` par ligne), la ligne `"7"` écrite `{ tokensIn: "7", tokensOut: 5 } as unknown as Usage` :

1. `{ tokensIn: NaN, tokensOut: 5 }`
2. `{ tokensIn: 20, tokensOut: -15 }`
3. `{ tokensIn: 7, tokensOut: -20 }`
4. `{ tokensIn: 0.5, tokensOut: 4.5 }`
5. `{ tokensIn: 7, tokensOut: Infinity }`
6. `{ tokensIn: 7, tokensOut: -Infinity }`
7. `{ tokensIn: 1e308, tokensOut: 1e308 }`
8. `{ tokensIn: "7", tokensOut: 5 }`

Pour chaque ligne : `new FakeLLMProvider({ responses: [r1, r2, r3] })` avec `r1 = { ...callResponse("call-1", "navigate", { page: "reglages" }), usage }`, `r2 = { ...callResponse("call-2", "navigate", { page: "profil" }), usage: { tokensIn: 6, tokensOut: 6 } }`, `r3 = { ...textResponse("je conclus ici"), usage: { tokensIn: 1, tokensOut: 1 } }` ; deps `{ agent: agentWith([navigateTool()]), llm, context: wideContext(), budget: { maxTokens: 10 } }` ; `driveWithStep(deps, "amene-moi aux reglages")`. Attendu : `stopReason` `"budget"`, `tokensUsed` `14` (`assert.equal`, qui échoue sur `NaN`, `Infinity` et `"07512"`), `lastContent` `"je conclus ici"`, `llm.calls.length` `3`.

Test d'atterrissage : `responses` `[{ ...callResponse("call-1", "navigate", { page: "reglages" }), usage: { tokensIn: 6, tokensOut: 6 } }, { ...textResponse("je conclus ici"), usage: { tokensIn: NaN, tokensOut: 1 } }]`, mêmes deps. Attendu : `stopReason` `"budget"`, `tokensUsed` `12`, `lastContent` `"je conclus ici"`, `llm.calls.length` `2`.

## Estimation de taille

Hors `docs/` et `*.md`, lignes ajoutées et retirées :

| Fichier | Estimation |
|---|---|
| `src/agent/application/use-cases/step.ts` (import, `tokensOf`, TSDoc) | +16 −2 |
| `src/agent/application/dtos/index.ts` (trois TSDoc) | +5 −3 |
| `src/llm/services/token-count.ts` (en-tête) | +3 −2 |
| `tests/agent/application/use-cases/step.test.ts` | +60 −1 |
| **Total** | **environ 90** (fourchette 70 à 130) |

Sous le plafond de 400 ; aucune dérogation. La mesure (`pr_size.py`) fait foi à la PR.

## Hypothèses restantes

- **R-1 · Import hors barrel entre frameworks** (D2) : le jour où `llm` devient un paquet distinct (ADR-AGENT-0012:56), `src/llm/services/token-count.ts`, servi par aucun barrel, ne sera pas atteignable depuis le paquet agentique ; il faudra alors l'exporter ou le copier. Sans effet aujourd'hui (même paquet, compilé par `tsc` sans bundler).
- **R-2 · Trois définitions de la règle**, inchangées en nombre : `token-count.ts` (adaptateurs et boucle), `with-metrics.ts:54-57` (#46), `scripts/h2-report/cap-guard.ts:39-42` (#41).
- **R-3 · Corps de l'issue** transmis par le pilote ; le rédacteur n'a pas pu exécuter `gh issue view 60`. Le builder relit l'issue avant SPEC-1 et signale tout écart, titre compris (la checklist en porte un titre descriptif).
- **R-4 · `usage: null`** d'un fournisseur JavaScript : hors du type `Usage | undefined`, non testé. La lecture `usage?.tokensIn` du code prescrit le traite comme absent, alors que l'ancien `tokensOf` levait un `TypeError` ; ce n'est pas un engagement de #60.
- **R-5 · Débordement du cumul** : `state.tokensUsed + tokensOf(...)` n'est pas contrôlé ; l'atteindre demande un cumul de comptes valides voisin de `1.8e308`, et il ferait alors tomber le budget (`Infinity >= maxTokens`), sens sûr.
- **Node** ≥ 22.18 (retrait de types sans drapeau), constaté v22.19.0 par #20.
