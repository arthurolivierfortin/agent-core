# Spécification · Ajouter GeminiLLMProvider, requête nominale et contrat vert sur un double · #19

Date : 2026-09-30
Issue : https://github.com/arthurolivierfortin/agent-core/issues/19 (type feature, jalon H2 ; lot B1 du découpage de #19 : #19 fournisseur nominal, #25 erreurs de transport et clé masquée, #26 registre, exports, intégration et documentation ; dépend de #18, livré en bb15841)
Checklist : docs/specs/2026-09-30-gemini-provider-checklist.md
Branche : `feat/19-gemini-provider` (worktree `.claude/worktrees/feat+19-gemini-provider`, `main` bb15841)

## Objectif

Livrer `GeminiLLMProvider`, qui transporte vers `generateContent` la requête que construit `toGeminiRequest` et rend ce que lit `fromGeminiResponse`, refuse sans réseau un modèle non déclaré et une clé absente, et passe `checkProviderContract` sur un double de `fetch`.

## Source de l'issue (corps relevé le 2026-09-30)

1. `GeminiLLMProvider` et `GeminiConfig { models, baseURL?, apiKeyVar?, fetch? }` : id `gemini`, `models()` déclarés, `supportsStreaming()` false sans propriété `stream`, `fetch` injectable, lié à `globalThis` par défaut.
2. `baseURL` (décision du pilote, option A) : racine de l'hôte, sans version, défaut `GEMINI_DEFAULT_BASE_URL` de #18 ; URL construite par `geminiGenerateContentUrl(model, baseURL)`, qui ajoute `/v1beta` (H1, verrouillée à un seul endroit) ; la documentation dit de ne pas passer `/v1beta` dans `baseURL`.
3. `complete()` : `toGeminiRequest` avant tout appel réseau, POST avec les en-têtes `content-type` et `x-goog-api-key`, `fromGeminiResponse` sur la réponse.
4. Clé (décision du pilote) : option `apiKeyVar`, défaut `GEMINI_API_KEY` ; lue dans `process.env[apiKeyVar]` au moment de chaque appel, jamais ailleurs ni dans un fichier.
5. Sans réseau (double de `fetch` qui échoue s'il est appelé) : modèle non déclaré → `MODEL_NOT_FOUND` ; clé absente ou vide → `MISSING_API_KEY`, message qui cite le nom de la variable (défaut et `apiKeyVar` personnalisé), jamais la valeur.
6. `checkProviderContract` vert sur la classe avec un `fetch` double.

Contraintes : aucun appel réseau ni fournisseur hébergé dans la suite ; la valeur de la clé n'apparaît dans aucun message, log, erreur ni test (valeurs factices seulement) ; les tests qui touchent `process.env` restaurent son état ; aucun `console.log` ; aucun `.env` lu ; gates build, typecheck, test ; PR sous 400 lignes hors `docs/` et `*.md`, sans dérogation.

## État constaté dans le code (lecture du 2026-09-30, `main` bb15841)

- `src/llm/providers/gemini/gemini-wire.ts:46` : `GEMINI_DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com"` (racine sans version) ; l.53-55 : `geminiGenerateContentUrl(model, baseURL = GEMINI_DEFAULT_BASE_URL)` rend `baseURL + "/v1beta/models/" + model + ":generateContent"`, sans encodage ni normalisation ; l.63 : `toGeminiRequest(messages, tools?)`, synchrone, lève `API_ERROR` sur un `toolCallId` orphelin (l.80-85) ; l.146 : `fromGeminiResponse(body: GeminiResponse): LLMResponse`, synchrone ; l.40-44 : type `GeminiResponse`. Le module n'a ni `fetch` ni `process.env` et n'est servi par aucun barrel (l.1-3).
- `src/llm/providers/ollama/ollama-llm-provider.ts:14` : `type FetchLike = typeof fetch` ; l.16-22 : `OllamaConfig` ; l.43 : `readonly id = "ollama"` ; l.55 : `config.fetch ?? fetch.bind(globalThis)` (le commentaire l.51-54 explique le « Illegal invocation » d'un `fetch` non lié en navigateur) ; l.58-60 : `models()` rend la déclaration ; l.147-156 : `assertDeclared(model)` lève `MODEL_NOT_FOUND` avec le message `Model '<model>' is not declared on this provider. Declared: <ids joints par ", ">` avant tout `fetch`.
- `src/llm/interfaces/llm-provider.ts:24-39` : port `LLMProvider` ; `stream?` est optionnel (l.38), « présent seulement si `supportsStreaming()` est vrai ».
- `src/llm/models/index.ts:80-85` : `LLMErrorCode` contient déjà `MISSING_API_KEY` (l.81) et `MODEL_NOT_FOUND` (l.85), aucun producteur de `MISSING_API_KEY` dans `src/` ; l.91-99 : `LLMError` porte `name = "LLMError"` et `code`.
- `src/llm/testing/provider-contract.ts:75` : `checkProviderContract(provider, opts?)` ; l.134-145 : appelle `complete()` avec un modèle non déclaré et exige `MODEL_NOT_FOUND` ; l.151-154 : exige que `complete()` résolve sur le premier modèle déclaré ; l.173-180 : aucun contrôle de streaming quand `supportsStreaming()` est faux.
- `src/llm/providers/index.ts:5-6` : le barrel n'exporte que `OllamaLLMProvider` et `OllamaConfig` ; l.13 : `ProviderID = "ollama"`. `tests/barrel-contract.test.ts:32` et `:39` fixent la surface de `.` et `./llm`, sans Gemini.
- `tsconfig.build.json:9` compile tout `src/` : `dist/llm/providers/gemini/gemini-llm-provider.js` existera sans barrel. Les tests importent depuis `dist/` (`tests/llm/providers/gemini/gemini-wire.test.ts:3-8`) ; `package.json:36` : `npm run test` = `npm run build && node --test`.
- `tests/llm/providers/ollama/ollama-adapter.test.ts:276-295` : précédent du test de `fetch` lié (remplacement de `globalThis.fetch`, restauration en `finally`) ; l.188-205 : précédent d'un `fetch` espion qui prouve l'absence d'appel réseau.
- `docs/decisions/ADR-AGENT-0021-le-contrat-comme-declaration-avant-le-moteur.md:33` : « Le contrat ne contient jamais une clé : seulement le nom de la variable d'environnement qui la porte » ; c'est ce que porte `apiKeyVar`.
- `docs/decisions/ADR-AGENT-0013-llm-port-capabilities-optional-streaming.md:40` et `:42` : un fournisseur qui ne streame pas écrit `supportsStreaming()` à `false` et omet `stream` (le faux fournisseur le fait déjà).
- `CLAUDE.md` (règles propres) : le package ne lit que `process.env`, jamais un fichier `.env`. Manifeste : `GATE-1 build` `npm run build`, `GATE-2 typecheck` `npm run typecheck`, `GATE-3 test` `npm run test`.
- Aucune occurrence de `GeminiLLMProvider`, `GeminiConfig` ni `gemini-llm-provider` dans `src/` ou `tests/` : aucun conflit de nom.

## Périmètre

Dans la PR :

- Classe `GeminiLLMProvider`, type `GeminiConfig`, chemin nominal de `complete()` (SPEC-1).
- Refus d'un modèle non déclaré sans réseau, et `checkProviderContract` vert sur un double (SPEC-2).
- Refus d'une clé absente ou vide sans réseau, message qui nomme la variable (SPEC-3).

Hors périmètre :

- #25 : réponse HTTP non `ok`, rejet de `fetch`, corps JSON illisible, masquage `[redacted]` de la clé dans les messages d'erreur de transport. En B1, `complete()` ne teste pas `res.ok` et n'entoure ni `fetch` ni `res.json()` d'un `try` : un corps d'erreur Gemini passe par `fromGeminiResponse` et devient `API_ERROR` « no candidate », message trompeur accepté jusqu'à #25 parce que le module n'est servi par aucun barrel ; un rejet de `fetch` se propage tel quel. La clé voyage dans un en-tête, jamais dans l'URL : ni l'URL ni le corps envoyés ne la contiennent.
- #26 : `ProviderID`, `PROVIDERS.gemini`, `resolveProvider`, réexport depuis `src/llm/providers/index.ts`, `./llm` ou `.`, `tests/barrel-contract.test.ts`, test d'intégration réel, README et guide. Dans B1, `gemini-llm-provider.ts` n'est réexporté par aucun barrel.
- #20 : tarifs et runner plafonné.
- Streaming (`streamGenerateContent`), `generationConfig`, lecture d'une variable d'environnement pour `baseURL`.
- Toute modification de `gemini-wire.ts`, de `LLMErrorCode` ou de `checkProviderContract`.

## Conception

### Placement

| Fichier | Contenu | Règle appliquée |
|---|---|---|
| `src/llm/providers/gemini/gemini-llm-provider.ts` | `GeminiConfig`, `GeminiLLMProvider`, constante non exportée `DEFAULT_API_KEY_VAR` | classe qui implémente un port et varie par fournisseur : `providers/<vendor>/` (`docs/conventions/architecture.md:48` et `:60`) ; nom en miroir de `ollama-llm-provider.ts` |
| `tests/llm/providers/gemini/gemini-llm-provider.test.ts` | TEST-1 à TEST-3 | miroir du chemin source, comme `gemini-wire.test.ts` |

Imports de `gemini-llm-provider.ts`, liste fermée : `LLMError` et les types `LLMResponse`, `Message`, `ModelInfo` depuis `../../models/index.js` ; les types `CompletionOptions`, `LLMProvider` depuis `../../interfaces/index.js` ; `GEMINI_DEFAULT_BASE_URL`, `geminiGenerateContentUrl`, `toGeminiRequest`, `fromGeminiResponse` et le type `GeminiResponse` depuis `./gemini-wire.js`. Aucun import de `fs`, `path`, `./testing`, aucun `console.*`.

Imports du test : `../../../../dist/llm/providers/gemini/gemini-llm-provider.js` (`GeminiLLMProvider`), `../../../../dist/llm/providers/gemini/gemini-wire.js` (`toGeminiRequest`), `../../../../dist/testing/index.js` (`checkProviderContract`).

Le commentaire d'en-tête du module (anglais, style du dépôt) renvoie à cette spécification, dit que les erreurs de transport et le masquage relèvent de #25 et les exports de #26, et nomme H5.

### `GeminiConfig` (SPEC-1)

```ts
export type GeminiConfig = {
  /** The models this provider offers, declared rather than queried (ADR-AGENT-0017). */
  models: ModelInfo[];
  /**
   * Host root, without version or trailing slash. Defaults to GEMINI_DEFAULT_BASE_URL.
   * Do not pass /v1beta: geminiGenerateContentUrl appends it (H1).
   */
  baseURL?: string;
  /** Name of the environment variable holding the API key, never the key itself. Defaults to GEMINI_API_KEY. */
  apiKeyVar?: string;
  /** Injectable for tests; defaults to the global fetch bound to globalThis. */
  fetch?: typeof fetch;
};
```

La formulation anglaise des JSDoc est libre ; le JSDoc de `baseURL` doit porter les trois faits : racine de l'hôte sans version ni barre finale ; défaut `GEMINI_DEFAULT_BASE_URL` ; ne pas y passer `/v1beta`, que `geminiGenerateContentUrl` ajoute.

### `GeminiLLMProvider` (SPEC-1)

- `readonly id = "gemini"`.
- Constructeur : `declaredModels = config.models` ; `baseURL = config.baseURL ?? GEMINI_DEFAULT_BASE_URL`, pris tel quel, sans normalisation ni lecture d'environnement ; `apiKeyVar = config.apiKeyVar ?? DEFAULT_API_KEY_VAR` (`"GEMINI_API_KEY"`) ; `fetchFn = config.fetch ?? fetch.bind(globalThis)`. Le constructeur ne lit pas `process.env` et ne lève jamais faute de clé.
- `models()` rend `declaredModels`.
- `supportsStreaming()` rend `false`. La classe ne déclare aucune méthode ni propriété `stream` : `"stream" in provider` vaut `false`.
- Aucun champ d'instance ne contient la clé : elle vit dans une variable locale de `complete()`.

### `complete(messages, opts)`, dans cet ordre

1. **Modèle déclaré** (SPEC-2) : si aucun `declaredModels[i].id === opts.model`, lever `new LLMError("MODEL_NOT_FOUND", "Model '<opts.model>' is not declared on this provider. Declared: <ids joints par \", \">")`.
2. **Clé** (SPEC-1 lit, SPEC-3 refuse) : `const apiKey = process.env[this.apiKeyVar]`, lue à chaque appel. Si `apiKey === undefined || apiKey === ""`, lever `new LLMError("MISSING_API_KEY", "Gemini API key missing: environment variable <apiKeyVar> is unset or empty")`. Le message ne contient que le nom de la variable.
3. **Requête** (SPEC-1) : `const body = toGeminiRequest(messages, opts.tools)` ; une `LLMError` `API_ERROR` qu'elle lève se propage sans appel réseau.
4. **Transport** (SPEC-1) : `const res = await this.fetchFn(geminiGenerateContentUrl(opts.model, this.baseURL), { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": apiKey }, body: JSON.stringify(body) })`.
5. **Réponse** (SPEC-1) : `return fromGeminiResponse((await res.json()) as GeminiResponse)`.

### Ordre des commits et preuve de rouge

Un SPEC = un commit = un test, dans l'ordre SPEC-1 à SPEC-3. La spécification et la checklist entrent dans le commit de SPEC-1 (précédent de #18).

- TEST-1 est rouge avant SPEC-1 : le module importé n'existe pas dans `dist/`.
- Avant SPEC-3, le typage de `headers` exige une chaîne : SPEC-1 peut envoyer `apiKey ?? ""` provisoirement, remplacé par la levée de SPEC-3. TEST-1 fixe toujours la clé et n'observe pas ce provisoire.
- TEST-2 est rouge avant SPEC-2 : sans garde, `complete()` sur un modèle non déclaré appelle le double (compteur à 1) et le contrôle « complete() refuses a model the provider does not declare » du rapport échoue.
- TEST-3 est rouge avant SPEC-3 : sans levée, `complete()` sans clé appelle le double (compteur à 1) au lieu de rejeter `MISSING_API_KEY`.

Gabarit des messages de commit (aucun `Co-Authored-By`) :

```
feat(llm): <sujet>

Refs: #19
Session: <id>
Model: <modèle>
Authorship: ai
```

Sujets, à l'impératif (forme infinitive des commits du dépôt) : SPEC-1 « ajouter GeminiLLMProvider et sa requête generateContent nominale » ; SPEC-2 « refuser un modèle Gemini non déclaré avant tout appel réseau » ; SPEC-3 « refuser un appel Gemini sans clé d'API avant tout appel réseau ».

## Chemins nominal et d'erreur

| Élément | Nominal | Erreur |
|---|---|---|
| Construction | aucune lecture d'environnement | aucune (pas de levée sans clé) |
| Modèle | déclaré : l'appel continue | non déclaré → `MODEL_NOT_FOUND`, sans réseau, avant le contrôle de clé (SPEC-2) |
| Clé | non vide : envoyée dans `x-goog-api-key` | absente ou `""` → `MISSING_API_KEY` qui nomme la variable, sans réseau (SPEC-3) |
| Requête | `toGeminiRequest` | `toolCallId` orphelin → `API_ERROR` de #18, sans réseau (vérifié dans TEST-1) |
| Transport et réponse | `fromGeminiResponse` | réponse non `ok`, rejet de `fetch`, JSON illisible : #25, non traités ici |

## Symétrie

- Écriture face à lecture : la requête écrite est celle de `toGeminiRequest`, la réponse lue passe par `fromGeminiResponse` ; la clé est lue dans l'environnement et écrite dans un seul en-tête, jamais dans un champ, l'URL, le corps ou un message ; `baseURL` écrit par la configuration est lu par `geminiGenerateContentUrl` seulement.
- Nominal face à erreur : SPEC-1 a SPEC-2 (modèle) et SPEC-3 (clé) ; le chemin d'erreur de transport est explicitement reporté à #25.
- Défaut face à personnalisé : `baseURL` (défaut et `http://localhost:8080`), `apiKeyVar` (défaut `GEMINI_API_KEY` et `AGENT_CORE_TEST_GEMINI_KEY`) et `fetch` (injecté et global lié) sont chacun testés sous leurs deux formes.
- Énumérations : `LLMErrorCode` n'est pas modifié (`MISSING_API_KEY` et `MODEL_NOT_FOUND` existent déjà) ; `ProviderID` n'est pas modifié (#26). Aucune base de données.

## Données touchées

Aucune base, aucun fichier. Lecture de `process.env[apiKeyVar]` à chaque appel de `complete()`, rien d'autre dans l'environnement. Aucun réseau dans les tests : tout `fetch` est un double, le `fetch` global compris (remplacé puis restauré dans le cas du `fetch` lié).

## Décisions et alternatives écartées

- **D1 · `baseURL` = racine de l'hôte sans version (décision du pilote, option A).** `geminiGenerateContentUrl` reste le seul endroit qui connaît `/v1beta` (H1) : si H1 tombe, un seul fichier change, et la configuration des consommateurs ne bouge pas. Écarté : une racine versionnée (`https://generativelanguage.googleapis.com/v1beta`), qui aurait mis la version dans la configuration de chaque consommateur et obligé à contourner `geminiGenerateContentUrl` ou à la dupliquer. Conséquence documentée dans le JSDoc de `baseURL` : ne pas passer `/v1beta`.
- **D2 · `baseURL` pris tel quel.** Pas de retrait de barre finale ni de détection de `/v1beta` : une correction silencieuse cache une configuration fausse, et la réponse 404 qui la révélera est traitée par #25. Écarté aussi : une variable d'environnement pour `baseURL` (précédent `OLLAMA_HOST`), sans besoin connu ; le registre de #26 pourra en décider.
- **D3 · Clé lue à chaque appel, jamais stockée (décision du pilote).** Un changement de `process.env` entre deux appels est pris en compte, le constructeur ne lève pas sans clé, et aucune sérialisation de l'instance ne contient la clé. Écarté : lecture au constructeur, qui figerait la clé et la garderait dans un champ.
- **D4 · Clé dans l'en-tête `x-goog-api-key`.** Écarté : le paramètre de requête `?key=`, qui met la clé dans l'URL, donc dans tout message qui cite l'URL.
- **D5 · « Vide » = chaîne `""` exactement.** Une valeur faite d'espaces est envoyée telle quelle, et le refus de l'API relève de #25. Écarté : `trim()`, qui transformerait une valeur de secret en silence.
- **D6 · Ordre modèle, clé, requête, transport.** Les deux erreurs de configuration passent avant l'erreur de contenu, et le modèle avant la clé, pour que `checkProviderContract` obtienne `MODEL_NOT_FOUND` quel que soit l'état de l'environnement. Écarté : requête avant clé, sans avantage observable.
- **D7 · `DEFAULT_API_KEY_VAR` non exporté.** La surface publique est l'affaire de #26 ; le nom par défaut est documenté dans le JSDoc d'`apiKeyVar`.
- **Pas de nouvel ADR** : ADR-AGENT-0013, 0016, 0017 et 0021 sont appliqués tels quels.

## Tests

Tous dans `tests/llm/providers/gemini/gemini-llm-provider.test.ts`, déterministes, sans réseau ni fournisseur hébergé. Conventions :

- `MODEL = "gemini-2.5-flash"`, `DECLARED = [{ id: MODEL, supportsTools: true }]`, `KEY_VAR = "AGENT_CORE_TEST_GEMINI_KEY"`.
- Réponse du double `ANSWER = { candidates: [{ content: { role: "model", parts: [{ text: "Bon" }, { text: "jour" }, { functionCall: { name: "navigate", args: { page: "reglages" } } }] }, finishReason: "STOP" }], usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 4 } }`.
- `NAVIGATE = { name: "navigate", description: "Navigate to a page.", parameters: { type: "object", properties: { page: { type: "string" } }, required: ["page"] } }`.
- Double capturant : enregistre chaque `(url, init)` et rend `new Response(JSON.stringify(ANSWER), { status: 200 })`. Double injoignable : incrémente un compteur puis lève `new Error("fetch must not be called")` ; chaque cas « sans réseau » vérifie que le compteur vaut 0.
- Environnement : une aide `withEnv(values: Record<string, string | undefined>, body)` enregistre la valeur initiale de chaque nom, écrit la nouvelle (suppression par `delete process.env[name]` pour `undefined`, parce qu'affecter `undefined` écrirait la chaîne `"undefined"`), exécute `body` et restaure en `finally` (suppression si la valeur initiale était absente). Aucun test ne touche `process.env` hors de `withEnv`.
- Valeurs de clé factices seulement : `cle-factice-1`, `cle-factice-2`, `cle-factice-ne-pas-afficher`.
- Une erreur attendue est vérifiée par `name === "LLMError"`, `code` et des expressions régulières sur le message, sur la forme de `tests/llm/providers/ollama/ollama-adapter.test.ts:55-60`. « Égal strictement » signifie `assert.deepStrictEqual`.
- Le cas qui verrouille H5 a un titre qui commence par `hypothesis H5:`.

## Estimation de taille

Hors `docs/` et `*.md` : `gemini-llm-provider.ts` environ 95 à 115 lignes (en-tête 10, imports 8, `GeminiConfig` et JSDoc 20, classe et constructeur 20, `models` et `supportsStreaming` 10, `complete` avec garde de modèle et de clé 35) ; `gemini-llm-provider.test.ts` environ 165 à 195 lignes (fixtures et aides 40, TEST-1 75, TEST-2 40, TEST-3 40). Total estimé : environ 285 lignes, fourchette 260 à 310, sous le plafond de 400 ; au-dessus de l'estimation de l'issue (environ 260) d'une vingtaine de lignes, dues aux cas de `fetch` lié et de restauration de l'environnement. La mesure fait foi à la PR.

## Hypothèses restantes

- H1 (de #18) : `generateContent` sous `v1beta` ; toujours non vérifiée, verrouillée dans `gemini-wire.test.ts`.
- H5 : l'API accepte la clé dans l'en-tête `x-goog-api-key` (et non seulement en `?key=`). Non vérifiée contre l'API réelle ; première vérification possible au premier appel réel (#26 intégration ou #20). Verrou : le cas « hypothesis H5: the API key travels in the x-goog-api-key header » de TEST-1.
- Les deux en-têtes `content-type` et `x-goog-api-key` suffisent ; aucun autre en-tête n'est envoyé. Non vérifié.
