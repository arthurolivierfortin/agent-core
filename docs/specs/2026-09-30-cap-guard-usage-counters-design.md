# Spécification · Contrôler chaque compteur d'usage dans capGuard et lire l'usage sous garde · #41

Date : 2026-09-30
Issue : https://github.com/arthurolivierfortin/agent-core/issues/41 (label `T:chore`, jalon H2 ; reprend R-1 et R-3 de docs/specs/2026-09-30-cap-guard-finite-cost-design.md)
Checklist : docs/specs/2026-09-30-cap-guard-usage-counters-checklist.md
Branche : `chore/41-cap-guard-usage-counters` (worktree `.claude/worktrees/chore+41-cap-guard-usage-counters`, `main` 76d02c1)
Continuité : docs/specs/2026-09-30-cap-guard-design.md (#35 : `capGuard`, SPEC-7 « coût inconnu sur un appel résolu → `unclassified` », D6) ; docs/specs/2026-09-30-cap-guard-finite-cost-design.md (#39 : coût non fini ou négatif → `unclassified`, R-1 et R-3 déclarés hors périmètre)

## Objectif

Faire couper la matrice H2 (`unclassified`) par `capGuard` dès qu'un compteur d'usage d'un appel résolu n'est pas un entier fini ≥ 0, ou dès que la lecture de la réponse lève, au lieu d'ajouter un coût sous-estimé ou de laisser passer l'appel suivant.

## Source de l'issue et périmètre du pilote

Corps de l'issue :

- **R-1** : le contrôle porte sur le coût, pas sur chaque compteur ; un `tokensIn` négatif compensé par un `tokensOut` énorme donne un coût fini sous-estimé sans coupure. Attendu : chaque compteur d'usage est un entier fini ≥ 0, sinon coût inconnu et coupure `unclassified`.
- **R-3** : `cap-guard.ts` lit `response.usage` hors du `try` ; un adaptateur qui résout `undefined` fait rejeter l'appel sans coupure, et l'appel suivant est admis. Attendu : lecture dans le `try`, coupure `unclassified`.
- Tests seuls plus deux gardes.

Précisions du pilote (font foi) : la classification d'un rejet du fournisseur reste sur `LLMError.status` seulement ; les sept clés propres de `CapGuard` restent inchangées ; `spentUsd()` reste la somme des coûts connus ; les tests existants (#35, #39, #42) restent verts. Contraintes : aucun appel réseau (doubles) ; aucun test qui fige le vrai `data/rates.json` ; la valeur d'une clé n'apparaît nulle part ; aucun `console.log` dans `src/` ; aucun `.env` lu ; PR sous 400 lignes hors `docs/` et `*.md`, sans dérogation ; gates build, typecheck, test.

## État constaté dans le code (lecture du 2026-09-30, `main` 76d02c1)

- `scripts/h2-report/cap-guard.ts:69-93` : `guarded`. `try` l.79-85 autour de `provider.complete` seul ; l.86 `const usage = { tokensIn: response.usage?.tokensIn ?? null, tokensOut: response.usage?.tokensOut ?? null };` **hors du `try`** ; l.87 `const cost = aggregate([{ model: opts.model, ...usage, durationMs: 0 }], rates).costUsd;` ; l.90-91 `if (cost === null || !Number.isFinite(cost) || cost < 0) cut ??= "unclassified"; else spent += cost;` (#39).
- Conséquence R-3 : un fournisseur qui résout `undefined` ou `null` fait lever `TypeError` à la l.86 ; un objet dont l'accesseur `usage` lève fait de même avec sa propre erreur. L'erreur sort de `guarded` sans passer par le `catch` : `cutReason()` reste `null`, `refused()` 0, et l'appel suivant atteint le fournisseur.
- Conséquence R-1 : `src/metrics/services/aggregate.ts:39-46` (`costOf`) multiplie les compteurs par le tarif sans contrôle de type, de finitude, de signe ni d'intégralité. Au tarif 1 / 2 USD par million : `{ tokensIn: -1, tokensOut: 1_000_000 }` donne 1,999999 USD (fini, positif, sous-estimé) ; `{ tokensIn: 0.5, tokensOut: 125_000 }` donne 0,2500005 ; `{ tokensIn: 250_000, tokensOut: "125000" }` donne 0,5 (la chaîne est convertie par la multiplication). Les trois s'ajoutent à `spent` sans coupure.
- `scripts/h2-report/cap-guard.ts:45-47` : TSDoc « A call's cost is aggregate() of its one record, the arithmetic of the report's total. spentUsd adds up the finite, non-negative costs only: a cost that is null, not finite or negative is unknown, and cuts the matrix (unclassified) without entering it. »
- `scripts/h2-report/cap-guard.ts:30-37` : `classifyCut`, lit `LLMError.status` seulement ; `TypeError` et toute valeur qui n'est pas une `LLMError` → `unclassified`.
- `src/llm/models/index.ts:39-42` : `Usage = { tokensIn: number; tokensOut: number }` ; `LLMResponse.usage?: Usage` (l.52). `Usage` est servi par `dist/index.js` (`scripts/h2-report/run-report.test.ts:7` l'importe).
- `scripts/h2-report/cap-guard.test.ts` : import de types l.4 (`LLMProvider, LLMResponse, Message, ModelInfo, RateTable`) ; doubles `scripted(steps, streaming)` (l.25-39, rejoue ses étapes puis répète la dernière) ; constantes `MODEL`, `HOSTED_RATE`, `RATES`, `HI`, `OPTS`, `PRICED_RESPONSE` (0,5 USD), `PRICED` ; aides `cutMessage(model, reason)` (l.123-124) et `settle(call)` (l.222-224) ; tests `TEST-1 (issue 39)` sur `INVALID_USAGES` (l.202-220 : `NaN`, `Infinity`, négatif) ; fin du fichier l.299.
- `scripts/h2-report/run-report.ts:135-141` (`truncationCause`) lit `cutReason()` : une coupure `unclassified` donne `cut: unclassified` dans `TRUNCATED.txt`, sans changement de code. `scripts/h2-report/run-report.test.ts:198`, `:200` : usages des doubles `{ 10, 5 }` et `{ 0, 200_000 }`, entiers ≥ 0 : inchangés par SPEC-1.
- `src/metrics/application/use-cases/with-metrics.ts:44-50` : `withMetrics`, placé au-dessus du garde par `runMatrix`, enregistre `response.usage?.tokensIn ?? null` tel quel (voir R-1 des hypothèses restantes).

## Périmètre

Dans la PR :

- `scripts/h2-report/cap-guard.ts` (SPEC-1, SPEC-2) ;
- `scripts/h2-report/cap-guard.test.ts` (TEST-1, TEST-2).

Hors périmètre :

- `aggregate`, `MetricsCollector`, `withMetrics`, `toUsage` de Gemini et d'Ollama, `LLMError`, les barrels, tout `src/`.
- `scripts/h2-report/run-report.ts` et sa documentation (`docs/rapport-h2.md` ne cite aucune raison de coupure).
- L'énumération `CutReason` (aucune valeur nouvelle), les sept clés de `CapGuard`, `classifyCut`, `isPositiveRate`, l'ordre des contrôles, la sérialisation.
- `package.json`, `tsconfig*.json`, `data/rates.json`.

## Conception

### SPEC-1 · Chaque compteur d'usage est un entier fini ≥ 0 (R-1)

Deux fonctions non exportées ajoutées à `scripts/h2-report/cap-guard.ts`, au-dessus de `capGuard` :

```ts
/** #41: a usage counter is an integer >= 0 (so finite); anything else makes the call's cost unknown. */
function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/** The two counters of a response, each read once; null when usage is absent or either is not a count. */
function usageCounters(response: LLMResponse): { tokensIn: number; tokensOut: number } | null {
  const usage = response.usage;
  const tokensIn = usage?.tokensIn;
  const tokensOut = usage?.tokensOut;
  return isCount(tokensIn) && isCount(tokensOut) ? { tokensIn, tokensOut } : null;
}
```

(`typeof value === "number"` est requis pour que `value >= 0` passe `npm run typecheck` sur un `unknown`.)

Dans `guarded`, les l.86-87 deviennent :

```ts
const counters = usageCounters(response);
const cost = counters === null ? null : aggregate([{ model: opts.model, ...counters, durationMs: 0 }], rates).costUsd;
```

La condition de #39 (l.90-91) reste **inchangée** : `cost === null` couvre désormais aussi un compteur invalide.

Effets, pour un appel résolu dont un compteur est négatif, fractionnaire, non fini ou d'un autre type que `number` (chaîne, booléen, `null`) :

- la réponse est rendue telle quelle (même référence) : l'appel a eu lieu ;
- `cutReason()` vaut `unclassified` si aucune coupure n'était posée ;
- `spentUsd()` ne change pas ;
- l'appel suivant est refusé : message `capGuard refused a call to '<model>': the matrix is cut (unclassified)`, fournisseur non appelé, `refused()` + 1.

Chaque compteur est lu une seule fois et la valeur contrôlée est celle qui est tarifée : un accesseur qui rendrait une valeur différente à chaque lecture ne peut pas passer le contrôle avec l'une et être tarifé avec l'autre.

Le contrôle de #39 sur le coût reste atteignable et nécessaire : deux compteurs entiers ≥ 0 très grands (`1e308`) donnent un coût `Infinity` par dépassement, arrêté par `!Number.isFinite(cost)`. TEST-1 le verrouille, puisque après SPEC-1 les lignes `INVALID_USAGES` de #39 sont arrêtées par `isCount` avant le contrôle du coût.

Le TSDoc de `capGuard` (l.45-47) ajoute, après la phrase sur `spentUsd`, une phrase disant que chaque compteur d'usage doit être un entier ≥ 0, lu une fois, sinon le coût est inconnu et coupe la matrice (`unclassified`) (#41).

### SPEC-2 · Lecture de la réponse sous garde (R-3)

Dans `guarded`, l'appel `usageCounters(response)` passe dans un **second** `try`, placé après celui de `provider.complete` :

```ts
let counters: { tokensIn: number; tokensOut: number } | null;
try {
  counters = usageCounters(response);
} catch (error) {
  // #41: the call took place, but its response cannot be read; its cost is unknown. Same error goes on.
  cut ??= "unclassified";
  throw error;
}
```

Effets, pour un fournisseur qui résout `undefined` ou `null`, ou une réponse dont l'accesseur `usage`, `tokensIn` ou `tokensOut` lève :

- `complete` rejette avec la même erreur (même référence, ni enveloppée ni convertie), comme aujourd'hui ;
- `cutReason()` vaut `unclassified` si aucune coupure n'était posée, **quelle que soit l'erreur levée**, `LLMError` à `status` comprise ;
- `spentUsd()` ne change pas ;
- l'appel suivant est refusé par le message de coupure `(unclassified)`, fournisseur non appelé, `refused()` + 1.

Le TSDoc de `capGuard` ajoute une phrase : une réponse illisible (`undefined`, `null`, un accesseur qui lève) coupe la matrice (`unclassified`) et l'appel rejette avec cette même erreur (#41).

## Chemins nominal et d'erreur

| Appel résolu | Avant #41 | Après #41 |
|---|---|---|
| compteurs entiers ≥ 0, coût fini | ajouté, pas de coupure | inchangé |
| compteurs entiers ≥ 0, coût `Infinity` par dépassement | coupure `unclassified` (#39) | inchangé |
| `usage` absent, ou compteur `null` | coupure `unclassified` (#35) | inchangé (par `usageCounters` → `null`) |
| un compteur négatif compensé par l'autre | coût fini sous-estimé ajouté, pas de coupure | coupure `unclassified`, `spent` inchangé |
| un compteur fractionnaire | coût fini ajouté, pas de coupure | coupure `unclassified`, `spent` inchangé |
| un compteur chaîne numérique | coût converti ajouté, pas de coupure | coupure `unclassified`, `spent` inchangé |
| un compteur `NaN`, `Infinity`, négatif sans compensation | coupure `unclassified` (#39, par le coût) | coupure `unclassified` (par `isCount`) |
| réponse `undefined` ou `null` | rejet `TypeError`, pas de coupure, appel suivant admis | rejet `TypeError`, coupure `unclassified`, appel suivant refusé |
| accesseur `usage` qui lève une `LLMError` à `status` 429 | rejet, pas de coupure, appel suivant admis | rejet par la même erreur, coupure `unclassified` (jamais `rate_limited`) |

Appel rejeté par le fournisseur : inchangé (classé par `classifyCut` sur `status`).

## Symétrie

- Écriture face à lecture : l'adaptateur écrit `usage` ; `capGuard` le lit une fois par compteur (SPEC-1), sous garde (SPEC-2) ; `run-report.ts` lit la raison `unclassified` par `cutReason()` sans changement.
- Chemin nominal face au chemin d'erreur : compteurs valides (TEST-1 à TEST-7 de #35, coût nul de #39, inchangés) face à compteurs invalides (TEST-1) ; réponse lisible face à illisible (TEST-2). Rejet du fournisseur (classé sur `status`) face à échec de lecture d'une réponse résolue (toujours `unclassified`).
- Énumération `CutReason` : inchangée ; `unclassified` reste le fourre-tout de D6 (#35), qui couvre déjà « appel résolu sans usage ».
- Double garde compteurs / coût : `isCount` couvre les compteurs, `!Number.isFinite(cost)` couvre le dépassement ; chacun a un test qui échoue sans lui (TEST-1 (a) pour le premier, TEST-1 (b) pour le second).

## Données touchées

Aucune base, aucun fichier écrit, aucune variable d'environnement lue ni posée. Tarifs des tests : littéraux du fichier de test (`HOSTED_RATE`, `RATES`), jamais `data/rates.json`. Aucune clé, réelle ou factice, dans les fichiers touchés.

## Décisions et alternatives écartées

- **D1 · Contrôle par compteur dans `capGuard`**, pas dans `aggregate` ni dans `toUsage` : même raison que D1 de #39, `aggregate` sert le total du rapport, hors périmètre ; le garde est la frontière qui doit être étanche, quel que soit l'adaptateur.
- **D2 · Entier fini ≥ 0** (`Number.isInteger`, qui exclut `NaN` et `±Infinity`) : formulation exacte de l'issue ; un compte de jetons fractionnaire ne décrit aucune facturation réelle. `-0` passe (`Number.isInteger(-0)` et `-0 >= 0` sont vrais) et donne un coût de 0, sans conséquence.
- **D3 · Contrôle du coût de #39 conservé** tel quel : il reste atteignable (dépassement) ; le retirer affaiblirait le garde. Sa branche `cost < 0` devient inatteignable (compteurs ≥ 0 et tarifs > 0 contrôlés par `isPositiveRate`) ; elle est gardée comme défense, sans test (voir R-2).
- **D4 · Second `try` dédié qui pose `unclassified`**, plutôt que déplacer la lecture dans le `try` de `provider.complete` : dans ce dernier, le `catch` passerait l'erreur de lecture à `classifyCut`, et un accesseur levant une `LLMError` à `status` 429 donnerait `rate_limited` alors que le fournisseur a résolu, un rapport qui dirait faux (« cut: rate_limited »). Le second `try` garde `classifyCut` réservée aux rejets du fournisseur (précision du pilote : classification sur `status` seulement) et aligne la lecture impossible sur D6 de #35 (appel résolu au coût inconnu → `unclassified`). La lecture est bien « dans le `try` » demandé par l'issue, et TEST-2 discrimine les deux placements.
- **D5 · L'appel rejette toujours sur une réponse illisible**, plutôt que rendre la réponse : une réponse `undefined` ne satisfait pas `LLMResponse`, et `withMetrics`, au-dessus du garde, la lirait de toute façon. Comportement de rejet inchangé, seule la coupure s'ajoute.
- **D6 · Type des commits `fix`**, alors que le label de l'issue est `T:chore` : le label range l'issue dans le suivi, le type de commit décrit le changement. Ici trois comportements observables changent (un appel jusqu'ici admis est refusé ; `cutReason()` passe de `null` à `unclassified` ; `spentUsd()` n'inclut plus un coût sous-estimé) : c'est la correction d'un défaut du plafond, pas une tâche sans effet. Précédent : #39 (`fix(scripts)`). La branche garde son nom `chore/41-…`, déjà créée.

## Ordre des commits et preuve de rouge

Un SPEC = un commit = un test, dans l'ordre SPEC-1 puis SPEC-2. La spécification et la checklist entrent dans le commit de SPEC-1 (précédent P1 de #20, #35, #39). Preuves par `npm run test`, chemins relatifs au dépôt dans toute preuve ; la sortie doit montrer les titres `TEST-N (issue 41)`.

- TEST-1 (a) avant SPEC-1 : pour chaque ligne de `INVALID_COUNTERS`, `cutReason()` vaut `null` et `spentUsd()` dépasse 0,5 après le deuxième appel ; le troisième appel atteint le double.
- TEST-1 (b) est **vert avant SPEC-1** (comportement de #39). Sa pertinence est prouvée par mutation, **après le commit de SPEC-1**, sur l'arbre propre : retirer `|| !Number.isFinite(cost)` de la condition de `guarded` fait échouer TEST-1 (b) (`cutReason()` `null`, `spentUsd()` `Infinity`) ; mutation annulée par `git restore scripts/h2-report/cap-guard.ts`, `git diff --stat -- scripts/h2-report/cap-guard.ts` vide ensuite ; sortie montrée dans le rapport du builder et dans la description de la PR.
- TEST-2 avant SPEC-2 : pour chaque ligne de `UNREADABLE_RESPONSES`, `cutReason()` vaut `null` après le deuxième appel et le troisième atteint le double (3 appels).
- Mutation de discrimination de D4, **après le commit de SPEC-2**, sur l'arbre propre : placer l'appel `usageCounters(response)` dans le `try` de `provider.complete` (second `try` supprimé) fait échouer la ligne de l'accesseur `LLMError` 429 de TEST-2 (`rate_limited` au lieu de `unclassified`) ; annulée et prouvée comme ci-dessus.

Gabarit (aucun `Co-Authored-By`) :

```
<type>(<scope>): <sujet>

<corps : ce qui change et la preuve de rouge, chemins relatifs au dépôt>

Refs: #41
Session: <id>
Model: <modèle>
Authorship: ai
```

| SPEC | Sujet (impératif, 72 caractères au plus type compris) |
|---|---|
| 1 | `fix(scripts): couper la matrice sur un compteur d'usage invalide` (64) |
| 2 | `fix(scripts): couper la matrice si la lecture de l'usage lève` (61) |

### Message de squash proposé

```
fix(scripts): fermer capGuard aux usages invalides ou illisibles (#<PR>)

capGuard contrôle chaque compteur d'usage d'un appel résolu, lu une
seule fois : tokensIn et tokensOut doivent être des entiers finis >= 0.
Sinon le coût est inconnu : la réponse est rendue, la matrice est
coupée (unclassified), spentUsd() reste la somme des coûts connus et
l'appel suivant est refusé. Un tokensIn de -1 compensé par un tokensOut
de 1 000 000 donnait un coût fini sous-estimé, ajouté sans coupure.

La lecture de l'usage passe sous un try dédié : un adaptateur qui
résout undefined ou null, ou un accesseur qui lève, fait toujours
rejeter l'appel avec la même erreur, mais coupe désormais la matrice
(unclassified) au lieu d'admettre l'appel suivant. classifyCut reste
réservée aux rejets du fournisseur, classés sur LLMError.status.

Le contrôle du coût de #39 reste en place : il arrête un coût infini
par dépassement, verrouillé par un test.

Refs: #41
Session: <id>
Model: <modèle>
Authorship: ai
```

Sujet : 64 caractères sans le suffixe ; 70 avec ` (#NN)`.

## Tests

Déterministes, sans réseau, sans horloge, sans fournisseur réel (ni `GeminiLLMProvider`, ni `OllamaLLMProvider`, ni `PROVIDERS`), sans variable d'environnement. Titres en anglais comme leurs voisins, préfixés `TEST-N (issue 41)`, sans `#` dans un titre (TAP l'échappe), ajoutés en fin de `scripts/h2-report/cap-guard.test.ts`. Réutiliser `scripted`, `MODEL`, `RATES`, `HI`, `OPTS`, `PRICED`, `cutMessage` ; `Usage` est ajouté à l'import de types existant de la l.4. Aucun test existant n'est modifié.

- **TEST-1** (exerce SPEC-1), deux parties :
  - (a) Table `INVALID_COUNTERS`, une ligne par usage, plafond 10, double `scripted([PRICED, { response }])` avec `response = { content: <titre>, toolCalls: [], usage }` : `{ tokensIn: -1, tokensOut: 1_000_000 }` (négatif compensé en entrée) ; `{ tokensIn: 1_000_000, tokensOut: -1 }` (négatif compensé en sortie) ; `{ tokensIn: 0.5, tokensOut: 125_000 }` (fractionnaire) ; `{ tokensIn: 250_000, tokensOut: "125000" as unknown as number }` (chaîne numérique). Pour chaque ligne : premier appel tarifé ; le deuxième rend la même référence de réponse, puis `[cutReason(), spentUsd(), refused()]` égale `["unclassified", 0.5, 0]` ; le troisième rejette avec `cutMessage(MODEL, "unclassified")` ; le double compte 2 appels ; `refused()` 1.
  - (b) Dépassement : plafond 10, double `scripted([PRICED, { response: huge }])` avec `huge = { content: "huge", toolCalls: [], usage: { tokensIn: 1e308, tokensOut: 1e308 } }` (compteurs entiers ≥ 0, coût `Infinity`) : premier appel tarifé ; le deuxième rend `huge` (même référence) ; `[cutReason(), spentUsd(), refused()]` égale `["unclassified", 0.5, 0]` ; le troisième rejette avec `cutMessage(MODEL, "unclassified")` ; le double compte 2 appels. Un commentaire d'une ligne dit que ce test verrouille le contrôle du coût de #39, que `isCount` ne couvre pas.
- **TEST-2** (exerce SPEC-2) : table `UNREADABLE_RESPONSES`, une ligne par réponse, plafond 10, double `scripted([PRICED, { response }])` : `undefined as unknown as LLMResponse` (rejet attendu `{ name: "TypeError" }`) ; `null as unknown as LLMResponse` (rejet attendu `{ name: "TypeError" }`) ; l'objet `{ content: "getter", toolCalls: [], get usage(): Usage { throw error; } }` avec `error = new LLMError("API_ERROR", "unreadable usage", { status: 429 })` (rejet attendu : la même référence `error`). Pour chaque ligne : premier appel tarifé ; le deuxième rejette comme attendu ; `[cutReason(), spentUsd(), refused()]` égale `["unclassified", 0.5, 0]` ; le troisième rejette avec `cutMessage(MODEL, "unclassified")` ; le double compte 2 appels ; `refused()` 1.

## Estimation de taille

Hors `docs/` et `*.md`, lignes ajoutées et retirées :

| Fichier | Estimation |
|---|---|
| `scripts/h2-report/cap-guard.ts` (`isCount` 4, `usageCounters` 7, second `try` 8, TSDoc 2, l.86-87 remplacées +2 −2) | +23 −2 |
| `scripts/h2-report/cap-guard.test.ts` (TEST-1 (a) : table 7, boucle 13 ; TEST-1 (b) : 11 ; TEST-2 : table 9, boucle 13 ; import l.4 +1 −1) | +54 −1 |
| **Total** | **environ 80** (fourchette 60 à 110) |

Très en dessous du plafond de 400 ; aucune dérogation. La mesure (`pr_size.py`) fait foi à la PR.

## Hypothèses restantes

- **R-1 · Le total du rapport n'est pas protégé.** `withMetrics` (`src/metrics/application/use-cases/with-metrics.ts:45-50`), au-dessus du garde, enregistre les compteurs tels quels, et `aggregate` les tarifie sans contrôle : le run dont la réponse porte un compteur invalide garde dans `runs.truncated.csv` un coût sous-estimé ou converti. Le rapport est alors tronqué (`cut: unclassified`), ce qui signale l'anomalie ; le plafond, lui, est étanche. Hors périmètre (`src/` exclu) ; à rouvrir en issue si le pilote veut un total qui refuse ces compteurs.
- **R-2 · Branche `cost < 0` inatteignable** après SPEC-1 : compteurs ≥ 0 et tarifs > 0 finis ne donnent jamais un coût négatif. Conservée comme défense (D3), sans test possible par l'interface publique ; une mutation qui la retire ne fait échouer aucun test.
- **R-3 · `toUsage` de Gemini et d'Ollama** restent contrôlés par `typeof` seul : une réponse à compteur négatif ou fractionnaire, si elle existait, est désormais coupée par le garde ; aucune réponse Gemini connue n'en porte.
- **Node** ≥ 22.18 (retrait de types sans drapeau), constaté v22.19.0 par #20.
