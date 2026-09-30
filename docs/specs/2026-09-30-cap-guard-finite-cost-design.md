# Spécification · Rendre le plafond H2 étanche à un coût non fini ou négatif · #39

Date : 2026-09-30
Issue : https://github.com/arthurolivierfortin/agent-core/issues/39 (type bug, `T:bug`, jalon H2, sous le parapluie #3 ; dépend de #35, fusionné par la PR #38)
Checklist : docs/specs/2026-09-30-cap-guard-finite-cost-checklist.md
Branche : `fix/39-cap-guard-finite-cost` (worktree `.claude/worktrees/fix+39-cap-guard-finite-cost`, `main` cbb0ca8)
Continuité : docs/specs/2026-09-30-cap-guard-design.md (#35 : `capGuard`, SPEC-1 à SPEC-7, ordre des contrôles « coupure posée, puis plafond, puis tarif ») ; docs/specs/2026-09-30-gemini-wire-design.md (#18 : `toUsage`, hypothèse H4)

## Objectif

Faire qu'un coût non fini ou négatif coupe la matrice H2 au lieu d'entrer dans `spentUsd()`, faire contrôler `thoughtsTokenCount` par `toUsage` comme les deux autres compteurs Gemini, et verrouiller par des tests la classification d'un `status` 600, le refus d'un tarif `Infinity` et l'ordre des contrôles de `capGuard`.

## Source de l'issue et périmètre du pilote

Défaut relevé à la revue de la PR #38 : `scripts/h2-report/cap-guard.ts` ajoute à la dépense tout coût numérique, même non fini ou négatif ; `thoughtsTokenCount` n'est pas contrôlé dans `src/llm/providers/gemini/gemini-wire.ts`. Sonde du juge : `usage { tokensIn: 1, tokensOut: NaN }`, plafond 0.000001, trois appels → `calls 3 spent NaN cut null refused 0`. Le runner de #33 dépensera réellement et doit s'appuyer sur un plafond prouvé étanche.

Périmètre du pilote (fait foi, et rien de plus) :

1. Dans `capGuard`, un coût non fini ou négatif est un coût inconnu : coupure `unclassified`, réponse rendue, appel suivant refusé ; `spentUsd()` reste la somme connue. Dans `gemini-wire`, `thoughtsTokenCount` est contrôlé exactement comme les deux autres compteurs : une valeur non numérique donne `usage` `undefined`.
2. Tests : `status` 600 → `unclassified` ; composante `Infinity` dans les tarifs → `unpriced_model`.
3. Un test verrouille l'ordre des contrôles coupure → plafond → tarif, chaque paire discriminée par un état où deux conditions sont vraies et où la raison ou le message attendu est celui de la première.

Contraintes : classification sur `LLMError.status` seulement ; aucun appel réseau (doubles) ; aucun test qui fige le vrai `data/rates.json` ; la valeur d'une clé n'apparaît nulle part ; aucun `console.log` dans `src/` ; aucun `.env` lu ; PR sous 400 lignes hors `docs/` et `*.md`, sans dérogation ; gates build, typecheck, test.

## État constaté dans le code (lecture du 2026-09-30, `main` cbb0ca8)

- `scripts/h2-report/cap-guard.ts:85-89` : `const cost = aggregate([...], rates).costUsd;` puis `if (cost === null) cut ??= "unclassified"; else spent += cost;`. Tout `number` s'ajoute, `NaN`, `Infinity` et négatifs compris. Avec `NaN`, `spent` devient `NaN` et `spent >= capUsd` est faux pour toujours : le plafond ne coupe plus.
- `scripts/h2-report/cap-guard.ts:45-46` : TSDoc « spentUsd adds up the numeric costs only, so that one unknown cost never masks it with null ».
- `scripts/h2-report/cap-guard.ts:20-24` : `isPositiveRate` exige `Number.isFinite(price) && price > 0` pour les deux composantes : un tarif `Infinity` est déjà refusé (`unpriced_model`), sans test qui le verrouille (`cap-guard.test.ts:126-133`, `UNPRICED_TABLES` : `{}`, `null`, 0, 0, −1, `NaN`).
- `scripts/h2-report/cap-guard.ts:30-37` : `classifyCut` ; `Number.isInteger(status) && status >= 100 && status <= 599` → `http_<status>`, sinon `unclassified`. Un `status` 600 donne déjà `unclassified`, sans test (`cap-guard.test.ts:159-173`, `REJECTIONS` : 0 et 429.5 seulement hors plage).
- `scripts/h2-report/cap-guard.ts:69-76` : ordre des contrôles `cut !== null`, puis `spent >= capUsd`, puis `isPositiveRate` ; la coupure `unpriced_model` est posée par affectation (`cut = "unpriced_model"`), pas par `??=`.
- `scripts/h2-report/cap-guard.test.ts` : doubles `scripted(steps, streaming)` (l.25-39 ; rejoue ses étapes puis répète la dernière), `deferred()` (l.98-107) ; constantes `MODEL` (`hosted-model`), `HOSTED_RATE`, `RATES`, `HI`, `OPTS`, `PRICED_RESPONSE` (0,5 USD), `PRICED` ; aides `capMessage(spent, cap)` (l.70-71, modèle `MODEL` figé) et `cutMessage(model, reason)` (l.123-124) ; fin du fichier l.198. Titres `TEST-N (issue 35)`.
- `src/metrics/services/aggregate.ts:39-46` : `costOf` multiplie les compteurs par le tarif sans contrôle de finitude ni de signe ; `aggregate` ne lève jamais.
- `src/llm/providers/gemini/gemini-wire.ts:179-188` : `toUsage` ; `promptTokenCount` et `candidatesTokenCount` sont contrôlés par `typeof … !== "number"` **seulement** (ni finitude ni signe) ; `thoughtsTokenCount` est ajouté par `candidateTokens + (metadata?.thoughtsTokenCount ?? 0)` sans aucun contrôle : une chaîne `"7"` donne `tokensOut` `"57"` (chaîne), `true` donne 6, `null` donne 5 (compté 0), un objet donne `NaN` après multiplication dans `aggregate`.
- `src/llm/providers/gemini/gemini-wire.ts:43` : `usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number }`.
- `tests/llm/providers/gemini/gemini-wire.test.ts:210-224` : test « hypothesis H4: thoughtsTokenCount counts as output » ; son aide `usageOf` est typée `Record<string, number>` ; fin du fichier l.224. `tsconfig.json` couvre `tests` : les littéraux non numériques exigent une conversion `as unknown as number`.
- `src/llm/models/index.ts:104-114` : `new LLMError(code, message, { status })` accepte tout `number` et le pose en propre.

## Périmètre

Dans la PR :

- `scripts/h2-report/cap-guard.ts` (SPEC-1) et `scripts/h2-report/cap-guard.test.ts` (TEST-1, SPEC-3 et TEST-3, SPEC-4 et TEST-4, SPEC-5 et TEST-5).
- `src/llm/providers/gemini/gemini-wire.ts` (SPEC-2) et `tests/llm/providers/gemini/gemini-wire.test.ts` (TEST-2).

Hors périmètre :

- Contrôle de finitude ou de signe des compteurs eux-mêmes (`tokensIn`, `tokensOut`) dans `capGuard`, `aggregate` ou `toUsage` : le pilote a fixé le contrôle sur le coût dans `capGuard`, et sur le type seul dans `toUsage` (voir R-1).
- `aggregate`, `MetricsCollector`, `withMetrics`, `OllamaLLMProvider` (son propre `toUsage`), `LLMError`, les barrels.
- Le runner (#33), le README et `docs/guide-agent-package.md` (H4 y reste vraie : un `thoughtsTokenCount` numérique compte en sortie).
- `package.json`, `tsconfig*.json`, `data/rates.json`.

## Conception

### SPEC-1 · Coût non fini ou négatif = coût inconnu (`capGuard`)

Dans `guarded`, après le calcul de `cost` (l.86), la condition de coupure devient :

```ts
if (cost === null || !Number.isFinite(cost) || cost < 0) cut ??= "unclassified";
else spent += cost;
```

(`cost === null` reste en tête : `Number.isFinite` n'est pas une garde de type et `cost < 0` exige un `number` pour `npm run typecheck`.)

Effets, pour un appel résolu dont le coût est `NaN`, `Infinity`, `-Infinity` ou strictement négatif :

- la réponse est rendue telle quelle (même référence) : l'appel a eu lieu ;
- `cutReason()` vaut `unclassified` si aucune coupure n'était posée ;
- `spentUsd()` ne change pas : il reste la somme des coûts connus ;
- l'appel suivant est refusé par le premier contrôle, message `capGuard refused a call to '<model>': the matrix is cut (unclassified)`, fournisseur non appelé, `refused()` + 1.

Un coût fini et positif ou nul s'ajoute comme avant (0 et `-0` compris : une réponse à 0 jeton d'entrée et 0 de sortie a un coût connu de 0, sans coupure).

Le TSDoc de `capGuard` (l.45-46) remplace « spentUsd adds up the numeric costs only, so that one unknown cost never masks it with null » par une phrase qui dit que `spentUsd` n'additionne que les coûts finis et non négatifs, et qu'un coût `null`, non fini ou négatif est inconnu et coupe la matrice (`unclassified`) sans y entrer. Un commentaire d'une ligne au-dessus de la condition cite #39.

### SPEC-2 · `thoughtsTokenCount` contrôlé comme les deux autres compteurs (`toUsage`)

Contrôle retenu, **aligné exactement** sur celui des deux autres compteurs : `typeof … !== "number"`, rien de plus. Les deux autres compteurs ne sont contrôlés ni en finitude ni en signe ; `thoughtsTokenCount` non plus. `NaN`, `Infinity` et un négatif (les deux premiers impossibles à produire par `JSON.parse`) passent donc `toUsage` comme ils passent pour `promptTokenCount` et `candidatesTokenCount` ; c'est SPEC-1 qui les arrête dans `capGuard` quand ils rendent le coût non fini ou négatif.

Seule différence avec les deux autres, héritée de H4 et conservée : `thoughtsTokenCount` est facultatif. Absent (clé manquante ou valeur `undefined`), il compte 0, comme aujourd'hui (verrouillé par le test H4, l.218 et l.219, inchangé). Toute autre valeur qui n'est pas de type `number`, `null` compris, rend `usage` `undefined`, comme `null` le fait déjà pour les deux autres (`typeof null` vaut `"object"`).

Forme attendue de `toUsage` :

```ts
const tokensIn = metadata?.promptTokenCount;
const candidateTokens = metadata?.candidatesTokenCount;
const thoughts = metadata?.thoughtsTokenCount;
if (typeof tokensIn !== "number" || typeof candidateTokens !== "number") return undefined;
if (thoughts !== undefined && typeof thoughts !== "number") return undefined;
return { tokensIn, tokensOut: candidateTokens + (thoughts ?? 0) };
```

Le TSDoc de `toUsage` (l.179-182) dit : les trois compteurs doivent être des nombres, sinon `usage` reste `undefined` ; `thoughtsTokenCount` peut manquer et compte alors 0 ; absent n'est pas zéro pour les deux autres (ADR-AGENT-0007). Aucune autre ligne de `gemini-wire.ts` ne change ; le type `GeminiResponse` reste tel quel.

### SPEC-3 · `status` 600 → `unclassified` (test seul)

Aucune modification de `cap-guard.ts`. Livrable : un test `TEST-3 (issue 39)` dans `cap-guard.test.ts`, qui verrouille la borne haute de la plage `http_<status>` (599 inclus, 600 exclu). Voir TEST-3.

### SPEC-4 · Composante `Infinity` → `unpriced_model` (test seul)

Aucune modification de `cap-guard.ts`. Livrable : un test `TEST-4 (issue 39)` dans `cap-guard.test.ts`, qui verrouille la finitude exigée par `isPositiveRate` pour chacune des deux composantes. Voir TEST-4.

### SPEC-5 · Ordre des contrôles coupure → plafond → tarif (test seul)

Aucune modification de `cap-guard.ts`. Livrable : un test `TEST-5 (issue 39)` dans `cap-guard.test.ts`.

Les trois paires et l'état qui discrimine chacune :

| Paire | État où les deux conditions sont vraies | Attendu (celui de la première) | Ce que donnerait l'ordre inverse |
|---|---|---|---|
| plafond avant tarif | plafond 0,5, double `scripted([PRICED])`, un appel tarifé sur `hosted-model` (dépense 0,5), puis un appel sur `unpriced-model`, absent de `RATES` | rejet `capGuard refused a call to 'unpriced-model': 0.5 USD spent reached the cap of 0.5 USD`, `cutReason()` `null`, `refused()` 1, double à 1 appel | rejet `… the matrix is cut (unpriced_model)`, `cutReason()` `unpriced_model` |
| coupure avant tarif | plafond 10, double `scripted([PRICED, { error }])` avec `error = new LLMError("API_ERROR", "quota", { status: 429 })` : un appel tarifé, un rejet (coupure `rate_limited`), puis un appel sur `unpriced-model` | rejet `capGuard refused a call to 'unpriced-model': the matrix is cut (rate_limited)`, `cutReason()` `rate_limited`, `refused()` 1, double à 2 appels | le contrôle du tarif affecte `cut = "unpriced_model"` (l.74) : rejet `… the matrix is cut (unpriced_model)`, `cutReason()` `unpriced_model` |
| coupure avant plafond | **inatteignable** par l'interface publique (démonstration ci-dessous) | aucun état à observer | comportement identique |

Démonstration de l'inatteignabilité de « coupure posée et dépense ≥ plafond » : `spent` n'augmente que sur un appel résolu dont le coût est connu, et cet appel ne pose aucune coupure. Une coupure est posée (a) par le contrôle du tarif, qui ne s'exécute que si `spent < capUsd`, (b) sur un rejet, (c) sur un coût inconnu ; dans (b) et (c) l'appel a été admis, donc `spent < capUsd`, et `spent` ne change pas. Après une coupure, tout appel est refusé avant le fournisseur, donc `spent` ne change plus. Au moment où une coupure est posée on a donc `spent < capUsd`, et cela reste vrai ensuite. Échanger les deux premiers contrôles ne change aucun comportement observable ; aucun test ne peut le discriminer sans exposer l'état interne, ce que le périmètre exclut (« rien de plus »). Les deux paires atteignables fixent l'ordre total observable : le tarif est contrôlé en dernier, après la coupure et après le plafond. Un commentaire du test le dit (voir R-2).

## Chemins nominal et d'erreur

| Situation après un appel résolu | Avant #39 | Après #39 |
|---|---|---|
| coût fini ≥ 0 (0 compris) | ajouté, pas de coupure | inchangé |
| coût `null` (pas d'usage) | coupure `unclassified` | inchangé |
| coût `NaN` | `spent` devient `NaN`, plus aucun refus | coupure `unclassified`, `spent` inchangé, appel suivant refusé |
| coût `Infinity` | `spent` `Infinity`, appel suivant refusé par le plafond, `cutReason()` `null` | coupure `unclassified`, `spent` inchangé |
| coût négatif | `spent` diminue, le plafond recule | coupure `unclassified`, `spent` inchangé |

| `thoughtsTokenCount` (les deux autres compteurs numériques) | Avant #39 | Après #39 |
|---|---|---|
| absent | `tokensOut` = candidats | inchangé |
| nombre | `tokensOut` = candidats + pensées | inchangé |
| `"7"` | `tokensOut` `"57"` (chaîne) | `usage` `undefined` |
| `true` | `tokensOut` 6 | `usage` `undefined` |
| `null` | `tokensOut` = candidats (compté 0) | `usage` `undefined` |

## Symétrie

- Écriture face à lecture : `toUsage` écrit `usage` ; `capGuard` le lit par `aggregate`. Une valeur non numérique est arrêtée à l'écriture (SPEC-2, `usage` `undefined` → coût `null` → coupure `unclassified`, chemin de TEST-7 de #35) ; une valeur numérique invalide est arrêtée à la lecture (SPEC-1), quel que soit le fournisseur (un double ou un autre adaptateur que Gemini peut rendre `NaN`).
- Chemin nominal face au chemin d'erreur : coût fini ≥ 0 ajouté (TEST-1 de #35, et le cas « zéro jeton » de TEST-1 ici, qui verrouille la borne `cost < 0` contre `cost <= 0`) face à coût `NaN`, `Infinity`, négatif (TEST-1). Compteur de pensées absent ou numérique (test H4 inchangé) face à non numérique (TEST-2).
- Énumération `CutReason` : inchangée ; aucune valeur nouvelle, `unclassified` reste le fourre-tout (D6 de #35).
- Tarif : borne `> 0` déjà verrouillée (0, −1, `NaN` de #35) ; borne de finitude verrouillée ici (TEST-4). Statut : valeurs hors plage 0 et 429.5 verrouillées par #35, borne haute 600 ici (TEST-3).

## Données touchées

Aucune base, aucun fichier écrit, aucune variable d'environnement lue ni posée. Tarifs des tests : littéraux (`HOSTED_RATE`, `RATES` du fichier de test), jamais `data/rates.json`. Aucune clé, réelle ou factice, dans les fichiers touchés.

## Décisions et alternatives écartées

- **D1 · Contrôle sur le coût, dans `capGuard`** (décision du pilote) plutôt que dans `aggregate` : `aggregate` sert aussi le total du rapport, que #39 ne touche pas ; le garde est la seule frontière qui doit être étanche avant #33.
- **D2 · Coût négatif = inconnu**, plutôt que borné à 0 : un coût négatif ne décrit aucune dépense réelle ; le compter 0 masquerait un défaut d'adaptateur.
- **D3 · `cut ??= "unclassified"`** : même raison et même forme que le coût `null` (SPEC-7 de #35) ; aucune valeur nouvelle dans `CutReason` (liste fermée du pilote de #35).
- **D4 · `toUsage` aligné sur `typeof` seul**, consigne du pilote (« exactement comme les deux autres ») : pas de `Number.isFinite` ni de signe sur `thoughtsTokenCount` alors que les deux autres n'en ont pas.
- **D5 · `thoughtsTokenCount: null` → `usage` `undefined`** (changement : il comptait 0). `null` n'est pas de type `number` et rend déjà `usage` `undefined` pour les deux autres compteurs ; seule l'absence reste lue comme 0 (H4). Écarté : traiter `null` comme absent, qui garderait une valeur non numérique silencieuse.
- **D6 · Tests seuls pour SPEC-3 à SPEC-5**, prouvés par mutation (précédent D8 de docs/specs/2026-09-30-gemini-wiring-design.md) : le comportement est déjà livré par #35.
- **D7 · Paire coupure/plafond non testée**, faute d'état atteignable (SPEC-5, R-2). Écarté : exposer une fonction interne de contrôle ou un accès à `spent` pour la tester, qui changerait l'interface de `CapGuard` (sept clés propres verrouillées par TEST-1 de #35).

## Ordre des commits et preuve de rouge

Un SPEC = un commit = un test, dans l'ordre SPEC-1 à SPEC-5. La spécification et la checklist entrent dans le commit de SPEC-1 (précédent P1 de #20 et #35). Preuves par `npm run test`, chemins relatifs au dépôt dans toute preuve ; la sortie doit montrer les titres `TEST-N (issue 39)`.

- TEST-1 avant SPEC-1 : pour la sonde du juge, le double est appelé 3 fois, `spentUsd()` vaut `NaN`, `cutReason()` `null`, `refused()` 0 ; pour les lignes `Infinity` et négatif, `cutReason()` vaut `null`.
- TEST-2 avant SPEC-2 : `"7"` rend `{ tokensIn: 10, tokensOut: "57" }`, `true` rend `{ tokensIn: 10, tokensOut: 6 }`, `null` rend `{ tokensIn: 10, tokensOut: 5 }` au lieu de `undefined`.
- TEST-3, TEST-4, TEST-5 sont **verts dès leur écriture** (comportement de #35). Leur preuve de pertinence est une mutation locale de `scripts/h2-report/cap-guard.ts`, exécutée dans la session, montrée dans le rapport du builder et dans le corps du commit, puis annulée **sans commit** (`git diff --stat -- scripts/h2-report/cap-guard.ts` vide au commit) :
  - TEST-3 : `status <= 599` → `status <= 600` dans `classifyCut` fait échouer TEST-3 (`http_600`).
  - TEST-4 : `Number.isFinite(price) && price > 0` → `price > 0` dans `isPositiveRate` fait échouer TEST-4 (fournisseur appelé, `cutReason()` différent de `unpriced_model`).
  - TEST-5 : le bloc du contrôle du tarif (`if (!isPositiveRate(…)) { … }`) déplacé au-dessus du contrôle du plafond fait échouer le cas « plafond avant tarif » ; déplacé au-dessus du contrôle de la coupure, il fait échouer le cas « coupure avant tarif ». Chaque mutation est appliquée seule.

Gabarit (aucun `Co-Authored-By`) :

```
<type>(<scope>): <sujet>

Refs: #39
Session: <id>
Model: <modèle>
Authorship: ai
```

| SPEC | Sujet (impératif, 72 caractères au plus type compris) |
|---|---|
| 1 | `fix(scripts): couper la matrice sur un coût non fini ou négatif` (63) |
| 2 | `fix(llm): contrôler thoughtsTokenCount comme les autres compteurs` (65) |
| 3 | `test(scripts): verrouiller unclassified pour un status 600` (58) |
| 4 | `test(scripts): verrouiller unpriced_model pour un tarif Infinity` (64) |
| 5 | `test(scripts): verrouiller l'ordre coupure, plafond, tarif` (58) |

### Message de squash proposé

```
fix(scripts): rendre le plafond H2 étanche à un coût invalide (#<PR>)

capGuard n'ajoute plus à la dépense un coût NaN, infini ou négatif :
un tel coût est inconnu, coupe la matrice (unclassified), rend la
réponse et fait refuser l'appel suivant ; spentUsd() reste la somme
des coûts connus. La sonde de la revue de #38 (tokensOut NaN, plafond
0.000001, trois appels) donnait trois appels et spent NaN ; elle en
donne un, puis deux refus.

toUsage (gemini-wire) contrôle thoughtsTokenCount par typeof, comme
promptTokenCount et candidatesTokenCount : une valeur non numérique,
null compris, rend usage undefined ; absent, il compte toujours 0.

Tests ajoutés sans code : status 600 classé unclassified, composante
de tarif Infinity refusée (unpriced_model), ordre des contrôles
verrouillé sur les paires plafond/tarif et coupure/tarif (la paire
coupure/plafond n'a aucun état atteignable).

Refs: #39
Session: <id>
Model: <modèle>
Authorship: ai
```

Sujet : 61 caractères sans le suffixe ; 67 avec ` (#NN)`.

## Tests

Déterministes, sans réseau, sans horloge, sans fournisseur réel (ni `GeminiLLMProvider`, ni `OllamaLLMProvider`, ni `PROVIDERS`), sans variable d'environnement. Titres en anglais comme leurs voisins, préfixés `TEST-N (issue 39)`, ajoutés en fin de fichier. Dans `cap-guard.test.ts`, réutiliser `scripted`, `MODEL`, `HOSTED_RATE`, `RATES`, `HI`, `OPTS`, `PRICED`, `PRICED_RESPONSE`, `cutMessage` ; un modèle absent des tables s'appelle `unpriced-model`.

- **TEST-1** (exerce SPEC-1), trois groupes :
  - (a) Une ligne par usage invalide, plafond 10, double `scripted([PRICED, { response }])` : `{ tokensIn: 1, tokensOut: NaN }` (coût `NaN`) ; `{ tokensIn: Infinity, tokensOut: 0 }` (coût `Infinity`) ; `{ tokensIn: 0, tokensOut: -1_000_000 }` (coût −2). Pour chaque ligne : premier appel tarifé ; le deuxième rend la même référence de réponse, puis `[cutReason(), spentUsd(), refused()]` égale `["unclassified", 0.5, 0]` ; le troisième rejette avec `cutMessage(MODEL, "unclassified")` ; le double compte 2 appels ; `refused()` 1.
  - (b) Sonde du juge : plafond 0.000001, double `scripted([{ response }])` avec `response = { content: "nan", toolCalls: [], usage: { tokensIn: 1, tokensOut: NaN } }`, trois appels : le premier rend la réponse (même référence), le deuxième et le troisième rejettent avec `cutMessage(MODEL, "unclassified")` ; le double compte 1 appel ; `spentUsd()` 0 ; `cutReason()` `unclassified` ; `refused()` 2.
  - (c) Borne : plafond 10, double `scripted([PRICED, { response: zero }, PRICED])` avec `zero = { content: "zero", toolCalls: [], usage: { tokensIn: 0, tokensOut: 0 } }` : premier appel tarifé ; le deuxième rend `zero`, puis `cutReason()` `null` et `spentUsd()` 0.5 ; le troisième atteint le double et rend `PRICED_RESPONSE` ; le double compte 3 appels ; `spentUsd()` 1 ; `refused()` 0.
- **TEST-2** (exerce SPEC-2, `tests/llm/providers/gemini/gemini-wire.test.ts`) : pour chacune des valeurs `"7"`, `null`, `true` de `thoughtsTokenCount` (passée par `as unknown as number`), avec `promptTokenCount` 10 et `candidatesTokenCount` 5, `fromGeminiResponse({ candidates: [{ content: { role: "model", parts: [{ text: "ok" }] } }], usageMetadata }).usage` vaut `undefined`. Le test « hypothesis H4: thoughtsTokenCount counts as output » n'est pas modifié et reste vert (absent → 0, 7 → sortie 12).
- **TEST-3** (exerce SPEC-3) : double `scripted([PRICED, { error }])` avec `error = new LLMError("API_ERROR", "above range", { status: 600 })`, plafond 10 : premier appel tarifé ; le deuxième rejette avec la même référence ; `[cutReason(), spentUsd(), refused()]` égale `["unclassified", 0.5, 0]` ; le troisième rejette avec `cutMessage(MODEL, "unclassified")` ; le double compte 2 appels ; `refused()` 1.
- **TEST-4** (exerce SPEC-4) : pour chacune des tables `{ [MODEL]: { ...HOSTED_RATE, usdPerMillionTokensIn: Infinity } }` et `{ [MODEL]: { ...HOSTED_RATE, usdPerMillionTokensOut: Infinity } }`, plafond 10, double `scripted([PRICED])` : `complete` rejette avec `cutMessage(MODEL, "unpriced_model")` ; le double n'est pas appelé ; `cutReason()` `unpriced_model` ; `refused()` 1 ; `spentUsd()` 0.
- **TEST-5** (exerce SPEC-5), un seul `test()` au titre `TEST-5 (issue 39) the checks run in the order cut, cap, rate`, deux gardes distincts : les deux cas atteignables du tableau de SPEC-5 (« plafond avant tarif », « coupure avant tarif »), avec pour chacun le message exact, `cutReason()`, `refused()` 1 et le compte d'appels du double. Un commentaire de deux lignes au plus au-dessus du test dit que la paire coupure/plafond n'a aucun état atteignable et renvoie à cette spécification.

## Estimation de taille

Hors `docs/` et `*.md`, lignes ajoutées :

| Fichier | Estimation |
|---|---|
| `scripts/h2-report/cap-guard.ts` (condition, commentaire, TSDoc) | 4 |
| `scripts/h2-report/cap-guard.test.ts` (TEST-1 : 45 ; TEST-3 : 12 ; TEST-4 : 16 ; TEST-5 : 25) | 98 |
| `src/llm/providers/gemini/gemini-wire.ts` (`toUsage` et TSDoc) | 6 |
| `tests/llm/providers/gemini/gemini-wire.test.ts` (TEST-2) | 10 |
| **Total** | **environ 118** (fourchette 90 à 160) |

Très en dessous du plafond de 400 ; aucune dérogation. La mesure (`pr_size.py`) fait foi à la PR.

## Hypothèses restantes

- **R-1 · Compteurs invalides qui se compensent.** Le contrôle porte sur le coût, pas sur les compteurs : un compteur négatif compensé par un compteur positif (par exemple `tokensIn` −1 et `tokensOut` 1 000 000) donne un coût fini et positif, sous-estimé, qui s'ajoute sans coupure. `toUsage` ne l'empêche pas davantage (alignement sur `typeof` seul, D4). Aucune réponse Gemini connue ne porte un compteur négatif. Hors du périmètre du pilote ; à rouvrir en issue si le pilote veut une étanchéité par compteur.
- **R-2 · Paire coupure/plafond inatteignable** (SPEC-5) : le point 3 du pilote demande chaque paire discriminée ; celle-ci ne peut pas l'être sans exposer l'état interne. Le test verrouille les deux paires atteignables, qui fixent l'ordre total observable.
- **R-3 · Réponse qui lève à la lecture de `usage`.** Observé à la lecture, hors périmètre : `response.usage?.tokensIn` (l.85) est lu hors du `try` ; un fournisseur qui résout `undefined` ou un `usage` dont un accesseur lève fait rejeter l'appel sans poser de coupure, et l'appel suivant est admis. `GeminiLLMProvider` rend toujours un objet construit par `fromGeminiResponse`, donc le cas ne vient que d'un adaptateur non conforme au port. Signalé au pilote pour une éventuelle issue, non traité ici.
- **Node** ≥ 22.18 (retrait de types sans drapeau), constaté v22.19.0 par #20.
