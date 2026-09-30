# Spécification · Couper la matrice H2 au plafond et classer la cause · #35

Date : 2026-09-30
Issue : https://github.com/arthurolivierfortin/agent-core/issues/35 (type feature, jalon H2 ; C1b du découpage de #20, option C du pilote ; dépend de #20 et de #34, fusionnés)
Checklist : docs/specs/2026-09-30-cap-guard-checklist.md
Branche : `feat/35-cap-guard` (worktree `.claude/worktrees/feat+35-cap-guard`, `main` a26b265)
Continuité : docs/specs/2026-09-30-h2-report-guards-design.md (#20 : SPEC-6 et SPEC-7 barrés et renvoyés ici, règle du zéro R1 et R2) ; docs/specs/2026-09-30-llm-error-status-design.md (#34 : `LLMError.status`, `retryAfterMs`, H9)

## Objectif

Livrer `capGuard(provider, rates, capUsd)` sous `scripts/h2-report/`, qui enveloppe le seul fournisseur hébergé de la matrice H2, refuse l'appel suivant dès que la dépense atteint le plafond ou devient inconnue, classe la cause d'une coupure sur `LLMError.status` seulement, et reprendre trois défauts relevés aux revues de #37 et #36.

## Source de l'issue (corps relevé le 2026-09-30) et périmètre approuvé par le pilote

Corps : `capGuard(provider, rates, capUsd)` sous `scripts/` en TypeScript, couvert par `npm run typecheck`, hors de tout barrel ; une instance unique, réservée au fournisseur hébergé, partagée par toute la matrice ; refuse l'appel suivant dès que le coût dépensé atteint le plafond ou devient inconnu ; dépassement borné au coût d'un seul appel ; un appel hébergé rejeté (429 compris) coupe la matrice, raison classée sur le champ `status` de `LLMError`, jamais sur un libellé : `rate_limited`, `http_<statut>`, `network`, `unclassified` ; `unpriced_model` si le modèle hébergé n'a pas de tarif ; expose `spentUsd()` (somme des appels tarifés effectivement dépensés, jamais masquée par null), `refused()` et `cutReason()` (qui dit si le coût est devenu inconnu et pourquoi). Contraintes : aucun appel réseau dans la suite (doubles) ; la valeur d'une clé n'apparaît nulle part ; gates build, typecheck, test ; PR sous 400 lignes hors `docs/` et `*.md`, sans dérogation.

Périmètre du pilote (fait foi) :

1. `capGuard` sous `scripts/h2-report/`, TypeScript, typecheck, hors barrel ; instance unique réservée au fournisseur hébergé, partagée par toute la matrice ; refus dès que le coût dépensé atteint le plafond ou devient inconnu ; dépassement borné au coût d'un seul appel ; `RangeError` si `capUsd` n'est pas un nombre fini > 0.
2. Classification sur `LLMError.status` uniquement : `rate_limited` (429), `http_<statut>` (autre statut), `network` (pas de statut : fetch rejeté), `unclassified` (erreur qui n'est pas une `LLMError`, ou autre cas), `unpriced_model` (modèle hébergé sans tarif).
3. `spentUsd()` jamais masquée par null ; `cutReason()` à part ; `refused()`.
4. Reprises : `Number.isFinite` sur `--cap-usd` et `--runs` (`scripts/h2-report/report-args.ts`) ; garde sur `res.headers` dans `retryAfterMsOf` avec son test ; ligne d'en-tête de 208 colonnes de `gemini-llm-provider.ts` coupée.
5. `retryAfterMs` n'est pas une condition de classification (H9 non vérifiée).

Contraintes du pilote : aucun appel réseau, aucune exécution réelle, aucune valeur de clé, aucun `console.log` dans `src/`, aucun `.env` lu, aucun test qui fige le vrai `data/rates.json`.

## État constaté dans le code (lecture du 2026-09-30, `main` a26b265)

- `scripts/h2-report/` : `rates.ts`, `report-args.ts`, `start-guard.ts` et leurs tests ; aucun `cap-guard.ts`, aucun nom `capGuard`, `CutReason`, `CapGuard` dans le dépôt hors `docs/`. Règles communes de ces modules (docs/specs/2026-09-30-h2-report-guards-design.md, « Conception ») : TypeScript effaçable seulement, `import type` pour les types, code du paquet importé de `../../dist/index.js`, voisins de `./<nom>.ts`, aucun `console.`, aucun `process.env`, aucun `index.ts`.
- `tsconfig.json` couvre déjà `scripts` (SPEC-1 de #20) ; `npm run test` = `npm run build && node --test`, qui découvre `scripts/h2-report/*.test.ts`.
- `src/index.ts:7`, `:13` : `.` sert `llm` (dont `LLMError`, `LLMProvider`, `CompletionOptions`, `LLMResponse`, `Message`, `ModelInfo`) et `metrics` (dont `aggregate`, `RateTable`, `Rate`).
- `src/metrics/services/aggregate.ts:19-46` : `aggregate(records, rates)` ; `costUsd` d'un enregistrement = `(tokensIn × usdPerMillionTokensIn + tokensOut × usdPerMillionTokensOut) / 1 000 000`, `null` si le modèle n'est pas une clé propre de la table, si le tarif est `null` ou si l'usage est `null`.
- `src/metrics/application/use-cases/with-metrics.ts:33-54` : `withMetrics` n'enregistre rien pour un appel qui rejette ; objet littéral de fermetures, `supportsStreaming()` `false`, pas de clé `stream`.
- `docs/specs/2026-09-30-run-matrix-design.md:19-24` : `runMatrix` enveloppe `deps(combination).llm` par `withMetrics` à chaque run, exécute les runs en séquence, et une exception d'un run rend ce run `passed: false` puis passe au suivant. Un appel refusé par `capGuard` fait donc échouer son run, et chaque run suivant qui passe par le fournisseur hébergé échoue à son premier appel.
- `src/llm/models/index.ts:95-116` : `LLMError` ; `status` et `retryAfterMs` sont des propriétés propres seulement quand elles sont données ; TSDoc : l'absence de `status` ne dit pas que l'échec n'était pas HTTP.
- `src/llm/providers/gemini/gemini-llm-provider.ts` : `status` posé sur toute erreur d'une réponse non `ok` (l.138-163, l.198-209) ; aucun `status` sur un `fetch` rejeté (l.96-100), sur les erreurs d'une réponse `ok` (l.104-121), sur `MISSING_API_KEY` (l.80-86) ni sur un modèle non déclaré (l.125-129). `src/llm/providers/gemini/gemini-wire.ts:183` : `toUsage` rend `undefined` quand `usageMetadata` manque ses compteurs, donc une réponse Gemini résolue peut n'avoir aucun usage.
- `gemini-llm-provider.ts:166-175` : `retryAfterMsOf(res)` lit `res.headers.get("retry-after")` sans garde ; un `fetch` injecté qui rend un objet sans `headers` pour une réponse non `ok` lève une `TypeError` avant `readBody` (nit de la revue de #36). `:6` : ligne d'en-tête de 208 colonnes (nit de la revue de #36) ; les autres lignes de l'en-tête (l.1-17) font 118 colonnes au plus (l.8, comptée à la main).
- `scripts/h2-report/report-args.ts:50`, `:54` : `--cap-usd` et `--runs` passent leur expression régulière puis `Number(...)` ; une valeur d'environ 309 chiffres ou plus donne `Infinity` (nit de la revue de #37).
- `tests/llm/providers/gemini/gemini-llm-provider.test.ts:259` `ENDPOINT`, `:291-305` `expectFailure`, `:513-514` `QUOTA_BODY` et `QUOTA_MESSAGE`, fin du fichier l.669.
- `scripts/repo-conventions.test.mjs:10-16` : `readRepoFile`, `splitLines` ; titres des tests en français (P4 de #20).

## Périmètre

Dans la PR :

- `scripts/h2-report/cap-guard.ts` et `scripts/h2-report/cap-guard.test.ts` (SPEC-1 à SPEC-7, TEST-1 à TEST-7).
- `scripts/h2-report/report-args.ts` et `report-args.test.ts` (SPEC-8, TEST-8).
- `src/llm/providers/gemini/gemini-llm-provider.ts` (SPEC-9, SPEC-10) ; `tests/llm/providers/gemini/gemini-llm-provider.test.ts` (TEST-9) ; `scripts/repo-conventions.test.mjs` (TEST-10).

Hors périmètre :

- Le runner (`runReport`), l'annonce, `--dry-run`, l'écriture des CSV, le marquage « tronqué », la sortie en 1, la citation de la raison dans le rapport, la documentation : #33. `capGuard` ne lit aucun argument, n'écrit rien, n'affiche rien.
- Toute modification de `src/` autre que `gemini-llm-provider.ts` : ni `LLMError`, ni `LLMErrorCode`, ni barrels, ni `withMetrics`, `aggregate`, `runMatrix`, `OllamaLLMProvider`.
- Nouvelle tentative, attente sur `retryAfterMs`, lecture de `RetryInfo` dans le corps Gemini (H9).
- `package.json`, `tsconfig*.json`, `data/rates.json`.

## Conception

### Placement

| Fichier | Contenu |
|---|---|
| `scripts/h2-report/cap-guard.ts` | `capGuard`, types exportés `CapGuard` et `CutReason`, fonctions non exportées `classifyCut` et `isPositiveRate` |
| `scripts/h2-report/cap-guard.test.ts` | TEST-1 à TEST-7, doubles de fournisseur écrits dans le fichier |

Imports de `cap-guard.ts`, liste fermée : `import { LLMError, aggregate } from "../../dist/index.js";` et `import type { CompletionOptions, LLMProvider, LLMResponse, Message, ModelInfo, Rate, RateTable } from "../../dist/index.js";` (le builder retire un type inutilisé). Aucun barrel ne l'exporte ; aucun `index.ts` sous `scripts/`.

### Types

```ts
export type CutReason = "rate_limited" | `http_${number}` | "network" | "unclassified" | "unpriced_model";

export type CapGuard = LLMProvider & {
  /** US dollars of the calls that resolved and could be priced; a number, never null. */
  spentUsd(): number;
  /** How many calls were refused without reaching the provider. */
  refused(): number;
  /** Null while the spending is known; once the cost became unknown, why. Set once, never changed. */
  cutReason(): CutReason | null;
};

export function capGuard(provider: LLMProvider, rates: RateTable, capUsd: number): CapGuard;
```

`cutReason()` non nul dit que le coût est devenu inconnu (ou le serait devenu : `unpriced_model`) et pourquoi ; le plafond atteint n'est pas une coupure : il laisse `cutReason()` à `null`, et #33 le lit par `spentUsd() >= capUsd` avec `refused() > 0`.

### SPEC-1 · Enveloppe et dépense (`capGuard`, chemin nominal)

- Rend un objet littéral de fermetures, pas une classe, pas une copie étalée du fournisseur, pas un proxy, aux clés propres exactement `id`, `supportsStreaming`, `models`, `complete`, `spentUsd`, `refused`, `cutReason` : `id` = `provider.id` ; `models()` délègue à `provider.models()` ; `supportsStreaming()` rend `false` quoi que déclare le fournisseur, et l'objet n'a pas de clé `stream` (un flux non plafonné laisserait des appels échapper au plafond, même raison que `withMetrics`). Le fournisseur est toujours appelé comme méthode (`provider.complete(messages, opts)`).
- `complete(messages, opts)` appelle `provider.complete(messages, opts)` et rend la réponse telle quelle (même référence).
- Après une réponse résolue, le coût de l'appel est `aggregate([{ model: opts.model, tokensIn: response.usage?.tokensIn ?? null, tokensOut: response.usage?.tokensOut ?? null, durationMs: 0 }], rates).costUsd` : la même arithmétique que le total du rapport (`MetricsCollector.total(rates)`). Un coût numérique s'ajoute à la dépense ; un coût `null` n'y ajoute rien (sa conséquence, la coupure, est SPEC-7).
- `spentUsd()` rend la dépense, 0 avant tout appel ; `refused()` rend 0 et `cutReason()` `null` tant qu'aucun refus ni coupure n'a eu lieu.
- TSDoc de `capGuard` (anglais, comme les modules voisins) : une seule instance, construite par le runner (#33) autour du seul fournisseur hébergé et partagée par toute la matrice ; placée sous `withMetrics`, qui n'enregistre pas un appel refusé ; le sens exact de `network` (voir SPEC-6).

### SPEC-2 · `RangeError` sur `capUsd`

Avant toute autre instruction, si `typeof capUsd !== "number" || !Number.isFinite(capUsd) || capUsd <= 0`, lève `new RangeError(\`capGuard: capUsd must be a finite number > 0, got ${String(capUsd)}\`)`, sans appeler le fournisseur. Cas refusés : `0`, `-1`, `NaN`, `Infinity`, `"1"` passé comme `number` (`"1" as unknown as number`).

### SPEC-3 · Refus au plafond atteint

Avant d'appeler le fournisseur : si `spentUsd() >= capUsd`, l'appel est refusé : le fournisseur n'est pas appelé, `refused()` augmente de 1, `complete` rejette avec `new Error(\`capGuard refused a call to '${opts.model}': ${spent} USD spent reached the cap of ${capUsd} USD\`)` (nombres écrits par la conversion par défaut de JavaScript), `cutReason()` reste `null`. Le contrôle n'a lieu qu'avant l'appel : un appel admis sous le plafond peut le franchir, d'au plus son propre coût ; aucun appel suivant n'est admis.

### SPEC-4 · Appels sérialisés

Deux appels de `complete` concurrents ne sont jamais en vol ensemble : chaque appel attend que le précédent soit réglé (résolu ou rejeté) avant ses contrôles, par une chaîne de promesses privée (`let tail: Promise<unknown> = Promise.resolve()` ; `const call = tail.then(() => guarded(messages, opts)); tail = call.catch(() => undefined); return call;`). Sans cela, deux appels lancés sous le plafond le franchiraient chacun, et le dépassement dépasserait le coût d'un seul appel. `runMatrix` et la boucle appellent déjà en séquence : la sérialisation ne change rien à leur comportement, elle rend la borne vraie quel que soit l'appelant.

### SPEC-5 · Modèle hébergé sans tarif (`unpriced_model`, règle R3)

Avant d'appeler le fournisseur, après le contrôle du plafond : si `opts.model` n'est pas une clé propre de `rates` (`Object.hasOwn`), si son tarif est `null`, ou si l'une de ses deux composantes n'est pas un nombre fini strictement positif (`isPositiveRate`), la coupure est posée à `unpriced_model` puis l'appel est refusé par le message de coupure de SPEC-6 (fournisseur non appelé, `refused()` + 1). C'est la troisième couche de la règle du zéro annoncée par #20 (docs/specs/2026-09-30-h2-report-guards-design.md:49, :93) : un modèle à 0 ne passe jamais par le garde. Conséquence voulue : un `capGuard` posé par erreur sur le fournisseur local (tarif `{ 0, 0 }`, source `"local"`) coupe la matrice au premier appel, ce qui fait respecter « réservé au fournisseur hébergé ».

### SPEC-6 · Coupure au premier appel rejeté, classée sur `status`

Quand `provider.complete` rejette avec `error` :

- la coupure est posée à `classifyCut(error)` si aucune ne l'est déjà ;
- `complete` rejette avec la même valeur `error` (même référence, ni enveloppée ni convertie) ;
- `spentUsd()` ne change pas : le coût de l'appel rejeté est inconnu et n'est jamais compté, ni comme 0 ni comme null.

`classifyCut(error: unknown): CutReason`, dans cet ordre, sans lire `message`, `name`, `code` ni `retryAfterMs` :

| Condition | Raison |
|---|---|
| `error` n'est pas une instance de `LLMError` (`Error`, `TypeError`, chaîne, objet `{ status: 429 }`) | `unclassified` |
| `error.status === undefined` | `network` |
| `error.status === 429` | `rate_limited` |
| `Number.isInteger(error.status)` et `100 <= error.status <= 599` | `` `http_${error.status}` `` |
| tout autre `status` (`0`, `429.5`) | `unclassified` |

Avant chaque appel, en premier contrôle (avant le plafond) : si une coupure est posée, l'appel est refusé : fournisseur non appelé, `refused()` + 1, rejet par `new Error(\`capGuard refused a call to '${opts.model}': the matrix is cut (${reason})\`)`. Une coupure est définitive et n'est jamais remplacée.

Sens de `network` : « `LLMError` sans `status` ». Avec `GeminiLLMProvider`, c'est un `fetch` rejeté, mais aussi une réponse `ok` au corps illisible, non JSON ou refusé par `fromGeminiResponse`, une clé absente (`MISSING_API_KEY`) et un modèle non déclaré ; les deux derniers sont écartés avant le premier appel par `assertReadyToStart` (#20) et par la configuration du runner (#33). Le TSDoc de `capGuard` l'écrit en toutes lettres (voir « Hypothèses restantes », R-1).

### SPEC-7 · Coût devenu inconnu sur un appel résolu (`unclassified`)

Quand l'appel résout et que le coût de SPEC-1 vaut `null` (réponse sans `usage` ; le tarif, lui, a été contrôlé par SPEC-5), la coupure est posée à `unclassified`, la réponse est rendue telle quelle (l'appel a eu lieu), `spentUsd()` ne change pas, et l'appel suivant est refusé par le message de coupure. `unclassified` est la raison fourre-tout du pilote (« ou autre cas ») : aucune `LLMError` n'est en cause.

### SPEC-8 · `--cap-usd` et `--runs` finis (`scripts/h2-report/report-args.ts`)

- `--cap-usd` : la condition de refus de la l.50 devient `!/^\d+(\.\d+)?$/.test(cap) || Number(cap) === 0 || !Number.isFinite(Number(cap))` ; message inchangé `--cap-usd must be a decimal number > 0, got '<valeur>'`.
- `--runs` : la condition de la l.54 devient `!/^[1-9]\d*$/.test(runs) || !Number.isFinite(Number(runs))` ; message inchangé `--runs must be an integer >= 1, got '<valeur>'`.
- Une valeur longue mais finie (`"1".repeat(300)`, environ 1,1 × 10^299) reste acceptée : la borne est la finitude, pas la longueur.

### SPEC-9 · `retryAfterMsOf` sans `headers` (`gemini-llm-provider.ts`)

- Première instruction de `retryAfterMsOf` : `if (typeof res.headers?.get !== "function") return undefined;` (un `fetch` injecté peut rendre un objet sans `headers`, ou à `headers` `null`).
- Effet : une réponse non `ok` sans `headers` donne la même `LLMError` qu'avec des en-têtes sans `Retry-After` (code, message, `status`), sans `retryAfterMs` en propre, au lieu d'une `TypeError`.
- Le TSDoc de la fonction dit « undefined when absent, in any other form, or when the response has no headers » ; le commentaire « Never throws » devient vrai pour tout objet réponse.

### SPEC-10 · En-tête de `gemini-llm-provider.ts` coupé

La l.6 est remplacée par des lignes de commentaire de 100 colonnes au plus chacune, dont la concaténation (préfixe `// ` retiré, lignes jointes par une espace) redonne exactement la phrase `HTTP status (#34): docs/specs/2026-09-30-llm-error-status-design.md. Every LLMError of a non-ok response carries status, even when its body cannot be read; a network failure or an ok response carries none.` Coupe indicative (le planificateur mesure) :

```ts
// HTTP status (#34): docs/specs/2026-09-30-llm-error-status-design.md. Every LLMError of a non-ok
// response carries status, even when its body cannot be read; a network failure or an ok response
// carries none.
```

Aucune autre ligne de l'en-tête n'est modifiée.

## Chemins nominal et d'erreur

| Situation avant l'appel | Fournisseur appelé | Effet |
|---|---|---|
| aucune coupure, dépense < plafond, modèle tarifé > 0 | oui | réponse rendue ; coût ajouté (SPEC-1) ou coupure `unclassified` si coût `null` (SPEC-7) ; rejet : coupure classée, même erreur relancée (SPEC-6) |
| coupure posée | non | refus « the matrix is cut (<raison>) », `refused()` + 1 (SPEC-6) |
| dépense ≥ plafond | non | refus « … reached the cap … », `refused()` + 1, `cutReason()` inchangé (SPEC-3) |
| modèle sans clé propre, tarif `null` ou composante non finie ou ≤ 0 | non | coupure `unpriced_model`, refus, `refused()` + 1 (SPEC-5) |
| appel concurrent | après le règlement du précédent | contrôles ci-dessus au moment de son tour (SPEC-4) |
| construction avec `capUsd` non fini ou ≤ 0 | non | `RangeError` (SPEC-2) |

Ordre des contrôles avant l'appel : coupure posée, puis plafond, puis tarif.

## Symétrie

- Écriture face à lecture : `capGuard` écrit la dépense, le compte des refus et la raison ; TEST-1 à TEST-7 les lisent ; le lecteur applicatif est le runner de #33 (hors périmètre), qui cite la raison dans le rapport tronqué.
- Chemin nominal face au chemin d'erreur : appel résolu et tarifé (SPEC-1) face à rejet (SPEC-6), résolu sans usage (SPEC-7), modèle sans tarif (SPEC-5), plafond (SPEC-3), paramètre invalide (SPEC-2).
- Énumération `CutReason` : une seule couche applicative (type de `cap-guard.ts`) ; ses cinq valeurs ont chacune une ligne de test (TEST-5 `unpriced_model`, TEST-6 `rate_limited`, `http_<statut>`, `network`, `unclassified`, TEST-7 `unclassified`) ; aucune base, aucune API, aucun libellé d'interface dans cette PR (le libellé du rapport est à #33, qui reprend les chaînes telles quelles).
- Libellé face à champ : TEST-6 contient une `LLMError` sans `status` dont le message dit « 429 » (classée `network`) et une `LLMError` à `status` 500 dont le message dit « 429 » (classée `http_500`) : la classification ne lit pas le texte. `retryAfterMs` présent ou absent ne change pas la raison.
- Règle du zéro : R1 (`loadRateFile`) et R2 (`assertReadyToStart`) livrées par #20 ; R3 ici (SPEC-5, TEST-5).

## Données touchées

Aucune base, aucun fichier écrit, aucune variable d'environnement lue ni posée par `capGuard` ni par ses tests. Les tarifs des tests sont des littéraux (`{ usdPerMillionTokensIn: 1, usdPerMillionTokensOut: 2 }` pour un modèle nommé `hosted-model`), jamais le vrai `data/rates.json`. Aucune clé, réelle ou factice, dans `cap-guard.test.ts`.

## Décisions et alternatives écartées

- **D1 · Coût d'un appel par `aggregate`** plutôt qu'une multiplication recopiée : le garde et le total du rapport (`MetricsCollector.total(rates)`) ne peuvent pas diverger. `spentUsd()` fait sa propre somme des coûts numériques : `aggregate` sur toute la liste rendrait `null` dès un appel non tarifé, ce que l'issue interdit (« jamais masquée par null »).
- **D2 · Le plafond atteint n'est pas une coupure** : `cutReason()` reste `null`, car la dépense est connue ; seuls les cas où elle est (ou serait) inconnue posent une raison. Écarté : une valeur `cap_reached` dans `CutReason`, absente de la liste fermée du pilote.
- **D3 · `refused()` rend un compte** (appels refusés sans atteindre le fournisseur). Écarté : un booléen, qui ne dit pas combien de runs ont été perdus ; une liste d'objets, que rien ne lit dans #33 tel qu'écrit.
- **D4 · Refus par `Error` nu au message fixe**, pas par `LLMError` (le code fermé `LLMErrorCode` ne change pas, #34 hors périmètre) ni par une classe d'erreur exportée (#33 lit l'état du garde, pas l'erreur).
- **D5 · Sérialisation par chaîne de promesses** (SPEC-4) plutôt qu'un refus des appels concurrents : aucune raison nouvelle, et la borne « un seul appel » tient pour tout appelant.
- **D6 · `unclassified` fourre-tout** : erreur non `LLMError`, `status` hors d'un entier 100 à 599, appel résolu sans usage. C'est la lecture fermée de « ou autre cas » du pilote sous la contrainte « `status` uniquement ».
- **D7 · Classification sur `status` seulement**, jamais sur `code` : décision du pilote. Conséquence acceptée et écrite (R-1).
- **D8 · Tarif contrôlé avant l'appel (R3)** plutôt qu'après : un modèle sans tarif ne dépense rien avant d'être coupé.
- **D9 · Garde `typeof res.headers?.get !== "function"`** plutôt que `res.headers?.get(...)` : couvre `headers` absent, `null`, ou objet sans `get`, en une ligne ; aucune `TypeError` ne sort de `retryAfterMsOf`.

## Ordre des commits et preuve de rouge

Un SPEC = un commit = un test, dans l'ordre SPEC-1 à SPEC-10. La spécification et la checklist entrent dans le commit de SPEC-1 (précédent P1 de #20). Preuve de rouge par `npm run test`, chemins relatifs au dépôt dans toute preuve :

- TEST-1 avant SPEC-1 : `scripts/h2-report/cap-guard.ts` introuvable.
- TEST-2 avant SPEC-2 : aucune `RangeError` pour `0`.
- TEST-3 avant SPEC-3 : le troisième appel atteint le fournisseur.
- TEST-4 avant SPEC-4 : le fournisseur est appelé deux fois avant le règlement du premier appel.
- TEST-5 avant SPEC-5 : le fournisseur est appelé pour un modèle sans tarif ; `cutReason()` vaut `null`.
- TEST-6 avant SPEC-6 : `cutReason()` vaut `null` après un rejet ; l'appel suivant atteint le fournisseur.
- TEST-7 avant SPEC-7 : `cutReason()` vaut `null` après une réponse sans usage.
- TEST-8 avant SPEC-8 : `parseReportArgs(["--cap-usd", "1".repeat(400)])` rend `capUsd: Infinity`.
- TEST-9 avant SPEC-9 : `TypeError` au lieu d'une `LLMError`.
- TEST-10 avant SPEC-10 : la ligne `// HTTP status (#34): …` fait 208 colonnes.

La sortie de `npm run test` doit montrer les titres `TEST-N (issue 35)`.

Gabarit (aucun `Co-Authored-By`) :

```
<type>(<scope>): <sujet>

Refs: #35
Session: <id>
Model: <modèle>
Authorship: ai
```

| SPEC | Sujet (impératif, 72 caractères au plus type compris) |
|---|---|
| 1 | `feat(scripts): compter la dépense hébergée dans capGuard` (56) |
| 2 | `feat(scripts): refuser un capUsd qui n'est pas un nombre fini > 0` (66) |
| 3 | `feat(scripts): refuser l'appel suivant dès le plafond atteint` (61) |
| 4 | `feat(scripts): sérialiser les appels pour borner le dépassement` (63) |
| 5 | `feat(scripts): couper sur un modèle hébergé sans tarif positif` (62) |
| 6 | `feat(scripts): couper au premier rejet et classer par status` (60) |
| 7 | `feat(scripts): couper quand un appel résolu n'a pas d'usage` (59) |
| 8 | `fix(scripts): refuser un --cap-usd ou --runs lu comme Infinity` (62) |
| 9 | `fix(llm): ne plus lever sur une réponse Gemini sans headers` (59) |
| 10 | `chore(llm): couper la ligne de 208 colonnes de l'en-tête Gemini` (64) |

### Message de squash proposé

```
feat(scripts): plafonner la matrice H2 et classer la coupure (#<PR>)

Ajoute scripts/h2-report/cap-guard.ts : capGuard enveloppe le seul
fournisseur hébergé de la matrice H2, une instance partagée par tous
les runs, hors de tout barrel.

- Refuse l'appel suivant dès que la dépense atteint le plafond ;
  les appels sont sérialisés, le dépassement tient en un seul appel.
- Coupe dès que le coût devient inconnu : modèle sans tarif > 0
  (unpriced_model), appel rejeté classé sur LLMError.status seulement
  (rate_limited, http_<statut>, network, unclassified), réponse sans
  usage (unclassified). retryAfterMs n'entre pas dans la classification.
- spentUsd() somme les appels tarifés, jamais null ; refused() compte
  les refus ; cutReason() dit pourquoi le coût est devenu inconnu.
- RangeError si capUsd n'est pas un nombre fini > 0.

Reprises des revues de #36 et #37 : --cap-usd et --runs refusent une
valeur lue comme Infinity ; retryAfterMsOf ne lève plus sur une réponse
sans headers ; la ligne d'en-tête de 208 colonnes de
gemini-llm-provider.ts est coupée.

Refs: #35
Session: <id>
Model: <modèle>
Authorship: ai
```

Sujet : 60 caractères sans le suffixe, 66 avec ` (#38)`.

## Tests

Déterministes, sans réseau, sans horloge, sans fournisseur réel (ni `GeminiLLMProvider`, ni `OllamaLLMProvider`, ni `PROVIDERS`), sans variable d'environnement. Titres préfixés `TEST-N (issue 35)`. Dans `cap-guard.test.ts` : `RATES: RateTable = { "hosted-model": { usdPerMillionTokensIn: 1, usdPerMillionTokensOut: 2 } }` ; une réponse tarifée `PRICED_RESPONSE` porte `usage: { tokensIn: 250_000, tokensOut: 125_000 }`, soit 0,5 USD exactement ; un double `scripted(steps)` rend, appel après appel, la réponse ou rejette avec la valeur donnée et compte ses appels ; un double `deferred()` rend une promesse que le test résout.

- TEST-1 : clés propres triées du garde égales à `["complete", "cutReason", "id", "models", "refused", "spentUsd", "supportsStreaming"]`, pas de clé `stream` ; `supportsStreaming()` `false` sur un double qui déclare `true` ; `id` et `models()` du double ; `spentUsd()` 0, `refused()` 0, `cutReason()` `null` avant tout appel ; plafond 10, deux appels : même référence de réponse, `spentUsd()` 0,5 puis 1.
- TEST-2 : `capGuard(double, RATES, x)` lève `RangeError` au message `capGuard: capUsd must be a finite number > 0, got <String(x)>` pour `0`, `-1`, `NaN`, `Infinity`, `"1" as unknown as number` ; le double n'est jamais appelé ; `0.01` ne lève pas.
- TEST-3 : plafond 1 : deux appels admis (dépense 1), le troisième rejette avec `capGuard refused a call to 'hosted-model': 1 USD spent reached the cap of 1 USD`, double à 2 appels, `refused()` 1, `cutReason()` `null` ; plafond 0,75 : le deuxième appel est admis (0,5 < 0,75) et porte la dépense à 1 (dépassement 0,25, sous le coût d'un appel), le troisième rejette avec `… 1 USD spent reached the cap of 0.75 USD`, un quatrième aussi, `refused()` 2.
- TEST-4 : plafond 0,5, double `deferred` : deux `complete` lancés sans attendre ; après `await new Promise((resolve) => setImmediate(resolve))`, le double compte 1 appel ; le premier résolu (0,5 USD), le second rejette avec le message du plafond ; le double compte toujours 1 appel.
- TEST-5 : une ligne par table (`{}`, `{ "hosted-model": null }`, composante `usdPerMillionTokensIn` 0, composante `usdPerMillionTokensOut` 0, composante −1, composante `NaN`) : `complete` rejette avec `capGuard refused a call to 'hosted-model': the matrix is cut (unpriced_model)`, double non appelé, `cutReason()` `unpriced_model`, `refused()` 1, `spentUsd()` 0 ; puis, sur `{ "hosted-model": null, "priced-model": <tarif 1, 2> }`, un appel à `priced-model` après la coupure est refusé par le même message de coupure (nommant `priced-model`), `refused()` 2.
- TEST-6 : treize lignes, une par erreur rejetée par le double après un premier appel tarifé : `LLMError` `status` 429 → `rate_limited` ; `status` 429 et `retryAfterMs` 30000 → `rate_limited` ; `status` 503 et `retryAfterMs` 30000 → `http_503` ; `MODEL_NOT_FOUND` `status` 404 → `http_404` ; `status` 500 au message `429 Too Many Requests` → `http_500` ; sans `status` au message `Gemini 429 RESOURCE_EXHAUSTED` → `network` ; sans `status` au message `fetch failed` → `network` ; `status` 0 → `unclassified` ; `status` 429.5 → `unclassified` ; `new Error("429")` → `unclassified` ; `new TypeError("x")` → `unclassified` ; chaîne `"boom"` → `unclassified` ; objet `{ status: 429 }` → `unclassified`. Pour chaque ligne : `complete` rejette avec la même référence, `cutReason()` vaut la raison, `spentUsd()` reste 0,5, `refused()` 0 ; l'appel suivant rejette avec `capGuard refused a call to 'hosted-model': the matrix is cut (<raison>)`, double non rappelé, `refused()` 1, `cutReason()` inchangé.
- TEST-7 : après un appel tarifé, le double résout une réponse sans `usage` : `complete` la rend (même référence), `cutReason()` `unclassified`, `spentUsd()` 0,5 ; l'appel suivant rejette avec le message de coupure `(unclassified)`, double non rappelé, `refused()` 1.
- TEST-8 (`scripts/h2-report/report-args.test.ts`) : `parseReportArgs(["--cap-usd", "1".repeat(400)])` lève `--cap-usd must be a decimal number > 0, got '<400 chiffres>'` ; `parseReportArgs(["--cap-usd", "1", "--runs", "1".repeat(400)])` lève `--runs must be an integer >= 1, got '<400 chiffres>'` ; `parseReportArgs(["--cap-usd", "1".repeat(300)]).capUsd` est fini.
- TEST-9 (`tests/llm/providers/gemini/gemini-llm-provider.test.ts`, en fin de fichier) : un `fetch` injecté rend `{ ok: false, status: 429, text: async () => QUOTA_BODY }` (sans clé `headers`), puis le même objet avec `headers: null` ; chaque fois `expectFailure(…, "API_ERROR", QUOTA_MESSAGE)` réussit, `status` 429, `Object.hasOwn(error, "retryAfterMs") === false`.
- TEST-10 (`scripts/repo-conventions.test.mjs`, titre en français) : dans `src/llm/providers/gemini/gemini-llm-provider.ts`, les lignes de celle qui commence par `// HTTP status (#34):` à la première qui finit par `carries none.` font chacune 100 colonnes au plus, et leur texte, préfixe `// ` retiré et joint par une espace, égale la phrase de SPEC-10.

## Estimation de taille

Hors `docs/` et `*.md`, lignes ajoutées :

| Fichier | Estimation |
|---|---|
| `scripts/h2-report/cap-guard.ts` (en-tête, types, `classifyCut`, `isPositiveRate`, `capGuard` avec TSDoc) | 95 |
| `scripts/h2-report/cap-guard.test.ts` (doubles 25, TEST-1 à 7 : 12, 8, 16, 16, 20, 32, 10) | 140 |
| `scripts/h2-report/report-args.ts` (+2 −2) et `report-args.test.ts` (+9) | 11 |
| `src/llm/providers/gemini/gemini-llm-provider.ts` (garde 2, TSDoc 1, en-tête +3 −1) | 6 |
| `tests/llm/providers/gemini/gemini-llm-provider.test.ts` (TEST-9) | 13 |
| `scripts/repo-conventions.test.mjs` (TEST-10) | 13 |
| **Total** | **environ 278** (fourchette 230 à 340) |

Sous le plafond de 400, marge d'environ 120 lignes ; aucune dérogation. La mesure (`pr_size.py`) fait foi à la PR.

## Hypothèses restantes

- **R-1 · `network` couvre toute `LLMError` sans `status`**, conséquence de la classification sur `status` seulement : une réponse Gemini 200 au corps illisible, non JSON ou refusé par `fromGeminiResponse` est classée `network`, bien qu'aucun réseau ne soit en cause ; le TSDoc de `LLMError` le prévient (« its absence does not say the failure was not HTTP »). La lire comme « aucun statut HTTP rapporté » dans le rapport de #33. Écarté par la consigne du pilote (« `status` uniquement ») : lire `code` en plus de `status`.
- **H9** (#34) reste non vérifiée : sans effet ici, `retryAfterMs` n'entre pas dans la classification.
- Longueurs de lignes de l'en-tête (l.8 à 118 colonnes, coupe de SPEC-10 à 98 colonnes au plus) comptées à la main : le planificateur les mesure.
- Node local ≥ 22.18 (retrait de types sans drapeau), constaté v22.19.0 par #20.
