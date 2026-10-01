# Spécification · Fermer le budget maxTokens aux compteurs d'usage invalides de Gemini et d'Ollama · #51

Date : 2026-10-01
Issue : https://github.com/arthurolivierfortin/agent-core/issues/51 (label `T:bug`, `origine: #46` ; reprend R-2 et R-4 de docs/specs/2026-10-01-metrics-invalid-usage-design.md)
Checklist : docs/specs/2026-10-01-budget-usage-invalide-checklist.md
Branche : `fix/51-usage-tokens-invalides` (worktree `.claude/worktrees/fix-51-usage-invalide`, `main` 27bd9a1)
Continuité : docs/specs/2026-09-30-cap-guard-usage-counters-design.md (#41 : règle « entier fini ≥ 0 » dans `capGuard`) ; docs/specs/2026-10-01-metrics-invalid-usage-design.md (#46 : même règle dans `withMetrics`) ; docs/specs/2026-09-30-gemini-wire-design.md (#18, `toUsage` de Gemini) et le contrôle `typeof` ajouté par #39.

## Objectif

Faire rendre par `toUsage` de Gemini et d'Ollama un `usage` absent (`undefined`) dès qu'un compteur n'est pas un entier fini ≥ 0, pour que `tokensOf` (qui ignore déjà un usage absent) n'ajoute jamais au budget `maxTokens` un compteur négatif, fractionnaire, `NaN` ou infini venu d'un fournisseur livré par le package.

## Source de l'issue

Corps de l'issue (résumé transmis par le pilote) : le budget `maxTokens` ne résiste pas à un compteur d'usage `NaN` ou négatif. `tokensOf` (`src/agent/application/use-cases/step.ts`) additionne les compteurs sans contrôle ; un `NaN` rend le budget inopérant, un négatif retarde l'arrêt. Cause racine : `toUsage` de Gemini (`gemini-wire.ts`) et d'Ollama (`ollama-llm-provider.ts`) ne contrôle que `typeof`. Attendu :

1. `toUsage` rend `usage` undefined si un compteur n'est pas un entier fini ≥ 0 (même règle que `capGuard` et `withMetrics`, #39, #46) ;
2. `tokensOf` ignore un usage absent ;
3. des tests sur les deux fournisseurs et sur le budget.

Contraintes du pilote : code du package publié (`src/`) ; le package ne lit que `process.env`, jamais un fichier `.env` ; aucun fournisseur hébergé appelé dans la suite ; coût et jetons à null ou absents quand la donnée manque, jamais 0 inventé ; gates build, typecheck, test ; Node 22.

## État constaté dans le code (lecture du 2026-10-01, `main` 27bd9a1)

- `src/llm/providers/gemini/gemini-wire.ts:184-191` (`toUsage`, non exporté) : lit `promptTokenCount`, `candidatesTokenCount`, `thoughtsTokenCount` une fois chacun ; l.188 rejette si l'un des deux premiers n'est pas `typeof "number"`, l.189 si `thoughtsTokenCount` est présent et pas `typeof "number"` ; l.190 rend `{ tokensIn, tokensOut: candidateTokens + (thoughts ?? 0) }`. `-1`, `0.5`, `NaN`, `Infinity` passent. TSDoc l.179-183 : « The three counters must be numbers, else usage stays undefined (#39) ». Appelé par `fromGeminiResponse` l.157, que `GeminiLLMProvider.complete` appelle (`gemini-llm-provider.ts:118`) ; Gemini n'a pas de `stream`.
- `src/llm/providers/ollama/ollama-llm-provider.ts:200-205` (`toUsage(chunk)`, non exporté, sans TSDoc) : rejette si `prompt_eval_count` ou `eval_count` n'est pas `typeof "number"`, sinon `{ tokensIn: prompt_eval_count, tokensOut: eval_count }`. Appelé par `complete` (l.78) et par `stream` sur le fragment terminal (l.102). Le corps est lu par `res.json()` ou `JSON.parse` : `-1`, `0.5`, `1e400` (lu `Infinity`) et `-1e400` (lu `-Infinity`) y arrivent ; `NaN` littéral n'existe pas en JSON, mais `1e400` et `-1e400` dans le même corps donnent une somme `NaN` dans `tokensOf`.
- `src/agent/application/use-cases/step.ts:276-279` (`tokensOf`) : `if (usage === undefined) return 0; return usage.tokensIn + usage.tokensOut;`. Appelé par `land` (l.225) et `advance` (l.242). `isOverBudget` l.160-161 : `state.tokensUsed >= maxTokens`, faux pour `NaN`.
- **Point 2 de l'issue vérifié** : `tokensOf` ignore déjà un usage absent (l.277), verrouillé par `tests/agent/application/use-cases/agentic-llm.test.ts:121-127` (« run reports zero tokens against a provider that reports no usage »). Il n'appelle aucun changement de code.
- `src/llm/models/index.ts:38-42` : `Usage = { tokensIn: number; tokensOut: number }`, TSDoc « Token count for a call. Absent (not zero) when the provider does not supply it. »
- `src/agent/application/dtos/index.ts:41-42` (`Budget.maxTokens`, « A provider that reports none never trips it. ») et l.118-124 (`AgentResult.tokensUsed`, 0 quand le fournisseur ne rapporte rien) : restent vrais après #51.
- Règle à reprendre : `scripts/h2-report/cap-guard.ts:39-42` (`isCount`) et `src/metrics/application/use-cases/with-metrics.ts:54-57` (`isTokenCount`), tous deux `typeof value === "number" && Number.isInteger(value) && value >= 0`, non exportés.
- `src/llm/providers/index.ts` ne réexporte que `OllamaLLMProvider`, `OllamaConfig`, `GeminiLLMProvider`, `GeminiConfig`, `ProviderID`, `PROVIDERS`, `DEFAULT_*`, `resolveProvider` ; `package.json` n'expose que `.`, `./llm`, `./tools`, `./testing` : un module de `src/llm/` importé en relatif et absent des barrels (`src/llm/index.ts` ne réexporte pas `services/`) n'est pas public (précédent : `gemini-wire.ts`, « served by no barrel »).
- Tests existants : `tests/llm/providers/gemini/gemini-wire.test.ts:210-224` (« hypothesis H4 », dont `{ 0, 0 }` → `{ 0, 0 }` et compteur manquant → `undefined`) et l.226-235 (`TEST-2 (issue 39)`) ; `tests/llm/providers/ollama/ollama-adapter.test.ts:32-38` et l.80-90 (usage valide en `complete` et `stream`), helper `fakeFetch(body)` l.29-30 qui passe par `JSON.stringify` (un `NaN` ou `Infinity` y devient `null`) ; `tests/agent/application/use-cases/step.test.ts:448-467` (« the token bound lands the run once the provider has reported enough », `FakeLLMProvider`, `maxTokens: 10`), helpers `agentWith`, `navigateTool`, `wideContext`, `driveWithStep`, imports l.3-20 dont `LLMError` de `../../../../dist/llm/index.js` (l.12).
- Effet en aval déjà fermé : `withMetrics` (#46) enregistre `{ null, null }` pour un usage absent comme pour un usage invalide ; `capGuard` (#41) coupe `unclassified` dans les deux cas (`usageCounters` rend `null`). #51 ne change donc ni les métriques ni le rapport H2.

## Périmètre

Dans la PR :

- `src/llm/services/token-count.ts`, nouveau module interne (SPEC-1) ;
- `src/llm/providers/gemini/gemini-wire.ts`, `toUsage` et son TSDoc (SPEC-1) ;
- `src/llm/providers/ollama/ollama-llm-provider.ts`, `toUsage` et un TSDoc (SPEC-2) ;
- `src/llm/models/index.ts`, TSDoc de `Usage` seulement (SPEC-2) ;
- `tests/llm/providers/gemini/gemini-wire.test.ts` (TEST-1) ;
- `tests/llm/providers/ollama/ollama-adapter.test.ts` (TEST-2) ;
- `tests/agent/application/use-cases/step.test.ts` (TEST-3).

Hors périmètre :

- Le code de `tokensOf`, `isOverBudget`, `land`, `advance` (`step.ts`) : point 2 déjà vrai (voir D3 et R-1).
- `withMetrics` et son `isTokenCount` privé ; `capGuard` et son `isCount` (voir D2 et R-2).
- `FakeLLMProvider`, `checkProviderContract`, les barrels, les types exportés, `package.json`, `tsconfig*.json`, `README.md`, `docs/guide-agent-package.md`.
- Un corps Gemini ou Ollama illisible ou mal formé : comportement inchangé (`LLMError` `API_ERROR`).

## Conception

### SPEC-1 · Module `token-count.ts` et `toUsage` de Gemini

Nouveau fichier `src/llm/services/token-count.ts`, importé en relatif par les deux adaptateurs, absent de `src/llm/providers/index.ts` :

```ts
// #51: the rule every usage counter obeys before it leaves a provider adapter, the one capGuard
// (#41) and withMetrics (#46) apply too. Served by no barrel: the adapters import it relatively.

/** A usage counter is an integer >= 0, so finite: negative, fractional, NaN, infinite or non-numeric is not a count. */
export function isTokenCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
```

Dans `gemini-wire.ts`, import `import { isTokenCount } from "../../services/token-count.js";` et `toUsage` devient :

```ts
function toUsage(metadata: GeminiResponse["usageMetadata"]): Usage | undefined {
  const tokensIn = metadata?.promptTokenCount;
  const candidateTokens = metadata?.candidatesTokenCount;
  const thoughts = metadata?.thoughtsTokenCount;
  if (!isTokenCount(tokensIn) || !isTokenCount(candidateTokens)) return undefined;
  if (thoughts !== undefined && !isTokenCount(thoughts)) return undefined;
  const tokensOut = candidateTokens + (thoughts ?? 0);
  if (!isTokenCount(tokensOut)) return undefined;
  return { tokensIn, tokensOut };
}
```

Chaque compteur est lu une fois ; la somme est contrôlée aussi, parce que deux entiers finis peuvent sommer à `Infinity` (`1e308 + 1e308`). Le TSDoc l.179-183 devient : « Tokens of a call, thinking counted as output (H4). Each counter, and the output sum, must be an integer >= 0 (isTokenCount, #51), else usage stays undefined: a negative, fractional, NaN or infinite counter would corrupt the maxTokens budget, and a non-number would too (#39). thoughtsTokenCount alone may be missing, and then counts 0. For the other two, absent is not zero (ADR-AGENT-0007). »

### SPEC-2 · `toUsage` d'Ollama et TSDoc de `Usage`

Dans `ollama-llm-provider.ts`, import `import { isTokenCount } from "../../services/token-count.js";` et `toUsage` devient :

```ts
/**
 * Both counters of a final chunk, each an integer >= 0 (isTokenCount, #51), else undefined: absent
 * is not zero (ADR-AGENT-0007), and a negative, fractional or infinite counter would corrupt the
 * maxTokens budget. JSON reads 1e400 as Infinity.
 */
function toUsage(chunk: OllamaChatChunk): Usage | undefined {
  const tokensIn = chunk.prompt_eval_count;
  const tokensOut = chunk.eval_count;
  if (!isTokenCount(tokensIn) || !isTokenCount(tokensOut)) return undefined;
  return { tokensIn, tokensOut };
}
```

`complete` et `stream` passent tous deux par cette fonction : un fragment terminal au compteur invalide garde `done: true` et un `contentDelta` inchangé, avec `usage` `undefined`.

Le TSDoc de `Usage` (`src/llm/models/index.ts:38`) devient : « Token count for a call. Absent (not zero) when the provider does not supply it. Each counter is an integer >= 0: the shipped adapters leave usage absent rather than report a counter that is not (#51). » Le type ne change pas.

### Effet sur l'API publique

- **Types exportés** : aucun changement de forme. `isTokenCount` n'entre dans aucun barrel ni dans `exports` de `package.json` ; `dist/llm/services/token-count.js` existe mais n'est pas importable par un consommateur via le paquet.
- **Sémantique** : une réponse Gemini ou Ollama dont un compteur n'est pas un entier fini ≥ 0 est servie normalement (contenu, appels d'outils), avec `usage` absent au lieu d'un usage faux. Conséquences :
  - `AgentState.tokensUsed` et `AgentResult.tokensUsed` n'ajoutent rien pour cet appel (règle existante de `tokensOf`) au lieu d'ajouter un négatif, une fraction, `Infinity` ou `NaN` ;
  - le budget `maxTokens` reste opérant : un appel invalide compte 0, il ne retire rien aux appels valides et ne rend plus la somme `NaN` ;
  - un compteur valide accompagnant un compteur invalide est perdu aussi (D1) : `{ 20, -15 }` comptait 5, il compte 0.
- **Métriques et rapport H2** : inchangés en valeur (voir l'état constaté) ; `withMetrics` enregistre toujours `{ null, null }`, `capGuard` coupe toujours `unclassified`.
- **Version** : correction de comportement sans changement de signature ; relève d'un correctif (patch).

## Chemins nominal et d'erreur

| Compteurs reçus | Avant #51 (`usage`) | Après #51 (`usage`) | Apport à `tokensUsed` après |
|---|---|---|---|
| absents (l'un ou l'autre) | `undefined` | inchangé | 0 (inchangé) |
| deux entiers ≥ 0, zéro compris | tels quels | inchangé | leur somme (inchangé) |
| Gemini `thoughtsTokenCount` entier ≥ 0, `0` compris | ajouté à la sortie | inchangé | inchangé |
| un négatif (`-1`) | tel quel | `undefined` | 0 |
| un fractionnaire (`0.5`) | tel quel | `undefined` | 0 |
| `NaN` (Gemini, objet passé en mémoire) | tel quel | `undefined` | 0 |
| `Infinity` ou `-Infinity` (`1e400` / `-1e400` en JSON) | tel quel | `undefined` | 0 |
| Gemini, sortie qui déborde (`1e308 + 1e308`) | `tokensOut: Infinity` | `undefined` | 0 |
| non numérique (`"7"`, `null`, `true`) | `undefined` (#39) | inchangé | 0 |
| corps illisible, non JSON | `LLMError` `API_ERROR` | inchangé | — |

## Symétrie

- Écriture face à lecture : les deux `toUsage` écrivent `LLMResponse.usage` (et `LLMChunk.usage` pour Ollama) ; `tokensOf` le lit pour le budget (TEST-3), `withMetrics` et `capGuard` le lisent pour la mesure et la coupure (inchangés, même résultat pour absent et invalide).
- Chemin nominal face au chemin d'erreur : chaque table de test porte au moins une ligne valide, zéro compris, rendue telle quelle, face aux lignes invalides rendues `undefined`. TEST-3 montre le budget qui tombe avec un appel invalide suivi d'appels valides.
- Les deux fournisseurs : même règle, une seule définition (`token-count.ts`) ; Ollama sur ses deux chemins (`complete` et `stream`).
- Règle « entier fini ≥ 0 » sur ses couches : adaptateurs (#51, source), `withMetrics` (#46, enregistrement), `capGuard` (#41, coupure). Trois définitions identiques mot pour mot (D2, R-2).
- Aucune énumération touchée.

## Données touchées

Aucune base, aucun fichier écrit, aucune variable d'environnement lue ni posée. Les tests passent par des `fetch` factices et des corps littéraux ; aucun appel réseau, aucune clé, réelle ou factice.

## Dépendances

Aucune dépendance. (#46, origine de l'issue, est livrée : PR #50 fusionnée.)

## Décisions et alternatives écartées

- **D1 · Usage entier absent** plutôt qu'un compteur à 0 ou qu'un usage partiel : `Usage` exige deux nombres, et compter 0 pour un compteur invalide inventerait une donnée (« absent is not zero », ADR-AGENT-0007). Un compteur valide accompagnant un invalide est perdu : l'usage d'une réponse dont un compteur est faux n'est pas digne de confiance pour l'autre (même choix que D1 de #46 et que `usageCounters` de #41).
- **D2 · Un module interne partagé par les deux adaptateurs**, `src/llm/services/token-count.ts`, plutôt qu'une copie privée par fichier : les deux adaptateurs sont dans le même sous-système et la règle y reste unique. Le module est dans `services/` et non dans `providers/` : c'est une fonction pure (ni disque, ni HTTP, ni SDK), que la règle de placement du dépôt range dans `services/` (`docs/decisions/ADR-AGENT-0001-hexagonal-architecture-use-cases-functions.md:61`, `docs/guide-agent-package.md:162`), `providers/` étant réservé aux adaptateurs par fournisseur (ADR-AGENT-0001:53 et 63, ADR-AGENT-0016:177) ; correction demandée par la revue de la PR #59. `withMetrics` garde sa copie (le faire importer depuis `llm/services/` serait un refactor hors de l'issue, et lierait `metrics` au sous-système `llm`) ; `capGuard` garde la sienne (`scripts/` n'importe que `dist/index.js`, où la règle n'est pas exportée). Écarté : exporter `isTokenCount` dans un barrel, qui ajoute un symbole public (contrat semver, `tests/barrel-contract.test.ts`) pour une expression d'une ligne.
- **D3 · `tokensOf` inchangé** : l'attendu de l'issue lui demande d'ignorer un usage absent, ce qu'il fait déjà (step.ts:277, agentic-llm.test.ts:121-127). Écarté : lui faire aussi refuser un usage invalide, qui protégerait le budget contre un fournisseur tiers ou un `FakeLLMProvider` scripté, mais déborde l'attendu ; déclaré en R-1.
- **D4 · Somme Gemini contrôlée** (`tokensOut`) en plus des trois compteurs : sans elle, `candidatesTokenCount` et `thoughtsTokenCount` valides mais énormes rendraient `tokensOut: Infinity`, et le budget tomberait sur un usage faux. Coût : une ligne.
- **D5 · `-0` accepté**, comme D2 de #41 et D5 de #46 (`Number.isInteger(-0)` et `-0 >= 0` sont vrais) ; il compte 0.
- **D6 · Test de budget par l'adaptateur Ollama** et non par `FakeLLMProvider` : `tokensOf` étant inchangé, seul un usage produit par un adaptateur corrigé montre le budget qui résiste ; Ollama se teste sans clé (Gemini en exigerait une dans `process.env`). Le `fetch` factice répond des corps JSON bruts, pour que `1e400` arrive en `Infinity` comme d'un vrai serveur.
- **D7 · Type `fix`**, scope `llm` : label `T:bug`, la valeur fausse observable est `AgentResult.tokensUsed` et l'arrêt sur budget.

## Ordre des commits et preuve de rouge

Un SPEC = un commit. TEST-3 exerce SPEC-2 à travers la boucle : il entre dans le commit de SPEC-2 avec TEST-2. La spécification et la checklist entrent dans le commit de SPEC-1 (précédent P1 de #20, #35, #39, #41, #46). Preuves par `npm run build` puis `npm run test`, chemins relatifs au dépôt ; la sortie montre les titres `TEST-1 (issue 51)`, `TEST-2 (issue 51)`, `TEST-3 (issue 51)`.

- Rouge avant SPEC-1 (TEST-1 écrit, `gemini-wire.ts` non modifié) : les 8 lignes invalides de TEST-1 échouent, la ligne valide passe.
- Vert après SPEC-1 : les 9 passent ; aucun test existant ne change de statut.
- Rouge avant SPEC-2 (TEST-2 et TEST-3 écrits, `ollama-llm-provider.ts` non modifié) : les 5 lignes invalides de `complete` et le test `stream` de TEST-2 échouent, la ligne valide passe ; les 2 tests de TEST-3 échouent (`stopReason` `completed` au lieu de `budget`).
- Vert après SPEC-2 : les 18 tests ajoutés passent ; aucun test existant ne change de statut.
- Mutations, **après le commit de SPEC-2**, sur l'arbre propre, chacune annulée par `git restore <fichier>` puis `git diff --stat -- <fichier>` vide :
  1. `value >= 0` → `value > 0` dans `isTokenCount` (`token-count.ts`) : échouent au moins la ligne zéro de TEST-1, la ligne zéro de TEST-2 et « hypothesis H4 » ;
  2. retrait de `if (!isTokenCount(tokensOut)) return undefined;` dans `gemini-wire.ts` : échoue la ligne de débordement de TEST-1.
  Sorties montrées dans le rapport du builder et dans la description de la PR.

Gabarit (aucun `Co-Authored-By`) :

```
<type>(<scope>): <sujet>

<corps : ce qui change et la preuve de rouge, chemins relatifs au dépôt>

Refs: #51
Session: <id>
Model: <modèle>
Authorship: ai
```

| SPEC | Sujet (impératif, 72 caractères au plus type compris) |
|---|---|
| 1 | `fix(llm): rendre l'usage Gemini absent si un compteur est invalide` (66) |
| 2 | `fix(llm): rendre l'usage Ollama absent si un compteur est invalide` (66) |

### Message de squash proposé

```
fix(llm): écarter les compteurs d'usage invalides du budget (#<PR>)

toUsage de Gemini et d'Ollama rend usage absent quand un compteur
n'est pas un entier fini >= 0 (négatif, fractionnaire, NaN, infini),
et Gemini contrôle aussi la somme de sortie. La règle est celle de
capGuard (#41) et de withMetrics (#46), écrite une fois pour les deux
adaptateurs dans src/llm/services/token-count.ts, hors barrel.

tokensOf ignorait déjà un usage absent : le budget maxTokens ne reçoit
plus de NaN qui le rendait inopérant, ni de négatif qui retardait
l'arrêt. Aucun type exporté ne change ; métriques et rapport H2
inchangés en valeur.

Refs: #51
Session: <id>
Model: <modèle>
Authorship: ai
```

Sujet : 59 caractères sans le suffixe ; 65 avec ` (#NN)`. Le corps de la PR se termine par le même bloc de trailers `Refs` / `Session` / `Model` / `Authorship`.

## Tests

Déterministes, sans réseau, sans fournisseur réel ni clé, sans variable d'environnement. Titres en anglais comme leurs voisins, préfixés `TEST-N (issue 51)`, sans `#`, ajoutés en fin de fichier. Aucun test existant n'est modifié.

**TEST-1** (exerce SPEC-1), `tests/llm/providers/gemini/gemini-wire.test.ts`, un `test()` par ligne, soit 9. Réponse de base `{ candidates: [{ content: { role: "model", parts: [{ text: "ok" }] } }] }`, `fromGeminiResponse({ ...answer, usageMetadata }).usage` :

- table `INVALID_USAGE_METADATA` (8 lignes `[why, usageMetadata]`), attendu `undefined` : `{ promptTokenCount: -1, candidatesTokenCount: 5 }` ; `{ promptTokenCount: 10, candidatesTokenCount: -1 }` ; `{ promptTokenCount: 10, candidatesTokenCount: 5, thoughtsTokenCount: -1 }` ; `{ promptTokenCount: 0.5, candidatesTokenCount: 5 }` ; `{ promptTokenCount: NaN, candidatesTokenCount: 5 }` ; `{ promptTokenCount: 10, candidatesTokenCount: Infinity }` ; `{ promptTokenCount: 10, candidatesTokenCount: 5, thoughtsTokenCount: NaN }` ; `{ promptTokenCount: 10, candidatesTokenCount: 1e308, thoughtsTokenCount: 1e308 }` (somme `Infinity`). Le contenu reste `"ok"`.
- ligne valide : `{ promptTokenCount: 0, candidatesTokenCount: 0, thoughtsTokenCount: 0 }` rend `{ tokensIn: 0, tokensOut: 0 }` (`deepStrictEqual`).

**TEST-2** (exerce SPEC-2), `tests/llm/providers/ollama/ollama-adapter.test.ts`, 7 tests. Assistant de fichier `rawFetch(text)` (`new Response(text, { status: 200 })`, sans `JSON.stringify`) et corps bâti par concaténation `'{"model":"qwen2.5:0.5b","message":{"role":"assistant","content":"Hi!"},"done":true,"prompt_eval_count":' + tokensIn + ',"eval_count":' + tokensOut + '}'`, les compteurs écrits en texte :

- table `INVALID_COUNTS` (5 lignes `[why, tokensIn, tokensOut]`) : `["-1", "3"]` ; `["36", "-3"]` ; `["0.5", "3"]` ; `["36", "1e400"]` ; `["-1e400", "3"]`. Pour chacune, `complete([{ role: "user", content: "hi" }], { model: MODEL })` rend `content` `"Hi!"`, `toolCalls` `[]` et `usage` `undefined` ;
- ligne valide `["0", "0"]` : `usage` égal à `{ tokensIn: 0, tokensOut: 0 }` ;
- `stream` : le flux `'{"message":{"role":"assistant","content":"Su"},"done":false}\n{"message":{"role":"assistant","content":""},"done":true,"prompt_eval_count":-1,"eval_count":26}\n'` rend deux fragments, `done` `[false, true]`, et `usage` `undefined` sur les deux.

**TEST-3** (exerce SPEC-2), `tests/agent/application/use-cases/step.test.ts`, 2 tests. `OllamaLLMProvider` ajouté à l'import de valeurs de `../../../../dist/llm/index.js` (l.12). Assistant de fichier `scriptedOllamaFetch(bodies: string[])` qui répond `bodies[i]` à l'appel `i` (statut 200, texte brut), compte les appels et lève si la liste est épuisée. Deps : `agent: agentWith([navigateTool()])`, `llm: new OllamaLLMProvider({ models: [{ id: "qwen2.5:0.5b", supportsTools: true }], fetch })`, `context: wideContext()`, `budget: { maxTokens: 10 }` ; `driveWithStep(deps, "amene-moi aux reglages")`. Trois corps dans l'ordre :

1. appel d'outil `navigate` `{ page: "reglages" }` avec les compteurs invalides de la ligne ;
2. appel d'outil `navigate` `{ page: "profil" }` avec `prompt_eval_count` 6 et `eval_count` 6 ;
3. texte `"je conclus ici"` sans appel d'outil, `prompt_eval_count` 1 et `eval_count` 1.

Lignes : compteur négatif (`5` et `-20`) ; somme `NaN` (`1e400` et `-1e400`). Attendu pour chacune : `stopReason` `"budget"`, `tokensUsed` `14`, `lastContent` `"je conclus ici"`, 3 appels du `fetch`. Avant SPEC-2 : `stopReason` `"completed"`, `tokensUsed` `-1` puis `NaN`.

## Estimation de taille

Hors `docs/` et `*.md`, lignes ajoutées et retirées :

| Fichier | Estimation |
|---|---|
| `src/llm/services/token-count.ts` (nouveau) | +7 |
| `src/llm/providers/gemini/gemini-wire.ts` (import, `toUsage`, TSDoc) | +9 −5 |
| `src/llm/providers/ollama/ollama-llm-provider.ts` (import, `toUsage`, TSDoc) | +11 −4 |
| `src/llm/models/index.ts` (TSDoc de `Usage`) | +2 −1 |
| `tests/llm/providers/gemini/gemini-wire.test.ts` | +30 |
| `tests/llm/providers/ollama/ollama-adapter.test.ts` | +45 |
| `tests/agent/application/use-cases/step.test.ts` | +65 −1 |
| **Total** | **environ 180** (fourchette 140 à 240) |

Sous le plafond de 400 ; aucune dérogation. La mesure (`pr_size.py`) fait foi à la PR.

## Hypothèses restantes

- **R-1 · Fournisseur tiers ou scripté** : `tokensOf` additionne toujours sans contrôle l'usage d'un `LLMProvider` écrit par un consommateur ou d'un `FakeLLMProvider` scripté ; un `NaN` ou un négatif y garde l'effet décrit par l'issue. Hors périmètre par l'attendu (D3) ; à rouvrir en issue si le pilote veut un budget qui refuse lui-même un usage invalide.
- **R-2 · Trois copies de la règle** (D2) : `token-count.ts` (#51), `with-metrics.ts` (#46), `cap-guard.ts` (#41), identiques mot pour mot et verrouillées chacune par ses tests ; un changement de la règle devra toucher les trois fichiers.
- **R-3 · Résumé de l'issue** : le corps de #51 est repris du résumé du pilote ; le rédacteur n'a pas pu exécuter `gh issue view 51` (aucun outil de commande dans sa passe). Le builder relit l'issue avant SPEC-1 et signale tout écart.
- **Node** ≥ 22.18 (retrait de types sans drapeau), constaté v22.19.0 par #20.
