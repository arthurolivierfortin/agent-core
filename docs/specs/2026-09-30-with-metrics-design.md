# Spécification · `withMetrics`, décorateur de `LLMProvider` qui mesure chaque appel · #11

Date : 2026-09-30
Issue : https://github.com/arthurolivierfortin/agent-core/issues/11 (type feature ; lot 1 du découpage de #8)
Checklist : docs/specs/2026-09-30-with-metrics-checklist.md
Branche : `feat/11-with-metrics` (worktree `.claude/worktrees/feat+11-with-metrics`, `main` fc3e35f intégrée)
Continuité : docs/specs/2026-09-30-metriques-execution-design.md (#2, qui a livré `UsageRecord`, `aggregate`, `MetricsCollector` et reporté `withMetrics`, puis transmis la question du streaming)

## Objectif

Livrer `withMetrics(provider, collector, now?)`, un décorateur de `LLMProvider` qui enregistre dans un `MetricsCollector` le modèle, l'usage et la durée de chaque appel `complete` résolu, sans toucher au moteur ni au fournisseur décoré.

## Source de l'issue (corps relevé le 2026-09-30)

Découpage du 2026-09-30 de #8 (runMatrix + withMetrics) : #11 = lot 1 (`withMetrics`, cette spécification), #8 = lot 2 (`runMatrix`), #12 = lot 3 (summary et `toJSON`). `withMetrics` est un prérequis de #8.

Décisions déjà fixées par l'issue et par le pilote (reprises telles quelles, SPEC-1 à SPEC-4) :

1. Délégation de `id`, `models()` et `complete()` ; après un `complete` résolu, `collector.record({ model: opts.model, tokensIn: usage?.tokensIn ?? null, tokensOut: usage?.tokensOut ?? null, durationMs })`, durée mesurée sur l'horloge injectée `now` (défaut `Date.now`) ; réponse rendue sans modification.
2. Un `complete` qui lève n'enregistre rien et propage la même erreur (même référence).
3. Streaming : `supportsStreaming()` rend `false` et le décorateur n'a aucune propriété `stream`, quel que soit le fournisseur décoré ; `checkProviderContract` passe sur le décorateur.
4. Export depuis `.` (barrel `src/metrics`), absent de `./llm` et `./testing` ; verrou dans `tests/barrel-contract.test.ts`.

Contraintes : modèles factices seulement (`FakeLLMProvider` et fournisseurs de test écrits dans le fichier de test) ; aucun fournisseur hébergé dans les tests ; aucun `console.log` ; le package ne lit que `process.env` ; `step.ts` inchangé ; gates build, typecheck, test ; PR sous 400 lignes hors `docs/` et `*.md`.

## État constaté dans le code (lecture du 2026-09-30, `main` fc3e35f)

- `src/llm/interfaces/llm-provider.ts:24-39` : `LLMProvider` = `readonly id: string`, `supportsStreaming(): boolean`, `models(): ModelInfo[]`, `complete(messages: Message[], opts: CompletionOptions): Promise<LLMResponse>`, `stream?(messages, opts): AsyncIterable<LLMChunk>` (« Present only if `supportsStreaming()` is true »). `CompletionOptions = { model: string; tools?: ToolDefinition[] }` (l.10-13).
- `src/llm/models/index.ts:38-53` : `Usage = { tokensIn: number; tokensOut: number }` ; `LLMResponse.usage?: Usage` (absent, pas zéro, quand le fournisseur n'en donne pas). `LLMError` (l.91-99) porte `code: LLMErrorCode`, dont `"MODEL_NOT_FOUND"` et `"API_ERROR"`.
- `src/metrics/models/index.ts:10-17` : `UsageRecord = { model: string; tokensIn: number | null; tokensOut: number | null; durationMs: number }`.
- `src/metrics/application/use-cases/metrics-collector.ts:12-32` : `MetricsCollector.record(entry)` garde une copie, `records()` rend des copies, `total(rates?)` délègue à `aggregate`. Aucune méthode ne lève.
- `src/metrics/index.ts:3-5` réexporte `models`, `services/aggregate`, `application/use-cases/metrics-collector` ; `src/index.ts:13` réexporte `./metrics/index.js` ; `src/llm/index.ts` et `src/testing/index.ts` ne réexportent pas `metrics` (verrouillé par `tests/barrel-contract.test.ts:197-207`).
- `src/llm/testing/fake-llm-provider.ts` : `id = "fake"`, `MODEL_ID = "fake-model"`, `supportsStreaming()` rend `false`, pas de `stream`. `complete` lève `LLMError("MODEL_NOT_FOUND", …)` pour un modèle autre que `fake-model` (sans l'enregistrer dans `calls`), puis un `Error` nu « FakeLLMProvider: no scripted response for call #N » à la fin du script ; il rend l'objet scripté lui-même (`this.script[this.cursor++]`, même référence) et utilise `this` (le décorateur doit appeler `provider.complete(...)` en méthode, jamais une fonction détachée).
- `src/llm/testing/provider-contract.ts:75-223` : `checkProviderContract` appelle `complete` deux fois (une fois avec un modèle non déclaré, qui doit lever `MODEL_NOT_FOUND`, une fois avec le premier modèle déclaré, qui doit résoudre) et ne vérifie `stream` que si `supportsStreaming()` vaut `true` (l.174-220).
- `src/llm/providers/ollama/ollama-llm-provider.ts:63` et `:82` : `OllamaLLMProvider` déclare le streaming et définit `stream` ; c'est le cas qui a motivé la question transmise par #2.
- `src/agent/application/use-cases/step.ts:37` et `:214` : la boucle n'appelle que `deps.llm.complete` ; aucun appel à `stream` dans `src/` hors `checkProviderContract`.
- Aucun nom `withMetrics` sous `src/` ni `tests/` : pas de collision sur les `export *`.
- `docs/conventions/architecture.md:59` : une fonction qui prend un port et orchestre va dans `application/use-cases/` ; `:29` : rien de `./testing` ne doit être atteignable depuis `.`.
- Manifeste (`CLAUDE.md`, bloc `core-project`) : `GATE-1 build` `npm run build`, `GATE-2 typecheck` `npm run typecheck`, `GATE-3 test` `npm run test` ; `derogations: []`.

## Périmètre

Dans la PR :

- `withMetrics` : délégation et mesure d'un `complete` résolu (SPEC-1) ; chemin d'erreur (SPEC-2) ; décision de streaming et son verrou (SPEC-3) ; export depuis `.` et verrou du barrel (SPEC-4).

Hors périmètre :

- Mesure de `stream` : décision du pilote ci-dessous ; un futur besoin sera un SPEC à part.
- `runMatrix` (#8), summary et `toJSON` (#12), documentation du guide et du README.
- Toute modification de `step.ts`, du port `LLMProvider`, de `FakeLLMProvider`, de `checkProviderContract`, de `MetricsCollector` ou d'`aggregate`.
- Enregistrement des appels en échec (compteur d'erreurs, durée d'un appel qui lève) : SPEC-2 fixe « rien n'est enregistré ».
- Correction d'une horloge non monotone : `durationMs` vaut `now()` après moins `now()` avant, sans borne ni arrondi (voir « Décisions »).

## Conception

### Placement

| Fichier | Contenu | Règle appliquée |
|---|---|---|
| `src/metrics/application/use-cases/with-metrics.ts` | `withMetrics` | fonction qui prend un port (`LLMProvider`) et orchestre : `application/use-cases/` (`architecture.md:59`) ; fonction, pas classe (aucune API publique à état propre, ADR-AGENT-0009) |
| `src/metrics/index.ts` | `export * from "./application/use-cases/with-metrics.js";` (SPEC-4) | barrel du framework `metrics`, servi par `.` |
| `tests/metrics/application/use-cases/with-metrics.test.ts` | TEST-1 à TEST-3 | miroir du chemin source |
| `tests/barrel-contract.test.ts` | TEST-4 | verrou des points d'entrée |

Imports de `with-metrics.ts`, liste fermée : `import type { CompletionOptions, LLMProvider } from "../../../llm/interfaces/index.js"`, `import type { LLMResponse, Message, ModelInfo } from "../../../llm/models/index.js"`, `import type { MetricsCollector } from "./metrics-collector.js"` (le builder peut retirer un type inutilisé). Imports de types seulement : aucune dépendance d'exécution vers `llm`, aucun import de `./testing`, de `fs` ni de `path`.

### Signature et forme (SPEC-1)

```ts
export function withMetrics(
  provider: LLMProvider,
  collector: MetricsCollector,
  now: () => number = Date.now,
): LLMProvider;
```

- Rend un **objet littéral neuf** portant exactement quatre clés propres : `id`, `supportsStreaming`, `models`, `complete`. Pas de classe (le prototype d'une classe pourrait porter `stream`), pas de copie ni d'étalement du fournisseur (`{ ...provider }` recopierait `stream`), pas de `Proxy`.
- `id` : valeur de `provider.id` lue à la décoration (le port le déclare `readonly`).
- `models()` : rend `provider.models()`, appelé à chaque appel (un fournisseur qui rend un tableau neuf à chaque fois le garde).
- `complete(messages, opts)` : `async` ; `const startedAt = now()` ; `const response = await provider.complete(messages, opts)` (mêmes références `messages` et `opts`, appel en méthode sur `provider`) ; `collector.record({ model: opts.model, tokensIn: response.usage?.tokensIn ?? null, tokensOut: response.usage?.tokensOut ?? null, durationMs: now() - startedAt })` ; `return response` (même référence, non copiée, non modifiée).
- `now()` est donc appelé exactement deux fois par `complete` résolu : une fois avant l'appel au fournisseur, une fois après sa résolution.
- Les méthodes sont des fermetures sur `provider`, `collector` et `now` : elles n'utilisent pas `this`. Aucun état propre au décorateur : deux appels concurrents ont chacun leur `startedAt` local ; l'ordre des enregistrements est l'ordre de résolution.
- `model` enregistré = `opts.model`, le modèle demandé par l'appel (ADR-AGENT-0007 amendé par ADR-AGENT-0017 : la clé de jointure est le modèle porté par l'appel).

### Chemin d'erreur (SPEC-2)

- Si `provider.complete` rejette (ou lève), le `await` propage le rejet : `collector.record` n'est pas appelé, `complete` du décorateur rejette avec **la même référence d'erreur**, sans l'envelopper ni la convertir (une erreur de fournisseur remonte telle quelle, `LLMError` et son `code` compris ; un `Error` nu, comme la fin de script du fake, reste un `Error` nu).
- Pas de `try/finally` qui enregistrerait, pas de `catch` qui relancerait une autre erreur.
- Conséquence non testée : `now()` n'est appelé qu'une fois sur ce chemin.
- `checkProviderContract` exige précisément cette propagation : son contrôle « complete() refuses a model the provider does not declare » lit `err.code === "MODEL_NOT_FOUND"` à travers le décorateur.

### Streaming (SPEC-3) : décision du pilote

**Décision.** `supportsStreaming()` rend toujours `false`, et l'objet rendu n'a aucune propriété `stream` (`"stream" in decorated` vaut `false`), quel que soit le fournisseur décoré, y compris un fournisseur qui déclare le streaming (`OllamaLLMProvider`).

**Raison.**

- Le port exige `stream` dès que `supportsStreaming()` vaut `true` (`llm-provider.ts:37-38`) et `checkProviderContract` le vérifie. Déléguer `supportsStreaming()` sans exposer `stream` rendrait `withMetrics(ollama, collector)` non conforme au port.
- Déléguer `stream` sans le mesurer laisserait des appels échapper aux métriques sans le signaler : un total qui sous-estime en silence, exactement ce que la règle « absent n'est pas zéro » d'ADR-AGENT-0007 refuse.
- Mesurer `stream` demande de trancher des cas absents de toute issue (flux abandonné, flux en erreur, usage du bloc terminal absent) pour un besoin que personne n'a : la boucle, donc `runScenario` et le futur `runMatrix` (#8), n'appelle que `complete` (`step.ts:37` et `:214`).
- Rendre `false` est conforme au port (« `false` unless proven ») et garde les métriques complètes : tout ce qui passe par le décorateur est mesuré.

**Coût accepté.** Un consommateur perd le flux derrière le décorateur ; il appelle alors le fournisseur non décoré, dont les appels ne sont pas mesurés, et il le sait.

**Règle pour la suite.** Si un fournisseur mesuré doit un jour streamer, ce sera un SPEC à part, avec son test (un enregistrement par flux, règle écrite pour le flux abandonné et le flux en erreur), jamais un `true` par défaut ni une délégation de `stream` sans mesure.

Le commentaire de conception de `withMetrics` (anglais, au style du dépôt) porte cette décision et sa raison en résumé, avec le renvoi à cette spécification.

### Exports (SPEC-4)

- SPEC-4 ajoute `export * from "./application/use-cases/with-metrics.js";` à `src/metrics/index.ts`. `src/index.ts` le sert déjà via `export * from "./metrics/index.js"` : aucune ligne n'y change. `src/llm/index.ts` et `src/testing/index.ts` ne changent pas.
- Jusqu'à SPEC-4, `tests/metrics/application/use-cases/with-metrics.test.ts` importe `withMetrics` depuis `../../../../dist/metrics/application/use-cases/with-metrics.js` ; il n'est pas modifié par SPEC-4. Ainsi TEST-4 est rouge avant SPEC-4.
- Verrou : valeur (`typeof root.withMetrics === "function"`, `undefined` sur `llm` et `testing`) et type (le retour de `root.withMetrics(...)` annoté `LLMProvider`, contrôlé par `npm run typecheck`, méthode de `tests/barrel-contract.test.ts:79-83`).

### Ordre des commits et preuve de rouge

Un SPEC = un commit = un test, dans l'ordre SPEC-1, SPEC-2, SPEC-3, SPEC-4.

- Le type de retour `LLMProvider` impose `supportsStreaming` dès SPEC-1, et l'implémentation de SPEC-1 (`await` puis `record`) propage déjà les erreurs sans enregistrer. SPEC-1 livre donc `supportsStreaming: () => false` et le `await` nu comme éléments requis par le type et le nominal ; SPEC-2 et SPEC-3 livrent chacun le commentaire de conception de leur règle dans `with-metrics.ts` et le test qui la verrouille.
- Comme leur test passe dès son écriture, le builder prouve qu'il n'est pas vide par une mutation locale non commitée, et l'écrit dans le corps du commit : pour TEST-2, `record` déplacé dans un `finally` fait échouer le test ; pour TEST-3, `supportsStreaming: () => provider.supportsStreaming()` puis l'ajout d'une clé `stream` font échouer le test. TEST-1 et TEST-4 sont rouges avant leur SPEC sans mutation.

Gabarit des messages de commit (aucun `Co-Authored-By`) :

```
feat(metrics): <sujet>

Refs: #11
Session: <id>
Model: <modèle>
Authorship: ai
```

Sujets : SPEC-1 « mesurer chaque complete résolu avec withMetrics » ; SPEC-2 « withMetrics n'enregistre rien d'un appel qui lève » ; SPEC-3 « withMetrics ne diffuse jamais en flux » ; SPEC-4 « exporter withMetrics depuis le point d'entrée ».

## Chemins nominal et d'erreur

| Élément | Nominal | Erreur |
|---|---|---|
| `complete` | délègue, enregistre un `UsageRecord`, rend la réponse (même référence) | rejette avec la même erreur, n'enregistre rien (SPEC-2) |
| `id`, `models()` | délégués | un `models()` qui lève propage (aucun `try` : la délégation ne change pas le comportement du fournisseur) ; non testé |
| `supportsStreaming()` | `false` | aucun |
| `stream` | absent | aucun |

## Symétrie

- Écriture face à lecture : `complete` écrit dans le collecteur, TEST-1 relit par `collector.records()` ; TEST-3 relit après `checkProviderContract`.
- Nominal face à erreur : SPEC-1 (résolu : un enregistrement) a son SPEC-2 (levé : aucun enregistrement, même erreur), et TEST-2 mêle les deux (un succès puis un échec laissent exactement un enregistrement).
- Usage présent face à absent : TEST-1 couvre `usage` présent (nombres) et absent (`null`, jamais 0).
- Déclaration face à capacité : `supportsStreaming()` `false` et absence de `stream` sont testés ensemble (TEST-3).
- Aucune énumération modifiée, aucune base de données.

## Données touchées

Aucune base, aucun fichier lu ou écrit à l'exécution, aucune variable d'environnement. Aucun `console.log`. En mémoire : les enregistrements ajoutés au `MetricsCollector` passé.

## Décisions et alternatives écartées

- **Objet littéral de fermetures** plutôt qu'une classe `MeteredProvider` : l'absence de `stream` est garantie par construction (`"stream" in` vaut `false`, rien sur un prototype), et les méthodes restent correctes détachées. Nom et forme `withMetrics(provider, collector)` fixés par ADR-AGENT-0007 et l'issue.
- **`id` copié à la décoration** plutôt qu'un accesseur : le port déclare `id` `readonly` ; un accesseur n'apporterait rien et ajouterait une clé non énumérable à expliquer.
- **Horloge `now: () => number`, défaut `Date.now`**, fixée par l'issue. `Date.now` n'est pas monotone : un réglage d'horloge système pendant un appel peut produire une durée fausse, voire négative ; aucune borne n'est posée (une borne à 0 masquerait l'erreur). Un consommateur qui veut une horloge monotone passe `() => performance.now()`. Écarté : `performance.now` par défaut (contraire à la décision fixée).
- **Enregistrer après résolution seulement** (SPEC-2) plutôt qu'un enregistrement d'échec : `UsageRecord` n'a pas de champ d'issue, et un appel en échec compté comme un appel réussi fausserait `calls` et `durationMs`. Compter les échecs relève d'un futur besoin.
- **Streaming** : option 3 de la question transmise par #2 (voir « Streaming »). Écartées : option 1 (déléguer `stream` sans mesure, fuite silencieuse) et option 2 (mesurer `stream`, cas indéfinis, aucun appelant).
- **Pas de nouvel ADR** : ADR-AGENT-0007 (décorateur, portée par instance, modèle lu sur l'appel depuis ADR-AGENT-0017) est appliqué tel quel ; la décision de streaming est locale au décorateur, réversible par un SPEC, et consignée ici.

## Tests

Tous déterministes, sans réseau ni fournisseur hébergé : `FakeLLMProvider`, `checkProviderContract` et `LLMError` importés depuis `dist/` ; deux fournisseurs de test écrits comme littéraux `LLMProvider` dans le fichier de test (l'un qui rejette avec une erreur détenue par le test, l'autre qui déclare le streaming et définit `stream`) ; horloge scriptée : fonction qui rend, dans l'ordre, les valeurs d'un tableau et lève si le tableau est épuisé.

## Estimation de taille

Hors `docs/` et `*.md` : `with-metrics.ts` environ 50 lignes (commentaires de conception compris), `src/metrics/index.ts` 1 à 2 lignes, `with-metrics.test.ts` environ 120 lignes, `barrel-contract.test.ts` environ 20 lignes : environ 190 lignes, sous le plafond de 400. L'estimation du pilote (environ 140) est plus basse ; la mesure fait foi à la PR.

## Hypothèses restantes

- Le titre exact de l'issue #11 n'a pas été relu (pas de shell `gh` pour le rédacteur) : l'en-tête de la checklist reprend l'intention du corps relevé. Le pilote corrige l'en-tête s'il diffère, sans renuméroter.
