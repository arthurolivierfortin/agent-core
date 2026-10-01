# Spécification · deux tests CSV : un CR seul dans `csvField`, `undefined` dans `cellText` · #17

Date : 2026-09-30 · Type : chore (commits `test`) · Branche : `chore/17-csv-field-tests` · Base : `main` 9312c9a
Issue : https://github.com/arthurolivierfortin/agent-core/issues/17
Origine : deux mineures de la revue de la PR #16 (issue #9, `toCSV`, `toRunsCSV`, `replayRun`), reprises du corps de l'issue.

## Objectif

Verrouiller par deux tests, sans toucher au code de production, deux comportements déjà livrés par #9 et qu'aucun test ne fixe : un champ qui contient un retour chariot seul (`\r`) est mis entre guillemets, et une valeur `undefined` donne une cellule vide comme `null`.

## Périmètre

- Un test qui fixe que `csvField` met entre guillemets un champ contenant un `\r` non suivi de `\n` (SPEC-1, TEST-1).
- Un test qui fixe que `cellText` rend une cellule vide pour `undefined`, identique à celle de `null` (SPEC-2, TEST-2).
- Les deux tests vont dans `tests/agent/testing/run-matrix.test.ts`, après le test « report.toRunsCSV() writes one line per run: failures joined, a thrown error quoted, null empty » (l.330-354), avant « report.toJSON() copies each run's combination, failures and trace, and each line's combination » (l.356).

## Hors périmètre

