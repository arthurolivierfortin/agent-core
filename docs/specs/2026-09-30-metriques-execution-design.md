# Spécification · métriques par exécution (partie A du harnais complet) · #2

Date : 2026-09-30
Issue : https://github.com/arthurolivierfortin/agent-core/issues/2 (T:feature, jalon H1)
Checklist : docs/specs/2026-09-30-metriques-execution-checklist.md
Branche : `feat/2-metriques-execution` (worktree `.claude/worktrees/feat+2-harnais-matrice`, `main` 74876fc intégrée)

## Objectif

Exposer les jetons consommés par une exécution d'agent et fournir, sans toucher davantage au moteur, les types, l'agrégation pure et le collecteur qui transforment des enregistrements d'appels en un total (appels, jetons, durée, coût) calculé à partir d'une table de tarifs injectée.

## Source de l'issue (corps relevé le 2026-09-30)

Découpage du 2026-09-30 de l'ancienne #2 : #2 = A (métriques, cette spécification), #8 = B (`runMatrix`), #9 = C (`toCSV`, rejeu, démonstration). Attendus de l'issue, liste fermée :

1. `tokensUsed` exposé dans `AgentResult` (rempli depuis `AgentState.tokensUsed`) : seule modification du moteur (`step.ts`).
2. Types `UsageRecord` { model, tokensIn, tokensOut, durationMs } (jetons à null si le fournisseur ne rapporte pas d'usage), `Rate` (unité dans le nom), `RateTable`, `MetricsTotal` { calls, tokensIn, tokensOut, durationMs, costUsd }.
3. Fonction pure `aggregate(records, rates?)`.
4. `MetricsCollector` (`record`, `records`, `total(rates?)`), portée = l'instance.
5. Décorateur `withMetrics(provider, collector, now?)`.
6. Exports publics depuis `.`.

Contraintes de l'issue : modèles factices seulement (`FakeLLMProvider`), aucun fournisseur hébergé dans les tests ; aucun `console.log` ; le package ne lit que `process.env` ; gates build, typecheck, test ; PR sous 400 lignes hors `docs/` et `*.md`, sinon `withMetrics` passe en tête de #8, sans dérogation.

## Décision de portée : `withMetrics` sort de A

Estimation des lignes ajoutées ou modifiées hors `docs/` et `*.md`, au style du dépôt (commentaires de conception sur chaque type et chaque fonction) :

| Élément | Source | Tests |
|---|---|---|
| `AgentResult.tokensUsed` | ~3 | ~16 |
| Types `src/metrics/models/index.ts` | ~45 | |
| `aggregate` | ~50 | ~95 |
| `MetricsCollector` | ~30 | ~50 |
| Barrels et verrou `barrel-contract` | ~6 | ~30 |
| **Sous-total A retenu** | **~134** | **~191** (total ~325) |
| `withMetrics` (délégation, horloge, erreur) | ~40 | ~90, plus ~8 au verrou (total ~138) |

Avec `withMetrics`, la PR est estimée à ~460 lignes, au-dessus du plafond de 400. Application de la règle de l'issue : **`withMetrics` et son export sortent de A et passent en tête de #8**, sans dérogation. Le corps de #8 le prévoit déjà (« Si l'issue #2 dépasse 400 lignes hors docs, `withMetrics` passe en tête de cette issue »). Le paramètre `now?` part avec lui : rien dans A ne mesure de durée, `UsageRecord.durationMs` est fourni par l'appelant de `record`.

Une question de conception sur `withMetrics` a été relevée pendant cette passe ; elle est transmise à #8 (section « Question ouverte transmise à #8 ») et ne bloque pas A.

## État constaté dans le code (lecture du 2026-09-30)

- `src/agent/application/dtos/index.ts:110-118` : `AgentResult` = { content, toolCalls, stopReason, iterations } ; pas de `tokensUsed`. `AgentState.tokensUsed: number` (l.97-98) est documenté « Stays 0 against a provider that reports none ».
- `src/agent/application/use-cases/step.ts:68-77` : `toResult(state)` construit `AgentResult` champ par champ. `tokensOf(usage)` (l.275-278) rend 0 quand `usage` est absent ; `advance` (l.241) et `land` (l.224) cumulent dans `state.tokensUsed`.
- `tests/agent/application/use-cases/agentic-llm.test.ts:157-162` : le cas « a caller can drive the loop itself, one iteration at a time » compare `toResult(state)` par `assert.deepEqual` à un objet à quatre champs : il échoue dès que `AgentResult` gagne un champ, et doit être mis à jour dans le même commit.
- `AgentResult` est aussi lu par `src/agent/application/use-cases/agentic-llm.ts:35` (`run`), `src/agent/testing/run-scenario.ts:50` (`checkExpectation`) et `tests/barrel-contract.test.ts:185` ; aucun de ces lecteurs ne construit d'`AgentResult` littéral, aucun autre changement n'est donc forcé. Aucun fichier de `examples/` ne nomme `AgentResult`.
- `src/metrics/` existe avec des `.gitkeep` seulement (`models/`, `interfaces/`, `services/`, `infrastructure/`) ; pas de `src/metrics/index.ts`, pas de `src/metrics/application/`.
- `src/index.ts` réexporte `llm`, `context`, `tools`, `agent` ; `src/llm/index.ts` ne réexporte ni `context` ni `agent` (verrouillé par `tests/barrel-contract.test.ts:142-146` et `:156-160`).
- `src/llm/models/index.ts:38-42` : `Usage = { tokensIn: number; tokensOut: number }`, « Absent (not zero) when the provider does not supply it ».
- Aucun des noms `aggregate`, `Rate`, `RateTable`, `UsageRecord`, `MetricsTotal`, `MetricsCollector`, `withMetrics` n'existe sous `src/`, `tests/` ou `examples/` : pas de collision sur les `export *` du barrel racine.
- `tsconfig.json` : `target` ES2022 (donc `Object.hasOwn` disponible), `strict`, `include` = `src`, `tests`. Les tests importent le code compilé depuis `dist/` (`npm run test` = `npm run build && node --test`) et sont exécutés par `node --test` avec retrait des types : les imports de types s'écrivent `import type`.
- Manifeste (`CLAUDE.md`, bloc `core-project`) : `GATE-1 build` `npm run build`, `GATE-2 typecheck` `npm run typecheck`, `GATE-3 test` `npm run test` ; `derogations: []`.

## Périmètre

Dans la PR :

- `AgentResult.tokensUsed` (SPEC-1), seule modification du moteur.
- Types `UsageRecord`, `Rate`, `RateTable`, `MetricsTotal` et fonction pure `aggregate` : sommes (SPEC-2) puis coût (SPEC-3).
- Classe `MetricsCollector` : `record` et `records` (SPEC-4), `total` (SPEC-5).
- Barrel `src/metrics/index.ts` et export depuis `.` avec son verrou (SPEC-6).

Hors périmètre :

- `withMetrics(provider, collector, now?)` et son export : tête de #8 (voir ci-dessus).
- `runMatrix`, `MatrixRun`, `toJSON` (#8) ; `toCSV`, `replayRun`, démonstration, documentation du guide et du README (#9).
- Validation des valeurs d'un `Rate` (négatif, `NaN`, `Infinity`) : la table vient du consommateur ; une valeur non finie produit un coût non fini. Aucune règle n'est posée dans A.
- Ventilation du total par modèle : `aggregate` rend un total unique.
- Aucun changement à `FakeLLMProvider`, au port `LLMProvider`, à `runScenario` ni à `ScenarioResult`.

## Conception

### Placement (convention `docs/conventions/architecture.md`)

| Fichier | Contenu | Règle appliquée |
|---|---|---|
| `src/metrics/models/index.ts` | `UsageRecord`, `Rate`, `RateTable`, `MetricsTotal` | données : `models/`, types seuls |
| `src/metrics/services/aggregate.ts` | `aggregate` | fonction pure : `services/`, n'importe que `../models/index.js` |
| `src/metrics/application/use-cases/metrics-collector.ts` | `MetricsCollector` | API publique à état : classe (ADR-AGENT-0009), à côté de sa mécanique pure, comme `AgenticLLM` au-dessus de `step` |
| `src/metrics/index.ts` | barrel du framework `metrics` | même forme que `src/context/index.ts` |
| `src/index.ts` | `export * from "./metrics/index.js";` | le framework est servi par `.` ; `./llm` ne le porte pas |

Les `.gitkeep` de `src/metrics/models/` et `src/metrics/services/` restent en place ; les retirer n'est pas un livrable.

### Types (SPEC-2)

```ts
/** One provider call, as measured. Tokens are null when the provider reported no usage. */
export type UsageRecord = {
  model: string;
  tokensIn: number | null;
  tokensOut: number | null;
  durationMs: number;
};

/** A model's price, in US dollars per million tokens. */
export type Rate = {
  usdPerMillionTokensIn: number;
  usdPerMillionTokensOut: number;
};

/** Keyed by the model id carried by the call; null means "not billed" (a local model). */
export type RateTable = Readonly<Record<string, Rate | null>>;

export type MetricsTotal = {
  calls: number;
  tokensIn: number | null;
  tokensOut: number | null;
  durationMs: number;
  costUsd: number | null;
};
```

Les commentaires ci-dessus sont le minimum ; le builder les rédige au style du dépôt (anglais, le pourquoi), et le commentaire de `RateTable` renvoie à la règle de coût ci-dessous.

### Règle de coût (normative)

1. **Aucun tarif n'est codé en dur dans le package.** La `RateTable` est injectée par l'appelant (`aggregate(records, rates)`, `collector.total(rates)`) ; le package ne lit aucun fichier et ne connaît aucun prix (ADR-AGENT-0007, « Rates do not live in the package »).
2. **Le coût vaut `null`, jamais 0, dès qu'une information manque. Absent n'est pas zéro.** Le coût d'un enregistrement est `null` quand l'un des cas suivants est vrai :
   - aucune table n'est passée (`rates` vaut `undefined`) ;
   - le modèle de l'enregistrement n'est pas une clé **propre** de la table (`Object.hasOwn(rates, record.model)` est faux ; un modèle nommé `toString` ou `constructor` n'hérite donc d'aucun tarif) ;
   - le tarif du modèle vaut `null` (modèle non facturé, par exemple local) ;
   - l'enregistrement n'a pas d'usage (`tokensIn` ou `tokensOut` vaut `null`).
3. Sinon, coût d'un enregistrement = `(tokensIn × usdPerMillionTokensIn + tokensOut × usdPerMillionTokensOut) / 1 000 000`, en dollars US.
4. `MetricsTotal.costUsd` vaut `null` dès qu'**un seul** enregistrement a un coût `null` : jamais de somme partielle des seuls enregistrements chiffrés. Sinon, c'est la somme des coûts, dans l'ordre des enregistrements.
5. Sans aucun enregistrement : `costUsd` vaut `null` sans table (l'absence de table rend le coût `null` quels que soient les enregistrements) et `0` avec une table (rien n'a été consommé, aucun tarif ne manque).
6. **En aval (#9)**, un coût `null` s'exporte en cellule CSV vide, jamais en `0` ni en texte `null`.

### Sommes (SPEC-2)

`aggregate(records: readonly UsageRecord[], rates?: RateTable): MetricsTotal` :

- `calls` = nombre d'enregistrements ;
- `durationMs` = somme des `durationMs` ;
- `tokensIn` = somme des `tokensIn`, ou `null` dès qu'un enregistrement a `tokensIn` à `null` ; `tokensOut` de même, indépendamment. Même principe que la règle de coût (ADR-AGENT-0007, règle 2 « Absent ≠ zero ») : une somme qui compterait un usage absent pour 0 sous-estimerait sans le dire ;
- sans enregistrement : `calls` 0, `tokensIn` 0, `tokensOut` 0, `durationMs` 0 ;
- ne modifie ni le tableau reçu ni ses éléments ; ne lève jamais (aucune entrée n'est rejetée, voir « Hors périmètre »).

SPEC-2 livre `aggregate` avec `costUsd` toujours `null` (aucun tarif encore lu : c'est le cas « pas de table » de la règle) ; SPEC-3 ajoute la lecture de `rates` et la règle complète.

### `MetricsCollector` (SPEC-4, SPEC-5)

```ts
export class MetricsCollector {
  record(entry: UsageRecord): void;
  records(): UsageRecord[];
  total(rates?: RateTable): MetricsTotal;
}
```

- **Portée = l'instance** (ADR-AGENT-0007, option C) : aucun état statique ni de module ; deux collecteurs ne partagent rien ; pas de `start` ni de `stop`.
- `record(entry)` conserve une **copie** de `entry` (`{ ...entry }`) : modifier l'objet passé après coup ne change pas ce qui a été enregistré.
- `records()` rend un **nouveau tableau de copies**, dans l'ordre d'enregistrement, à chaque appel : ni le tableau rendu ni ses éléments ne donnent accès à l'état interne (même précaution que `FakeLLMProvider.models()`).
- `total(rates?)` rend `aggregate(<enregistrements>, rates)` : aucune arithmétique propre au collecteur.
- Pas de chemin d'erreur : aucune méthode ne lève.

### Exports (SPEC-6)

- `src/metrics/index.ts` réexporte `./models/index.js`, `./services/aggregate.js` (dès SPEC-2) et `./application/use-cases/metrics-collector.js` (dès SPEC-4). Les tests de SPEC-2 à SPEC-5 importent depuis `dist/metrics/index.js`.
- SPEC-6 ajoute `export * from "./metrics/index.js";` à `src/index.ts`. `./llm` et `./testing` ne portent pas `metrics`.
- Verrou : valeurs (`aggregate`, `MetricsCollector`) testées à l'exécution ; types (`UsageRecord`, `Rate`, `RateTable`, `MetricsTotal`) verrouillés par annotation de valeurs produites par le package, contrôlée par `npm run typecheck`, selon la méthode déjà écrite dans `tests/barrel-contract.test.ts:75-79`.

### `AgentResult.tokensUsed` (SPEC-1)

- `AgentResult` gagne `tokensUsed: number`, commenté : somme des jetons (entrée + sortie) rapportés par le fournisseur sur toute l'exécution, appel d'atterrissage compris ; 0 quand le fournisseur n'en rapporte aucun.
- `toResult(state)` le remplit depuis `state.tokensUsed`. Aucune autre ligne du moteur ne change.
- **Asymétrie assumée** : ce champ est le compteur de budget du moteur (`maxTokens`), il vaut 0 quand l'usage est absent ; les métriques (`UsageRecord`, `MetricsTotal`) distinguent absent (`null`) de zéro. Les deux coexistent parce que l'issue fixe la source (`AgentState.tokensUsed`) et que changer le type du compteur de budget modifierait le moteur au-delà de `toResult`. #8 choisit laquelle des deux sources alimente `MatrixRun.tokensUsed` en connaissant cette différence.

## Chemins nominal et d'erreur

| Élément | Nominal | Erreur |
|---|---|---|
| `toResult` | `tokensUsed` = `state.tokensUsed` | aucun nouveau : un état lu trop tôt rend `tokensUsed` 0, `stopReason` `error` (comportement existant) |
| `aggregate` | sommes et coût selon les règles | ne lève pas ; toute information manquante produit `null`, jamais 0 |
| `MetricsCollector` | enregistre, relit, totalise | ne lève pas |

## Symétrie

- Écriture face à lecture : `toResult` écrit `tokensUsed`, TEST-1 le lit via `run()` et `toResult` ; `record` écrit, `records` et `total` lisent (TEST-4, TEST-5).
- Nominal face à manque : chaque somme (`tokensIn`, `tokensOut`, `costUsd`) a son cas `null` testé (TEST-2, TEST-3), et le cas « table présente, aucun enregistrement » est distingué du cas « aucune table ».
- Aucune énumération n'est modifiée (`StopReason` inchangé) ; aucune base de données.

## Décisions et alternatives écartées

- **Unité dans les noms de champs de `Rate`** (`usdPerMillionTokensIn`, `usdPerMillionTokensOut`), le type gardant le nom `Rate` fixé par l'issue. Écartés : `{ in, out }` avec commentaire (croquis d'ADR-AGENT-0007, unité hors du nom, contraire à sa règle 1 qui préfère le nom) ; renommer le type en `RatePerMillionTokensUsd` (nom fixé par l'issue).
- **Clé de `RateTable` = `string`**, l'identifiant de modèle tel que le porte `CompletionOptions.model`. La règle « une clé chaîne doit être typée » (`docs/conventions/architecture.md`) vise les registres internes ; les modèles sont déclarés par le consommateur (ADR-AGENT-0017) et ne forment pas une union fermée connue du package.
- **`Object.hasOwn`** pour « modèle absent » : `rates[model] === undefined` ou `model in rates` trouveraient les clés du prototype (`toString`, `constructor`) et fabriqueraient un tarif.
- **Jetons totaux à `null` si un enregistrement n'a pas d'usage.** Écartés : compter l'absent pour 0 (ADR-AGENT-0007 règle 2) ; `null` seulement si tous manquent (somme partielle présentée comme totale).
- **Classe `MetricsCollector`** plutôt que `createMetricsCollector()` du croquis d'ADR-AGENT-0007 : API publique à état = classe (ADR-AGENT-0009), et nom fixé par l'issue. **`total(rates?)`** reçoit la table directement plutôt que `total({ rates })` du croquis. Aucun nouvel ADR : la décision d'ADR-AGENT-0007 (décorateur, portée par instance, tarifs injectés, absent ≠ zéro, pas de score composite) est inchangée, seuls les noms du croquis sont fixés.
- **`records()` méthode rendant des copies** plutôt qu'une propriété tableau : une propriété exposerait l'état interne à la mutation.
- **`withMetrics` reporté à #8** : règle de taille de l'issue, voir « Décision de portée ».

## Question ouverte transmise à #8 (non bloquante pour A)

Relevée en concevant `withMetrics`, à trancher avant d'écrire son SPEC dans #8.

- **Titre** : `withMetrics` et le streaming.
- **Contexte** : l'approbation de A prévoit que `withMetrics` délègue `complete`, `models`, `supportsStreaming` et `id`, sans nommer `stream`. Or le port exige `stream` quand `supportsStreaming()` vaut `true` (`src/llm/interfaces/llm-provider.ts:37-38`), `checkProviderContract` le vérifie (`src/llm/testing/provider-contract.ts:180-187`), et `OllamaLLMProvider` déclare le streaming (`src/llm/providers/ollama/ollama-llm-provider.ts:63-65`, `:82`). `withMetrics(ollama, c)` rendrait `supportsStreaming()` vrai sans `stream`, et échouerait au contrôle de contrat.
- **Bloque** : le SPEC `withMetrics` de #8.
- **Question** : que fait `withMetrics` d'un fournisseur qui diffuse en flux ?
- **Options** :
  1. Déléguer `stream` sans le mesurer. Coût : quelques lignes. Effet : contrat respecté ; les appels diffusés échappent aux métriques sans le signaler.
  2. Déléguer et mesurer `stream` (un enregistrement au bloc `done`, usage du bloc terminal ou `null`, durée du premier appel au bloc terminal). Coût : ~25 lignes de source et ~40 de test ; cas à définir pour un flux abandonné ou en erreur. Effet : comptabilité complète.
  3. Déclarer `supportsStreaming()` `false` et ne pas exposer `stream`. Coût : nul. Effet : contrat respecté et métriques complètes ; un consommateur perd le flux derrière le décorateur ; contredit « délègue `supportsStreaming` ».
- **Recommandation** : option 3 pour #8, parce que la boucle, donc `runScenario` et le futur `runMatrix`, n'appelle que `complete` (`step.ts:37` et `:213`) ; option 2 le jour où un consommateur diffuse au travers du décorateur.
- **Sans réponse** : #8 ne peut pas écrire le SPEC `withMetrics` sans supposer.

## Données touchées

Aucune base, aucun fichier lu ou écrit à l'exécution, aucune variable d'environnement nouvelle. Aucun `console.log`.

## Tests

Tous déterministes, sans réseau ni fournisseur hébergé : `FakeLLMProvider` pour TEST-1, enregistrements écrits à la main pour TEST-2 à TEST-6. Les valeurs de tarif et de jetons des tests sont choisies pour que les coûts soient exacts en virgule flottante (par exemple 500 000 jetons à 2 $/M et 250 000 à 8 $/M = 3 $).

## Hypothèses restantes

- Le titre exact de l'issue #2 n'a pas été relu (pas de shell `gh` pour le rédacteur) ; l'en-tête de la checklist reprend le type et l'intention du corps relevé. Le pilote corrige l'en-tête s'il diffère, sans renuméroter.
- L'estimation de taille (~325 lignes) est une estimation ; la mesure fait foi à la PR. Si la mesure dépasse 400 lignes malgré le retrait de `withMetrics`, la décision revient au pilote : aucune dérogation n'est prévue ici.
