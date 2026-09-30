# Spécification · Traduire le format Gemini `generateContent`, requête et réponse · #18

Date : 2026-09-30
Issue : https://github.com/arthurolivierfortin/agent-core/issues/18 (type feature, jalon H2 ; lot A du découpage de #3 : #18 format, #19 `GeminiLLMProvider`, #20 tarifs et runner)
Checklist : docs/specs/2026-09-30-gemini-wire-checklist.md
Branche : `feat/18-gemini-wire` (worktree `.claude/worktrees/feat+18-gemini-wire`, `main` 85771db)

## Objectif

Livrer la traduction pure, sans réseau, entre les types du port (`Message`, `ToolDefinition`, `LLMResponse`) et le format REST Gemini `generateContent` pour `gemini-2.5-flash`, pour que `GeminiLLMProvider` (#19) n'ait plus qu'à transporter.

## Source de l'issue (corps relevé le 2026-09-30)

1. `toGeminiRequest(messages, tools?)` : `system` concaténés dans `systemInstruction` ; `user` → rôle `user`, part texte ; `assistant` → rôle `model`, part texte si `content` n'est pas vide et une part `functionCall {name, args}` par toolCall ; `tool` → `functionResponse {name, response: {content}}`, `name` lu dans le dernier toolCall assistant de même id ; messages `tool` consécutifs fusionnés dans un seul contenu `user` ; `toolCallId` sans toolCall correspondant → `LLMError` `API_ERROR` avant tout appel réseau.
2. Outils : `tools = [{ functionDeclarations: [{ name, description, parameters }] }]`, `parameters` omis quand `properties` est vide, aucune clé `tools` sans outil.
3. `fromGeminiResponse(body)` : parts du premier candidat ; `content` = parts texte jointes ; `toolCalls` = parts `functionCall` en `{ id: functionCall.id ?? call_<i>, name, arguments: args ?? {} }` ; sans candidat ou sans content → `API_ERROR` qui cite `promptFeedback.blockReason` ou `finishReason`.
4. `usage` : `tokensIn = promptTokenCount`, `tokensOut = candidatesTokenCount + (thoughtsTokenCount ?? 0)` ; `usage` undefined si l'un des deux compteurs n'est pas un nombre.
5. Hypothèses non vérifiées, chacune écrite ici et verrouillée par un test sur le double : endpoint `v1beta` ; rôle `user` des `functionResponse` ; ids de `functionCall` facultatifs ; `thoughtsTokenCount` compté en sortie.

Contraintes : aucun appel réseau, aucun fournisseur hébergé dans les tests ; aucun `.env` lu ; Gemini 3 (signatures de pensée) hors portée ; gates build, typecheck, test ; PR sous 400 lignes hors `docs/` et `*.md`.

## État constaté dans le code (lecture du 2026-09-30, `main` 85771db)

- `src/llm/models/index.ts:15-19` : `Message` est une union discriminée ; seul `assistant` porte `toolCalls?: ToolCall[]`, seul `tool` porte `toolCallId: string`. `ToolCall` (l.22-26) = `{ id, name, arguments: Record<string, unknown> }`. `ToolDefinition` (l.32-36) = `{ name, description, parameters: ToolSchema }`. `Usage` (l.39-42), absent et non zéro quand le fournisseur n'en donne pas. `LLMResponse` (l.49-53) = `{ content, toolCalls, usage? }`. `LLMErrorCode` (l.80-85) est fermé ; `API_ERROR` existe ; `LLMError` (l.91-99) porte `name = "LLMError"` et `code`.
- `src/core/models/index.ts:33-37` : `ToolSchema = { type: "object"; properties: Record<string, JSONSchemaProperty>; required?: string[] }` ; `JSONSchemaProperty` (l.19-26) en types JSON Schema minuscules.
- `src/llm/providers/ollama/ollama-llm-provider.ts:24-40` : les types de fil Ollama vivent dans le dossier du fournisseur ; l.176-205 : `toRequestMessage`, `toRequestTool`, `toToolCalls` (id synthétisé `call_${i}`, l.194) et `toUsage` (usage `undefined` si un compteur n'est pas un nombre, l.200-205) sont des fonctions pures du même fichier.
- `docs/decisions/ADR-AGENT-0016-context-strategies-behind-one-port.md:132-136` : pas de couche `services/` partagée pour les fonctions d'une seule implémentation ; elles vivent à côté de la classe, « following the `src/llm/providers/ollama/ollama-llm-provider.ts` precedent ». `docs/conventions/architecture.md:48` : ce qui varie par fournisseur va dans `providers/<vendor>/`.
- `ROADMAP.md:133` et `:136` (carte cible héritée) nomment `services/response-parser.ts` et `gemini/gemini-adapter.ts` ; le code réel ne suit pas cette carte (`ollama-llm-provider.ts`, pas `ollama-adapter.ts`, et aucun `response-parser.ts`).
- `src/agent/testing/fake-app.ts:61-65` : l'outil `getCurrentPage` déclare `schema: { type: "object", properties: {} }`, le cas réel d'un outil sans paramètre ; `navigate` (l.35-43) déclare `page` requis.
- `src/tools/application/use-cases/to-tool-definition.ts:12-18` : `toToolDefinition(tool)` rend `{ name, description, parameters: tool.schema }`, servi par `.`.
- `src/llm/providers/index.ts:5-6` réexporte `OllamaLLMProvider` et `OllamaConfig` ; `ProviderID` (l.13) vaut `"ollama"`.
- `tests/llm/providers/ollama/ollama-adapter.test.ts:3` : les tests importent depuis `dist/` ; `package.json:36` : `npm run test` = `npm run build && node --test`.
- Aucune occurrence de `gemini` sous `src/` ni `tests/` : aucun conflit de nom.
- Manifeste (`CLAUDE.md`, bloc `core-project`) : `GATE-1 build` `npm run build`, `GATE-2 typecheck` `npm run typecheck`, `GATE-3 test` `npm run test` ; `derogations: []`.

## Périmètre

Dans la PR :

- Types de fil Gemini et URL `generateContent` (SPEC-1).
- `toGeminiRequest` : `system` et `user` (SPEC-2), `assistant` (SPEC-3), `tool` (SPEC-4), `toolCallId` orphelin (SPEC-5), outils (SPEC-6).
- `fromGeminiResponse` : nominal (SPEC-7), erreurs (SPEC-8), `usage` (SPEC-9).

Hors périmètre :

- `GeminiLLMProvider`, `fetch`, clé d'API, en-têtes, lecture de `process.env`, `ProviderID` et `PROVIDERS` : #19.
- Tarifs et runner plafonné : #20.
- Export depuis `./llm` ou `.` : `gemini-wire.ts` n'est réexporté par aucun barrel dans cette PR (la surface publique ne change pas ; #19 décide de ce qu'il expose).
- Streaming (`streamGenerateContent`), `generationConfig`, `thinkingConfig`, `toolConfig`, `safetySettings`.
- Parts de pensée (`thought: true`) et signatures de pensée (Gemini 3) : la requête ne demande jamais `includeThoughts`, ces parts ne sont pas attendues ; aucune règle n'est écrite pour elles.
- Parts autres que `text` et `functionCall` dans une réponse (`inlineData`, `executableCode`, …) : ignorées, sans test dédié.
- Mise à jour de `ROADMAP.md` (carte cible périmée) : signalée, non corrigée ici.

## Conception

### Placement

| Fichier | Contenu | Règle appliquée |
|---|---|---|
| `src/llm/providers/gemini/gemini-wire.ts` | types de fil, `GEMINI_DEFAULT_BASE_URL`, `geminiGenerateContentUrl`, `toGeminiRequest`, `fromGeminiResponse` et leurs fonctions auxiliaires non exportées | varie par fournisseur : `providers/<vendor>/` (`architecture.md:48`) ; fonctions d'une seule implémentation à côté de celle-ci, précédent Ollama (ADR-AGENT-0016 l.132-136) ; fichier séparé parce que la classe n'arrive qu'en #19, qui l'importera en `./gemini-wire.js` |
| `tests/llm/providers/gemini/gemini-wire.test.ts` | TEST-1 à TEST-9 | miroir du chemin source, comme `tests/llm/providers/ollama/` |

Imports de `gemini-wire.ts`, liste fermée : `import { LLMError } from "../../models/index.js"` et `import type { LLMResponse, Message, ToolCall, ToolDefinition, Usage } from "../../models/index.js"` (le builder retire un type inutilisé). Aucun import de `interfaces/`, de `./testing`, de `fs`, de `path` ; aucun `fetch`, aucun `process.env`.

Imports du test : `../../../../dist/llm/providers/gemini/gemini-wire.js` (fonctions et constante), `../../../../dist/index.js` (`toToolDefinition`), `../../../../dist/testing/index.js` (`fakeApp`).

### Types de fil (SPEC-1)

Exportés depuis le module (pour #19), non réexportés par un barrel :

```ts
export type GeminiFunctionCall = { id?: string; name: string; args?: Record<string, unknown> };
export type GeminiFunctionResponse = { name: string; response: { content: string } };
export type GeminiPart = { text?: string; functionCall?: GeminiFunctionCall; functionResponse?: GeminiFunctionResponse };
export type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };
export type GeminiFunctionDeclaration = { name: string; description: string; parameters?: ToolDefinition["parameters"] };
export type GeminiRequest = {
  contents: GeminiContent[];
  systemInstruction?: { parts: { text: string }[] };
  tools?: { functionDeclarations: GeminiFunctionDeclaration[] }[];
};
export type GeminiResponse = {
  candidates?: { content?: { role?: string; parts?: GeminiPart[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
};
```

Le commentaire d'en-tête du module (anglais, style du dépôt) liste les hypothèses H1 à H4 ci-dessous, chacune avec le titre du test qui la verrouille et le renvoi à cette spécification.

### Hypothèses de format non vérifiées (décision du pilote)

Aucune n'a été vérifiée contre l'API réelle. Chacune est verrouillée par un test sur le double, dont le titre commence par `hypothesis H<n>:`, pour qu'un démenti observé en #19 ou #20 désigne le test à changer.

| Id | Hypothèse | Conséquence dans le code | Verrou |
|---|---|---|---|
| H1 | L'endpoint est `POST {base}/v1beta/models/{model}:generateContent` (et non `v1`), `base` = `https://generativelanguage.googleapis.com`. | `geminiGenerateContentUrl` | TEST-1 |
| H2 | Les résultats d'outil (`functionResponse`) voyagent dans un contenu de rôle `user` (ni `function` ni `tool`). | `toGeminiRequest`, messages `tool` | TEST-4 |
| H3 | L'`id` d'un `functionCall` est facultatif en réponse pour `gemini-2.5-flash` ; absent, il est synthétisé `call_<i>`. Aucun `id` n'est renvoyé dans la requête (`functionCall` et `functionResponse` sans clé `id`) : la corrélation se fait par nom et par ordre. | `fromGeminiResponse`, `toGeminiRequest` | TEST-7 (réponse), TEST-3 et TEST-4 (requête, égalité stricte sans clé `id`) |
| H4 | `thoughtsTokenCount` n'est pas inclus dans `candidatesTokenCount` ; les jetons de pensée sont facturés en sortie et s'y ajoutent. | `usage.tokensOut` | TEST-9 |

### `geminiGenerateContentUrl` (SPEC-1)

```ts
export const GEMINI_DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com";
export function geminiGenerateContentUrl(model: string, baseURL: string = GEMINI_DEFAULT_BASE_URL): string;
```

Rend `baseURL + "/v1beta/models/" + model + ":generateContent"`. `model` et `baseURL` sont insérés tels quels : ni encodage, ni normalisation de barre finale (le modèle est déclaré par le consommateur, ADR-AGENT-0017 ; la configuration de `baseURL` appartient à #19).

### `toGeminiRequest` (SPEC-2 à SPEC-6)

```ts
export function toGeminiRequest(messages: Message[], tools?: ToolDefinition[]): GeminiRequest;
```

Synchrone et pure. Parcourt `messages` dans l'ordre :

- **`system`** (SPEC-2) : les `content` de tous les messages `system`, où qu'ils soient dans la liste, sont joints dans l'ordre par `"\n\n"` et placés dans `systemInstruction = { parts: [{ text: <joint> }] }`. Ils ne produisent aucun élément de `contents`. Sans message `system`, la requête n'a pas de clé `systemInstruction`.
- **`user`** (SPEC-2) : `{ role: "user", parts: [{ text: content }] }`, y compris quand `content` est vide.
- **`assistant`** (SPEC-3) : `{ role: "model", parts }` où `parts` = `[{ text: content }]` si `content !== ""`, suivi d'une part `{ functionCall: { name: tc.name, args: tc.arguments } }` par élément de `toolCalls`, dans l'ordre. Aucune clé `id` dans `functionCall` (H3). Un message `assistant` qui ne produit aucune part (`content` vide, `toolCalls` absent ou vide) est omis de `contents` (décision D2).
- **`tool`** (SPEC-4) : la part `{ functionResponse: { name, response: { content } } }`, sans clé `id` (H3). `name` est celui du toolCall d'`id === toolCallId` dans le message `assistant` le plus proche **avant** ce message `tool` qui en contient un (les ids synthétisés `call_0` se répètent d'un tour à l'autre : le plus récent gagne). Si le contenu précédemment ajouté à `contents` provient lui aussi d'un message `tool`, la part s'ajoute à ses `parts` ; sinon un nouveau contenu `{ role: "user", parts: [<part>] }` est ajouté (H2). Un message `user` qui suit des messages `tool` ouvre toujours un nouveau contenu.
- **`toolCallId` orphelin** (SPEC-5) : si aucun message `assistant` précédant le message `tool` ne porte de toolCall de cet id (y compris quand l'id n'existe que dans un `assistant` ultérieur), `toGeminiRequest` lève, de façon synchrone, `new LLMError("API_ERROR", …)` dont le message contient l'id, par exemple `Gemini request: tool message references toolCallId 'call_9' but no preceding assistant toolCall has that id`. #19 construit la requête avant `fetch` : l'erreur précède donc tout appel réseau.
- **Outils** (SPEC-6) : si `tools` est défini et non vide, `tools: [{ functionDeclarations }]`, une déclaration par `ToolDefinition` dans l'ordre : `{ name, description, parameters }`, où `parameters` est la valeur de `ToolDefinition.parameters` transmise telle quelle (décision D4), **clé omise** quand `Object.keys(parameters.properties).length === 0` (règle fixée par l'issue ; un objet sans propriétés est supposé refusé par Gemini, non vérifié ; cas réel : `getCurrentPage` de `fakeApp`). Si `tools` est `undefined` ou `[]`, la requête n'a pas de clé `tools`.

La requête ne porte aucune autre clé que `contents`, `systemInstruction` et `tools`.

### `fromGeminiResponse` (SPEC-7 à SPEC-9)

```ts
export function fromGeminiResponse(body: GeminiResponse): LLMResponse;
```

Synchrone et pure.

- **Erreurs** (SPEC-8), vérifiées d'abord :
  - `body.candidates` absent ou vide → `LLMError("API_ERROR", …)` dont le message contient `no candidate` et la valeur de `promptFeedback.blockReason` (ou `none` si elle est absente), par exemple `Gemini returned no candidate (promptFeedback.blockReason: SAFETY)`.
  - premier candidat sans `content`, ou `content.parts` qui n'est pas un tableau → `LLMError("API_ERROR", …)` dont le message contient `no content` et la valeur de `finishReason` (ou `none`), par exemple `Gemini candidate has no content (finishReason: MAX_TOKENS)`. Le cas `parts` absent est traité comme « sans content » (décision D3).
- **Nominal** (SPEC-7), sur `parts` du **premier** candidat seulement :
  - `content` = les `text` des parts où `typeof part.text === "string"`, joints par `""` (décision D5) ; `""` s'il n'y en a aucune.
  - `toolCalls` = pour chaque part portant `functionCall`, dans l'ordre, `{ id: functionCall.id ?? "call_" + i, name: functionCall.name, arguments: functionCall.args ?? {} }`, où `i` est le rang de la part parmi les parts `functionCall` à partir de 0, pas parmi toutes les parts (décision D6) ; `[]` s'il n'y en a aucune (signal d'arrêt, ADR-AGENT-0003).
- **Usage** (SPEC-9) : avec `m = body.usageMetadata`, si `typeof m?.promptTokenCount === "number"` et `typeof m?.candidatesTokenCount === "number"`, `usage = { tokensIn: m.promptTokenCount, tokensOut: m.candidatesTokenCount + (m.thoughtsTokenCount ?? 0) }` (H4) ; sinon `usage` vaut `undefined` (absent n'est pas zéro, ADR-AGENT-0007). `0` est un nombre : `{ promptTokenCount: 0, candidatesTokenCount: 0 }` donne `{ tokensIn: 0, tokensOut: 0 }`.

### Ordre des commits et preuve de rouge

Un SPEC = un commit = un test, dans l'ordre SPEC-1 à SPEC-9. TEST-1, TEST-2 et TEST-7 sont rouges avant leur SPEC (export absent). TEST-5 (aucune levée avant SPEC-5), TEST-6 (pas de clé `tools`), TEST-8 (`TypeError` au lieu d'`LLMError`) et TEST-9 (`usage` absent) sont rouges avant leur SPEC. Si le builder, pour satisfaire le typage, écrit en SPEC-2 un traitement provisoire d'`assistant` ou de `tool` qui fait passer TEST-3 ou TEST-4 dès leur écriture, il prouve leur non-vacuité par une mutation locale non commitée décrite dans le corps du commit (précédent #11).

Gabarit des messages de commit (aucun `Co-Authored-By`) :

```
feat(llm): <sujet>

Refs: #18
Session: <id>
Model: <modèle>
Authorship: ai
```

Sujets, à l'impératif : SPEC-1 « poser les types du format Gemini et l'URL generateContent v1beta » ; SPEC-2 « traduire les messages system et user vers Gemini » ; SPEC-3 « traduire les messages assistant en contenus model avec functionCall » ; SPEC-4 « traduire les résultats d'outil en functionResponse de rôle user » ; SPEC-5 « refuser un toolCallId sans appel d'outil qui le précède » ; SPEC-6 « déclarer les outils en functionDeclarations Gemini » ; SPEC-7 « lire le texte et les appels d'outil d'une réponse Gemini » ; SPEC-8 « refuser une réponse Gemini sans candidat ou sans contenu » ; SPEC-9 « compter les jetons d'une réponse Gemini, pensée comprise ».

## Chemins nominal et d'erreur

| Élément | Nominal | Erreur |
|---|---|---|
| `geminiGenerateContentUrl` | URL `v1beta` | aucun (concaténation) |
| `toGeminiRequest`, `system`/`user`/`assistant` | contenus traduits | aucun |
| `toGeminiRequest`, `tool` | `functionResponse` nommé (SPEC-4) | `toolCallId` orphelin → `API_ERROR` synchrone (SPEC-5) |
| `toGeminiRequest`, outils | `functionDeclarations` | aucun ; `properties` vide → `parameters` omis |
| `fromGeminiResponse` | `content`, `toolCalls` (SPEC-7) | sans candidat, sans content, sans parts → `API_ERROR` (SPEC-8) |
| `usage` | deux compteurs numériques → `Usage` | un compteur absent → `undefined`, pas d'erreur (SPEC-9) |

## Symétrie

- Écriture face à lecture : `functionCall` écrit dans la requête (SPEC-3) et lu dans la réponse (SPEC-7), même forme `{ name, args }`, `id` jamais écrit mais lu s'il est présent (H3) ; le `name` d'un `functionResponse` (SPEC-4) est relu depuis les `toolCalls` qu'a produits `fromGeminiResponse` ou le moteur.
- Nominal face à erreur : SPEC-4 a SPEC-5 ; SPEC-7 a SPEC-8 ; SPEC-9 a son cas `undefined` dans le même test.
- Présence face à absence : `systemInstruction`, `tools`, `parameters` et `usage` sont absents (clé omise ou `undefined`), jamais vides ou à zéro, quand la donnée manque ; chaque absence est testée.
- Énumérations : `LLMErrorCode` n'est pas modifié (seul `API_ERROR` est utilisé) ; les quatre valeurs de `Role` ont chacune leur traduction (SPEC-2, SPEC-3, SPEC-4). Aucune base de données.

## Données touchées

Aucune base, aucun fichier lu ou écrit à l'exécution, aucune variable d'environnement, aucun réseau. Les entrées ne sont pas modifiées (les tableaux et objets rendus sont neufs, sauf `parameters` et `arguments`/`args`, transmis par référence).

## Décisions et alternatives écartées

- **D1 · Placement `src/llm/providers/gemini/gemini-wire.ts`.** Écarté : `src/llm/services/` (règle 3 de `architecture.md` lue littéralement, et `ROADMAP.md:133` `services/response-parser.ts`), parce qu'ADR-AGENT-0016 l.132-136 a déjà tranché que les fonctions d'une seule implémentation vivent à côté d'elle, et que le code réel d'Ollama suit cette règle. Écarté : un seul fichier `gemini-llm-provider.ts` dès maintenant, parce que la classe est #19 ; le fichier séparé garde le diff de #19 lisible.
- **D2 · `assistant` sans part omis.** Un `parts: []` ou une part `{ text: "" }` risquerait un refus de l'API (non vérifié) ; l'omission ne perd aucune information. Écarté : lever une erreur (un tour vide de l'assistant est légitime dans l'historique).
- **D3 · `content.parts` absent traité comme « sans content ».** Sans cette règle, lire `parts` lèverait un `TypeError` au lieu d'un `LLMError` ; ce cas est plausible quand la pensée consomme tout le budget (`finishReason: MAX_TOKENS`), non vérifié. `parts: []` reste une réponse vide valide (`content: ""`, `toolCalls: []`).
- **D4 · `parameters` transmis tel quel.** `ToolSchema` n'emploie que le sous-ensemble JSON Schema (types minuscules, `enum`, `items`, `properties`, `required`) que les exemples de déclaration de fonction Gemini emploient ; aucune conversion vers les types majuscules OpenAPI. Non vérifié ; un refus observé en #19 sera un SPEC à part.
- **D5 · Parts texte jointes par `""`.** Gemini peut découper un même texte en plusieurs parts ; tout séparateur ajouterait des caractères absents de la réponse.
- **D6 · `i` = rang parmi les parts `functionCall`.** Mêmes ids que le précédent Ollama (`call_0` pour le premier appel), indépendants des parts texte intercalées.
- **D7 · `system` joints par `"\n\n"`.** Sépare deux consignes sans les fusionner en une phrase. Écarté : une part par message système (forme non vérifiée pour `systemInstruction`).
- **D8 · Aucun `id` renvoyé dans la requête (H3).** Renvoyer un `call_<i>` synthétisé présenterait à l'API un id qu'elle n'a pas émis. Contrepartie acceptée : si l'API exige un jour l'écho de l'id (Gemini 3), ce sera un SPEC à part.
- **Pas de nouvel ADR** : la traduction est locale au fournisseur et réversible ; ADR-AGENT-0003, 0007, 0016 et 0017 sont appliqués tels quels.

## Tests

Tous dans `tests/llm/providers/gemini/gemini-wire.test.ts`, déterministes, sans réseau ni fournisseur hébergé : les corps de réponse sont des littéraux écrits dans le test (le double), les outils viennent de `fakeApp` via `toToolDefinition`. Le modèle cité dans les fixtures est `gemini-2.5-flash`. Une erreur attendue est vérifiée par `name === "LLMError"`, `code === "API_ERROR"` et une expression régulière sur le message, comme `tests/llm/providers/ollama/ollama-adapter.test.ts:55-60`. Titres des cas verrouillant H1 à H4 préfixés `hypothesis H<n>:`. Dans la checklist, `user "go"` abrège `{ role: "user", content: "go" }` ; « égal strictement » signifie `assert.deepStrictEqual` (une clé présente à `undefined` n'égale pas une clé absente).

## Estimation de taille

Hors `docs/` et `*.md` : `gemini-wire.ts` environ 150 à 190 lignes (types 35, commentaire d'en-tête et commentaires de conception 35, URL 8, `toGeminiRequest` et recherche du nom 60, outils 12, `fromGeminiResponse` et usage 40) ; `gemini-wire.test.ts` environ 160 à 200 lignes (neuf cas, fixtures comprises). Total estimé : environ 340 lignes, fourchette 310 à 390, sous le plafond de 400 mais au-dessus de l'estimation de l'issue (environ 270). La mesure fait foi à la PR. Repli prêt si la mesure dépasse 400 : deux PR, requête (SPEC-1 à SPEC-6) puis réponse (SPEC-7 à SPEC-9), sans renumérotation.

## Hypothèses restantes

- H1 à H4 et D2, D3, D4 sont des hypothèses de format non vérifiées contre l'API réelle ; la première vérification possible est le premier appel réel de #19 ou #20.
- Deux contenus `user` consécutifs (résultats d'outil puis message `user`) sont supposés acceptés par l'API ; non vérifié, non testé.
