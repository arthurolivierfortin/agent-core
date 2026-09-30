# Spécification · Typer les erreurs de transport de GeminiLLMProvider et masquer la clé · #25

Date : 2026-09-30
Issue : https://github.com/arthurolivierfortin/agent-core/issues/25 (type feature, jalon H2 ; lot B2 du découpage de #19 : #19 fournisseur nominal, #25 erreurs de transport et clé masquée, #26 registre, exports, intégration et documentation ; dépend de #19, livré en 7bdf33f)
Checklist : docs/specs/2026-09-30-gemini-errors-checklist.md
Branche : `feat/25-gemini-errors` (worktree `.claude/worktrees/feat+25-gemini-errors`, `main` 7bdf33f)

## Objectif

Faire de chaque échec de transport de `GeminiLLMProvider.complete()` (réponse non `ok`, `fetch` rejeté, corps illisible ou non JSON) une `LLMError` à code fermé, sans cause chaînée, dont aucun message ne contient la valeur de la clé d'API.

## Source de l'issue (corps relevé le 2026-09-30) et décisions du pilote

Corps de l'issue :

1. `fetch` qui rejette → `API_ERROR`.
2. Statut non ok → `API_ERROR` avec le statut et le corps.
3. 404 dont le corps JSON porte `error.status` `NOT_FOUND` → `MODEL_NOT_FOUND` ; tout autre 404 → `API_ERROR`.
4. Corps JSON illisible → `API_ERROR`.
5. Clé masquée : `[redacted]` remplace la valeur de la clé dans toute chaîne externe avant qu'elle entre dans un message d'erreur ; aucune `cause` chaînée ; aucune propriété de l'instance ne porte la clé ; test obligatoire sur l'erreur sérialisée.

Contraintes : aucun appel réseau ni fournisseur hébergé dans la suite (doubles de `fetch`) ; gates build, typecheck, test ; PR sous 400 lignes hors `docs/` et `*.md`, sans dérogation.

Décisions du pilote (2026-09-30), qui précisent le corps :