- Tout fichier sous `src/` : aucune ligne de production ne change. `git diff --stat -- src/` est vide à chaque commit.
- Tout export nouveau : `csvField` et `cellText` restent privées à `src/agent/testing/matrix-csv.ts`, et `summaryCSV`/`runsCSV` restent hors de tout barrel.
- La vue JSON d'une valeur d'axe `undefined` (voir R2) et toute autre forme de valeur d'axe (objet, fonction, `bigint`).
- Le README, le guide, les artefacts `docs/demo/h1-matrix/` : inchangés (ils ne listent pas les caractères quotés un à un).
- Si l'un des deux tests est rouge sans mutation, le builder s'arrête et le signale (défaut réel) au lieu de corriger `src/` dans cette PR (consigne de l'issue).

## Code réel lu

`src/agent/testing/matrix-csv.ts` (main 9312c9a) :

- l.8-15 `summaryCSV(summary, axisKeys)` et l.18-25 `runsCSV(runs, axisKeys)`, exportées du module seulement ; chaque valeur d'une ligne, `combination[key]` de chaque axe compris, passe par `cellText` (l.14, l.24), puis `csvDocument`.
- l.28-30 `cellText(value: unknown): string`, privée : `value === null || value === undefined ? "" : String(value)` (l.29).
- l.33-35 `csvField(text: string): string`, privée : `/[",\r\n]/.test(text) ? \`"${text.replaceAll('"', '""')}"\` : text` (l.34).
- l.38-40 `csvDocument(rows)`, privée : chaque champ passe par `csvField`, champs joints par `,`, chaque ligne terminée par `\r\n`.

`src/agent/testing/run-matrix.ts` : `runMatrix` rend `toCSV: () => summaryCSV(summary, axisKeys)` et `toRunsCSV: () => runsCSV(runs, axisKeys)` (l.171-172), `axisKeys = Object.keys(options.axes)` (l.158) ; `combinationsOf` (l.244-252) recopie chaque valeur d'axe telle quelle, `undefined` compris, sous sa clé.

`tests/agent/testing/run-matrix.test.ts` : importe `runMatrix` de `../../../dist/agent/testing/run-matrix.js` (l.7) ; aide `matrix(options)` (l.45-49 : scénario « aller aux reglages », `axes: {}`, `runs: 1`, `deps` = `script(navigate(), text("tu y es"))`, un run réussi) ; tests CSV existants l.307-328 (`toCSV`) et l.330-354 (`toRunsCSV`).

## Comment exercer des fonctions privées

`csvField` et `cellText` ne sont pas exportées, et `summaryCSV`/`runsCSV` ne sont servies par aucun barrel. Les deux tests passent par la surface publique du rapport, `report.toCSV()` et `report.toRunsCSV()` de `runMatrix`, déjà importé par le fichier de test. Le seul point d'entrée par lequel une valeur arbitraire, chaîne à `\r` ou `undefined`, atteint `cellText` puis `csvField` est **une valeur d'axe** : `combination[key]` est passé tel quel (l.11 et l.21 de `matrix-csv.ts`). Les autres colonnes sont produites par `runMatrix` (nombres, booléens, `null`, messages d'erreur) et ne peuvent pas valoir `undefined`.

## Comportement attendu

### SPEC-1 · Champ à CR seul entre guillemets (test seulement)

Un `test()` de titre `report.toCSV() quotes a field that holds a lone CR (RFC 4180)` :

```ts
let t = 0;
const report = await matrix({ axes: { model: ["a\rb"] }, now: () => (t += 10) });
assert.equal(
  report.toCSV(),
  'scenario,model,runs,passed,successRate,meanDurationMs,tokensUsed,costUsd\r\n' +
    'aller aux reglages,"a\rb",1,1,1,50,,\r\n',
);
```

- `"a\rb"` contient un `\r` sans `\n` : c'est le seul caractère de la classe `[",\r\n]` présent, donc seule l'alternative `\r` de la regex de l.34 le met entre guillemets.
- `50` : même script et même horloge que la ligne `'fake"b'` du test l.307-328, qui rend `50` (lecture de départ, deux lectures par appel pour deux appels, lecture de fin, pas de 10).
- `tokensUsed` et `costUsd` vides : le script ne porte pas d'usage et aucun `rates` n'est donné.

### SPEC-2 · `undefined` rend une cellule vide, comme `null` (test seulement)

Un `test()` de titre `report.toCSV() and report.toRunsCSV() write an empty cell for an undefined axis value, like null` :

```ts
let t = 0;
const report = await matrix({ axes: { memory: [null, undefined] }, now: () => (t += 10) });
assert.equal(
  report.toCSV(),
  "scenario,memory,runs,passed,successRate,meanDurationMs,tokensUsed,costUsd\r\n" +
    "aller aux reglages,,1,1,1,50,,\r\n" +
    "aller aux reglages,,1,1,1,50,,\r\n",
);
assert.equal(
  report.toRunsCSV(),
  "scenario,memory,run,passed,failures,error,durationMs,tokensUsed,costUsd,stopReason\r\n" +
    "aller aux reglages,,1,true,,,50,,,completed\r\n" +
    "aller aux reglages,,1,true,,,50,,,completed\r\n",
);
```

- Deux combinaisons, `{ memory: null }` puis `{ memory: undefined }` (dernier axe le plus rapide, un seul axe ici) : leurs lignes sont identiques octet à octet, ce qui dit « comme `null` ».
- Les deux vues sont vérifiées : `cellText` est appliquée par `summaryCSV` (l.14) et par `runsCSV` (l.24), deux appels distincts.
- `completed` : `stopReason` d'un run réussi, déjà rendu par la démonstration (`docs/demo/h1-matrix/runs.csv`, run 1 de `fake-a`).

## Chemins nominal et d'erreur

Ces tests ne décrivent aucun chemin d'erreur de production : un format CSV n'échoue pas. Le « chemin d'erreur » est celui du test lui-même, la régression qu'il doit attraper, prouvée par mutation :

| Élément | Nominal (vert à l'écriture) | Régression attrapée (mutation locale, non commitée) |
|---|---|---|
| SPEC-1 | `"a\rb"` rendu `"a\rb"` entre guillemets | l.34 `/[",\r\n]/` → `/[",\n]/` : le champ sort nu, TEST-1 échoue sur `assert.equal` |
| SPEC-2 | `undefined` rendu `""` | l.29 `value === null \|\| value === undefined ? "" : String(value)` → `value === null ? "" : String(value)` : la seconde ligne porte `undefined`, TEST-2 échoue sur le premier `assert.equal` |

Chaque mutation, appliquée seule, ne doit faire échouer que son test : aucun autre test du dépôt ne passe un `\r` seul ni un `undefined` dans un CSV (lecture des tests l.307-354 et de `tests/agent/testing/matrix-demo.test.ts`). Le builder relève le nombre d'échecs ; s'il diffère de 1, il le note en `[H]` avec la sortie.

## Symétrie et énumération

L'énumération « caractères qui imposent les guillemets » (`,`, `"`, CR, LF, commentaire l.32) est désormais couverte sur chacun de ses membres :

| Caractère | Test qui le fixe |
|---|---|
| `,` | l.311 et l.324 (`"fake,a"`, `"max,tokens"`) ; l.352 (`"no ""b"", sorry"`) |
| `"` | l.324 (`"fake""b"`) ; l.352 |
| LF | l.310 et l.324 (`"aller\naux reglages"`) |
| CR seul | TEST-1 (nouveau) |

L'énumération « valeurs rendues vides par `cellText` » (`null`, `undefined`, commentaire l.27) : `null` fixé l.324 (`tokensUsed`, `costUsd`) et l.340-352 (`memory: [null]`, `error`) ; `undefined` par TEST-2 (nouveau). Les autres valeurs (`String(value)` : chaîne, nombre, booléen) sont déjà fixées par les mêmes tests.

Lecture face à écriture : le CSV n'est qu'écrit par le paquet ; aucune lecture de CSV n'existe dans `src/`. Hors périmètre, voir R2 pour la vue JSON.

## Données touchées

Aucune base, aucun fichier de données, aucune variable d'environnement. Un seul fichier modifié : `tests/agent/testing/run-matrix.test.ts`.

## Décisions et alternatives écartées

- **D1 · Passer par `runMatrix`, pas exporter.** Les fonctions restent privées (contrainte « aucun code de production »). Écarté : exporter `csvField`/`cellText` pour un test unitaire direct (surface ajoutée pour les seuls tests, et modification de `src/`) ; importer `summaryCSV`/`runsCSV` depuis `dist/agent/testing/matrix-csv.js` (possible sans toucher `src/`, mais lie le test à un module interne alors que `runMatrix`, déjà importé, suffit et exerce le chemin réel).
- **D2 · L'aide `matrix()` existante.** Scénario, script et un run déjà définis ; seuls `axes` et `now` changent. Écarté : un appel direct à `runMatrix` comme l.309 (plus long, sans gain).
- **D3 · Valeur `"a\rb"` au milieu.** Un `\r` encadré n'est ni en tête ni en fin de champ, et n'est suivi d'aucun `\n` : il ne peut pas être confondu avec une fin de ligne CRLF. Écarté : `"a\r"` (un `\r` final suivi du `,` séparateur, lecture moins nette).
- **D4 · `null` et `undefined` dans la même matrice.** Les deux lignes identiques prouvent « comme `null` » dans un seul `assert.equal`. Écarté : `undefined` seul (n'énonce pas l'équivalence).
- **D5 · Exactitude octet à octet.** `assert.equal` sur la chaîne entière, comme les tests l.321-325 et l.348-353, avec `now` déterministe. Écarté : un `includes` ou un `split("\r\n")` (laisse passer un champ mal quoté ailleurs dans la ligne).
- **D6 · Tests verts dès l'écriture, prouvés par mutation.** Précédents : D8 de #26 (`2026-09-30-gemini-wiring-design.md`), P4 de #41. Pas de nouvel ADR.

## Ordre des commits et preuve de pertinence

Un SPEC = un commit = un test, dans l'ordre SPEC-1 puis SPEC-2. La spécification et la checklist entrent dans le commit de SPEC-1 (précédent P1 de #20, #35, #39, #41).

Pour chaque SPEC :

1. Écrire le test, lancer `npm run test` : vert attendu. **Rouge sans mutation = défaut réel** : le builder s'arrête, ne touche pas `src/`, et rend la sortie (titre du test, `actual`, `expected`) pour qu'une issue de correction soit ouverte.
2. Appliquer la mutation du tableau « Chemins nominal et d'erreur » à `src/agent/testing/matrix-csv.ts`, relancer `npm run test` : le test échoue, lui seul (sortie montrée au rapport du builder et dans le corps de la PR).
3. Annuler par `git restore src/agent/testing/matrix-csv.ts` ; `git diff --stat -- src/` vide ; relancer `npm run test` : vert.
4. Commiter le seul fichier de test (et, au premier commit, les documents de l'issue).

Gabarit (aucun `Co-Authored-By`) :

```
test(testing): <sujet>

Refs: #17
Session: <id>
Model: <modèle>
Authorship: ai
```

Sujets, à l'impératif (forme infinitive des commits du dépôt), 72 caractères au plus type compris :

- SPEC-1 `test(testing): fixer la mise entre guillemets d'un champ à CR seul` (66)
- SPEC-2 `test(testing): fixer la cellule vide d'une valeur d'axe undefined` (65)

### Message de squash proposé (bloc de la PR, avec corps)

```
test(testing): fixer CR seul et undefined dans les CSV du rapport (#<PR>)

Deux mineures de la revue de #9 (PR #16), en tests seulement, sans
modifier src/ : un champ qui contient un retour chariot seul est mis
entre guillemets (RFC 4180), et une valeur d'axe undefined donne une
cellule vide, identique à celle de null, dans toCSV comme dans
toRunsCSV. csvField et cellText restent privées : les tests passent
par report.toCSV() et report.toRunsCSV() de runMatrix.

Verts à l'écriture, ils sont prouvés par mutation locale non commitée
de src/agent/testing/matrix-csv.ts : retirer \r de la classe de
csvField fait échouer le premier, retirer le cas undefined de
cellText le second.

Refs: #17
Session: <id>
Model: <modèle>
Authorship: ai
```

Sujet : 71 caractères avec un numéro de PR à deux chiffres. La PR porte `Closes #17` dans sa description.

## Estimation de taille

| Fichier | Estimation |
|---|---|
| `tests/agent/testing/run-matrix.test.ts` (TEST-1) | +10 |
| `tests/agent/testing/run-matrix.test.ts` (TEST-2) | +17 |
| `src/` | 0 |

Total : environ 27 lignes ajoutées hors `docs/`, fourchette 22 à 35, aucune supprimée. Bien sous le plafond de 400.

## Hypothèses et risques restants

- **R1 · Tests non exécutés à la rédaction.** Le rédacteur n'a pas de shell : vert sans mutation, rouge sous mutation et la durée `50` sont déduits de la lecture de `matrix-csv.ts`, `run-matrix.ts` et du test l.307-328 (même script, même horloge, `50`). Si la sortie réelle diffère sur la durée seulement, le builder s'aligne sur elle et l'inscrit en `[H]` ; si elle diffère sur la mise entre guillemets ou la cellule vide, c'est un défaut réel (étape 1 ci-dessus).
- **R2 · Vue JSON d'un axe `undefined` (remarque, hors périmètre).** `toJSON()` recopie `{ memory: undefined }` (`{ ...run.combination }`, `run-matrix.ts:200`), mais `JSON.stringify(report)` omet la clé : le JSON perd la colonne que le CSV garde vide. Comportement standard de `JSON.stringify`, non demandé ici ; à rouvrir en issue si le pilote veut l'aligner.
- **R3 · Titre de l'issue.** Non relu sur GitHub (aucun accès réseau du rédacteur) ; le titre de la checklist reprend l'objet de l'issue tel que transmis.
- **R4 · Origine.** La revue de la PR #16 n'a pas été relue ; les deux mineures sont prises dans le corps de l'issue transmis au dispatch.
