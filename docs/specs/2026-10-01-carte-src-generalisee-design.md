# Spécification · Aligner toute la carte de ROADMAP.md et l'arborescence du guide sur src/, et généraliser le test de carte · #56

Date : 2026-10-01
Issue : https://github.com/arthurolivierfortin/agent-core/issues/56 (label `T:docs`, `origine: #23`)
Checklist : docs/specs/2026-10-01-carte-src-generalisee-checklist.md
Branche : `docs/56-carte-src` (worktree `.claude/worktrees/docs-56-carte-src`, `origin/main` 419617a, qui contient `src/llm/services/token-count.ts` de #51)
Continuité : docs/specs/2026-10-01-roadmap-metrics-tree-design.md (#23, PR #55) : R-1 (guide l.105-110) et R-2 (autres sous-arbres de la carte), recommandés par le juge de #23.

## Objectif

Faire nommer à la carte `## Full tree (target map, V1 → V4)` de `ROADMAP.md` chaque fichier `.ts` de `src/` et, hors lignes marquées `[V2]`/`[V3]`/`[V4]`, seulement des chemins existants ; faire nommer à l'arborescence `### Directory tree` du guide, hors lignes marquées, seulement des chemins existants, et montrer chaque dossier de `src/` qui contient du code ; verrouiller les deux par des tests qui comparent chaque document à l'arbre réel dans les deux sens.

## Source de l'issue

Corps : « R-1 et R-2 de #23 (PR #55), recommandés par le juge : docs/guide-agent-package.md:105-110 porte les deux mêmes lignes périmées que la carte metrics/ ; d'autres sous-arbres de ROADMAP.md nomment des fichiers absents de src/ (ollama-adapter.ts, gemini-adapter.ts, llm/services/response-parser.ts, agent/services/step.ts). Attendu : corriger le guide et la carte, et généraliser TEST-1 (issue 23) à tous les sous-arbres, dans les deux sens. Documentation et tests. origine: #23 »

Consignes du pilote : `ROADMAP.md` et `docs/guide-agent-package.md` relèvent de la dérogation `core/langue` (corps en anglais, mises à jour comprises) ; spécification et checklist en français ; messages de test dans la langue du fichier qui les accueille (français dans `scripts/repo-conventions.test.mjs`) ; dire explicitement ce que « dans les deux sens » veut dire pour une arborescence non exhaustive ; aucun `.env` lu ; seuil de 400 lignes hors docs.

## État constaté dans le code (lecture du 2026-10-01, 419617a)

### Arbre réel

`src/` contient 50 fichiers `.ts` (Glob `src/**/*`) :

- racine : `index.ts` ; `testing/index.ts`, seul `.ts` de `src/testing/`, qui réexporte `../llm/testing/index.js` et `../agent/testing/index.js` (l.4-5) ;
- `core/` (2) : `index.ts`, `models/index.ts` (`JSONSchemaType`, `JSONSchemaProperty`, `ToolSchema`, ADR-AGENT-0012) ; `src/llm/index.ts:1` réexporte `../core/index.js` ;
- `llm/` (12) : `index.ts`, `models/index.ts` (`Role`, `Message`, `ToolCall`, `ToolDefinition`, `Usage`, `LLMResponse`, `LLMChunk`, `ModelInfo`, `LLMErrorCode`, `LLMError` ; aucun `ToolResult`), `interfaces/index.ts`, `interfaces/llm-provider.ts`, `services/token-count.ts` (`isTokenCount`, « Served by no barrel », #51), `providers/index.ts`, `providers/ollama/ollama-llm-provider.ts`, `providers/gemini/gemini-llm-provider.ts`, `providers/gemini/gemini-wire.ts`, `testing/index.ts`, `testing/fake-llm-provider.ts`, `testing/provider-contract.ts` ;
- `context/` (8) : `index.ts`, `interfaces/index.ts`, `interfaces/context-strategy.ts`, `interfaces/token-counter.ts`, `strategies/sliding-window/index.ts`, `strategies/sliding-window/sliding-window-strategy.ts`, `infrastructure/index.ts`, `infrastructure/heuristic-token-counter.ts` ;
- `tools/` (7) : `index.ts`, `models/index.ts` (`ToolOutcome`, `ToolResult` ; l.2 : `ToolSchema` vit dans `core/models`), `interfaces/index.ts`, `interfaces/tool.ts`, `application/use-cases/dispatch-tool.ts`, `application/use-cases/to-tool-definition.ts` (`toToolDefinition`), `infrastructure/index.ts` (barrel de `./tools`, `export {}` : les outils fichiers ne sont pas livrés, l.6-9) ;
- `metrics/` (5) : les cinq fichiers alignés par #23 ;
- `agent/` (14) : `index.ts`, `models/index.ts`, `models/agent-definition.ts`, `services/define-agent.ts`, `application/dtos/index.ts`, `application/use-cases/step.ts`, `application/use-cases/agentic-llm.ts`, `testing/index.ts`, `testing/fake-app.ts`, `testing/define-scenario.ts`, `testing/run-scenario.ts`, `testing/run-matrix.ts`, `testing/matrix-csv.ts` (« served by no barrel », l.3), `testing/replay-run.ts`.
- Dossiers sans fichier `.ts` (`.gitkeep` seul) : `llm/infrastructure/`, `metrics/interfaces/`, `metrics/infrastructure/`, `voice/interfaces/`, `voice/providers/`.

### Carte de `ROADMAP.md` (l.123-172)

Titre l.123 `## Full tree (target map, V1 → V4)` ; légende l.125 (« `[V2]`/`[V3]`/`[V4]` = version of appearance; no tag = V1. ») ; bloc de code l.127-172. Écarts avec l'arbre :

- chemins absents de `src/` sur des lignes non marquées : `llm/services/response-parser.ts` (l.133), `llm/providers/ollama/ollama-adapter.ts` (l.135), `agent/services/step.ts` (l.165, réel `agent/application/use-cases/step.ts`), `testing/fake-llm-provider.ts` (l.170, réel sous `llm/testing/`), `testing/fake-app.ts · define-scenario.ts · run-scenario.ts · run-matrix.ts` (l.171 : quatre fichiers sur une ligne, réels sous `agent/testing/`) ;
- ligne marquée `[V2]` au nom périmé : `gemini/gemini-adapter.ts` (l.136 ; réels `gemini-llm-provider.ts` et `gemini-wire.ts`) ;
- ligne de contenu élidé non marquée : `sliding-window/…` (l.143) ;
- ligne de dossier qui décrit des classes non livrées : `infrastructure/              ReadFile · WriteFile · ListFiles   → exported by "./tools"` (l.150) ;
- 31 fichiers `.ts` de `src/` qu'aucune ligne ne nomme (19 sur 50 le sont) : tout `core/` (2) ; `llm/index.ts`, `llm/interfaces/index.ts`, `llm/services/token-count.ts`, les deux fichiers Gemini, `ollama-llm-provider.ts`, `llm/testing/*` (3) ; `context/index.ts`, `context/interfaces/index.ts`, `context/infrastructure/index.ts`, les deux fichiers de `sliding-window/` ; `tools/index.ts`, `tools/interfaces/index.ts`, `tools/application/use-cases/to-tool-definition.ts`, `tools/infrastructure/index.ts` ; `agent/index.ts`, `agent/models/index.ts`, `agent/application/use-cases/step.ts`, `agent/testing/*` (7) ; `testing/index.ts` ;
- descriptions qui placent un type ailleurs que dans son fichier : `llm/models/index.ts` liste `ToolResult` (l.131, vit dans `tools/models`) ; `tools/models/index.ts` liste `ToolSchema` (l.147, vit dans `core/models`).
- Le sous-arbre `metrics/` (l.151-156) et le sous-arbre `voice/` (l.157-161, entièrement marqué `[V4]`) sont conformes.

### Arborescence du guide (`docs/guide-agent-package.md`, `### Directory tree` l.70, bloc l.72-132)

Le guide ne se veut pas exhaustif : il omet des barrels (`llm/interfaces/index.ts`, `context/interfaces/index.ts`, `agent/models/index.ts`), montre `sliding-window/` comme un dossier sans ses fichiers, et ne liste pas `src/index.ts`. Écarts qui sont des erreurs, et non des omissions :

- chemins absents de `src/` : `llm/services/response-parser.ts` (l.77), `metrics/interfaces/metrics-collector.ts` (l.107), `metrics/infrastructure/collector.ts` (l.109) ; `context/strategies/memory/` (l.94) et `agent/application/use-cases/voice-agentic-llm.ts` (l.119) sont futurs, mais marqués en texte libre (`V3,`, `(V4)`), sans la notation `[Vn]` de la carte ;
- dossiers de `src/` qui contiennent du code et que le guide ne montre pas : `core/`, `core/models/`, `metrics/application/use-cases/` ;
- descriptions fausses : `llm/models/index.ts` liste `ToolResult` (l.75) ; `tools/models/index.ts` liste `ToolCall, ToolResult, ToolSchema` (l.99) ; `infrastructure/` sous `tools/` annonce `read-file.ts, write-file.ts, list-files.ts` (l.102), absents ; `testing/index.ts` « re-exports llm/testing (+ agent/testing when it lands) » (l.131) et le paragraphe l.138 « (`llm/testing/`, later `agent/testing/`) », alors que `agent/testing/` existe et est réexporté (`src/testing/index.ts:5`).

### Tests existants

`scripts/repo-conventions.test.mjs` (CRLF en copie de travail ; `splitLines` coupe sur `\r?\n`) :

- l.7 : imports `existsSync`, `readdirSync`, `readFileSync` ; aides `readRepoFile` (l.10-12), `splitLines` (l.14-16), `sectionAfterHeading` (l.50-57).
- l.271-290 `TEST-4 (issue 7)` : exige des lignes exactes `  llm/` avant `  context/`, aucune ligne contenant `with-metrics` entre elles, une ligne exacte `  metrics/` suivie plus loin d'une ligne commençant par `  voice/`, et entre les deux une ligne portant `application/use-cases/with-metrics.ts` et `withMetrics`. Reste vert si `core/` est placé avant `  llm/` et si ces lignes gardent leur forme.
- l.292-311 `TEST-1 (issue 23)` : compare le seul sous-arbre `metrics/` à `src/metrics/` ; c'est le test que l'issue demande de généraliser.
- l.106-163, 216-233, 273 : interdits du `ROADMAP.md` (`IDE` en mot, `blind`, `NATHAN`, `Flux E`, `MicroPython`, `ADR-0006`, `PMC/`, `TECH-19`, `January 2027`, `S7` en mot, `DEV-xxx`, `DEV-NNN`, `nathan-agent-core`, `v1-decoupage-pr`, `infrastructure/with-metrics.ts`) ; le texte écrit par SPEC-1 n'en contient aucun.
- l.165-181 `TEST-8 (issue 9)` : le guide contient `matrix-csv.ts` et `replay-run.ts`, pas `llm/infrastructure/with-metrics.ts` ; l.401-412 `TEST-5 (issue 26)` : le guide contient `gemini/gemini-llm-provider.ts` et `gemini/gemini-wire.ts`. SPEC-2 garde ces chaînes.

## Périmètre

Dans la PR :

- `ROADMAP.md` : légende l.125 et bloc de code de la carte l.128-171 (SPEC-1).
- `docs/guide-agent-package.md` : bloc `### Directory tree` l.73-131, un paragraphe ajouté après la clôture l.132, la parenthèse de l.138 (SPEC-2).
- `scripts/repo-conventions.test.mjs` : trois aides, `TEST-1 (issue 56)` à la place de `TEST-1 (issue 23)` (TEST-1), `TEST-2 (issue 56)` et sa constante (TEST-2).

Hors périmètre :

- Les paragraphes « The 3 entry points » (`ROADMAP.md:178`) et « Three public entry points » (guide l.60-66), qui omettent `./llm` exporté par `package.json:13-16` : ce ne sont pas des sous-arbres (R-1).
- Tout autre texte des deux documents, dont le contexte de projet hérité du guide (l.9-13, l.50) ; les ADR de `docs/decisions/` (immuables) ; les arborescences de `examples/navigation/README.md` et `examples/web-chat/README.md` (elles décrivent le `src/` de chaque exemple, pas le paquet).
- `TEST-4 (issue 7)` : inchangé.
- Tout fichier de `src/`, de `tests/`, `package.json`.

## Grammaire commune des deux arborescences

Les deux tests lisent les deux blocs avec la même grammaire, que SPEC-1 et SPEC-2 rendent vraie :

1. Le bloc est formé des lignes situées entre la première ligne commençant par trois accents graves qui suit la ligne de titre exacte et la ligne commençant par trois accents graves suivante, clôtures exclues.
2. Les lignes vides sont ignorées. La première ligne non vide est exactement `src/`.
3. Chaque autre ligne a une indentation paire d'au moins deux espaces ; sa profondeur `d` est l'indentation divisée par 2. Les dossiers ouverts forment une pile : à une ligne de profondeur `d`, la pile est tronquée à `d − 1` dossiers ; si elle en compte moins de `d − 1`, la ligne est invalide (saut de niveau).
4. Le premier mot de la ligne (séparateur : espaces) est le chemin, relatif au dossier parent ; le reste est une description libre, non vérifiée. Un chemin terminé par `/` est un dossier, empilé à la profondeur `d` ; un chemin terminé par `.ts` est un fichier. Le chemin complet, relatif à `src/`, est la concaténation des dossiers de la pile et du chemin de la ligne.
5. Une ligne est **marquée** si elle contient `[V2]`, `[V3]` ou `[V4]`, ou si un dossier de la pile est marqué. Une ligne marquée peut nommer un chemin pas encore livré, ou un contenu élidé (`memory/…`, `gemini/…`).
6. Une ligne non marquée dont le premier mot n'est ni un dossier ni un fichier `.ts`, ou toute ligne qui viole la règle 3, est **invalide**.

## Conception

### SPEC-1 · Carte de `ROADMAP.md` égale à l'arbre réel, dans les deux sens

**Légende.** À la fin du paragraphe `ROADMAP.md:125`, après « no tag = V1. », ajouter sur la même ligne, après une espace, exactement ce texte :

```
One path per line, two spaces per level: every `.ts` file of `src/` has its line, and every untagged line names a file or folder that exists in `src/`; a tagged line, or any line under a tagged folder, may name one that has not landed yet. `scripts/repo-conventions.test.mjs` checks both directions.
```

**Bloc.** Remplacer les lignes l.128-171 (entre les clôtures l.127 et l.172, inchangées) par exactement ces lignes, en anglais :

```
src/
  index.ts                       "." entry point: engine + ports + types, NO fs
  core/                          shared kernel: the vocabulary llm/ and tools/ both import (ADR-AGENT-0012)
    models/index.ts              JSONSchemaType · JSONSchemaProperty · ToolSchema
    index.ts                     barrel of the kernel, re-exported by llm/index.ts
  llm/
    models/index.ts              Message · ToolCall · ToolDefinition · Usage · LLMResponse · LLMChunk · ModelInfo · LLMError
    interfaces/llm-provider.ts
    interfaces/index.ts          barrel of the port
    services/token-count.ts      pure: isTokenCount, the usage-counter rule (served by no barrel)
    providers/
      ollama/ollama-llm-provider.ts   OllamaLLMProvider
      gemini/gemini-llm-provider.ts   GeminiLLMProvider        [V2]
      gemini/gemini-wire.ts      pure: generateContent translation, served by no barrel   [V2]
      azure/azure-llm-provider.ts   AzureLLMProvider         [V2]
      index.ts                   PROVIDERS: Record<ProviderID, () => LLMProvider>
    testing/                     shipped test tooling → exported by "./testing", never by "./llm"
      fake-llm-provider.ts       FakeLLMProvider (2nd LLMProvider implementation)
      provider-contract.ts       checkProviderContract (runner-agnostic conformance check)
      index.ts                   barrel of the llm tooling, re-exported by testing/index.ts
    index.ts                     barrel of the framework (with core/), re-exported by "."
  context/
    interfaces/context-strategy.ts
    interfaces/token-counter.ts
    interfaces/index.ts          barrel of the ports
    strategies/                  they differ by algorithm, not by vendor (ADR-AGENT-0016)
      sliding-window/sliding-window-strategy.ts   SlidingWindowStrategy
      sliding-window/index.ts    barrel of the strategy
      memory/…                   MemoryStrategy              [V3]
    infrastructure/heuristic-token-counter.ts   HeuristicTokenCounter
    infrastructure/index.ts      barrel of the adapters
    index.ts                     barrel of the framework, re-exported by "."
  tools/
    models/index.ts              ToolOutcome · ToolResult (ToolSchema lives in core/)
    interfaces/tool.ts
    interfaces/index.ts          barrel of the port
    application/use-cases/dispatch-tool.ts   dispatchTool ("ToolDispatcher" box from the schema)
    application/use-cases/to-tool-definition.ts   toToolDefinition (Tool → ToolDefinition shown to the model)
    infrastructure/index.ts      "./tools" entry point, empty for now: ReadFile · WriteFile · ListFiles land here
    index.ts                     the pure half (port, dispatcher), re-exported by "."
  metrics/
    models/index.ts              UsageRecord · MetricsTotal · RateTable
    services/aggregate.ts        pure: records → MetricsTotal (with RateTable)
    application/use-cases/metrics-collector.ts   MetricsCollector (class: the records of one run or batch)
    application/use-cases/with-metrics.ts   withMetrics (LLMProvider → MetricsCollector decorator)
    index.ts                     barrel of the framework, re-exported by "."
  voice/                          [V4]: the whole framework
    interfaces/voice-provider.ts
    providers/
      gemini/…                   GeminiVoiceProvider
      azure/…                    AzureVoiceProvider
  agent/
    models/agent-definition.ts   AgentDefinition
    models/index.ts              barrel of the models
    services/define-agent.ts     defineAgent (pure)
    application/dtos/index.ts    AgentDeps · AgentInput · AgentResult · AgentState
    application/use-cases/step.ts               step(state, deps) (one iteration: a function, but it calls ports)
    application/use-cases/agentic-llm.ts        AgenticLLM (class: public API)
    application/use-cases/voice-agentic-llm.ts  VoiceAgenticLLM (class)   [V4]
    testing/                     the agent harness → exported by "./testing", never by "."
      fake-app.ts                shared-state simulator (not a mock)
      define-scenario.ts         defineScenario
      run-scenario.ts            runScenario
      run-matrix.ts              runMatrix
      matrix-csv.ts              CSV views of a matrix report, served by no barrel
      replay-run.ts              replayRun
      index.ts                   barrel of the harness, re-exported by testing/index.ts
    index.ts                     barrel of the framework, re-exported by "."
  testing/                        → exported by "./testing", never in prod
    index.ts                     aggregates llm/testing/ and agent/testing/
```

Effet, sous-arbre par sous-arbre :

- `core/` ajouté avant `  llm/` (deux fichiers).
- `llm/` : `services/response-parser.ts` retiré (aucun parseur partagé : chaque adaptateur porte sa traduction à côté de lui, ADR-AGENT-0016, D1 de docs/specs/2026-09-30-gemini-wire-design.md) ; `ollama-adapter.ts` devient `ollama-llm-provider.ts` ; `gemini-adapter.ts` devient `gemini-llm-provider.ts` et `gemini-wire.ts`, marqués `[V2]` comme avant (version d'apparition, D3) ; la ligne future `azure/azure-adapter.ts` devient `azure/azure-llm-provider.ts` (D5) ; `interfaces/index.ts`, `services/token-count.ts`, `testing/` (trois fichiers) et `index.ts` ajoutés ; dans la description des modèles, `ToolResult` est remplacé par `ToolDefinition` et `ModelInfo` est ajouté.
- `context/` : `sliding-window/…` remplacé par ses deux fichiers ; `memory/…` reste, marqué `[V3]` ; trois barrels ajoutés.
- `tools/` : `interfaces/index.ts`, `to-tool-definition.ts` et `index.ts` ajoutés ; la ligne de dossier `infrastructure/` devient la ligne de fichier `infrastructure/index.ts`, les trois outils non livrés restant nommés dans sa description (D6) ; `ToolSchema` renvoyé à `core/`.
- `metrics/`, `voice/` : inchangés.
- `agent/` : `services/step.ts` devient `application/use-cases/step.ts` (« pure » tombe : `step` appelle des ports) ; `models/index.ts`, `testing/` (sept fichiers) et `index.ts` ajoutés.
- `testing/` : les deux lignes de fichiers déplacés sont remplacées par `index.ts`.

Après SPEC-1, la carte nomme les 50 fichiers `.ts` de `src/` une fois chacun, plus trois fichiers marqués non livrés (`azure-llm-provider.ts`, `voice-provider.ts`, `voice-agentic-llm.ts`) et trois contenus élidés marqués (`memory/…`, `gemini/…`, `azure/…`). Les lignes exactes `  llm/`, `  context/`, `  metrics/`, la ligne `  voice/` et la ligne `with-metrics.ts` gardent leur forme : `TEST-4 (issue 7)` reste vert.

### SPEC-2 · Arborescence du guide : chemins existants, dossiers de code tous montrés

Dans `docs/guide-agent-package.md`, en anglais, sans tiret cadratin :

**Bloc.** Remplacer les lignes l.73-131 (entre la clôture l.72 et la clôture l.132, inchangées) par exactement ces lignes, lignes vides comprises :

```
src/
  core/                         # shared kernel: the vocabulary llm/ and tools/ both import (ADR-AGENT-0012)
    models/index.ts               JSONSchemaType, JSONSchemaProperty, ToolSchema
    index.ts

  llm/                          # peer framework, provider-agnostic
    models/index.ts               Message, LLMResponse, ToolCall, ToolDefinition, LLMError
    interfaces/llm-provider.ts
    services/token-count.ts       pure: isTokenCount, served by no barrel
    providers/
      ollama/ollama-llm-provider.ts    OllamaLLMProvider, a CLASS (real I/O)
      gemini/gemini-llm-provider.ts    GeminiLLMProvider, a CLASS (real I/O)
      gemini/gemini-wire.ts            pure generateContent translation, served by no barrel
      index.ts                    PROVIDERS: Record<ProviderID, () => LLMProvider>
    testing/                      shipped test tooling (→ ./testing, never ./llm)
      fake-llm-provider.ts          scripted provider, 2nd implementation of the port
      provider-contract.ts          checkProviderContract, runner-agnostic conformance
      index.ts
    index.ts

  context/                      # peer framework, 2 strategies, 1 contract
    interfaces/context-strategy.ts
    interfaces/token-counter.ts
    strategies/
      sliding-window/             V1: SlidingWindowStrategy and its pure helpers
      memory/                     [V3] plugs in here without touching the agent
    infrastructure/heuristic-token-counter.ts
    index.ts

  tools/
    models/index.ts               ToolOutcome, ToolResult (ToolSchema lives in core/)
    interfaces/tool.ts
    application/use-cases/dispatch-tool.ts    chains record → [authorize] → execute
    application/use-cases/to-tool-definition.ts   Tool → ToolDefinition shown to the model
    infrastructure/index.ts       ./tools branch, empty for now: read-file.ts, write-file.ts, list-files.ts land here
    index.ts

  metrics/                      # peer framework
    models/index.ts               UsageRecord, MetricsTotal, RateTable
    services/aggregate.ts         pure
    application/use-cases/metrics-collector.ts   MetricsCollector, a CLASS
    application/use-cases/with-metrics.ts        withMetrics, an LLMProvider decorator (see below)
    index.ts

  agent/                        # the app
    models/agent-definition.ts
    services/define-agent.ts      pure: invokes no port, imports only models/
    application/
      dtos/index.ts               AgentDeps, AgentInput, AgentResult, AgentState
      use-cases/step.ts           one iteration; a function, but it calls ports
      use-cases/agentic-llm.ts    AgenticLLM, a CLASS (public API)
      use-cases/voice-agentic-llm.ts   VoiceAgenticLLM [V4]
    testing/                      the agent test harness (→ ./testing)
      fake-app.ts                   shared-state simulator (≠ mock)
      define-scenario.ts
      run-scenario.ts
      run-matrix.ts
      matrix-csv.ts                 toCSV / toRunsCSV rendering, served by no barrel
      replay-run.ts                 replayRun
      index.ts
    index.ts

  testing/                      # ./testing branch: aggregates each framework's testing/
    index.ts                      re-exports llm/testing and agent/testing
```

Changements par rapport à l.73-131 : sous-arbre `core/` et sa ligne vide ajoutés après `src/` ; l.75 `ToolResult` → `ToolDefinition` ; l.77 `services/response-parser.ts   pure` → `services/token-count.ts` ; l.94 `V3,` → `[V3]` ; l.99 description des modèles de `tools/` ; ligne `to-tool-definition.ts` ajoutée après l.101 ; l.102 dossier `infrastructure/` → fichier `infrastructure/index.ts` ; l.107 `interfaces/metrics-collector.ts` et l.109 `infrastructure/collector.ts` retirées, `metrics-collector.ts` et `with-metrics.ts` ajoutées sous `application/use-cases/` ; l.119 `(V4)` → `[V4]` ; l.131 `(+ agent/testing when it lands)` → `and agent/testing`. Toutes les autres lignes sont reprises à l'identique.

**Règle de l'arborescence.** Après la clôture l.132, insérer une ligne vide puis ce paragraphe d'une ligne (texte de la constante `GUIDE_TREE_SENTENCE` de TEST-2), la ligne vide existante le séparant du paragraphe `metrics/application/use-cases/with-metrics.ts` qui suit :

```
This tree shows every folder of `src/` that holds code, not every file: the exhaustive map is the Full tree of `ROADMAP.md`. Every file and folder it names exists in `src/`, except the lines tagged `[V3]` or `[V4]`, which have not landed yet; `scripts/repo-conventions.test.mjs` checks both rules.
```

**Paragraphe l.138.** Remplacer `` (`llm/testing/`, later `agent/testing/`) `` par `` (`llm/testing/`, `agent/testing/`) ``, le reste de la ligne inchangé.

Aucune autre ligne du guide ne change. Les chaînes exigées par `TEST-8 (issue 9)` et `TEST-5 (issue 26)` restent présentes.

## « Dans les deux sens » : décision par document

- **Carte de `ROADMAP.md` : exhaustive.** Elle se déclare carte de placement de chaque classe (l.125) et #23 l'a voulue égale à l'arbre (D3 de #23). Sens carte → `src/` : chaque ligne non marquée nomme un fichier ou un dossier existant. Sens `src/` → carte : chaque fichier `.ts` de `src/` est nommé par une ligne, marquée ou non. Aucun fichier n'est nommé deux fois.
- **Arborescence du guide : non exhaustive, et elle le dit.** Elle illustre l'architecture ; la rendre exhaustive doublerait la carte, et chaque nouveau fichier coûterait deux éditions. Sens guide → `src/` : identique à la carte (tout chemin nommé hors ligne marquée existe), car un nom faux n'est jamais une simplification. Sens `src/` → guide, au grain des dossiers : chaque dossier de `src/` qui contient directement un fichier `.ts` (hors `src/` lui-même) est montré par le guide, comme ligne de dossier ou comme dossier ancêtre d'un chemin nommé ; un fichier non nommé n'est pas une erreur. Le paragraphe ajouté par SPEC-2 écrit cette règle dans le guide, pour que le lecteur sache ce que l'arborescence promet et ce qu'elle ne promet pas.

## Chemins nominal et d'erreur

Changement de documentation : aucun chemin d'exécution du paquet ne change. Pour les tests :

| Situation | TEST-1 (carte) | TEST-2 (guide) |
|---|---|---|
| documents conformes (après SPEC-1 et SPEC-2) | vert | vert |
| `main` 419617a | rouge : liste des lignes invalides, la ligne `sliding-window/…` citée | rouge : chemins absents `llm/services/response-parser.ts`, `context/strategies/memory/`, `metrics/interfaces/metrics-collector.ts`, `metrics/infrastructure/collector.ts`, `agent/application/use-cases/voice-agentic-llm.ts` |
| ligne non marquée nommant un chemin absent | rouge, chemin nommé | rouge, chemin nommé |
| fichier `.ts` ajouté à un dossier déjà montré, absent de la carte | rouge, fichier nommé | vert (le guide n'est pas exhaustif) |
| dossier de `src/` contenant un `.ts`, absent du guide | rouge (son fichier manque à la carte) | rouge, dossier nommé |
| indentation impaire, saut de niveau, ou premier mot ni dossier ni `.ts` sur une ligne non marquée | rouge, ligne citée | rouge, ligne citée |
| ligne marquée nommant un chemin absent | vert (attendu) | vert (attendu) |
| fichier nommé deux fois dans la carte | rouge, message dédié | sans effet |
| paragraphe de règle du guide modifié ou retiré ; `when it lands` ou ``later `agent/testing/` `` réintroduit | sans effet | rouge |

## Symétrie

- Lecture face à écriture : les deux documents (lus par un humain) sont comparés à l'arbre (écrit par les PR de code) ; chaque test vérifie les deux sens, au grain que son document promet.
- Même fait dans deux documents : carte et guide reçoivent les mêmes corrections de noms (`response-parser.ts`, `metrics-collector.ts`, `collector.ts`, `step.ts`, `ToolResult`, `ToolSchema`, outils fichiers non livrés) et la même notation `[Vn]` ; la grammaire est commune, lue par les mêmes aides.
- Marque `[Vn]` : la légende de la carte (SPEC-1) et le paragraphe du guide (SPEC-2) disent la même règle (une ligne marquée peut nommer un chemin non livré).
- Aucune énumération applicative, aucune donnée écrite.

## Données touchées

Aucune base, aucune variable d'environnement, aucun `.env` lu, aucun appel réseau. Fichiers modifiés : `ROADMAP.md`, `docs/guide-agent-package.md`, `scripts/repo-conventions.test.mjs`. Aucun artefact de build ne change.

## Décisions et alternatives écartées

- **D1 · Généraliser en remplaçant `TEST-1 (issue 23)`.** `TEST-1 (issue 56)` couvre tout ce que vérifiait `TEST-1 (issue 23)` (égalité du sous-arbre `metrics/` avec `src/metrics/`, ligne `MetricsCollector`) ; garder les deux obligerait à éditer deux tests à chaque ligne ajoutée sous `metrics/`. Écarté : garder `TEST-1 (issue 23)` à côté. Le retrait se fait dans le commit de SPEC-1, qui ajoute le test qui le remplace ; le total des tests augmente de 1 (deux ajoutés, un retiré).
- **D2 · Une seule grammaire pour les deux documents**, des règles de comparaison propres à ce que chaque document promet. Écarté : rendre le guide exhaustif (double maintenance d'une même liste) ; ne vérifier le guide que dans le sens guide → `src/` (un dossier entier, comme `core/` aujourd'hui, manquerait sans bruit).
- **D3 · Marque `[Vn]` = version d'apparition, pas « non livré ».** La légende l.125 la définit ainsi ; les lignes Gemini gardent `[V2]` alors que leurs fichiers existent. Une ligne marquée n'est exemptée que du sens carte → `src/`. Limite assumée (R-3). Écarté : « marquée = absente » (contredit la légende, efface la version des fichiers livrés, et ne détecte pas davantage un nom faux sur une ligne future).
- **D4 · Un chemin par ligne, élision seulement sous marque.** La ligne à quatre fichiers et `sliding-window/…` empêchent la comparaison : ils sont dépliés. `memory/…` et le sous-arbre `voice/` restent élidés : ils sont marqués.
- **D5 · Ligne future renommée selon la convention réelle.** `azure/azure-adapter.ts` devient `azure/azure-llm-provider.ts`, comme `ollama-llm-provider.ts` et `gemini-llm-provider.ts`. Non vérifié par le test (ligne marquée) ; cohérence seulement.
- **D6 · Outils fichiers non livrés nommés en description.** `ReadFile`, `WriteFile`, `ListFiles` (carte) et `read-file.ts`, `write-file.ts`, `list-files.ts` (guide) restent dans la description de `infrastructure/index.ts`, avec « land here » ; le premier mot de la ligne nomme le seul fichier réel. Écarté : des lignes de fichier marquées (ce sont des livrables V1, aucune marque `[V2]` à `[V4]` ne serait vraie) ; les retirer (perte de l'intention, que l'en-tête de `src/tools/infrastructure/index.ts:6` porte aussi).
- **D7 · Descriptions corrigées seulement là où elles sont fausses sur l'arbre réel** : `ToolResult` sous `llm/models`, `ToolSchema` sous `tools/models`, `step` « pure », `when it lands`, `later`. Les autres descriptions restent telles quelles.
- **D8 · `./llm` non mentionné dans la carte.** La description de `llm/index.ts` dit « re-exported by "." » (vrai, `src/index.ts:7`) sans nommer le sous-chemin `./llm`, pour ne pas ouvrir dans la même PR le sujet du paragraphe « The 3 entry points », laissé hors périmètre (R-1).
- **D9 · Types et scopes** : `docs(roadmap)` pour SPEC-1, `docs(guide)` pour SPEC-2 ; squash en `docs(roadmap)`.

## Ordre des commits et preuves

Un SPEC = un commit = un test ; chaque test entre dans le commit de son SPEC ; spécification et checklist entrent dans le commit de SPEC-1 (précédent P1 de #20, #31, #35, #46, #23). Chemins relatifs au dépôt dans toute preuve. Garde avant toute commande de test : `node -e "process.exit(process.env.GEMINI_INTEGRATION === undefined ? 0 : 1)"` rend 0, sinon arrêter. Aucun `npm run build` pendant les mutations (précédent P6 de #23).

1. **SPEC-1** : écrire les aides et TEST-1, retirer `TEST-1 (issue 23)` ; `node --test scripts/repo-conventions.test.mjs` échoue sur `TEST-1 (issue 56)` seul, la liste des lignes invalides citant la ligne `sliding-window/…` (rouge montré). Puis modifier `ROADMAP.md` ; la commande passe, `TEST-4 (issue 7)` compris. Mutations après le commit, chacune annulée avant la suivante : A, retirer la ligne `    services/token-count.ts …` de la carte → rouge, `llm/services/token-count.ts` nommé ; B, ajouter juste après elle la ligne non marquée `    services/response-parser.ts` → rouge, `llm/services/response-parser.ts` nommé ; C, créer le fichier vide `src/core/probe.ts` → rouge, `core/probe.ts` nommé (`TEST-2 (issue 56)` n'est pas encore écrit). Annulation : `git restore ROADMAP.md`, suppression de `src/core/probe.ts`, `git status --short` vide.
2. **SPEC-2** : écrire TEST-2 et sa constante ; la commande échoue sur `TEST-2 (issue 56)` seul (rouge montré, chemins de la ligne `main` du tableau). Puis modifier le guide ; la commande passe, `TEST-8 (issue 9)` et `TEST-5 (issue 26)` compris. Mutations : A, rajouter sous `  metrics/` du guide, après `    models/index.ts …`, la ligne `    interfaces/metrics-collector.ts` → rouge, `metrics/interfaces/metrics-collector.ts` nommé ; B, créer le fichier vide `src/probe/probe.ts` → `TEST-2 (issue 56)` rouge, `probe/` nommé (`TEST-1 (issue 56)` rouge aussi, `probe/probe.ts` nommé : attendu). Annulation : `git restore docs/guide-agent-package.md`, suppression du dossier `src/probe/`, `git status --short` vide.
3. Gates : `npm run build`, `npm run typecheck`, `npm run test` ; aucun test existant autre que `TEST-1 (issue 23)` (retiré) ne change de statut ; le total de tests augmente de 1.

Gabarit (aucun `Co-Authored-By`) :

```
<type>(<scope>): <sujet>

<corps : ce qui change et la preuve, chemins relatifs au dépôt>

Refs: #56
Session: <id>
Model: <modèle>
Authorship: ai
```

| SPEC | Sujet (impératif, 72 caractères au plus type compris) |
|---|---|
| 1 | `docs(roadmap): aligner toute la carte de ROADMAP.md sur src/` (61) |
| 2 | `docs(guide): aligner l'arborescence du guide sur src/` (53) |

### Message de squash proposé

```
docs(roadmap): aligner la carte et le guide sur src/ (#<PR>)

La carte de ROADMAP.md nommait des fichiers absents (response-parser.ts,
ollama-adapter.ts, gemini-adapter.ts, agent/services/step.ts, les
fichiers du harnais sous testing/) et en omettait 31 sur 50, dont tout
core/. Elle nomme désormais chaque fichier .ts de src/, un chemin par
ligne ; seules les lignes marquées [V2]/[V3]/[V4] peuvent nommer un
chemin pas encore livré. TEST-1 (issue 56) le vérifie dans les deux sens
et remplace TEST-1 (issue 23), limité à metrics/.

L'arborescence du guide perd ses chemins faux (response-parser.ts,
metrics/interfaces/metrics-collector.ts, metrics/infrastructure/
collector.ts), montre core/ et metrics/application/use-cases/, et dit
qu'elle n'est pas exhaustive. TEST-2 (issue 56) vérifie que tout chemin
nommé existe et que chaque dossier de src/ qui contient du code y figure.

Refs: #56
Session: <id>
Model: <modèle>
Authorship: ai
```

Sujet : 52 caractères sans le suffixe ; 58 avec ` (#NN)`. Rappel A4 : le corps de la PR se termine par le même bloc de trailers.

## Tests

Aides ajoutées dans `scripts/repo-conventions.test.mjs`, juste après `sectionAfterHeading` (l.57), avec un commentaire en français qui renvoie à la grammaire (#56) :

- `fencedBlockAfter(text, heading)` : lignes du bloc défini par la règle 1 de la grammaire ; échec `assert` si le titre ou une des deux clôtures manque, le titre cité dans le message.
- `parseSrcTree(blockLines)` : applique les règles 2 à 6 ; échec `assert` si la première ligne non vide n'est pas `src/` ; rend `{ invalid, entries }`, `invalid` la liste des lignes invalides (texte de la ligne), `entries` une entrée `{ line, path, kind, tagged }` par ligne valide, `kind` valant `"dir"`, `"file"` ou `"elided"` (ligne marquée dont le premier mot n'est ni dossier ni `.ts`), `path` relatif à `src/`, terminé par `/` pour un dossier.
- `srcTsFiles()` : entrées de `readdirSync(new URL("../src/", import.meta.url), { recursive: true })` terminées par `.ts`, `\` remplacé par `/` (Windows), triées.

**TEST-1** (exerce SPEC-1), `TEST-1 (issue 56) ROADMAP : la carte nomme chaque fichier .ts de src/ et seulement des chemins existants hors lignes [Vn]`, à la place de `TEST-1 (issue 23)` (l.292-311), donc juste après `TEST-4 (issue 7)`. Sur le bloc qui suit `## Full tree (target map, V1 → V4)` dans `ROADMAP.md` : `invalid` égale `[]` (`assert.deepEqual`, message « ROADMAP.md : lignes de la carte invalides ») ; la liste des chemins des entrées non marquées de type `dir` ou `file` pour lesquelles `existsSync(new URL("../src/" + path, import.meta.url))` est faux égale `[]` (message « ROADMAP.md : la carte nomme des chemins absents de src/ ») ; la liste des fichiers de `srcTsFiles()` absents des chemins de type `file` égale `[]` (message « ROADMAP.md : fichiers .ts de src/ absents de la carte ») ; aucun chemin de type `file` n'apparaît deux fois (message « ROADMAP.md : chemin nommé deux fois dans la carte ») ; l'entrée de chemin `metrics/application/use-cases/metrics-collector.ts` existe et sa ligne contient `MetricsCollector`. Lecture seule, aucun réseau, déterministe.

**TEST-2** (exerce SPEC-2), `TEST-2 (issue 56) le guide ne nomme que des chemins existants et montre chaque dossier de src/ qui contient du code`, juste après TEST-1, précédé de la constante de module `GUIDE_TREE_SENTENCE` (texte du paragraphe « Règle de l'arborescence » de SPEC-2, coupé en littéraux concaténés de 100 colonnes au plus, sur la forme de `HTTP_STATUS_SENTENCE`). Sur le bloc qui suit `### Directory tree` dans `docs/guide-agent-package.md` : `invalid` égale `[]` (message « guide : lignes de l'arborescence invalides ») ; la liste des chemins non marqués de type `dir` ou `file` absents de `src/` égale `[]` (message « guide : l'arborescence nomme des chemins absents de src/ ») ; la liste des dossiers de `srcTsFiles()` (préfixe jusqu'au dernier `/` inclus, racine exclue) absents de l'ensemble formé des chemins de type `dir` et de tous les préfixes de dossier des chemins nommés égale `[]` (message « guide : dossiers de src/ qui contiennent du code, absents de l'arborescence ») ; `splitLines(guide)` contient `GUIDE_TREE_SENTENCE` ; le texte du guide ne contient ni `when it lands` ni ``later `agent/testing/` ``. Lecture seule, aucun réseau, déterministe.

## Estimation de taille

Hors `docs/` et `*.md`, lignes ajoutées et retirées :

| Fichier | Estimation |
|---|---|
| `scripts/repo-conventions.test.mjs` : aides (environ 40), TEST-1 (environ 25), TEST-2 et constante (environ 25), retrait de `TEST-1 (issue 23)` (−20) | +80 à +100 −20 |
| **Total** | **environ 110** (fourchette 90 à 140) |

`ROADMAP.md` (environ +33 −11) et `docs/guide-agent-package.md` (environ +12 −8) sont exclus du compte (`*.md`). Sous le plafond de 400 ; aucune dérogation ; aucun découpage. La mesure (`pr_size.py`) fait foi à la PR.

## Dépendances

Aucune dépendance.

(#23 est fermée par la PR #55 ; `src/llm/services/token-count.ts` de #51 est sur `main` 419617a.)

## Hypothèses restantes

- **R-1 · Points d'entrée** : « The 3 entry points » (`ROADMAP.md:178`) et « Three public entry points » (guide l.60-66) omettent `./llm`, exporté par `package.json:13-16` et documenté par le README (`TEST-4 (issue 26)`). Hors des sous-arbres visés par l'issue ; à ouvrir en issue de suivi si le pilote le veut.
- **R-2 · Contexte de projet du guide** (l.9-13, l.50 : NATHAN, `PMC/`) : héritage couvert par la dérogation et par la note d'origine (`TEST-4`), non touché.
- **R-3 · Lignes marquées non vérifiées** (D3) : un nom faux sur une ligne `[Vn]` passe tant qu'aucun fichier n'arrive ; quand le fichier réel arrive sous un autre nom, le sens `src/` → carte le nomme.
- **R-4 · Descriptions non vérifiées** : seul le premier mot de chaque ligne est comparé à l'arbre ; un type déplacé d'un fichier à un autre n'est pas détecté (sauf `MetricsCollector`, verrou repris de #23).
- **Node** ≥ 22.18 (retrait de types sans drapeau ; `readdirSync` récursif depuis Node 20.1), constaté v22.19.0 par #20.