- P1 · `res.ok` est testé **en premier** après le `fetch`, avant toute lecture du corps.
- P2 · 404 dont le corps JSON porte `error.status === "NOT_FOUND"` → `MODEL_NOT_FOUND` ; tout autre statut non ok → `API_ERROR` avec le statut, et **jamais le corps brut** : un extrait du corps qui entre dans le message passe d'abord par le masquage et reste borné en longueur. Le choix est écrit en D2 et D3.
- P3 · `fetch` qui rejette → `API_ERROR` ; corps JSON illisible → `API_ERROR`.
- P4 · `[redacted]` remplace la valeur de la clé dans toute chaîne externe (corps serveur, message d'un `fetch` rejeté, `String(cause)`) avant qu'elle entre dans un message ; aucune cause chaînée ; aucune propriété de l'instance d'erreur ne porte la clé.
- P5 · Test obligatoire : la valeur factice de la clé est injectée dans un corps de réponse **et** dans le message d'un `fetch` rejeté ; le test vérifie qu'elle n'apparaît nulle part dans l'erreur sérialisée (message, `name`, `code`, propriétés énumérables).
- P6 · La mineure relevée sur #28 (cas (a) de TEST-1 de #19) n'est pas reprise ici.

Contraintes du pilote : aucun barrel modifié ; `ROADMAP.md` non modifié ; aucun `console.log` ; aucun `.env` lu ; gabarits de commit sans `Co-Authored-By`, sujets à l'impératif ; chemins relatifs au dépôt dans toute preuve.

## État constaté dans le code (lecture du 2026-09-30, `main` 7bdf33f)

- `src/llm/providers/gemini/gemini-llm-provider.ts:3-4` : l'en-tête dit que les erreurs de transport et le masquage relèvent de #25 ; l.49 : `baseURL` pris tel quel, « which the 404 reveals (#25) » ; l.65-84 : `complete()` dans l'ordre `assertDeclared`, clé (`MISSING_API_KEY` l.70-76), `toGeminiRequest` (l.77), `fetchFn` sans `try` (l.78-82), `fromGeminiResponse((await res.json()) as GeminiResponse)` sans test de `res.ok` ni `try` (l.83). La clé vit dans la locale `apiKey` (l.69), jamais dans un champ.
- `docs/specs/2026-09-30-gemini-provider-design.md:48` : limite déclarée par #19, « `complete()` ne teste pas `res.ok` et n'entoure ni `fetch` ni `res.json()` d'un `try` », jusqu'à #25.
- `src/llm/providers/gemini/gemini-wire.ts:146-158` : `fromGeminiResponse(body)` ; l.165-177 : ses deux `API_ERROR` construisent leur message avec `promptFeedback.blockReason` (l.168-169) et `finishReason` (l.173-174), lus dans le corps serveur. l.53-55 : `geminiGenerateContentUrl` ne met pas la clé dans l'URL (clé en en-tête, H5 de #19).
- `src/llm/models/index.ts:80-85` : `LLMErrorCode` fermé, contient `API_ERROR` et `MODEL_NOT_FOUND` ; l.91-99 : `LLMError(code, message, options?: { cause?: unknown })`, `name = "LLMError"` et `code` sont des propriétés propres.
- `src/llm/providers/ollama/ollama-llm-provider.ts:121-123` : `fetch` rejeté → `API_ERROR` « Ollama request failed: <String(cause)> » avec `{ cause }` ; l.124-143 : non `ok` → lecture `res.text()`, 404 dont le corps JSON porte `error` → `MODEL_NOT_FOUND`, autre 404 → `API_ERROR` qui invite à vérifier la base URL, sinon `API_ERROR` « Ollama <status>: <corps brut> » ; l.70-74 : JSON illisible → `API_ERROR` avec `{ cause }`. Précédent suivi pour la structure (ordre, distinction des deux 404, indice sur la base URL) ; écarté sur deux points : Gemini ne chaîne aucune cause et n'écrit jamais le corps brut (P2, P4 ; Ollama local n'a pas de clé).
- `tests/llm/providers/gemini/gemini-llm-provider.test.ts:44-59` : aides `withEnv` et `setEnv` ; l.64-81 : doubles `capturingFetch` et `unreachableFetch` ; l.84-92 : aide `llmError(code, present, absent)`. Aucune occurrence de `redact`, `res.ok`, `excerpt` dans `src/llm/providers/gemini/`.
- `tsconfig.json:3` : cible ES2022 (`String.prototype.replaceAll`, `Object.hasOwn` disponibles). `package.json:36` : `npm run test` = `npm run build && node --test`, les tests importent depuis `dist/`.
- Manifeste (`CLAUDE.md`, bloc `core-project`) : `GATE-1 build` `npm run build`, `GATE-2 typecheck` `npm run typecheck`, `GATE-3 test` `npm run test`.

## Périmètre

Dans la PR :

- Réponse non `ok` → `API_ERROR` avec statut, `error.status` et extrait borné, lecture du corps d'erreur protégée (SPEC-1).
- 404 `NOT_FOUND` → `MODEL_NOT_FOUND` (SPEC-2).
- `fetch` rejeté → `API_ERROR` (SPEC-3).
- Réponse `ok` au corps illisible, non JSON ou non objet → `API_ERROR` (SPEC-4).
- Masquage `[redacted]` de la clé dans toute chaîne externe, erreurs de `fromGeminiResponse` comprises (SPEC-5).

Hors périmètre :

