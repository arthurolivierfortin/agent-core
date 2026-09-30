# Spécification · Brancher Gemini dans PROVIDERS et les exports, préparer l'intégration et documenter · #26

Date : 2026-09-30
Issue : https://github.com/arthurolivierfortin/agent-core/issues/26 (type feature, jalon H2 ; lot B3 du découpage de #19 : #19 fournisseur nominal, #25 erreurs de transport et clé masquée, #26 registre, exports, intégration et documentation ; dépend de #25, livré en 7533edf)
Checklist : docs/specs/2026-09-30-gemini-wiring-checklist.md
Branche : `feat/26-gemini-wiring` (worktree `.claude/worktrees/feat+26-gemini-wiring`, `main` 7533edf)

## Objectif

Rendre `GeminiLLMProvider` atteignable par le registre `PROVIDERS` et par les points d'entrée `./llm` et `.`, fournir un test d'intégration réel que seul Arthur lance, et documenter le fournisseur, sans qu'aucune valeur de clé n'apparaisse nulle part.

## Source de l'issue (corps relevé le 2026-09-30) et ajouts du pilote

Corps de l'issue :

1. Registre : `ProviderID = ollama | gemini`, `DEFAULT_GEMINI_MODEL` (`gemini-2.5-flash`), `makeGemini` qui lit `GEMINI_MODEL` à l'appel, `PROVIDERS.gemini`.
2. Exports : `GeminiLLMProvider` et `GeminiConfig` servis par `./llm` et `.` ; `toGeminiRequest`, `fromGeminiResponse` et `geminiGenerateContentUrl` (#18) servis par aucun barrel ; verrou dans `tests/barrel-contract.test.ts`.
3. Test d'intégration `tests/integration/gemini.integration.test.ts` derrière `GEMINI_INTEGRATION=1`, ignoré par défaut ; son lancement est un geste d'Arthur, jamais de la boucle ; commande exacte (PowerShell et bash) documentée ; il exerce `checkProviderContract` sur l'API réelle.
4. Documentation : section Gemini dans `README.md` et `docs/guide-agent-package.md` (anglais, dérogation `core/langue`) : variable de clé et `apiKeyVar`, modèles déclarés, pas de streaming, `baseURL` = racine de l'hôte (ne pas passer `/v1beta`), hypothèses de format ; corriger `README.md:369` et les lignes de surface de `./llm` et `.`.

Contraintes de l'issue : aucun appel hébergé dans la suite par défaut ; le package ne lit que `process.env` ; gates build, typecheck, test ; PR sous 400 lignes hors `docs/` et `*.md`, sans dérogation.

Ajouts du pilote (2026-09-30) :

- A1 · Les deux mineures de la revue de #25, **en tests seulement** (aucun code de production) : ajouter à `REDACTION_CASES` les cas de masquage non verrouillés (`error.status` d'un corps d'erreur, texte d'un corps 200 JSON non objet, URL via `baseURL`) ; ajouter un test qui fixe le libellé exact produit quand `error.message` est vide.
- A2 · Le test d'intégration n'est **jamais** lancé par la boucle. La spécification donne le texte exact de la commande (PowerShell et bash), avec `GEMINI_INTEGRATION=1` et la clé exposée par Arthur dans son environnement (jamais écrite dans un fichier ni dans la commande), et dit ce que le test vérifie.
- A3 · La valeur de la clé n'apparaît jamais dans un message, un log, une erreur, un test ni la documentation.

Contraintes du pilote : aucun appel réseau dans la suite par défaut ; aucun `console.log` ; aucun `.env` lu ; `.env.example` non modifié (issue #27) ; gabarits de commit sans `Co-Authored-By`, sujets à l'impératif ; le bloc « Message de squash proposé » de la PR a un corps ; chemins relatifs au dépôt dans toute preuve.

## État constaté dans le code (lecture du 2026-09-30, `main` 7533edf)

- `src/llm/providers/index.ts:5-6` : n'exporte que `OllamaLLMProvider` et `OllamaConfig` ; l.13 `export type ProviderID = "ollama"` ; l.16 `DEFAULT_OLLAMA_MODEL = "qwen2.5:0.5b"` ; l.25-28 `makeOllama()` lit `process.env.OLLAMA_MODEL ?? DEFAULT_OLLAMA_MODEL` et rend `new OllamaLLMProvider({ models: [{ id: model, supportsTools: true }] })` ; l.34-36 `PROVIDERS: Record<ProviderID, () => LLMProvider> = { ollama: makeOllama }` ; l.39-50 `isProviderID` par `Object.hasOwn(PROVIDERS, id)` et `resolveProvider`, qui lève `UNKNOWN_PROVIDER`.
- `src/llm/index.ts:4` réexporte `./providers/index.js` ; `src/index.ts:7` réexporte `./llm/index.js`. Un export ajouté à `src/llm/providers/index.ts` est donc servi par `./llm` et par `.` sans toucher aux deux autres barrels.
- `src/llm/providers/gemini/gemini-llm-provider.ts:6` : « The registry and the barrel exports belong to #26, so no barrel serves this module yet. » ; l.28-29 : `DEFAULT_API_KEY_VAR = "GEMINI_API_KEY"`, « Not exported: the public surface is #26's. » ; l.33-45 `export type GeminiConfig = { models; baseURL?; apiKeyVar?; fetch? }` ; l.47-48 `export class GeminiLLMProvider`, `id = "gemini"` ; l.55-62 constructeur sans lecture d'environnement, `fetch.bind(globalThis)` capturé **à la construction** ; l.69-71 `supportsStreaming()` rend `false` ; l.77-84 clé lue à chaque `complete()`, `MISSING_API_KEY` avant tout `fetch`.
- `src/llm/providers/gemini/gemini-llm-provider.ts:139` : `const extract = detail === "" ? "(empty body)" : excerpt(redactKey(detail, apiKey));` avec `detail = gemini?.message ?? text` (l.138). Un corps `{"error":{"message":""}}` produit donc le libellé `(empty body)` alors que le corps n'est pas vide (voir R1).
- `src/llm/providers/gemini/gemini-llm-provider.ts:97` (URL d'un `fetch` rejeté), l.110-111 (corps 200 JSON non objet), l.140 (`error.status`), l.141 (`safeUrl` des messages de `httpError`) : quatre chemins de masquage que `REDACTION_CASES` (`tests/llm/providers/gemini/gemini-llm-provider.test.ts:408-457`, sept cas) n'exerce pas avec la clé plantée.
- `src/llm/providers/gemini/gemini-wire.ts:46` `GEMINI_DEFAULT_BASE_URL`, l.53 `geminiGenerateContentUrl`, l.63 `toGeminiRequest`, `fromGeminiResponse` : exportés du module, servis par aucun barrel (en-tête l.3).
- `tests/llm/providers/gemini/gemini-llm-provider.test.ts:286-300` : `expectFailure(fetchFn, code, message, key = "cle-factice-1")` construit `new GeminiLLMProvider({ models: DECLARED, apiKeyVar: KEY_VAR, fetch: fetchFn })`, sans `baseURL` ; l.406 `PLANTED_KEY = "cle-factice-ne-pas-afficher"` ; l.459-466 boucle qui génère un `test()` par cas.
- `tests/llm/providers/registry.test.ts` : quatre tests sur `PROVIDERS.ollama` et `resolveProvider`, importés de `dist/llm/index.js`, sauvegarde et restauration manuelles de `process.env.OLLAMA_MODEL`.
- `tests/barrel-contract.test.ts:32` : liste des valeurs de `.` ; l.37-41 : valeurs de `./llm` ; l.84-88 : les types sont verrouillés par annotation sous `npm run typecheck` (`tsconfig.json:13` inclut `tests`).
- `tests/integration/ollama.integration.test.ts` : modèle à suivre, `OPT_IN = process.env.OLLAMA_INTEGRATION === "1"`, `skip: OPT_IN ? false : "<raison>"`, `checkProviderContract(provider)` puis `assert.ok(report.ok, JSON.stringify(report.checks, null, 2))`.
- `src/llm/testing/provider-contract.ts:134-145` : le contrôle « refuses a model the provider does not declare » est local (garde `assertDeclared`, aucun réseau) ; l.151-171 : un seul appel réel `complete([{ role: "user", content: "ping" }], { model })` et des contrôles de forme ; l.180 : aucun contrôle de flux quand `supportsStreaming()` est faux.
- `scripts/repo-conventions.test.mjs` : tests de documentation (`sectionAfterHeading`, précédent « TEST-8 (issue 9) » l.156-172 : contenu de sections, absence de tiret cadratin) ; l.67-69 verrouille `.env.example` ligne à ligne.
- `package.json:36` : `npm run test` = `npm run build && node --test` ; `node --test` sans argument découvre `tests/**/*.test.ts` et `scripts/*.test.mjs`. `docs/guide-agent-package.md:266` : précédent de commande `node --test <fichier>.ts` sur un seul fichier. `.github/workflows/publish.yml:52` : Node 22.
- `README.md:101` (ligne `./llm` du tableau), l.112 (puce « Engine » de `.`), l.279 (introduction de `./llm`), l.317-331 (« The provider registry »), l.346-361 (« Setting up Ollama »), l.369 (« The variables the LLM layer reads today are **`OLLAMA_HOST`** … and **`OLLAMA_MODEL`** … ») : aucune mention de Gemini.
- `docs/guide-agent-package.md:78-80` : arborescence de `providers/` sans `gemini/` ; l.236-266 : « ## Testing conventions », dernière sous-section « ### Evaluation matrix: runMatrix, report, replay », suivie de « ## Branch and commit conventions » (l.268).
- Manifeste (`CLAUDE.md`, bloc `core-project`) : `GATE-1 build` `npm run build`, `GATE-2 typecheck` `npm run typecheck`, `GATE-3 test` `npm run test` ; dérogation `core/langue` (README et guide en anglais).

## Périmètre

Dans la PR :

- Registre : `ProviderID`, `DEFAULT_GEMINI_MODEL`, `makeGemini`, `PROVIDERS.gemini` (SPEC-1).
- Exports de `GeminiLLMProvider` et `GeminiConfig` par `./llm` et `.`, rien de `gemini-wire.ts` ; en-tête du module Gemini remis à jour, commentaires seulement (SPEC-2).
- Test d'intégration derrière `GEMINI_INTEGRATION=1` (SPEC-3).
- `README.md` (SPEC-4) et `docs/guide-agent-package.md` (SPEC-5).
- Mineures de #25, tests seulement : quatre cas de masquage (SPEC-6) et le libellé d'un `error.message` vide (SPEC-7).

Hors périmètre :

- Tout changement de comportement de `gemini-llm-provider.ts` et `gemini-wire.ts` (seuls deux commentaires changent, SPEC-2). En particulier, le libellé `(empty body)` d'un `error.message` vide est **fixé tel quel**, non corrigé (R1).
- `.env.example` (issue #27) : non modifié ; `scripts/repo-conventions.test.mjs:67-69` le verrouille déjà ligne à ligne.
- `ROADMAP.md`, `LLMErrorCode`, `checkProviderContract`, `src/llm/index.ts`, `src/index.ts` : non modifiés.
- Variable d'environnement de `baseURL` pour Gemini (pas de `GEMINI_BASE_URL`, D3) ; export de `DEFAULT_API_KEY_VAR` (D4).
- Vérification de H2, H3, H4 (premier rapport réel, #20) ; H7 et H8 (aucun chemin d'erreur réel n'est provoqué).
- Le cas d'un corps d'erreur **sans** `error.message` (le texte JSON brut devient l'extrait) : non demandé par la revue, non verrouillé ici.
- Lancement du test d'intégration : jamais par la boucle (A2).

## Conception

### SPEC-1 · Registre (`src/llm/providers/index.ts`)

```ts
import { GeminiLLMProvider } from "./gemini/gemini-llm-provider.js";

export type ProviderID = "ollama" | "gemini";

/** The model `PROVIDERS.gemini()` declares when the environment names none. */
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

function makeGemini(): LLMProvider {
  const model = process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
  return new GeminiLLMProvider({ models: [{ id: model, supportsTools: true }] });
}

export const PROVIDERS: Record<ProviderID, () => LLMProvider> = {
  ollama: makeOllama,
  gemini: makeGemini,
};
```

- `makeGemini` a un JSDoc anglais sur le modèle de `makeOllama` : fonction et non instance au chargement, pour lire `process.env` à l'appel (ADR-AGENT-0002) ; un seul modèle déclaré, le raccourci piloté par l'environnement ; plusieurs modèles passent par `new GeminiLLMProvider({ models: [...] })` (ADR-AGENT-0017) ; la clé n'est pas lue ici mais à chaque `complete()`, dans la variable par défaut `GEMINI_API_KEY`.
- `makeGemini` ne passe ni `baseURL`, ni `apiKeyVar`, ni `fetch` : les valeurs par défaut du constructeur s'appliquent.
- L'ordre des clés de `PROVIDERS` est `ollama` puis `gemini` ; `resolveProvider` et `isProviderID` sont inchangés.
- À ce commit, `providers/index.ts` **importe** `GeminiLLMProvider` sans le réexporter ; `DEFAULT_GEMINI_MODEL` est exporté (valeur du registre, comme `DEFAULT_OLLAMA_MODEL`).

### SPEC-2 · Exports (`src/llm/providers/index.ts`) et en-tête du module

Ajouter, sous les deux lignes d'export d'Ollama :

```ts
export { GeminiLLMProvider } from "./gemini/gemini-llm-provider.js";
export type { GeminiConfig } from "./gemini/gemini-llm-provider.js";
```

Aucun `export *` depuis `gemini/` : `gemini-wire.ts` (`toGeminiRequest`, `fromGeminiResponse`, `geminiGenerateContentUrl`, `GEMINI_DEFAULT_BASE_URL`, types `Gemini*`) reste servi par aucun barrel (D2).

Commentaires de `src/llm/providers/gemini/gemini-llm-provider.ts`, seuls changements du fichier, pour qu'ils ne disent plus le faux :

- l.6 remplacée par : `// Served by ./llm and . through src/llm/providers/index.ts, which re-exports GeminiLLMProvider and GeminiConfig only.`
- l.28 remplacée par : `/** The variable read when the configuration names none. Not exported: GeminiConfig.apiKeyVar documents it. */`

Aucune ligne de code exécutable de ce fichier ne change ; `git diff` du fichier ne touche que ces deux lignes de commentaire.

### SPEC-3 · Test d'intégration (`tests/integration/gemini.integration.test.ts`)

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { PROVIDERS } from "../../dist/llm/index.js";
import { checkProviderContract } from "../../dist/testing/index.js";

// Opt-in only: it calls the hosted Gemini API, so the default suite skips it. Launching it is a
// manual step of a person, never of a test suite or an agent loop. The provider reads the key from
// GEMINI_API_KEY at call time; this file never reads, prints nor stores it.
const OPT_IN = process.env.GEMINI_INTEGRATION === "1";

test(
  "GeminiLLMProvider conforms to the port against the live Gemini API",
  { skip: OPT_IN ? false : "set GEMINI_INTEGRATION=1 with GEMINI_API_KEY in the environment" },
  async () => {
    // Declares GEMINI_MODEL, else DEFAULT_GEMINI_MODEL; supportsStreaming() is false, so no stream check runs.
    const provider = PROVIDERS.gemini();
    const report = await checkProviderContract(provider);
    assert.ok(report.ok, JSON.stringify(report.checks, null, 2));
  },
);
```

- Le texte de la raison de `skip` est exactement `set GEMINI_INTEGRATION=1 with GEMINI_API_KEY in the environment` (TEST-3 le cherche).
- Aucun `console.*`, aucun `readFileSync`, aucun `dotenv`, aucune lecture de `GEMINI_API_KEY` dans ce fichier.
- Avec `GEMINI_INTEGRATION=1` et une clé absente, le test échoue (et non est ignoré) : le contrôle « complete() resolves » rapporte `MISSING_API_KEY`, message qui nomme `GEMINI_API_KEY` sans valeur. Choix assumé (D5).
- Le message d'échec de l'assertion est `JSON.stringify(report.checks)` : chaque `detail` est le message d'une `LLMError` du fournisseur, déjà masqué par #25 ; la clé n'y entre pas.

### SPEC-4 · `README.md` (anglais, dérogation `core/langue`)

Liste fermée des changements :

1. l.101, ligne `| \`./llm\` |` du tableau : « `OllamaLLMProvider` » devient « `OllamaLLMProvider`, `GeminiLLMProvider` ».
2. l.112, puce « - **Engine**: » : ajouter `GeminiLLMProvider` avec sa configuration `GeminiConfig`, et `DEFAULT_GEMINI_MODEL` à côté de `DEFAULT_OLLAMA_MODEL`.
3. l.279, introduction de « ## Using the LLM layer (`./llm`) » : nommer `GeminiLLMProvider` à côté de `OllamaLLMProvider`.
4. « ### The provider registry » (l.317-331) : ajouter dans le bloc de code la ligne `const c = PROVIDERS.gemini(); // declares the single model named by GEMINI_MODEL`, et après le paragraphe de `PROVIDERS.ollama()` un paragraphe : `PROVIDERS.gemini()` déclare un modèle, `process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL` (`gemini-2.5-flash`), lu à l'appel, avec `supportsTools: true` ; la clé n'est lue qu'à chaque `complete()`.
5. Nouvelle section `## Setting up Gemini`, placée entre la fin de « ## Setting up Ollama » (après sa ligne 361 et le séparateur `---`) et `## Configuration`, précédée et suivie d'un `---` comme ses voisines. Contenu obligatoire, chaque élément cité mot pour mot là où il est entre guillemets :
   - la clé : variable `GEMINI_API_KEY` par défaut, `apiKeyVar` pour nommer une autre variable (le **nom**, jamais la valeur), lue à chaque appel à `complete()` et gardée dans aucun champ ; clé absente ou vide → `LLMError("MISSING_API_KEY")` qui nomme la variable ; toute occurrence de la clé dans un message d'erreur est remplacée par `[redacted]` ;
   - les modèles déclarés, jamais découverts : `models` du constructeur, `GEMINI_MODEL` pour `PROVIDERS.gemini()`, défaut `gemini-2.5-flash` ; modèle non déclaré → `MODEL_NOT_FOUND` avant toute requête ;
   - pas de streaming : `supportsStreaming()` rend `false` et l'instance n'a pas de membre `stream` ;
   - `baseURL` : racine de l'hôte, défaut `https://generativelanguage.googleapis.com`, sans version ni barre finale ; la phrase « Do not pass `/v1beta`: the provider appends it. » ; un 404 qui ne vient pas de Gemini se signale par « check baseURL » ;
   - un tableau des variables : `GEMINI_API_KEY` (aucun défaut, lue par `GeminiLLMProvider.complete()` sauf `apiKeyVar`), `GEMINI_MODEL` (`gemini-2.5-flash`, lue par `PROVIDERS.gemini()` / `resolveProvider("gemini")`) ;
   - les hypothèses de format, non vérifiées contre l'API réelle, une ligne chacune, étiquetées `H1` à `H8` : H1 `generateContent` servi sous `v1beta` ; H2 résultats d'outil dans un contenu de rôle `user` ; H3 `id` de `functionCall` optionnel, synthétisé `call_<i>` ; H4 `thoughtsTokenCount` compté en sortie ; H5 clé dans l'en-tête `x-goog-api-key` ; H6 les en-têtes `content-type` et `x-goog-api-key` suffisent ; H7 modèle inconnu → 404 `NOT_FOUND` ; H8 corps d'erreur `{ error: { code, message, status } }` ; chacune verrouillée par un test sur un double dans `tests/llm/providers/gemini/` ;
   - une sous-section `### Running the integration test` : la phrase « Launching it is a manual step: no test suite and no agent loop runs it. », les prérequis (clé exposée dans l'environnement du shell, voir « Commande de lancement » ci-dessous), les deux commandes exactes, ce que le test vérifie (voir « Ce que vérifie le test d'intégration ») avec le renvoi `#20` pour H2 à H4.
6. l.369, « ## Configuration » : la phrase « The variables the LLM layer reads today are **`OLLAMA_HOST`** (default `http://localhost:11434`) and **`OLLAMA_MODEL`** (default `qwen2.5:0.5b`). See [Setting up Ollama](#setting-up-ollama). » est remplacée par : « The variables the LLM layer reads are **`OLLAMA_HOST`** (default `http://localhost:11434`), **`OLLAMA_MODEL`** (default `qwen2.5:0.5b`), **`GEMINI_API_KEY`** (no default; `GeminiLLMProvider` reads it at every `complete()` call, or the variable its `apiKeyVar` names) and **`GEMINI_MODEL`** (default `gemini-2.5-flash`). See [Setting up Ollama](#setting-up-ollama) and [Setting up Gemini](#setting-up-gemini). »

Aucun tiret cadratin dans la section « ## Setting up Gemini » (précédent de TEST-8 de #9). Aucune chaîne en forme de clé Google (`AIza` suivi de 35 caractères) dans le fichier.

### SPEC-5 · `docs/guide-agent-package.md` (anglais, dérogation `core/langue`)

1. Arborescence (l.78-80) : sous `providers/`, après la ligne d'Ollama, ajouter deux lignes alignées sur les colonnes existantes : `gemini/gemini-llm-provider.ts    GeminiLLMProvider, a CLASS (real I/O)` et `gemini/gemini-wire.ts            pure generateContent translation, served by no barrel`.
2. Nouvelle sous-section `### Gemini provider and its integration test`, dernière de « ## Testing conventions » (après « ### Evaluation matrix: runMatrix, report, replay », avant « ## Branch and commit conventions »). Contenu obligatoire, identique en substance au point 5 de SPEC-4 : `GEMINI_API_KEY` et `apiKeyVar`, `[redacted]`, modèles déclarés et `GEMINI_MODEL` / `gemini-2.5-flash`, `supportsStreaming()` faux, `baseURL` racine de l'hôte avec la phrase « Do not pass `/v1beta`: the provider appends it. » et `https://generativelanguage.googleapis.com`, hypothèses `H1` à `H8` avec leur test verrou sur un double, la phrase « Launching it is a manual step: no test suite and no agent loop runs it. », `GEMINI_INTEGRATION=1`, le chemin `tests/integration/gemini.integration.test.ts`, `checkProviderContract`, les deux commandes exactes, le renvoi `#20`.

Aucun tiret cadratin dans la sous-section ; aucune chaîne en forme de clé Google dans le fichier.

### Commande de lancement (texte exact, documenté par SPEC-4 et SPEC-5)

Depuis la racine du dépôt. **Prérequis** : `GEMINI_API_KEY` est déjà présente dans l'environnement du shell, posée par Arthur hors de toute commande et de tout fichier, par exemple par une variable d'environnement utilisateur, ou par une saisie masquée dont la valeur ne s'inscrit ni dans la ligne de commande ni dans l'historique :

- PowerShell 7.1 ou plus : `$env:GEMINI_API_KEY = Read-Host -MaskInput "GEMINI_API_KEY"`
- bash : `read -rs GEMINI_API_KEY && export GEMINI_API_KEY`

Commande, PowerShell (5.1 et 7) :

```
npm run build; if ($LASTEXITCODE -eq 0) { $env:GEMINI_INTEGRATION = "1"; node --test tests/integration/gemini.integration.test.ts; Remove-Item Env:GEMINI_INTEGRATION }
```

Commande, bash :

```
npm run build && GEMINI_INTEGRATION=1 node --test tests/integration/gemini.integration.test.ts
```

`GEMINI_MODEL` peut précéder la commande pour viser un autre modèle déclaré ; sans elle, `gemini-2.5-flash`. Succès : code de sortie 0, un test passé, aucun ignoré. Échec : l'assertion liste `report.checks`, dont chaque `detail` est un message masqué. Après usage, `Remove-Item Env:GEMINI_API_KEY` (PowerShell) ou `unset GEMINI_API_KEY` (bash) retire la clé du shell.

### Ce que vérifie le test d'intégration

Un seul appel réel à `generateContent` (prompt `ping`, sans outil), puis des contrôles de forme de `checkProviderContract` : `id`, `models()`, `supportsStreaming()` booléen, refus local d'un modèle non déclaré (aucun réseau), `complete()` résout, `content` chaîne, `toolCalls` tableau, `usage` de forme `{ tokensIn, tokensOut }` s'il est présent ; aucun contrôle de flux.

- Hypothèse visée : **H1** (`v1beta`). Un succès corrobore aussi, par construction, **H5** (clé acceptée dans `x-goog-api-key`) et **H6** (ces deux en-têtes suffisent), puisque la requête réelle ne porte qu'eux ; la documentation le dit sans en faire un objectif.
- Non vérifiées : **H2, H3, H4** (aucun outil, aucun résultat d'outil, `thoughtsTokenCount` non contrôlé), qui attendent le premier rapport réel (#20) ; **H7, H8** (aucun chemin d'erreur réel provoqué).

### Règle de la boucle (A2)

- Aucun agent (builder, judge ou autre) ne lance le test avec `GEMINI_INTEGRATION=1`, ni `npm run test` dans un environnement où `GEMINI_INTEGRATION` vaut `1`. Avant GATE-3, le builder vérifie que `GEMINI_INTEGRATION` est absente de son environnement (PowerShell `$env:GEMINI_INTEGRATION`, vide attendu) ; si elle est posée, il rend `blocked` sans lancer la suite.
- La suite par défaut ignore le test (raison de `skip`), ce que TEST-3 prouve dans un sous-processus dont l'environnement est expurgé de `GEMINI_INTEGRATION` et `GEMINI_API_KEY`.

### SPEC-6 · Quatre cas de masquage (tests seulement)

Dans `tests/llm/providers/gemini/gemini-llm-provider.test.ts` :

- `expectFailure` reçoit un cinquième paramètre optionnel `baseURL?: string`, transmis tel quel au constructeur (`new GeminiLLMProvider({ models: DECLARED, apiKeyVar: KEY_VAR, fetch: fetchFn, baseURL })`) ; `undefined` laisse le défaut (`config.baseURL ?? GEMINI_DEFAULT_BASE_URL`, l.58).
- Le type des éléments de `REDACTION_CASES` gagne `baseURL?: string` ; la boucle l.459-466 le passe à `expectFailure`.
- Quatre cas ajoutés à la fin de `REDACTION_CASES` (K = `PLANTED_KEY`), code et message exacts :

| Titre | Double | `baseURL` | Code | Message exact |
|---|---|---|---|---|
| `an error.status of an error body` | `respondingFetch(400, JSON.stringify({ error: { code: 400, message: "Bad request.", status: PLANTED_KEY } }))` | aucun | `API_ERROR` | `Gemini 400 [redacted] from ${ENDPOINT}: Bad request.` |
| `an ok body that is a JSON string` | `respondingFetch(200, JSON.stringify(PLANTED_KEY))` | aucun | `API_ERROR` | `Gemini 200 response is not a JSON object: "[redacted]"` |
| `the URL of a rejected fetch, through baseURL` | `rejectingFetch(new TypeError("fetch failed"))` | `` `http://${PLANTED_KEY}.invalid` `` | `API_ERROR` | `Gemini request to http://[redacted].invalid/v1beta/models/gemini-2.5-flash:generateContent failed: TypeError: fetch failed` |
| `the URL of a non-ok response, through baseURL` | `respondingFetch(404, "<html>Not Found</html>")` | `` `http://${PLANTED_KEY}.invalid` `` | `API_ERROR` | `Gemini 404 from http://[redacted].invalid/v1beta/models/gemini-2.5-flash:generateContent (check baseURL: host root, without /v1beta): <html>Not Found</html>` |

Chaque cas passe par la boucle existante : message exact, `Object.hasOwn(error, "cause") === false`, `exposed(error)` sans K ni `cle-`.

### SPEC-7 · Libellé d'un `error.message` vide (test seulement)

Un `test()` ajouté après « a 404 that carries no Gemini error points at baseURL » : titre `an error body whose error.message is empty is labelled (empty body)` ; `expectFailure(respondingFetch(400, JSON.stringify({ error: { code: 400, message: "", status: "INVALID_ARGUMENT" } })).fetch, "API_ERROR", \`Gemini 400 INVALID_ARGUMENT from ${ENDPOINT}: (empty body)\`)` ; le double a été appelé exactement une fois.

### Ordre des commits et preuve de rouge

Un SPEC = un commit = un test, dans l'ordre SPEC-1 à SPEC-7. La spécification et la checklist entrent dans le commit de SPEC-1 (précédent de #18, #19, #25).

- TEST-1 rouge avant SPEC-1 : `PROVIDERS.gemini` vaut `undefined`, son appel lève une `TypeError` ; `DEFAULT_GEMINI_MODEL` est `undefined`.
- TEST-2 rouge avant SPEC-2 : `GeminiLLMProvider` absent de `.` et `./llm` ; `npm run typecheck` échoue sur `GeminiConfig`. Le cas « no Gemini wire symbol » est vert avant et après : il verrouille la frontière de SPEC-2 (précédent P4 de #25).
- TEST-3 rouge avant SPEC-3 : `node --test` sur un fichier absent sort en code non nul.
- TEST-4 et TEST-5 rouges avant SPEC-4 et SPEC-5 : titre absent (`sectionAfterHeading` échoue) et phrase de `README.md:369` encore présente.
- TEST-6 et TEST-7 verrouillent un comportement déjà livré par #25 : ils sont **verts dès leur écriture**. Leur preuve de pertinence est une mutation locale, exécutée dans la session, montrée dans le rapport du builder, puis annulée **sans commit** (`git diff --stat -- src/` vide au commit) :
  - TEST-6 : chacune des quatre mutations suivantes, appliquée seule, fait échouer son cas et lui seul : l.140 `excerpt(redactKey(gemini.status, apiKey))` → `excerpt(gemini.status)` ; l.110 `excerpt(redactKey(text, apiKey))` → `excerpt(text)` ; l.97 `${redactKey(url, apiKey)}` → `${url}` ; l.141 `redactKey(url, apiKey)` → `url`.
  - TEST-7 : l.138 `gemini?.message ?? text` → `gemini?.message || text` fait échouer le test (l'extrait devient le JSON du corps).

Gabarit (aucun `Co-Authored-By`) :

```
<type>(<scope>): <sujet>

Refs: #26
Session: <id>
Model: <modèle>
Authorship: ai
```

Sujets, à l'impératif (forme infinitive des commits du dépôt) :

- SPEC-1 `feat(llm): brancher Gemini dans le registre PROVIDERS`
- SPEC-2 `feat(llm): exporter GeminiLLMProvider et GeminiConfig par ./llm et .`
- SPEC-3 `test(llm): préparer le test d'intégration Gemini derrière GEMINI_INTEGRATION=1`
- SPEC-4 `docs(llm): documenter le fournisseur Gemini dans le README`
- SPEC-5 `docs(llm): documenter le fournisseur Gemini dans le guide`
- SPEC-6 `test(llm): verrouiller le masquage de la clé sur error.status, un corps 200 non objet et baseURL`
- SPEC-7 `test(llm): fixer le libellé d'une erreur Gemini dont error.message est vide`

### Message de squash proposé (bloc de la PR, avec corps)

```
feat(llm): brancher Gemini dans PROVIDERS et les exports, préparer l'intégration et documenter (#<PR>)

Le registre connaît gemini : ProviderID vaut "ollama" | "gemini", et PROVIDERS.gemini()
déclare process.env.GEMINI_MODEL, sinon DEFAULT_GEMINI_MODEL (gemini-2.5-flash), lu à
l'appel. GeminiLLMProvider et GeminiConfig sont servis par ./llm et . ; toGeminiRequest,
fromGeminiResponse, geminiGenerateContentUrl et GEMINI_DEFAULT_BASE_URL ne le sont par
aucun barrel, ce que tests/barrel-contract.test.ts verrouille.

tests/integration/gemini.integration.test.ts exerce checkProviderContract sur l'API réelle
derrière GEMINI_INTEGRATION=1 ; la suite par défaut l'ignore et son lancement reste un
geste d'Arthur. README.md et docs/guide-agent-package.md documentent la clé et apiKeyVar,
les modèles déclarés, l'absence de streaming, baseURL racine de l'hôte sans /v1beta, les
hypothèses H1 à H8 et la commande de lancement ; README.md:369 nomme les variables Gemini.

Mineures de la revue de #25, en tests seulement : quatre cas de masquage ajoutés à
REDACTION_CASES (error.status, corps 200 JSON non objet, URL via baseURL sur les deux
chemins) et le libellé d'un error.message vide fixé à « (empty body) ».

Refs: #26
Session: <id>
Model: <modèle>
Authorship: ai
```

## Chemins nominal et d'erreur

| Élément | Nominal | Erreur |
|---|---|---|
| Registre | `PROVIDERS.gemini()` construit un fournisseur `gemini` sans lire la clé | clé absente au `complete()` → `MISSING_API_KEY` avant tout `fetch` (TEST-1) ; identifiant inconnu → `UNKNOWN_PROVIDER` (test existant) |
| Exports | `GeminiLLMProvider`, `GeminiConfig`, `DEFAULT_GEMINI_MODEL` servis | symboles de `gemini-wire.ts` absents des deux barrels (TEST-2) |
| Intégration | `GEMINI_INTEGRATION=1` : un appel réel, rapport `ok` | sans la variable : ignoré (TEST-3) ; avec la variable et sans clé : échec explicite `MISSING_API_KEY` (D5) |
| Masquage | clé absente des messages | quatre chemins supplémentaires verrouillés (TEST-6) |

## Symétrie

- Écriture face à lecture : `GEMINI_MODEL`, posée par le consommateur, est lue à l'appel par `makeGemini` (TEST-1) ; `GEMINI_API_KEY` est lue à chaque `complete()` (tests de #19) et jamais par le registre ni par le test d'intégration ; un export ajouté au barrel est lu par `tests/barrel-contract.test.ts` et nommé dans les lignes de surface du README (TEST-2, TEST-4).
- Nominal face à erreur : tableau ci-dessus ; opt-in face au défaut pour le test d'intégration (TEST-3).
- Énumération `ProviderID` : type (`"ollama" | "gemini"`), clés de `PROVIDERS` (vérifiées par `Object.keys`, TEST-1), `resolveProvider` à l'exécution (TEST-1), documentation du registre (TEST-4). `.env.example` décrit `LLM_PROVIDER` comme « a key of the PROVIDERS union » sans énumérer les valeurs : cohérent sans modification. `LLMErrorCode` inchangé. Aucune base de données.
- Deux barrels : chaque vérification de TEST-2 porte sur `.` **et** `./llm`.

## Données touchées

Aucune base, aucun fichier de données, aucun `.env`. Variables d'environnement lues : `GEMINI_MODEL` (nouvelle, par `makeGemini`), `GEMINI_INTEGRATION` (nouvelle, par le test d'intégration seulement), `GEMINI_API_KEY` (existante, par le fournisseur). Les tests qui les touchent sauvegardent et restaurent la valeur initiale en `finally`.

## Décisions et alternatives écartées

- **D1 · Exports par `src/llm/providers/index.ts` seulement.** `./llm` et `.` le réexportent déjà (`src/llm/index.ts:4`, `src/index.ts:7`). Écarté : modifier les barrels de tête.
- **D2 · Exports nommés, pas `export *`.** Seuls `GeminiLLMProvider` et `GeminiConfig` sortent ; `GEMINI_DEFAULT_BASE_URL` reste interne, comme tout `gemini-wire.ts` (son en-tête l.3 : « served by no barrel »), et TEST-2 verrouille son absence avec les trois fonctions de #18. La valeur par défaut de `baseURL` est documentée en clair. Les types `Gemini*` du format ne sont pas exportés ; aucun test d'exécution ne peut verrouiller l'absence d'un type, limite déclarée.
- **D3 · Pas de `GEMINI_BASE_URL`.** Aucun besoin connu (D2 de #19 laissait la décision au registre) ; `baseURL` reste une option du constructeur. Écarté : précédent `OLLAMA_HOST`, qui répond à un serveur local à l'adresse variable.
- **D4 · `DEFAULT_API_KEY_VAR` non exporté.** L'issue ne le demande pas ; le nom `GEMINI_API_KEY` est documenté (JSDoc d'`apiKeyVar`, README, guide). Le commentaire l.28 est corrigé pour ne plus renvoyer à #26.
- **D5 · Pas de second garde sur la clé dans le test d'intégration.** Qui pose `GEMINI_INTEGRATION=1` sans clé obtient un échec explicite (`MISSING_API_KEY`, nom de variable seul) plutôt qu'un test ignoré silencieusement. Le fichier ne lit pas `GEMINI_API_KEY` : moins de surface où la valeur pourrait fuir.
- **D6 · `PROVIDERS.gemini()` dans le test d'intégration.** C'est le chemin piloté par l'environnement que la documentation propose ; il exerce `makeGemini` et le défaut de `fetch` réels. Écarté : `new GeminiLLMProvider(...)` comme le test d'Ollama, qui dupliquerait la résolution du modèle.
- **D7 · Preuve du « ignoré par défaut » par un sous-processus.** TEST-3 lance `node --test` sur le seul fichier, avec un environnement expurgé, plutôt qu'une lecture textuelle du fichier : il prouve le comportement à l'exécution. `NODE_TEST_CONTEXT` est retiré de l'environnement du fils : le lanceur de `node --test` le pose dans chaque fichier de test, et un `node --test` imbriqué qui l'hérite change de format de sortie.
- **D8 · Tests des mineures verts dès l'écriture, prouvés par mutation.** Ils verrouillent un comportement livré (#25) sans toucher au code de production (A1).
- **D9 · Commande PowerShell compatible 5.1.** `;` et `if ($LASTEXITCODE -eq 0)` plutôt que `&&`, absent de Windows PowerShell 5.1 ; la variable d'opt-in est retirée du shell après le test pour qu'un `npm run test` ultérieur dans le même shell ne rappelle pas l'API.
- Pas de nouvel ADR.

## Tests

Tous déterministes, sans réseau, sans `console.*`, sans `.env`. Chaque test qui touche `process.env` ou `globalThis.fetch` sauvegarde la valeur initiale et la restaure en `finally` (suppression si elle était absente).

- **TEST-1** (`tests/llm/providers/registry.test.ts`, importe `DEFAULT_GEMINI_MODEL`, `PROVIDERS`, `resolveProvider` de `dist/llm/index.js`) : (a) `PROVIDERS.gemini()` rend un fournisseur d'`id` `"gemini"`, `supportsStreaming() === false`, `complete` fonction ; (b) `DEFAULT_GEMINI_MODEL === "gemini-2.5-flash"` ; `GEMINI_MODEL` supprimée → `models()` égal à `[{ id: DEFAULT_GEMINI_MODEL, supportsTools: true }]` ; `GEMINI_MODEL = "gemini-2.5-flash-lite"` posée **après** l'import → `[{ id: "gemini-2.5-flash-lite", supportsTools: true }]` ; (c) `Object.keys(PROVIDERS)` égal à `["ollama", "gemini"]` et `resolveProvider("gemini").id === "gemini"` ; (d) `GEMINI_API_KEY` supprimée et `globalThis.fetch` remplacé, **avant** `PROVIDERS.gemini()` (le fournisseur capture `fetch` à la construction), par un double qui compte ses appels puis lève ; `provider.complete([{ role: "user", content: "hi" }], { model: provider.models()[0].id })` rejette une erreur de `name` `"LLMError"`, `code` `"MISSING_API_KEY"`, message qui contient `GEMINI_API_KEY` ; le double n'a été appelé aucune fois.
- **TEST-2** (`tests/barrel-contract.test.ts`) : (a) la liste de l.32 inclut `GeminiLLMProvider` et `DEFAULT_GEMINI_MODEL` ; (b) le test de `./llm` (l.37-41) vérifie `typeof llm.GeminiLLMProvider === "function"` et `llm.DEFAULT_GEMINI_MODEL === "gemini-2.5-flash"` ; (c) nouveau test « `.` and `./llm` serve no Gemini wire symbol » : pour `root` et `llm`, `toGeminiRequest`, `fromGeminiResponse`, `geminiGenerateContentUrl` et `GEMINI_DEFAULT_BASE_URL` valent `undefined` ; (d) nouveau test de types : `GeminiConfig` importé en type de `@arthurolivierfortin/agent-core` et, sous l'alias `LlmGeminiConfig`, de `@arthurolivierfortin/agent-core/llm` ; `const config: GeminiConfig = { models: [{ id: root.DEFAULT_GEMINI_MODEL, supportsTools: true }], apiKeyVar: "AGENT_CORE_TEST_GEMINI_KEY" }` ; `const provider: LLMProvider = new root.GeminiLLMProvider(config)` ; `const fromLlm: LlmGeminiConfig = config` ; `new llm.GeminiLLMProvider(fromLlm)` ; assertions : `provider.id === "gemini"`, `provider.models()` égal à `config.models`, `provider.supportsStreaming() === false`. Aucun `complete()`, donc aucun réseau.
- **TEST-3** (`scripts/repo-conventions.test.mjs`, titre `TEST-3 (issue 26) le test d'intégration Gemini est ignoré sans GEMINI_INTEGRATION=1`) : `spawnSync(process.execPath, ["--test", "--test-reporter=tap", "tests/integration/gemini.integration.test.ts"], { cwd: <racine du dépôt par fileURLToPath(new URL("../", import.meta.url))>, env: <copie de process.env sans GEMINI_INTEGRATION, GEMINI_API_KEY, NODE_TEST_CONTEXT>, encoding: "utf8" })` ; `status === 0` ; `stdout` contient `# SKIP set GEMINI_INTEGRATION=1 with GEMINI_API_KEY in the environment` ; `stdout` correspond à `/^# fail 0$/m`. Puis lecture du fichier : il contient `process.env.GEMINI_INTEGRATION === "1"` et `checkProviderContract`, et ne contient ni `console.`, ni `dotenv`, ni `readFileSync`, ni `GEMINI_API_KEY =`, ni une chaîne correspondant à `/AIza[0-9A-Za-z_-]{35}/`.
- **TEST-4** (`scripts/repo-conventions.test.mjs`, titre `TEST-4 (issue 26) le README documente Gemini et corrige ses lignes de surface`) : `sectionAfterHeading(readme, "## Setting up Gemini")` contient chacun de : `` `GEMINI_API_KEY` ``, `` `apiKeyVar` ``, `` `[redacted]` ``, `` `GEMINI_MODEL` ``, `` `gemini-2.5-flash` ``, `` `supportsStreaming()` ``, `` `https://generativelanguage.googleapis.com` ``, ``Do not pass `/v1beta`: the provider appends it.``, `H1` à `H8` (huit chaînes), `Launching it is a manual step: no test suite and no agent loop runs it.`, `` `GEMINI_INTEGRATION=1` ``, `` `checkProviderContract` ``, `#20`, et les deux commandes exactes ; aucun tiret cadratin dans cette section ; la ligne qui commence par ``| `./llm` |`` contient `GeminiLLMProvider` ; la ligne qui commence par `- **Engine**:` contient `GeminiLLMProvider`, `GeminiConfig` et `DEFAULT_GEMINI_MODEL` ; `sectionAfterHeading(readme, "## Using the LLM layer (`./llm`)")` contient `GeminiLLMProvider` et `PROVIDERS.gemini()` ; `sectionAfterHeading(readme, "## Configuration")` contient `` `GEMINI_API_KEY` ``, `` `GEMINI_MODEL` ``, `` `apiKeyVar` `` et `(#setting-up-gemini)` ; le README ne contient plus `The variables the LLM layer reads today are` ; aucune chaîne du README ne correspond à `/AIza[0-9A-Za-z_-]{35}/`. La liste des chaînes attendues de la section est une constante du fichier (`GEMINI_DOC_EXPECTED`), réutilisée par TEST-5.
- **TEST-5** (`scripts/repo-conventions.test.mjs`, titre `TEST-5 (issue 26) le guide documente Gemini et son test d'intégration`) : `sectionAfterHeading(guide, "### Gemini provider and its integration test")` contient chaque chaîne de `GEMINI_DOC_EXPECTED` et `tests/integration/gemini.integration.test.ts` ; aucun tiret cadratin dans cette section ; le guide contient `gemini/gemini-llm-provider.ts` et `gemini/gemini-wire.ts` ; aucune chaîne du guide ne correspond à `/AIza[0-9A-Za-z_-]{35}/`.
- **TEST-6** et **TEST-7** : voir SPEC-6 et SPEC-7 ; preuve de rouge par mutation (section « Ordre des commits »).

## Estimation de taille

Hors `docs/` et `*.md`, lignes ajoutées :

| Fichier | Estimation |
|---|---|
| `src/llm/providers/index.ts` (SPEC-1, SPEC-2) | +18 |
| `src/llm/providers/gemini/gemini-llm-provider.ts` (deux commentaires) | +2 / -2 |
| `tests/llm/providers/registry.test.ts` (TEST-1) | +50 |
| `tests/barrel-contract.test.ts` (TEST-2) | +28 |
| `tests/integration/gemini.integration.test.ts` (SPEC-3) | +21 |
| `scripts/repo-conventions.test.mjs` (TEST-3 à TEST-5) | +80 |
| `tests/llm/providers/gemini/gemini-llm-provider.test.ts` (SPEC-6, SPEC-7) | +50 |

Total estimé : environ 250 lignes, fourchette 210 à 300, sous le plafond de 400 et sans dérogation. C'est nettement au-dessus de l'estimation de l'issue (environ 90) : l'issue ne comptait ni les mineures ajoutées par le pilote (+50), ni les tests de documentation (TEST-4, TEST-5, environ +50), ni la preuve en sous-processus du « ignoré par défaut » (TEST-3, environ +30), ni le chemin d'erreur du registre (TEST-1 (d), environ +20). La mesure fait foi à la PR.

## Hypothèses et risques restants

- **R1 · Libellé inexact.** `(empty body)` est produit quand `error.message` est `""` alors que le corps n'est pas vide (`gemini-llm-provider.ts:138-139`). SPEC-7 le fixe tel quel, par consigne (tests seulement). Candidat à une issue de suivi qui changerait le code et ce test ensemble.
- **R2 · Sortie TAP de Node 22.** TEST-3 suppose que le reporter `tap` de Node 22 écrit `# SKIP <raison>` sur la ligne du test ignoré et une ligne de résumé `# fail 0`. Si la sortie réelle observée dans la session diffère, le builder s'aligne sur elle, la cite dans son rapport et l'inscrit en `[H]`.
- **R3 · `NODE_TEST_CONTEXT`.** Le retrait de cette variable dans le fils de TEST-3 suppose le comportement décrit en D7 ; s'il s'avère superflu, le retrait reste inoffensif.
- H1 à H8 restent non vérifiées contre l'API réelle ; le premier lancement par Arthur renseignera H1, H5 et H6.
