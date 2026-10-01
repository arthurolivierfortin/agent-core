# Spécification · Borner par un délai le fils qui prouve que l'intégration Gemini est ignorée · #31

Date : 2026-10-01
Issue : https://github.com/arthurolivierfortin/agent-core/issues/31 (label `T:chore` ; mineure du juge sur #26, PR #30)
Checklist : docs/specs/2026-10-01-spawnsync-timeout-checklist.md
Branche : `chore/31-spawnsync-timeout` (worktree `.claude/worktrees/chore+31-spawnsync-timeout`, `main` 8af02ce)
Continuité : docs/specs/2026-09-30-gemini-wiring-design.md (#26 : TEST-3, section « Tests ») ; docs/plans/2026-09-30-gemini-wiring-plan.md:1867-1869 (risque « Durée de TEST-3 » accepté sans `timeout`, que cette issue lève)

## Objectif

Donner au `spawnSync` de `TEST-3 (issue 26)` un délai explicite de 60 s et, s'il expire, un échec qui dit que le sous-processus a dépassé ce délai, pour qu'un fils bloqué fasse échouer ce test au lieu de figer la suite.

## Source de l'issue

Corps de l'issue : mineure du juge sur #26 (PR #30) : le sous-processus qui prouve que le test d'intégration est ignoré sans `GEMINI_INTEGRATION` est lancé par `spawnSync` sans timeout ; un blocage figerait la suite. Attendu : timeout explicite (par exemple 60 s) et échec lisible. Tests seulement.

Précisions du pilote : « échec lisible » veut dire que, si le délai expire (`result.error.code === "ETIMEDOUT"` ou `result.signal === "SIGTERM"`), l'assertion dit que le sous-processus a dépassé le délai, en donnant le délai, au lieu d'un message obscur ; la preuve ne doit pas attendre 60 s (mutation locale du délai à une valeur minuscule, annulée sans commit) ; le fils n'appelle jamais le réseau, `GEMINI_INTEGRATION` reste absente de son environnement ; type de commit `test`. Contraintes générales : aucun `.env` lu ; chemins relatifs au dépôt dans toute preuve ; gates `npm run build`, `npm run typecheck`, `npm run test` ; Node 22.

## État constaté dans le code (lecture du 2026-10-01, `main` 8af02ce)

- `scripts/repo-conventions.test.mjs:6` : `import { spawnSync } from "node:child_process";`.
- `scripts/repo-conventions.test.mjs:292-318` : test `TEST-3 (issue 26) le test d'intégration Gemini est ignoré sans GEMINI_INTEGRATION=1`. L.293 `const file = "tests/integration/gemini.integration.test.ts";` ; l.294-296 commentaire ; l.297 `const scrubbed = ["GEMINI_INTEGRATION", "GEMINI_API_KEY", "NODE_TEST_CONTEXT"];` ; l.298 `env` = copie de `process.env` sans ces trois noms, comparés en majuscules ; l.299-303 `spawnSync(process.execPath, ["--test", "--test-reporter=tap", file], { cwd: fileURLToPath(new URL("../", import.meta.url)), env, encoding: "utf8" })`, **sans `timeout`** ; l.304 `assert.equal(child.status, 0, \`node --test ${file} : code ${child.status}\n${child.stdout}${child.stderr}\`)` ; l.305-309 assertions sur `# SKIP …` et `# fail 0` ; l.310-317 lecture du source.
- Comportement de Node 22 sur `spawnSync` avec `timeout` : à l'expiration, le fils reçoit `killSignal` (défaut `SIGTERM`), le résultat porte `status === null`, `signal === "SIGTERM"` et `error` (code `ETIMEDOUT`) ; les tuyaux sont fermés par Node, l'appel rend la main. Sans l'assertion de cette issue, la l.304 afficherait `node --test tests/integration/gemini.integration.test.ts : code null` : c'est le message obscur que l'issue écarte.
- `tests/integration/gemini.integration.test.ts:9` : `const OPT_IN = process.env.GEMINI_INTEGRATION === "1";` ; l.13 `skip` avec la raison `set GEMINI_INTEGRATION=1 with GEMINI_API_KEY in the environment` quand `OPT_IN` est faux. Sans la variable, le corps du test (l.15-18, seul chemin réseau) ne s'exécute pas.
- Autres `spawnSync` du dépôt (recherche de `spawnSync`, `execSync`, `execFileSync`, `child_process`, `spawn(`, `execFile(` sous `src/`, `tests/` et `scripts/`) : deux, tous deux dans `scripts/h2-report/cli.test.ts`, **sans `timeout`** :
  - l.12-15, `TEST-7 (issue 33)` : `spawnSync(process.execPath, ["scripts/h2-report/cli.ts"], { cwd, encoding: "utf8" })`, puis `assert.equal(child.status, 1, child.stderr)` (l.16) ;
  - l.31, `TEST-8 (issue 42)`, dans une boucle de deux lancements : `spawnSync(process.execPath, [cli, "--cap-usd", "1", "--dry-run"], { cwd: tmpdir(), env: childEnv, encoding: "utf8" })`, sans assertion sur le statut.
  Aucun appel à `child_process` dans `src/`.

## Périmètre

Dans la PR :

- `scripts/repo-conventions.test.mjs`, test `TEST-3 (issue 26)` et une constante placée juste avant lui (SPEC-1).

Hors périmètre :

- `scripts/h2-report/cli.test.ts` et ses deux `spawnSync` sans délai (voir D3 et R-1).
- Les lignes 293-298 de `scripts/repo-conventions.test.mjs` (fichier lancé, commentaire, liste `scrubbed`, construction de `env`) et les assertions l.304-317 : inchangées.
- `tests/integration/gemini.integration.test.ts`, tout `src/`, `package.json`, `README.md`, `docs/guide-agent-package.md`, le plan historique `docs/plans/2026-09-30-gemini-wiring-plan.md`.
- Les autres erreurs de lancement du fils (voir R-3).

## Conception

### SPEC-1 · Délai explicite et échec lisible pour le fils de `TEST-3 (issue 26)`

Trois changements dans `scripts/repo-conventions.test.mjs`, rien d'autre :

1. **Constante**, ajoutée juste avant le test (avant l'actuelle l.292), commentaire en français comme le reste du fichier :

   ```js
   // Délai du fils de TEST-3 (issue 26), qui dure environ 0,3 s : un fils bloqué fait échouer
   // ce test au lieu de figer la suite (#31).
   const CHILD_TIMEOUT_MS = 60_000;
   ```

2. **Option** `timeout: CHILD_TIMEOUT_MS,` ajoutée à l'objet d'options du `spawnSync` (l.300-302), après `encoding: "utf8",`. `killSignal` reste le défaut (`SIGTERM`).

3. **Assertion de délai**, insérée entre le `spawnSync` et l'actuelle assertion de statut (l.304), pour qu'un délai dépassé ne tombe jamais sur `code null` :

   ```js
   const timedOut = child.error?.code === "ETIMEDOUT" || child.signal === "SIGTERM";
   assert.ok(
     !timedOut,
     `node --test ${file} : le sous-processus a dépassé le délai de ${CHILD_TIMEOUT_MS} ms et a été arrêté (erreur ${child.error?.code}, signal ${child.signal})\n${child.stdout}${child.stderr}`,
   );
   ```

   Le message rendu pour le délai réel est donc, sur sa première ligne : `node --test tests/integration/gemini.integration.test.ts : le sous-processus a dépassé le délai de 60000 ms et a été arrêté (erreur ETIMEDOUT, signal SIGTERM)`, suivi de la sortie partielle du fils (pour voir où il s'est bloqué). Le gabarit peut être replié en concaténation sous 100 colonnes, sans changer le texte rendu.

Le titre du test ne change pas. L'environnement du fils ne change pas : `GEMINI_INTEGRATION`, `GEMINI_API_KEY` et `NODE_TEST_CONTEXT` en restent absents, sans casse (l.297-298 inchangées) ; le fils ne peut donc pas atteindre le corps réseau du test d'intégration.

### Effet

- Chemin nominal (le fils finit en environ 0,3 s) : le test passe comme avant ; `timedOut` est faux, l'assertion de statut et les suivantes s'appliquent telles quelles.
- Chemin d'erreur (le fils dépasse 60 s) : Node arrête le fils, `spawnSync` rend la main, le test échoue sur le message ci-dessus ; les autres tests de la suite s'exécutent.

## Chemins nominal et d'erreur

| Situation du fils | Avant #31 | Après #31 |
|---|---|---|
| finit, statut 0, `# SKIP …` et `# fail 0` | test vert | inchangé |
| finit, statut non nul | échec `node --test … : code <N>` | inchangé |
| bloqué | la suite reste figée, sans fin | arrêté à 60 s ; échec `… a dépassé le délai de 60000 ms et a été arrêté (erreur ETIMEDOUT, signal SIGTERM)` |
| arrêté de l'extérieur par `SIGTERM` | échec `code null` | échec sur le message de délai (le message donne `erreur` et `signal` réels : `erreur undefined` distingue ce cas) |
| sortie au-delà de `maxBuffer` (1 Mio, `ENOBUFS`) | échec `code null` | échec sur le message de délai, `erreur ENOBUFS, signal SIGTERM` : libellé inexact, cause affichée (R-3) |
| lancement impossible (`error` sans signal : `ENOENT`, `EACCES`, etc.) | échec `code null` | inchangé (R-3) |

## Symétrie

- Chemin nominal face au chemin d'erreur : le nominal est le test existant, vert avant comme après ; le chemin d'erreur (délai dépassé) est exercé par la mutation A de TEST-1, et le message obscur qu'il remplace par la mutation B.
- Lecture face à écriture : sans objet (aucune donnée écrite).
- Aucune énumération touchée.

## Données touchées

Aucune base, aucun fichier écrit, aucune variable d'environnement posée. L'environnement du fils est la copie filtrée existante. Aucun `.env` lu, aucune clé, réelle ou factice, dans le fichier touché.

## Décisions et alternatives écartées

- **D1 · 60 s** : la valeur que propose l'issue ; environ 200 fois la durée observée (0,3 s, plan de #26), assez large pour une machine chargée ou un premier lancement à froid, assez courte pour qu'un blocage se voie. Constante nommée, pour que la mutation de preuve ne touche qu'un littéral.
- **D2 · `timeout` de `spawnSync`, pas `{ timeout }` de `node:test`** : `spawnSync` bloque la boucle d'événements ; le délai d'un `test()` ne peut pas s'armer pendant l'appel synchrone. Passer à `spawn` asynchrone avec `AbortSignal` réécrirait le test pour le même effet ; écarté.
- **D3 · `scripts/h2-report/cli.test.ts` hors de la PR** : l'issue nomme un seul sous-processus. Ajouter `timeout: 60_000` à ses deux `spawnSync` tient en une ligne chacun (l.12-15 : une ligne dans l'objet d'options ; l.31 : un champ ajouté à une ligne déjà longue), mais ne donne **pas** l'échec lisible : TEST-7 tomberait sur `assert.equal(child.status, 1, child.stderr)` (`null !== 1` avec un stderr vide ou partiel), TEST-8 sur `child.stderr.includes(…)`. L'échec lisible demanderait la même assertion de délai dans ce fichier TypeScript, soit deux sites de plus et un second fichier à prouver par mutation. Le choix est laissé au pilote (R-1) ; cette spécification ne l'inclut pas, pour garder un SPEC = un commit = un test.
- **D4 · Détection par `error.code === "ETIMEDOUT"` ou `signal === "SIGTERM"`** (précision du pilote) : l'un ou l'autre suffit, ce qui couvre une plateforme qui ne rapporterait pas le signal ; le message affiche les deux valeurs réelles, pour qu'un `SIGTERM` venu d'ailleurs ne passe pas pour un délai sans indice.
- **D5 · Type `test`, scope `scripts`** : seul un fichier de test change (précision du pilote ; branche nommée `chore/` d'après le label `T:chore`). Scope `scripts`, le dossier du fichier touché, comme `fix(scripts)` de 361d7a1.

## Ordre des commits et preuves

Un SPEC = un commit = un test. La spécification et la checklist entrent dans le commit de SPEC-1 (précédent P1 de #20, #35, #39, #41, #46). Chemins relatifs au dépôt dans toute preuve.

Garde avant toute commande de test (précédent P6 de #26) : `node -e "process.exit(process.env.GEMINI_INTEGRATION === undefined ? 0 : 1)"` rend 0 ; sinon arrêter.

- **Vert** après SPEC-1 : `npm run test` passe, `TEST-3 (issue 26)` compris ; aucun test ne change de statut (le total de tests est celui de la référence, la constante n'ajoute aucun test).
- **Pas de rouge préalable** : le défaut couvert (un fils bloqué) ne se produit pas sur l'arbre de référence ; la preuve est portée par les deux mutations suivantes, faites **après le commit de SPEC-1**, sur l'arbre propre, après `npm run build` :
  - **Mutation A** (délai minuscule) : `const CHILD_TIMEOUT_MS = 60_000;` remplacé par `const CHILD_TIMEOUT_MS = 1;`. `node --test scripts/repo-conventions.test.mjs` échoue sur le seul test `TEST-3 (issue 26) le test d'intégration Gemini est ignoré sans GEMINI_INTEGRATION=1`, avec un message qui contient `le sous-processus a dépassé le délai de 1 ms et a été arrêté` et `ETIMEDOUT`, en moins de quelques secondes.
  - **Mutation B** (message obscur évité), cumulée à A : l'appel `assert.ok(!timedOut, …)` retiré. Le même test échoue sur `node --test tests/integration/gemini.integration.test.ts : code null`, ce qui montre le message que SPEC-1 remplace.
  - Annulation : `git restore scripts/repo-conventions.test.mjs`, puis `git diff --stat -- scripts/repo-conventions.test.mjs` vide. Sorties (lignes d'échec et compteurs `# tests`, `# pass`, `# fail`) montrées dans le rapport du builder et dans la description de la PR.

Gabarit (aucun `Co-Authored-By`) :

```
<type>(<scope>): <sujet>

<corps : ce qui change et la preuve, chemins relatifs au dépôt>

Refs: #31
Session: <id>
Model: <modèle>
Authorship: ai
```

| SPEC | Sujet (impératif, 72 caractères au plus type compris) |
|---|---|
| 1 | `test(scripts): borner le fils du test d'intégration Gemini à 60 s` (65) |

### Message de squash proposé

```
test(scripts): borner le fils du test d'intégration Gemini à 60 s (#<PR>)

Le test qui prouve que tests/integration/gemini.integration.test.ts
est ignoré sans GEMINI_INTEGRATION lance node --test par spawnSync.
Sans délai, un fils bloqué figeait toute la suite. Il est désormais
arrêté au bout de 60 s (constante CHILD_TIMEOUT_MS), et le test
échoue sur un message qui dit que le sous-processus a dépassé le
délai, avec le délai, l'erreur et le signal, au lieu de « code null ».

L'environnement du fils est inchangé : GEMINI_INTEGRATION,
GEMINI_API_KEY et NODE_TEST_CONTEXT en restent absents, aucun réseau
n'est atteint. Preuve par mutation locale du délai à 1 ms, annulée
sans commit.

Refs: #31
Session: <id>
Model: <modèle>
Authorship: ai
```

Sujet : 65 caractères sans le suffixe ; 71 avec ` (#NN)`. Rappel A4 : le corps de la PR se termine par le même bloc de trailers `Refs` / `Session` / `Model` / `Authorship`.

## Tests

**TEST-1** (exerce SPEC-1) : le test existant `TEST-3 (issue 26) le test d'intégration Gemini est ignoré sans GEMINI_INTEGRATION=1` de `scripts/repo-conventions.test.mjs`, modifié par SPEC-1, est le test exercé ; aucun test nouveau. Critères : vert sous `npm run test` avec le délai de 60 000 ms ; rouge sous la mutation A avec le message de délai (`le sous-processus a dépassé le délai de 1 ms et a été arrêté`, `ETIMEDOUT`) ; rouge sous les mutations A et B cumulées avec `code null` ; arbre propre après `git restore`. Déterministe sur le chemin nominal ; la mutation A repose sur un démarrage de Node toujours plus long que 1 ms. Aucun réseau : l'environnement du fils reste filtré.

## Estimation de taille

Hors `docs/` et `*.md`, lignes ajoutées et retirées :

| Fichier | Estimation |
|---|---|
| `scripts/repo-conventions.test.mjs` (constante et commentaire 4 ; option `timeout` 1 ; assertion de délai 5 à 7 ; ligne vide 1) | +11 à +13 −0 |
| **Total** | **environ 12** (fourchette 8 à 20) |

Très en dessous du plafond de 400 ; aucune dérogation. La mesure (`pr_size.py`) fait foi à la PR.

## Hypothèses restantes

- **R-1 · `scripts/h2-report/cli.test.ts:12-15` et `:31`** : deux `spawnSync` sans `timeout`, signalés sans élargir le périmètre (D3). Risque de blocage faible (`cli.ts` sans argument refuse avant tout fournisseur ; `--dry-run` ne construit aucun fournisseur), mais non nul. Deux options pour le pilote : (a) une issue de suivi « borner les fils de cli.test.ts » avec la même assertion de délai ; (b) étendre cette PR d'un `[SPEC-2]` (une ligne `timeout` par appel, plus l'assertion lisible dans chaque test, environ +15 lignes, preuve par la même mutation). Sans décision, cette PR reste à SPEC-1.
- **R-2 · Petit-fils orphelin sous Windows** : `node --test` lance le fichier testé dans un sous-processus ; à l'expiration, Node arrête le fils direct et ferme ses tuyaux, mais un petit-fils peut survivre. La suite ne se fige pas ; un processus peut rester à tuer à la main. Hors périmètre.
- **R-3 · Autres erreurs du fils** (corrigé en reprise 1, mesure à l'appui) : une sortie au-delà de `maxBuffer` (1 Mio par défaut) fait arrêter le fils par Node avec `SIGTERM` ; `spawnSync` rend `status: null`, `signal: "SIGTERM"`, `error.code: "ENOBUFS"`. La condition `timedOut` (D4) est donc vraie et le test échoue sur le message de délai, `… a dépassé le délai de 60000 ms et a été arrêté (erreur ENOBUFS, signal SIGTERM)` : le libellé « délai » est inexact, mais le message affiche l'erreur réelle et le cas reste diagnostiquable. Seules les erreurs sans signal (lancement impossible : `ENOENT`, `EACCES`, etc.) gardent le message existant `code null`. Sonde, hors du dépôt, sous Windows 11 et Node v22.19.0 : `node -e 'const {spawnSync}=require("node:child_process"); const o={encoding:"utf8",timeout:60000}; const a=spawnSync(process.execPath,["-e","process.stdout.write(\"x\".repeat(2000000))"],o); const b=spawnSync("agent-core-introuvable-31",[],o); for (const [k,r] of [["ENOBUFS",a],["ENOENT",b]]) console.log(k, JSON.stringify({status:r.status,signal:r.signal,error:r.error?.code,timedOut:r.error?.code==="ETIMEDOUT"||r.signal==="SIGTERM"})); console.log(process.version)'` rend `ENOBUFS {"status":null,"signal":"SIGTERM","error":"ENOBUFS","timedOut":true}`, `ENOENT {"status":null,"signal":null,"error":"ENOENT","timedOut":false}` et `v22.19.0`. La condition reste celle de D4 ; la resserrer (par exemple `error.code === "ETIMEDOUT"` seul) ou nommer `ENOBUFS` dans le message est un choix laissé au pilote. Hors de l'attendu de l'issue (délai).
- **Node** ≥ 22.18 (retrait de types sans drapeau), constaté v22.19.0 par #20.