- #26 : registre, `ProviderID`, exports, barrels, `tests/barrel-contract.test.ts`, intégration réelle, README et guide. Aucun barrel n'est modifié.
- `ROADMAP.md`, `gemini-wire.ts`, `LLMErrorCode`, `checkProviderContract` : non modifiés.
- La mineure de #28 sur le cas (a) de TEST-1 de #19 (P6).
- Chaînes fournies par le consommateur (messages, `toolCallId`, `opts.model`, configuration) : ce ne sont pas des chaînes externes ; l'`API_ERROR` de `toGeminiRequest` n'est pas masquée. Seule exception, l'URL, masquée par prudence (D5).
- Validation de la forme d'un corps qui est un objet JSON : elle reste celle de `fromGeminiResponse` (#18). Un corps aberrant comme `{"candidates":[null]}` y lève une `TypeError` et non une `LLMError` ; limite déclarée, candidate à une issue de suivi, non traitée ici.
- Nouvelle tentative, délai d'attente, `AbortSignal`, lecture de `cause.cause` d'un `fetch` rejeté.

## Conception

### Placement

| Fichier | Contenu |
|---|---|
| `src/llm/providers/gemini/gemini-llm-provider.ts` | `complete()` modifié ; fonctions de module non exportées `httpError`, `geminiErrorOf`, `readBody`, `excerpt`, `redactKey` ; constante non exportée `MAX_EXCERPT_LENGTH = 200` |
| `tests/llm/providers/gemini/gemini-llm-provider.test.ts` | TEST-1 à TEST-5 ajoutés à la fin du fichier, qui réutilisent `withEnv`, `llmError`, `KEY_VAR`, `DECLARED`, `MODEL` |

