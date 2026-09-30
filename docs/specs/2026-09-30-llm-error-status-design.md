# Spécification · Porter le statut HTTP sur LLMError · #34

Date : 2026-09-30
Issue : https://github.com/arthurolivierfortin/agent-core/issues/34 (type feature ; découpage du 2026-09-30 de #20, option C du pilote ; préalable à #35, coupure plafonnée `capGuard`)
Checklist : docs/specs/2026-09-30-llm-error-status-checklist.md
Branche : `feat/34-llm-error-status` (worktree `.claude/worktrees/feat+34-llm-error-status`, `main` 349ee1d)

## Objectif

Donner à `LLMError` deux champs numériques facultatifs, `status` (statut HTTP) et `retryAfterMs` (délai demandé par `Retry-After`), posés par `GeminiLLMProvider` sur toute erreur d'une réponse non `ok` seulement, pour que `capGuard` (#35) classe la cause d'une coupure sur un champ et jamais sur le texte d'un message.

## Source de l'issue (corps relevé le 2026-09-30) et décisions du pilote

Corps de l'issue :

1. `LLMError` porte un champ facultatif `status?: number` (statut HTTP), et éventuellement `retryAfterMs?: number` (délai demandé par le serveur, lu dans `Retry-After` quand il est présent).
2. `GeminiLLMProvider` pose `status` (et `retryAfterMs` s'il est présent) sur les erreurs HTTP qu'il lève ; une erreur réseau ou de lecture n'a pas de `status`.
3. Tests sur un double de `fetch` : statut posé sur une réponse non ok (dont 429 et 404), absent sur un fetch rejeté ; aucune valeur de clé dans l'erreur.
4. Aucun barrel changé ; les codes fermés de `LLMError` ne changent pas.

Contraintes : aucun appel réseau ni fournisseur hébergé dans la suite ; gates build, typecheck, test ; PR sous 400 lignes hors `docs/` et `*.md`, sans dérogation.

Décision du pilote (option C), qui précise le corps : le 404 `NOT_FOUND` traduit en `MODEL_NOT_FOUND` porte aussi `status` 404 ; le test de masquage existant reste vert et les champs ajoutés ne portent aucune chaîne externe non masquée ; les appels existants de `new LLMError` restent valides ; si `retryAfterMs` est retenu, le format accepté et le cas invalide sont écrits. Contraintes du pilote : aucun `console.log`, aucun `.env` lu, gabarits de commit sans `Co-Authored-By`, sujets à l'impératif de 72 caractères au plus, chemins relatifs au dépôt dans toute preuve.

Précision du coordinateur (2026-09-30, même passe), qui borne le point 2 : « une erreur de lecture n'a pas de `status` » vise la lecture du corps d'une réponse `ok` (200 illisible ou non JSON), qui n'est pas une erreur HTTP. Pour une réponse non `ok`, le statut est connu dès `res.status` : l'erreur levée quand son corps d'erreur est illisible porte `status`, et `retryAfterMs` si l'en-tête est lisible. Sinon `capGuard` ne pourrait pas classer un 429 au corps illisible (D3).

## État constaté dans le code (lecture du 2026-09-30, `main` 349ee1d)

- `src/llm/models/index.ts:79-85` : `LLMErrorCode` fermé (`MISSING_API_KEY`, `API_ERROR`, `UNKNOWN_PROVIDER`, `STREAMING_UNSUPPORTED`, `MODEL_NOT_FOUND`). l.87-99 : `class LLMError extends Error`, champ `readonly code: LLMErrorCode`, `constructor(code, message, options?: { cause?: unknown })` qui appelle `super(message, options)` puis pose `name = "LLMError"` et `code`.
- `src/llm/index.ts:2` : `export * from "./models/index.js"`. Tout nouveau symbole exporté de `src/llm/models/index.ts` changerait donc la surface des barrels `.` et `./llm` : le type des options reste en ligne, sans nom exporté.
- `tsconfig.json:3` : cible ES2022, sans `useDefineForClassFields` ; sa valeur par défaut est donc `true`, et un champ de classe déclaré `readonly status?: number;` serait émis comme une définition de propriété propre valant `undefined` sur toute instance (voir D2).
- `src/llm/providers/gemini/gemini-llm-provider.ts:100` : `if (!res.ok) throw await httpError(res, url, opts.model, apiKey)`. l.135-153 : `httpError` lit le corps par `readBody` (l.136), puis construit trois `LLMError` : `MODEL_NOT_FOUND` pour un 404 dont `error.status` vaut `NOT_FOUND` (l.143-145), `API_ERROR` avec indice `baseURL` pour tout autre 404 (l.146-151), `API_ERROR` pour tout autre statut (l.152). l.172-180 : `readBody(res, apiKey)` → `API_ERROR` « Gemini <res.status> response body could not be read », utilisée sur les deux chemins : non `ok` via `httpError` (l.136), `ok` directement (l.102). l.94-98 : `fetch` rejeté → `API_ERROR` sans cause. l.107, l.111, l.117 : erreurs du chemin `ok` (corps non JSON, non objet, erreurs de `fromGeminiResponse` relevées masquées). l.80-83 et l.126 : `MISSING_API_KEY` et `MODEL_NOT_FOUND` d'un modèle non déclaré, levées avant tout `fetch`. Aucune lecture d'en-tête de réponse dans le module.
- `src/llm/providers/ollama/ollama-llm-provider.ts:121-143` : `fetch` rejeté et réponse non `ok` levés en `LLMError` sans statut ; précédent de structure pour Gemini, non modifié ici (D5).
- `tests/llm/providers/gemini/gemini-llm-provider.test.ts:259` : `ENDPOINT` ; l.74-81 : `unreachableFetch()` ; l.262-269 : `respondingFetch(status, body)` rend `new Response(body, { status })` ; l.272-281 : `unreadableFetch(status, error)` rend un objet `{ ok, status, text }` **sans `headers`** ; l.283 : `type TransportError = Error & { code: string }` ; l.286-300 : `expectFailure(fetchFn, code, message, key = "cle-factice-1", baseURL?)` vérifie `name`, `code`, message exact et rend l'erreur ; l.339-345 : cas existant « an error body that cannot be read is an API_ERROR with the status » (`unreadableFetch(500, …)`) ; l.374-376 : `rejectingFetch(reason)` ; l.407-410 : `exposed(error)` (concatène `String`, `JSON.stringify`, `name`, `code` et chaque propriété propre) ; l.413 : `PLANTED_KEY` ; l.415-503 : `REDACTION_CASES`, onze cas qui vérifient qu'aucune erreur sérialisée ne contient la clé.
- `tests/barrel-contract.test.ts:35`, `:48` : `LLMError` exposé par `.` et `./llm` ; aucun test n'y lit les champs de `LLMError`. Aucun test unitaire de la classe `LLMError` n'existe (`tests/llm/` ne contient que `providers/` et `testing/`).
- `package.json:36` : `npm run test` = `npm run build && node --test` ; les tests importent depuis `dist/`, et `node --test` découvre `tests/**/*.test.ts`.
- Manifeste (`CLAUDE.md`, bloc `core-project`) : `GATE-1 build` `npm run build`, `GATE-2 typecheck` `npm run typecheck`, `GATE-3 test` `npm run test`.

## Périmètre

Dans la PR :

- `LLMError` accepte `status` et `retryAfterMs` dans ses options et ne les pose en propriété propre que lorsqu'ils sont définis (SPEC-1).
- `GeminiLLMProvider` pose `status: res.status` sur toute `LLMError` levée pour une réponse non `ok` : les trois de `httpError` et celle de `readBody` quand le corps d'erreur est illisible (SPEC-2).
- `GeminiLLMProvider` lit `Retry-After` d'une réponse non `ok` et pose `retryAfterMs` sur ces mêmes erreurs quand la valeur est un nombre entier de secondes (SPEC-3).

Hors périmètre :

- `LLMErrorCode` : inchangé (aucun code ajouté ni retiré).
- Barrels (`src/index.ts`, `src/llm/index.ts`, `src/llm/providers/index.ts`, `src/testing/index.ts`) et `tests/barrel-contract.test.ts` : non modifiés ; aucun nouveau symbole exporté.
- `OllamaLLMProvider`, `FakeLLMProvider`, `step.ts`, `gemini-wire.ts`, `checkProviderContract` : non modifiés (D5).
- La classification elle-même (`capGuard`, quels statuts valent « quota », « limite de débit », « panne ») : #35.
- La forme HTTP-date de `Retry-After` et le délai porté dans le corps Gemini (`error.details[]` de type `google.rpc.RetryInfo`, champ `retryDelay`) : non lus (D4, H9).
- README, `docs/guide-agent-package.md`, `ROADMAP.md` : non modifiés. La documentation des champs est leur TSDoc dans `src/llm/models/index.ts`, servie par `dist/llm/models/index.d.ts` ; le premier lecteur, #35, décrit la classification qui s'en sert.
- Nouvelle tentative, attente, `AbortSignal` : rien n'attend `retryAfterMs` dans ce dépôt.

## Conception

### Placement

| Fichier | Contenu |
|---|---|
| `src/llm/models/index.ts` | `LLMError` : deux champs `declare readonly`, options élargies, TSDoc (SPEC-1) |
| `src/llm/providers/gemini/gemini-llm-provider.ts` | `readBody` avec un troisième paramètre facultatif `http` ; `httpError` construit `http` avant la lecture et le passe à `readBody` et à ses trois `LLMError` ; fonction de module non exportée `retryAfterMsOf` ; en-tête du module (SPEC-2, SPEC-3) |
| `tests/llm/models/llm-error.test.ts` | nouveau fichier, TEST-1 |
| `tests/llm/providers/gemini/gemini-llm-provider.test.ts` | `TransportError` élargi, `respondingFetch` et `unreadableFetch` avec en-têtes facultatifs, TEST-2 et TEST-3 ajoutés en fin de fichier |

### `LLMError` (SPEC-1)

```ts
export class LLMError extends Error {
  readonly code: LLMErrorCode;
  /** HTTP status of the response that failed, when the provider reports one. */
  declare readonly status?: number;
  /** Delay the server asked for before a new attempt, in milliseconds, read from Retry-After. */
  declare readonly retryAfterMs?: number;

  constructor(
    code: LLMErrorCode,
    message: string,
    options?: { cause?: unknown; status?: number; retryAfterMs?: number },
  ) {
    super(message, options);
    this.name = "LLMError";
    this.code = code;
    if (options?.status !== undefined) this.status = options.status;
    if (options?.retryAfterMs !== undefined) this.retryAfterMs = options.retryAfterMs;
  }
}
```

- `super(message, options)` reste tel quel : `Error` ne lit que la clé `cause` de ses options, `status` et `retryAfterMs` y sont ignorés.
- Un champ défini devient une propriété propre, énumérable, de type `number` ; un champ `undefined` ou omis n'existe pas sur l'instance (`Object.hasOwn(error, "status") === false`).
- Le constructeur copie les valeurs telles quelles, sans validation : c'est le fournisseur qui garantit leur forme (SPEC-3 pour `retryAfterMs`).
- TSDoc de la classe complété, en anglais comme le reste du fichier : les deux champs sont des nombres, jamais des chaînes ; `status` n'est posé que par un fournisseur qui le rapporte (aujourd'hui `GeminiLLMProvider`, sur toute erreur d'une réponse non `ok`) ; **son absence ne dit pas que l'échec n'était pas HTTP**, elle dit que le fournisseur n'a pas rapporté de statut.
- Compatibilité : les appels `new LLMError(code, message)` et `new LLMError(code, message, { cause })` existants (`src/llm/providers/ollama/ollama-llm-provider.ts`, `src/llm/providers/gemini/`, `src/llm/providers/index.ts`, `src/llm/testing/fake-llm-provider.ts`, `src/agent/application/use-cases/step.ts`, trois tests) compilent et se comportent comme avant : aucune propriété propre ajoutée.

### `readBody(res, apiKey, http?)` (SPEC-2)

```ts
async function readBody(res: Response, apiKey: string, http?: { status: number; retryAfterMs?: number }): Promise<string>
```

Sur rejet de `res.text()`, lève `new LLMError("API_ERROR", "Gemini <res.status> response body could not be read: <excerpt(redactKey(String(cause), apiKey))>", http)` : message inchangé au caractère près ; `http` vaut `undefined` sur le chemin `ok` (appel de la l.102, inchangé), donc aucune propriété posée ; il porte `status` (et `retryAfterMs` après SPEC-3) quand l'appelant est `httpError`.

### `httpError(res, url, model, apiKey)` (SPEC-2, SPEC-3)

Signature inchangée. `http` est construit **avant** la lecture du corps, puisque le statut et les en-têtes sont connus dès la réponse :

- SPEC-2 : `const http = { status: res.status };` en première instruction, puis `const text = await readBody(res, apiKey, http)`, puis `http` passé en troisième argument aux trois `new LLMError(...)` (`MODEL_NOT_FOUND` du 404 `NOT_FOUND`, `API_ERROR` des autres 404, `API_ERROR` des autres statuts). Messages inchangés au caractère près.
- SPEC-3 : `const http = { status: res.status, retryAfterMs: retryAfterMsOf(res) };`, le constructeur ignorant `retryAfterMs` quand il vaut `undefined`.

Rien d'autre ne pose `status` ni `retryAfterMs` : `fetch` rejeté (l.94-98), `readBody` rejeté sur le chemin `ok` (l.102), corps `ok` non JSON ou non objet (l.107, l.111), erreurs relevées de `fromGeminiResponse` (l.117), `MISSING_API_KEY` (l.80-83), modèle non déclaré (l.126). `retryAfterMsOf` n'est jamais appelée sur une réponse `ok`.

### `retryAfterMsOf(res)` (SPEC-3)

```ts
/** Retry-After in delay-seconds form, as milliseconds; undefined when absent or in any other form. */
function retryAfterMsOf(res: Response): number | undefined
```

1. `const raw = res.headers.get("retry-after")` ; `null` → `undefined`.
2. `const value = raw.trim()` ; si `value` ne correspond pas à `/^\d+$/` → `undefined`.
3. `const ms = Number(value) * 1000` ; rend `ms` si `Number.isSafeInteger(ms)`, sinon `undefined`.

Format accepté : la forme `delay-seconds` de RFC 9110 §10.2.3, un entier décimal non négatif de secondes (`"0"` compris, qui donne `0`). Cas invalides, qui laissent `retryAfterMs` absent **sans lever** et sans changer ni le code, ni le message, ni `status` : en-tête absent, valeur vide, négative (`"-1"`), décimale (`"1.5"`), suffixée (`"30s"`), forme HTTP-date (`"Wed, 21 Oct 2015 07:28:00 GMT"`), texte quelconque, entier dont la valeur en millisecondes n'est pas un entier sûr (`"99999999999999999999"`). La valeur brute de l'en-tête n'entre jamais dans un message ni dans une propriété : seule sa conversion numérique sort.

Appelée avant `readBody` : l'en-tête reste lisible quand le corps ne l'est pas. Le double `unreadableFetch` reçoit donc des `headers` (section « Tests »).

### En-tête du module `gemini-llm-provider.ts`

SPEC-2 ajoute, après la ligne qui renvoie à #25 : `// HTTP status (#34): docs/specs/2026-09-30-llm-error-status-design.md. Every LLMError of a non-ok response carries status, even when its body cannot be read; a network failure or an ok response carries none.` SPEC-3 y ajoute : `// retryAfterMs comes from a Retry-After in delay-seconds form only (H9).` Aucun commit n'affirme ce qu'il ne fait pas encore.

### Ordre des commits et preuve de rouge

Un SPEC = un commit = un test, dans l'ordre SPEC-1, SPEC-2, SPEC-3. La spécification et la checklist entrent dans le commit de SPEC-1 (précédent de #18, #19, #25).

- TEST-1 rouge avant SPEC-1 : `npm run typecheck` refuse `{ status: 429 }` dans les options ; à l'exécution, `error.status` vaut `undefined` au lieu de `429`.
- TEST-2 rouge avant SPEC-2 : les cas 429 (corps lisible et corps illisible) rendent `status` `undefined`. Ses cas « absent » sont déjà verts avant SPEC-2 : ils verrouillent la frontière (précédent P4 de #25).
- TEST-3 rouge avant SPEC-3 : le cas `retry-after: 30` rend `retryAfterMs` absent au lieu de `30000`. Ses cas invalides sont déjà verts avant SPEC-3 : ils verrouillent la frontière.

Gabarit (aucun `Co-Authored-By`) :

```
feat(llm): <sujet>

Refs: #34
Session: <id>
Model: <modèle>
Authorship: ai
```

Sujets, à l'impératif, 72 caractères au plus type compris :

- SPEC-1 : `feat(llm): ajouter status et retryAfterMs facultatifs à LLMError` (64)
- SPEC-2 : `feat(llm): poser status sur les réponses Gemini non ok` (54)
- SPEC-3 : `feat(llm): lire Retry-After de Gemini en retryAfterMs` (53)

Message de squash proposé :

```
feat(llm): porter le statut HTTP sur LLMError (#34)

LLMError accepte deux champs numériques facultatifs, status et
retryAfterMs, qui ne deviennent des propriétés propres que lorsqu'ils
sont définis : les appels existants restent valides et leurs erreurs
inchangées. GeminiLLMProvider pose status sur toute erreur d'une
réponse non ok, 404 NOT_FOUND traduit en MODEL_NOT_FOUND et corps
d'erreur illisible compris, et retryAfterMs quand Retry-After est un
entier de secondes. Un fetch rejeté et les erreurs d'une réponse ok
n'en portent aucun. Codes fermés, barrels et OllamaLLMProvider
inchangés. Préalable à #35 : capGuard classe une coupure sur un
champ, jamais sur le texte d'un message.

Refs: #34
Session: <id>
Model: <modèle>
Authorship: ai
```

## Chemins nominal et d'erreur

| Situation | `status` | `retryAfterMs` |
|---|---|---|
| Réponse `ok`, lecture réussie | aucune erreur | aucune erreur |
| Réponse non `ok`, corps lu (400, 404 `NOT_FOUND` → `MODEL_NOT_FOUND`, autre 404, 429, 500, 503) | `res.status` (SPEC-2) | entier de secondes × 1000 si `Retry-After` valide, sinon absent (SPEC-3) |
| Réponse non `ok`, corps illisible (`API_ERROR` de `readBody`) | `res.status` (SPEC-2) | entier de secondes × 1000 si `Retry-After` valide, sinon absent (SPEC-3) |
| `fetch` rejeté | absent | absent |
| Réponse `ok`, corps illisible, non JSON, non objet, ou refusé par `fromGeminiResponse` | absent | absent, même si `Retry-After` est présent |
| `MISSING_API_KEY`, modèle non déclaré | absent | absent |

## Symétrie

- Écriture face à lecture : `GeminiLLMProvider` écrit les champs ; dans ce dépôt, seuls TEST-1 à TEST-3 les lisent ; le lecteur applicatif est `capGuard` (#35). Un `MODEL_NOT_FOUND` sans `status` (modèle non déclaré, local) se distingue ainsi d'un `MODEL_NOT_FOUND` à `status` 404 (réponse du serveur).
- Corps lisible face à corps illisible : sur une réponse non `ok`, les deux portent `status` (TEST-2 (a) face à (f)) et `retryAfterMs` (TEST-3 (a) face à (h)) ; sur une réponse `ok`, aucun des deux (TEST-2 (i) et (j), TEST-3 (f) et (i)).
- Nominal face à erreur : pour `Retry-After`, le format accepté (cas (a) à (c) et (h) de TEST-3) a ses cas invalides nommés (cas (d) et (e)) ; pour `status`, chaque chemin qui le pose (cas (a) à (g) de TEST-2) fait face aux chemins qui ne le posent pas (cas (h) à (l)).
- Masquage : les deux champs sont des nombres ; la valeur brute de `Retry-After` n'est ni citée ni copiée. Le cas (g) de TEST-3 plante la clé dans `Retry-After` et vérifie son absence de l'erreur sérialisée ; `REDACTION_CASES` reste vert tel quel, `exposed(error)` y voyant désormais des statuts numériques.
- Énumérations : `LLMErrorCode` inchangé. Aucune base de données.
- Fournisseurs : `OllamaLLMProvider` ne pose rien (D5) ; le TSDoc de `LLMError` dit que l'absence de `status` n'implique pas un échec non HTTP.

## Données touchées

Aucune base, aucun fichier, aucune variable d'environnement nouvelle. Lecture d'un en-tête de réponse (`retry-after`). Tous les `fetch` des tests sont des doubles.

## Décisions et alternatives écartées

- **D1 · Deux champs facultatifs portés par les options du constructeur.** Troisième argument élargi (`{ cause?, status?, retryAfterMs? }`) plutôt qu'un quatrième paramètre positionnel ou une sous-classe `HttpLLMError` : les appels existants restent valides sans changement, et `instanceof LLMError` reste le seul test utile. Écarté : un type d'options nommé et exporté, qui changerait la surface des barrels par `export *` (`src/llm/index.ts:2`).
- **D2 · `declare readonly`, propriété posée seulement si définie.** Avec la cible ES2022, `useDefineForClassFields` vaut `true` par défaut : un champ `readonly status?: number;` créerait `status: undefined` en propre sur toutes les `LLMError`, y compris celles d'Ollama et du faux. `declare` n'émet rien ; l'absence est alors vérifiable par `Object.hasOwn`, et `Object.keys` des erreurs existantes reste `["code", "name"]` à l'ordre près.
- **D3 (révisée le 2026-09-30) · `status` sur toute erreur d'une réponse non `ok`, lecture du corps d'erreur comprise.** Le statut HTTP est connu dès `res.status`, avant toute lecture du corps : une erreur levée parce que le corps d'une réponse non `ok` est illisible décrit toujours un échec HTTP, et le perdre empêcherait `capGuard` (#35) de classer un 429 au corps illisible, ce qui est l'objet de l'issue. La règle « une erreur de lecture n'a pas de `status` » s'applique au corps d'une réponse `ok` (illisible, non JSON, non objet, refusé par `fromGeminiResponse`), qui n'est pas une erreur HTTP, et une erreur réseau (`fetch` rejeté) n'a pas de réponse. Réalisation : `http` construit en tête de `httpError` et passé à `readBody`, dont l'appel sur le chemin `ok` ne passe rien. Écarté : attraper l'erreur de `readBody` dans `httpError` pour la relever avec `status`, qui construirait deux `LLMError` pour un échec ; laisser le 429 illisible sans `status` (première rédaction de cette passe), qui rendait la classification incomplète.
- **D4 · `Retry-After` en secondes entières seulement.** La forme HTTP-date exige l'heure courante, donc une horloge injectée pour rester testable ; elle est écartée ici et lue comme invalide. Le délai du corps Gemini (`RetryInfo.retryDelay`) est écarté : l'issue nomme `Retry-After`, et sa forme n'est pas vérifiée (H9). `Number.isSafeInteger` borne la conversion pour qu'aucune valeur non entière ou imprécise ne sorte.
- **D5 · `OllamaLLMProvider` inchangé.** L'issue ne vise que Gemini ; Ollama est local et gratuit, `capGuard` (#35) protège une dépense qu'il ne produit pas ; le champ est facultatif et son absence est documentée comme « non rapporté ». Écarté : poser `status` sur les trois erreurs HTTP d'Ollama (`ollama-llm-provider.ts:132-142`), candidat à une issue de suivi si un consommateur en a besoin.
- **D6 · Aucune validation dans le constructeur.** `LLMError` est un porteur ; un `status` hors plage passé par un appelant est de sa responsabilité. Écarté : lever depuis le constructeur d'une erreur, qui masquerait l'erreur d'origine.
- Pas de nouvel ADR : l'ajout est additif et ne change aucune décision de `docs/decisions/` (ADR-AGENT-0012 place `LLMError` dans `llm`, ce qui reste vrai).

## Tests

Déterministes, sans réseau, sans `console.log`.

- TEST-1 dans un nouveau fichier `tests/llm/models/llm-error.test.ts`, qui importe `LLMError` depuis `../../../dist/llm/models/index.js`.
- TEST-2 et TEST-3 ajoutés à la fin de `tests/llm/providers/gemini/gemini-llm-provider.test.ts`, qui réutilisent `withEnv`, `expectFailure`, `ENDPOINT`, `respondingFetch`, `unreadableFetch`, `unreachableFetch`, `rejectingFetch`, `exposed`, `PLANTED_KEY`, `KEY_VAR`, `DECLARED`, `MODEL`.
- `type TransportError` devient `Error & { code: string; status?: number; retryAfterMs?: number }` (commit de SPEC-2).
- `respondingFetch(status, body, headers?: Record<string, string>)` rend `new Response(body, { status, headers })` ; ses appels existants, sans troisième argument, sont inchangés (commit de SPEC-3).
- `unreadableFetch(status, error, headers?: Record<string, string>)` ajoute `headers: new Headers(headers)` à l'objet `{ ok, status, text }` qu'il rend ; sans troisième argument, `headers.get(...)` rend `null`, et ses appels existants sont inchangés. Changé au plus tard dans le commit de SPEC-3 : à partir de SPEC-3, `httpError` appelle `retryAfterMsOf(res)` avant `readBody`, et un double sans `headers` y lèverait une `TypeError` (cas existant des l.339-345, cas (f) et (g) de TEST-2).
- `QUOTA_BODY = JSON.stringify({ error: { code: 429, message: "Quota exceeded.", status: "RESOURCE_EXHAUSTED" } })`, message attendu `Gemini 429 RESOURCE_EXHAUSTED from <ENDPOINT>: Quota exceeded.`
- « Absent » se vérifie par `Object.hasOwn(error, "<champ>") === false`, ce qui implique `error.<champ> === undefined`.

## Estimation de taille

Hors `docs/` et `*.md` : `src/llm/models/index.ts` environ +14 −2 (TSDoc 5, deux champs 4, options 5) ; `gemini-llm-provider.ts` environ +25 −5 (en-tête 3, `readBody` 3, `httpError` 6, `retryAfterMsOf` 13) ; `tests/llm/models/llm-error.test.ts` environ +45 ; `gemini-llm-provider.test.ts` environ +120 −4 (aides 7, TEST-2 55, TEST-3 60). Total estimé : environ 204 lignes ajoutées, fourchette 165 à 260, sous le plafond de 400. La mesure fait foi à la PR.

## Hypothèses restantes

- H9 : Gemini signale un délai de nouvelle tentative par un en-tête `Retry-After` en secondes entières sur ses réponses 429 ou 503. Non vérifiée contre l'API réelle ; il est plausible que Gemini ne l'envoie pas et porte le délai dans `error.details[]` (`google.rpc.RetryInfo`, `retryDelay` du type `"30s"`). Conséquence si H9 est fausse : `retryAfterMs` reste absent sur les erreurs Gemini, `status` 429 reste posé ; #35 ne doit pas dépendre de `retryAfterMs` pour classer une coupure.
- H7, H8 (#25) et H1, H5, H6 (#18, #19) restent en l'état.
