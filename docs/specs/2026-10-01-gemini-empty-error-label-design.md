# Spécification · Distinguer un error.message Gemini vide d'un corps vide · #32

Date : 2026-10-01
Issue : https://github.com/arthurolivierfortin/agent-core/issues/32 (label `T:bug` ; relevé sur #25, PR #29, figé tel quel par #26, R1)
Checklist : docs/specs/2026-10-01-gemini-empty-error-label-checklist.md
Branche : `fix/32-gemini-empty-error-label` (worktree `.claude/worktrees/fix+32-gemini-empty-error-label`, `main` 491746a)
Continuité : docs/specs/2026-09-30-gemini-errors-design.md (#25 : `httpError`, extrait borné D2, masquage D3) ; docs/specs/2026-09-30-gemini-wiring-design.md (#26 : SPEC-7 et R1, qui figent le libellé `(empty body)` d'un `error.message` vide) ; docs/specs/2026-09-30-llm-error-status-design.md (#34 : `status` et `retryAfterMs` sur `LLMError`)

## Objectif

Qu'une réponse Gemini non ok dont le corps JSON porte un `error.message` vide se termine par `(empty error message)` au lieu de `(empty body)`, le libellé `(empty body)` restant réservé au corps réellement vide, sans rien changer d'autre à l'erreur levée.

## Source de l'issue

Corps de l'issue : relevé sur #25 (PR #29) et figé tel quel par un test dans #26 (R1) : quand la réponse Gemini porte un corps avec `error.message` vide, le message d'erreur dit « (empty body) » alors que le corps n'est pas vide. Attendu : libellé distinct (par exemple « (empty error message) »), statut conservé, test ajusté, masquage inchangé.

Précisions du pilote : distinguer les cas (corps vraiment vide ; corps JSON avec `error.message` vide ou absent ; corps non JSON) et le libellé de chacun ; `status` et `retryAfterMs` (#34) restent posés ; le masquage de la clé ne change pas ; aucun code de l'union fermée `LLMErrorCode` ne change ; dire l'effet observable (texte de message seulement) ; le test qui figeait le libellé (#26, R1) est ajusté, pas supprimé ; aucun appel réseau (fetch injecté) ; aucune valeur de clé nulle part ; aucun `console.log` dans `src/` ; aucun `.env` lu ; taille minime (seuil 400).

## État constaté dans le code (lecture du 2026-10-01, `main` 491746a)

- `src/llm/providers/gemini/gemini-llm-provider.ts:134-139` : commentaire de `httpError` (« The message quotes Gemini's error.message when the body carries one (H8), else the body text … »), qui ne nomme aucun libellé de vide.
- `src/llm/providers/gemini/gemini-llm-provider.ts:140-165` : `httpError(res, url, model, apiKey)`. L.142 `const http = { status: res.status, retryAfterMs: retryAfterMsOf(res) };` ; l.143 `const text = await readBody(res, apiKey, http);` ; l.144 `const gemini = geminiErrorOf(text);` ; l.145 `const detail = gemini?.message ?? text;` ; **l.146 `const extract = detail === "" ? "(empty body)" : excerpt(redactKey(detail, apiKey));`** ; l.147 `errorStatus` ; l.150-156 `MODEL_NOT_FOUND` (404 et `error.status === "NOT_FOUND"`) ; l.157-163 `API_ERROR` d'un autre 404 ; l.164 `API_ERROR` de tout autre statut. Les trois messages finissent par `: ${extract}` et reçoivent `http` en options.
- `src/llm/providers/gemini/gemini-llm-provider.ts:184-198` : `geminiErrorOf(text)` rend `undefined` si `text` n'est pas du JSON (dont `""` : `JSON.parse("")` lève) ou si `error` n'est pas un objet non nul ; sinon `{ status, message }`, chacun `undefined` s'il n'est pas une chaîne.
- Conséquence : `detail === ""` est vrai dans deux cas que l.146 confond, le corps vide (`gemini` indéfini, `text === ""`) et le corps `{"error":{"message":""}}` (`gemini.message === ""`). C'est le défaut de l'issue.
- `tests/llm/providers/gemini/gemini-llm-provider.test.ts:337-342` : commentaire `// Fixed as it is (R1 of #26): the body is not empty, only its error.message is.` puis test `an error body whose error.message is empty is labelled (empty body)`, qui attend `Gemini 400 INVALID_ARGUMENT from ${ENDPOINT}: (empty body)` et un seul appel au double.
- Corps réellement vide, attendu `(empty body)` par trois tests existants : l.318-325 (`a non-ok response quotes its status and a bounded excerpt of its body, never the whole body`, 500 vide, l.323), l.525-549 (`every LLMError of a non-ok response carries its status, 404 NOT_FOUND included`, 503 vide, l.546, `status` 503), l.592-… (`a Retry-After in whole seconds is retryAfterMs on every error of a non-ok response`, 503 vide avec `retry-after: 0`, l.603, `status` 503 et `retryAfterMs` 0).
- Aucun test ne fixe aujourd'hui le cas « objet `error` sans `message` » (corps JSON cité en extrait).
- `tests/llm/providers/gemini/gemini-llm-provider.test.ts:262-273` : `respondingFetch(status, body, headers?)`, double qui compte ses appels ; l.291-305 : `expectFailure(fetchFn, code, message, key?, baseURL?)` compare `name`, `code` et `message` exacts et rend l'erreur ; l.420-508 : les onze cas de masquage `REDACTION_CASES`.
- `src/llm/models/index.ts:80-85` : `LLMErrorCode`, union fermée de cinq codes ; l.95-116 : `LLMError`, `status` et `retryAfterMs` propres seulement quand donnés.
- Le libellé `(empty body)` n'apparaît hors `docs/` que dans `src/llm/providers/gemini/gemini-llm-provider.ts:146` et dans le fichier de test ci-dessus ; ni `README.md` ni `docs/guide-agent-package.md` ne le citent. Le dépôt n'a pas de `CHANGELOG`.

## Périmètre

Dans la PR :

- `src/llm/providers/gemini/gemini-llm-provider.ts` : choix du libellé de vide dans `httpError` et commentaire de `httpError` (SPEC-1).
- `tests/llm/providers/gemini/gemini-llm-provider.test.ts` : le test de #26 (l.337-342) ajusté, renommé et étendu (TEST-1).

Hors périmètre :

- Le chemin ok (statut 2xx) : messages `response is not JSON`, `response is not a JSON object`, `response body could not be read`, `no candidate` ; inchangés.
- `readBody`, `geminiErrorOf`, `retryAfterMsOf`, `redactKey`, `excerpt`, `MAX_EXCERPT_LENGTH` : inchangés.
- `src/llm/models/index.ts` (`LLMErrorCode`, `LLMError`), `src/llm/providers/gemini/gemini-wire.ts`, `README.md`, `docs/guide-agent-package.md`, `package.json` (aucune montée de version ici).
- Les plans historiques `docs/plans/2026-09-30-gemini-errors-plan.md`, `docs/plans/2026-09-30-gemini-wiring-plan.md`, `docs/plans/2026-09-30-llm-error-status-plan.md` et les spécifications des issues closes, qui citent l'ancien libellé : ce sont des traces datées, non réécrites.
- Les textes faits de blancs seuls (R-2).

## Conception

### SPEC-1 · Libellé de vide selon sa source, dans `httpError`

Dans `src/llm/providers/gemini/gemini-llm-provider.ts`, `httpError` :

1. l.145 `const detail = gemini?.message ?? text;` : **inchangée** (le `??` reste un `??`).
2. Une ligne ajoutée entre l.145 et l.146 :

   ```ts
   // "" from error.message is not an empty body: the body carries an error object (#32).
   const emptyLabel = gemini?.message === "" ? "(empty error message)" : "(empty body)";
   ```

3. l.146 devient :

   ```ts
   const extract = detail === "" ? emptyLabel : excerpt(redactKey(detail, apiKey));
   ```

4. Le commentaire de `httpError` (l.134-139) gagne, après sa première phrase, la phrase : `An error.message that is "" ends the message with (empty error message), an empty body with (empty body) (#32).`

Rien d'autre ne change : `http` (donc `status` et `retryAfterMs`) est calculé et passé comme avant ; le code choisi (`MODEL_NOT_FOUND` ou `API_ERROR`) ne dépend pas de `extract` ; aucun `console.log`, aucune lecture d'environnement ou de fichier ajoutée.

Justesse : `detail === ""` équivaut à « `gemini?.message === ""` » ou « `gemini?.message` indéfini et `text === ""` ». Dans le second cas `gemini` est indéfini (`JSON.parse("")` lève), donc `emptyLabel` vaut `(empty body)`. Dans le premier, le corps n'est pas vide (il porte au moins `{"error":{"message":""}}`), et `emptyLabel` vaut `(empty error message)`.

### Libellé de chaque cas (réponse non ok, corps lisible)

`<préfixe>` est l'une des trois formes inchangées : `Gemini has no model '<model>' (404 NOT_FOUND from <url>)`, `Gemini 404<statut> from <url> (check baseURL: host root, without /v1beta)`, `Gemini <code HTTP><statut> from <url>`. Le message est `<préfixe>: <extrait>`.

| Corps de la réponse non ok | `geminiErrorOf(text)` | `<extrait>` avant #32 | `<extrait>` après #32 |
|---|---|---|---|
| `""` (réellement vide) | `undefined` | `(empty body)` | `(empty body)` (inchangé) |
| JSON, `error` objet, `message` vaut `""` | `{ message: "" }` | `(empty body)` | **`(empty error message)`** |
| JSON, `error` objet, `message` absent ou non chaîne | `{ message: undefined }` | extrait borné et masqué du corps entier | inchangé (D2) |
| JSON, `error` objet, `message` chaîne non vide | `{ message: "…" }` | extrait borné et masqué de `error.message` | inchangé |
| JSON sans objet `error` (`{}`, `null`, `[]`, `42`, `error` non objet) | `undefined` | extrait borné et masqué du corps | inchangé |
| non JSON (page HTML, texte) | `undefined` | extrait borné et masqué du corps | inchangé |
| illisible (`text()` rejette) | non appelé | message `Gemini <code HTTP> response body could not be read: <raison>` | inchangé |

`(empty error message)` vaut pour les trois préfixes : un 404 `NOT_FOUND` dont le message est vide reste `MODEL_NOT_FOUND` et finit par `: (empty error message)`.

### Effet observable (package publié)

Seul le **texte** de `LLMError.message` change, et seulement pour une réponse non ok dont le corps JSON porte un objet `error` à `message` égal à `""` : la fin `: (empty body)` devient `: (empty error message)`. Exemple, 400 : `Gemini 400 INVALID_ARGUMENT from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: (empty error message)`.

Inchangés pour tous les cas : `name` (`LLMError`), `code` (aucun code de `LLMErrorCode` n'est ajouté, retiré ou réattribué), `status`, `retryAfterMs`, absence de `cause`, masquage `[redacted]`, nombre d'appels à `fetch` (un). Un consommateur qui comparait le texte `(empty body)` pour ce cas verra le nouveau libellé ; un consommateur qui branche sur `code` ou `status`, comme `LLMError` le recommande (`src/llm/models/index.ts:89`), ne voit aucune différence.

## Chemins nominal et d'erreur

Tout ce module est un chemin d'erreur ; le « nominal » de cette issue est le message cité d'un `error.message` non vide, inchangé et toujours fixé par `hypothesis H8: an API error body is { error: { code, message, status } }` (l.307-316). Le cas corrigé (message vide) et ses deux voisins (corps vide ; `message` absent) sont fixés par TEST-1 et par les trois tests existants du corps vide.

## Symétrie

- Corps vide face à `error.message` vide : deux libellés distincts, chacun fixé par un test (les trois tests existants pour `(empty body)`, TEST-1 pour `(empty error message)`) et chacun gardé par une mutation (M2 et M1 ci-dessous).
- `error.message` vide face à absent : vide → libellé ; absent → extrait du corps (D2), fixé par TEST-1 et gardé par M4.
- Lecture face à écriture : sans objet (aucune donnée écrite ni lue hors de la réponse).
- Énumération : `LLMErrorCode` non touchée ; aucun libellé d'interface hors du message.

## Données touchées

Aucune base, aucun fichier écrit à l'exécution, aucune variable d'environnement posée hors de `withEnv` (qui restaure). Les clés des tests restent factices (`cle-factice-*`) ; aucune valeur de clé réelle nulle part. Aucun `.env` lu. Aucun appel réseau : `respondingFetch` est un double injecté par `fetch` de `GeminiConfig`.

## Masquage

Inchangé. `(empty error message)` et `(empty body)` sont des littéraux, sans texte externe : ils n'ont rien à masquer. Les textes externes (`error.message` non vide, corps, `error.status`, URL) passent toujours par `redactKey` avant `excerpt` (D3 de #25). Les onze cas de `REDACTION_CASES` (l.420-508) ne changent pas et restent verts.

## Décisions et alternatives écartées

- **D1 · Libellé `(empty error message)`** : celui que propose l'issue ; en anglais comme tous les messages du module ; même forme parenthésée que `(empty body)`, pour qu'un lecteur reconnaisse un libellé et non un extrait. Écartés : `(empty error.message)` (point qui se lit comme un chemin de code), citer le JSON brut du corps (contredit H8 de #25 : quand le corps porte `error.message`, le JSON brut n'entre pas dans le message).
- **D2 · `error.message` absent ou non chaîne : extrait du corps, inchangé.** Aujourd'hui ce cas cite l'extrait borné et masqué du corps (`detail = text`), ce qui n'est pas un libellé faux et montre au lecteur ce que Gemini a renvoyé (`code`, `status`, `details`). Lui donner `(empty error message)` ferait perdre cette information sans corriger de défaut ; l'issue ne vise que le message vide. Le comportement est désormais fixé par TEST-1, pour qu'une implémentation qui confondrait « absent » et « vide » échoue (M4).
- **D3 · Une variable `emptyLabel` plutôt qu'une réécriture de `detail`** : `detail` et le `??` de #26 restent tels quels, la mutation `??` → `||` de #26 (M3) garde son sens, et le diff tient en deux lignes de code.
- **D4 · Test de #26 ajusté, pas supprimé ni doublé** (précision du pilote) : le même `test()` change de titre, d'attendu et de commentaire, et gagne les assertions de `status`, `retryAfterMs`, du 404 `NOT_FOUND` et du `message` absent. Écarté : un nouveau test à côté de l'ancien, qui laisserait un titre `labelled (empty body)` contraire au comportement.
- **D5 · Type `fix`, scope `llm`** : comportement observable corrigé dans le code publié (label `T:bug`) ; scope `llm`, celui des commits du fournisseur Gemini (#19, #25, #34).

## Ordre des commits et preuves

Un SPEC = un commit = un test. La spécification et la checklist entrent dans le commit de SPEC-1 (précédent P1 de #20, #35, #39, #41, #46, #31). Chemins relatifs au dépôt dans toute preuve. Les tests importent `dist/` : chaque exécution après une modification de `src/` est précédée de `npm run build`.

Garde avant toute commande de test (précédent P6 de #26) : `node -e "process.exit(process.env.GEMINI_INTEGRATION === undefined ? 0 : 1)"` rend 0 ; sinon arrêter.

- **Rouge préalable** : TEST-1 écrit d'abord, `src/` intact, `npm run build` puis `node --test tests/llm/providers/gemini/gemini-llm-provider.test.ts` : seul TEST-1 échoue, sur `actual: '… INVALID_ARGUMENT from …: (empty body)'` contre `expected: '…: (empty error message)'`.
- **Vert** après SPEC-1 : `npm run build`, `npm run typecheck`, `npm run test` passent ; le nombre de tests est celui de la référence (TEST-1 remplace un test, n'en ajoute aucun).
- **Mutations**, après le commit de SPEC-1, sur l'arbre propre, chacune seule, suivie de `npm run build` puis `node --test tests/llm/providers/gemini/gemini-llm-provider.test.ts`, et annulée par `git restore src/llm/providers/gemini/gemini-llm-provider.ts` (puis `git diff --stat` vide et `npm run build`) :
  - **M1** : `const emptyLabel = gemini?.message === "" ? "(empty error message)" : "(empty body)";` → `const emptyLabel = "(empty body)";`. TEST-1 seul échoue.
  - **M2** : même ligne → `const emptyLabel = "(empty error message)";`. Échouent les trois tests du corps vide et eux seuls : `a non-ok response quotes its status and a bounded excerpt of its body, never the whole body`, `every LLMError of a non-ok response carries its status, 404 NOT_FOUND included`, `a Retry-After in whole seconds is retryAfterMs on every error of a non-ok response`.
  - **M3** : `const detail = gemini?.message ?? text;` → `const detail = gemini?.message || text;` (mutation de #26). TEST-1 seul échoue (l'extrait du JSON au lieu du libellé).
  - **M4** : `const detail = gemini?.message ?? text;` → `const detail = gemini === undefined ? text : (gemini.message ?? "");`. TEST-1 seul échoue, sur l'assertion du `message` absent.
  Sorties (lignes d'échec, compteurs `# tests`, `# pass`, `# fail`) montrées dans le rapport du builder et dans la description de la PR.

Gabarit (aucun `Co-Authored-By`) :

```
<type>(<scope>): <sujet>

<corps : ce qui change et la preuve, chemins relatifs au dépôt>

Refs: #32
Session: <id>
Model: <modèle>
Authorship: ai
```

| SPEC | Sujet (impératif, 72 caractères au plus type compris) |
|---|---|
| 1 | `fix(llm): distinguer un error.message Gemini vide d'un corps vide` (65) |

### Message de squash proposé

```
fix(llm): distinguer un error.message Gemini vide d'un corps vide (#<PR>)

Une réponse Gemini non ok dont le corps JSON porte un error.message
vide finissait son message d'erreur par « (empty body) » alors que le
corps n'est pas vide. Elle finit désormais par « (empty error
message) » ; « (empty body) » reste réservé au corps réellement vide,
et un objet error sans message cite toujours l'extrait du corps.

Effet observable : le texte de LLMError.message de ce seul cas. Le
code (API_ERROR ou MODEL_NOT_FOUND), status et retryAfterMs (#34),
l'absence de cause et le masquage [redacted] de la clé sont
inchangés. Le test qui figeait l'ancien libellé (R1 de #26) est
ajusté dans
tests/llm/providers/gemini/gemini-llm-provider.test.ts ; preuve par
rouge préalable et par quatre mutations de
src/llm/providers/gemini/gemini-llm-provider.ts annulées sans commit.
Aucun appel réseau : fetch injecté.

Refs: #32
Session: <id>
Model: <modèle>
Authorship: ai
```

Sujet : 65 caractères sans le suffixe ; 71 avec ` (#NN)`. Rappel A4 : le corps de la PR se termine par le même bloc de trailers `Refs` / `Session` / `Model` / `Authorship`.

## Tests

**TEST-1** (exerce SPEC-1) : le `test()` de `tests/llm/providers/gemini/gemini-llm-provider.test.ts:337-342`, ajusté en place (même position, entre `a 404 that carries no Gemini error points at baseURL` et `an error body that cannot be read is an API_ERROR with the status`) :

- commentaire l.337 remplacé par `// #32, correcting R1 of #26: an empty error.message is not an empty body; a missing one quotes the body.` ;
- titre : `an error body whose error.message is empty is labelled (empty error message), not (empty body)` ;
- cas 1 : `respondingFetch(400, JSON.stringify({ error: { code: 400, message: "", status: "INVALID_ARGUMENT" } }), { "retry-after": "7" })` ; `expectFailure(…, "API_ERROR", \`Gemini 400 INVALID_ARGUMENT from ${ENDPOINT}: (empty error message)\`)` ; le double a été appelé exactement une fois ; `error.status === 400` ; `error.retryAfterMs === 7000` ;
- cas 2 : `respondingFetch(404, JSON.stringify({ error: { code: 404, message: "", status: "NOT_FOUND" } }))` ; `expectFailure(…, "MODEL_NOT_FOUND", \`Gemini has no model 'gemini-2.5-flash' (404 NOT_FOUND from ${ENDPOINT}): (empty error message)\`)` ; `error.status === 404` ;
- cas 3 (`message` absent, D2) : `const noMessage = JSON.stringify({ error: { code: 400, status: "INVALID_ARGUMENT" } });` (50 caractères, sous la borne de 200) ; `expectFailure(respondingFetch(400, noMessage).fetch, "API_ERROR", \`Gemini 400 INVALID_ARGUMENT from ${ENDPOINT}: ${noMessage}\`)`.

Le corps réellement vide reste fixé par les trois tests existants (l.323, l.546, l.603), **non modifiés**. Critères : rouge préalable, vert après SPEC-1, rouge sous M1, M3 et M4 ; M2 fait échouer les trois tests du corps vide. Déterministe, sans réseau, clé factice `cle-factice-1` par défaut de `expectFailure`.

## Estimation de taille

Hors `docs/` et `*.md`, lignes ajoutées et retirées :

| Fichier | Estimation |
|---|---|
| `src/llm/providers/gemini/gemini-llm-provider.ts` (commentaire de `httpError` +1 ; commentaire et `emptyLabel` +2 ; ligne `extract` ±1) | +4 −1 |
| `tests/llm/providers/gemini/gemini-llm-provider.test.ts` (test l.337-342 remplacé : −6 ; nouveau test de 3 cas : +18 à +24) | +18 à +24 −6 |
| **Total** | **environ 30** (fourchette 25 à 40) |

Très en dessous du plafond de 400 ; aucune dérogation. La mesure (`pr_size.py`) fait foi à la PR.

## Hypothèses restantes

- **R-1 · Forme réelle d'un `error.message` vide chez Gemini** : non observée sur l'API réelle ; le cas est construit sur un double, comme H8 de #25. Le correctif ne dépend que de `typeof message === "string" && message === ""`.
- **R-2 · Textes faits de blancs seuls** : un `error.message` valant `" "` ou un corps valant `"  "` sont cités tels quels (message qui finit par `: ` suivi de blancs), avant comme après #32. Hors de l'attendu de l'issue ; candidat à une issue de suivi si le pilote veut un libellé pour eux.
- **R-3 · Consommateurs qui comparent le texte** : aucun dans le dépôt (recherche de `empty body` hors `docs/` : `src/` l.146 et le fichier de test seulement). Un consommateur externe qui comparait `(empty body)` pour ce cas verra le nouveau libellé ; le message n'est pas un contrat (`code` l'est), d'où le type `fix` sans montée majeure.
- **Node** ≥ 22.18 (retrait de types sans drapeau), constaté v22.19.0 par #20.