Imports de `gemini-llm-provider.ts` inchangés (liste fermée de #19). L'en-tête du module est mis à jour : il renvoie aussi à cette spécification, ne dit plus que les erreurs de transport relèvent de #25, garde le renvoi à #26, et nomme H7 et H8 avec leur test verrou, sur le modèle de H5.

### Signatures finales (non exportées)

```ts
const MAX_EXCERPT_LENGTH = 200;
function excerpt(text: string): string;                       // SPEC-1
function geminiErrorOf(text: string): { status?: string; message?: string } | undefined; // SPEC-1
async function readBody(res: Response, apiKey: string): Promise<string>;               // SPEC-1, apiKey par SPEC-5
async function httpError(res: Response, url: string, model: string, apiKey: string): Promise<LLMError>; // SPEC-1, model par SPEC-2, apiKey par SPEC-5
function redactKey(text: string, apiKey: string): string;     // SPEC-5
```

- `excerpt(text)` : `text` si `text.length <= MAX_EXCERPT_LENGTH`, sinon `text.slice(0, MAX_EXCERPT_LENGTH) + "..."`.
- `geminiErrorOf(text)` : `JSON.parse(text)` dans un `try` ; rend `undefined` si l'analyse échoue ou si la valeur n'a pas de propriété `error` qui soit un objet non nul ; sinon rend `{ status, message }`, chacun repris seulement s'il est de type `string`.
- `redactKey(text, apiKey)` : `text.replaceAll(apiKey, "[redacted]")`. `apiKey` est toujours non vide à ce point (garde `MISSING_API_KEY` de #19).
- Après SPEC-5, toute chaîne tirée du serveur ou d'une exception passe par `excerpt(redactKey(brute, apiKey))` : masquage **avant** troncature, pour qu'une troncature ne laisse jamais un préfixe de clé que `replaceAll` n'aurait plus reconnu.

### `complete(messages, opts)`, dans cet ordre

1 à 3 inchangés (#19) : `assertDeclared`, clé, `toGeminiRequest`. Puis `const url = geminiGenerateContentUrl(opts.model, this.baseURL)`.

4. **Transport** (SPEC-3) : `fetchFn(url, …)` dans un `try` ; sur rejet `cause`, lever `new LLMError("API_ERROR", "Gemini request to <url> failed: <excerpt(String(cause))>")`, sans option `cause`.
5. **Statut, en premier** (SPEC-1, P1) : `if (!res.ok) throw await httpError(res, url, opts.model, apiKey)`, avant toute lecture du corps sur le chemin nominal.
6. **Corps** (SPEC-4) : `const text = await readBody(res, apiKey)` ; `JSON.parse(text)` dans un `try` : échec → `API_ERROR` « Gemini <res.status> response is not JSON: <excerpt(text)> » ; valeur `null`, non objet ou tableau → `API_ERROR` « Gemini <res.status> response is not a JSON object: <excerpt(text)> ».
7. **Lecture** (SPEC-5 pour l'enveloppe) : `fromGeminiResponse(parsed as GeminiResponse)` dans un `try` ; une `LLMError` levée est relevée en `new LLMError(error.code, redactKey(error.message, apiKey))`, sans cause ; toute autre exception est relevée telle quelle.

Aucune `LLMError` de ce module ne reçoit l'option `cause` (P4), dès SPEC-1.

### `readBody(res, apiKey)` (SPEC-1)

`await res.text()` dans un `try` ; sur rejet `cause`, lever `new LLMError("API_ERROR", "Gemini <res.status> response body could not be read: <excerpt(String(cause))>")`. Utilisée par `httpError` (SPEC-1) et par l'étape 6 (SPEC-4).

### `httpError(res, url, model, apiKey)` (SPEC-1, SPEC-2)

`text = await readBody(res, apiKey)`, `gemini = geminiErrorOf(text)`, `detail = gemini?.message ?? text`, puis `excerpt(detail)`, ou `(empty body)` si `detail === ""`.

- SPEC-2 : `res.status === 404 && gemini?.status === "NOT_FOUND"` → `new LLMError("MODEL_NOT_FOUND", "Gemini has no model '<model>' (404 NOT_FOUND from <url>): <extrait>")`.
- SPEC-1, autre 404 → `new LLMError("API_ERROR", "Gemini 404<statut> from <url> (check baseURL: host root, without /v1beta): <extrait>")`.
- SPEC-1, autre statut → `new LLMError("API_ERROR", "Gemini <res.status><statut> from <url>: <extrait>")`.

`<statut>` vaut `" " + excerpt(gemini.status)` quand `gemini?.status` est une chaîne, `""` sinon. Le JSON brut du corps n'entre jamais dans un message quand il porte `error.message` ; sinon seul l'extrait borné du texte y entre.

### Masquage (SPEC-5)

SPEC-5 ajoute `redactKey` et fait passer par lui, avant `excerpt` : le texte du corps (`detail` et `gemini.status` dans `httpError`, `text` aux messages de l'étape 6), `String(cause)` de `fetch` rejeté et de `res.text()` rejeté ; l'URL entre dans les messages sous la forme `redactKey(url, apiKey)` ; les `LLMError` de `fromGeminiResponse` sont relevées masquées (étape 7). Aucune propriété de l'erreur ne porte la clé : `LLMError` n'a en propre que `name`, `code`, `message`, `stack`, et `stack` reprend le message masqué.

### Ordre des commits et preuve de rouge

Un SPEC = un commit = un test, dans l'ordre SPEC-1 à SPEC-5. La spécification et la checklist entrent dans le commit de SPEC-1 (précédent de #18 et #19). Entre SPEC-1 et SPEC-5, `excerpt` n'est appliquée qu'à des chaînes non masquées : état intermédiaire de branche, module servi par aucun barrel.

- TEST-1 rouge avant SPEC-1 : une réponse 400 passe par `res.json()` puis `fromGeminiResponse`, qui lève « no candidate » au lieu du message attendu ; le cas « corps illisible » lève une `TypeError` (le double n'a pas de `json`).
- TEST-2 rouge avant SPEC-2 : le 404 `NOT_FOUND` rend `API_ERROR`.
- TEST-3 rouge avant SPEC-3 : la `TypeError` du double se propage, `name !== "LLMError"`.
- TEST-4 rouge avant SPEC-4 : `res.json()` rejette une `SyntaxError` ; `null` fait lever une `TypeError` à `fromGeminiResponse` ; le double sans `json` lève une `TypeError`.
- TEST-5 rouge avant SPEC-5 : la clé factice figure dans chaque message.

Gabarit (aucun `Co-Authored-By`) :

```
feat(llm): <sujet>

Refs: #25
Session: <id>
Model: <modèle>
Authorship: ai
```

Sujets, à l'impératif (forme infinitive des commits du dépôt) : SPEC-1 « typer en API_ERROR une réponse Gemini non ok, avec statut et extrait borné » ; SPEC-2 « traduire un 404 NOT_FOUND de Gemini en MODEL_NOT_FOUND » ; SPEC-3 « typer en API_ERROR un fetch Gemini rejeté » ; SPEC-4 « typer en API_ERROR un corps Gemini illisible ou non JSON » ; SPEC-5 « masquer la clé Gemini dans tout message d'erreur de transport ».

## Chemins nominal et d'erreur

| Étape | Nominal | Erreur |
|---|---|---|
| Transport | `fetchFn` résout | rejet → `API_ERROR` qui cite l'URL et `String(cause)` borné (SPEC-3) |
| Statut | `res.ok` | 404 `NOT_FOUND` → `MODEL_NOT_FOUND` (SPEC-2) ; autre 404 → `API_ERROR` avec indice `baseURL` ; autre statut → `API_ERROR` (SPEC-1) |
| Corps d'erreur | `res.text()` lu | lecture rejetée → `API_ERROR` avec le statut (SPEC-1) |
| Corps nominal | objet JSON | lecture rejetée, non JSON, non objet → `API_ERROR` (SPEC-4) |
| Lecture | `fromGeminiResponse` | ses `API_ERROR` relevées masquées (SPEC-5) |

## Symétrie

- Écriture face à lecture : la clé écrite dans l'en-tête `x-goog-api-key` est cherchée à la lecture dans tout ce qui revient (corps, exceptions) ; le corps d'erreur est lu par la même `readBody` que le corps nominal.
- Nominal face à erreur : chaque étape nominale de `complete()` après `fetch` a son `API_ERROR` (tableau ci-dessus) ; le chemin nominal reste couvert par les tests de #19, inchangés.
- 404 face à 404 : `NOT_FOUND` et autre statut, JSON et non JSON, 404 et 400 portant `NOT_FOUND` sont chacun testés (TEST-1, TEST-2).
- Énumérations : `LLMErrorCode` inchangé (`API_ERROR`, `MODEL_NOT_FOUND` existent). Aucune base de données.

## Données touchées

Aucune base, aucun fichier, aucune variable d'environnement nouvelle. Tous les `fetch` des tests sont des doubles ; les réponses dont `text()` rejette sont des objets `{ ok, status, text }` convertis en `Response`.

## Décisions et alternatives écartées

- **D1 · `res.ok` d'abord (P1).** Un corps d'erreur ne passe plus par `fromGeminiResponse` (message « no candidate » trompeur de #19).
- **D2 · Extrait plutôt que rien (P2).** Le message porte `error.message` du corps Gemini quand il existe, sinon le texte : c'est ce qui dit pourquoi l'appel échoue (clé invalide, argument refusé). Écarté : aucun extrait, qui ne laisserait que le statut ; le corps brut, interdit par P2 et illisible pour une page HTML.
- **D3 · Borne de 200 caractères, masquage avant troncature.** 200 couvre une phrase d'erreur Gemini et coupe une page HTML ; le masquage d'abord empêche qu'une coupure au milieu de la clé laisse un préfixe que `replaceAll` ne reconnaît plus. La même borne s'applique à `String(cause)` et à `error.status`.
- **D4 · Pas de cause chaînée (P4).** Une cause garde la chaîne non masquée (message d'un `fetch` rejeté, `SyntaxError` dont V8 cite un fragment du corps) ; son texte utile entre masqué dans le message. Écarté : la cause d'Ollama (`ollama-llm-provider.ts:122`). Coût accepté : `cause.cause` d'undici (code réseau) est perdu.
- **D5 · URL masquée.** Elle vient de la configuration, pas du serveur ; `redactKey` coûte un appel et couvre une clé mise par erreur dans `baseURL`.
- **D6 · `JSON.parse(await res.text())` plutôt que `res.json()`.** L'extrait du corps illisible est construit par nous, masqué puis borné, au lieu du message de V8 qui peut citer un fragment tronqué de la clé.
- **D7 · Relever masquées les `LLMError` de `fromGeminiResponse`.** Ses messages citent `blockReason` et `finishReason`, chaînes externes (P4) ; `gemini-wire.ts` n'est pas modifié.
- **D8 · Indice `baseURL` sur un 404 non `NOT_FOUND`.** Réalise ce que D2 de #19 annonçait (« la réponse 404 qui la révélera est traitée par #25 »), comme Ollama (`ollama-llm-provider.ts:137-140`).
- **D9 · Masquage littéral.** Une clé très courte (un caractère) masque trop ; accepté, la sûreté passe avant la lisibilité.
- Pas de nouvel ADR.

## Tests

Tous ajoutés à `tests/llm/providers/gemini/gemini-llm-provider.test.ts`, déterministes, sans réseau. Conventions en plus de celles de #19 :

- `ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"`.
- Double `respondingFetch(status, body)` : compte ses appels et rend `new Response(body, { status })`.
- Double `unreadableFetch(status, error)` : rend `{ ok: status >= 200 && status < 300, status, text: async () => { throw error } }` converti en `Response`.
- Double `rejectingFetch(reason)` : rend `Promise.reject(reason)`.
- Aide `exposed(error)` : concatène `String(error)`, `JSON.stringify(error)`, `error.name`, `error.code`, et `String(error[p])` pour chaque `p` de `Object.getOwnPropertyNames(error)`.
- Chaque cas s'exécute sous `withEnv({ [KEY_VAR]: <clé> })` avec `apiKeyVar: KEY_VAR`, `models: DECLARED` et `complete([{ role: "user", content: "hi" }], { model: MODEL })`. Clé `cle-factice-1` pour TEST-1 à TEST-4, `cle-factice-ne-pas-afficher` pour TEST-5.
- Les messages attendus sont vérifiés par égalité exacte (motif `^…$` dans `llmError`, ou `assert.equal`).
- Les cas qui verrouillent H7 et H8 ont un titre qui commence par `hypothesis H7:` et `hypothesis H8:`.

## Estimation de taille

Hors `docs/` et `*.md` : `gemini-llm-provider.ts` +70 à +90 lignes (en-tête 4, transport 8, statut 2, corps et objet 12, enveloppe de lecture 8, `httpError` 18, `geminiErrorOf` 12, `readBody` 8, `excerpt` et `redactKey` 8) ; tests +170 à +220 (doubles et `exposed` 30, TEST-1 50, TEST-2 30, TEST-3 20, TEST-4 30, TEST-5 55). Total estimé : environ 265 lignes, fourchette 240 à 310, sous le plafond de 400 ; au-dessus de l'estimation de l'issue (environ 150), à cause des messages exacts, du chemin « corps illisible » des deux côtés de `res.ok` et des sept cas de TEST-5. La mesure fait foi à la PR.

## Hypothèses restantes

- H7 : Gemini répond à un modèle inconnu par 404 et un corps `{"error":{"code":404,"message":…,"status":"NOT_FOUND"}}`, et un chemin qui n'atteint pas l'API (mauvais `baseURL`) ne rend pas cette forme. Non vérifiée contre l'API réelle ; verrou : cas « hypothesis H7: an unknown model answers 404 with error.status NOT_FOUND » de TEST-2.
- H8 : les corps d'erreur de Gemini ont la forme `{ error: { code, message, status } }`. Non vérifiée ; verrou : cas « hypothesis H8: an API error body is { error: { code, message, status } } » de TEST-1.
- H1, H5 et H6 de #18 et #19 restent en l'état.
