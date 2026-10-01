# Spécification · Borner par un délai les deux spawnSync de cli.test.ts · #53

Date : 2026-10-01
Issue : https://github.com/arthurolivierfortin/agent-core/issues/53 (label `T:chore` ; `origine: #31`, R-1 de la spécification de #31, PR #52)
Checklist : docs/specs/2026-10-01-cli-spawnsync-timeout-checklist.md
Branche : `chore/53-cli-spawnsync-timeout` (worktree `.claude/worktrees/chore-53-cli-spawnsync-timeout`, `main` 27bd9a1)
Continuité : docs/specs/2026-10-01-spawnsync-timeout-design.md (#31 : SPEC-1, D2, D4, R-1, R-3) ; code issu de #31 : `scripts/repo-conventions.test.mjs:313-334`

## Objectif

Donner aux deux `spawnSync` de `scripts/h2-report/cli.test.ts` le même délai de 60 s que celui de #31 et, s'il expire, un échec qui dit que le sous-processus a dépassé ce délai, pour qu'un fils bloqué fasse échouer son test au lieu de figer la suite.

## Source de l'issue

Titre : « test(scripts): borner les deux spawnSync de cli.test.ts par un délai ». Corps : « R-1 de #31 (PR #52) : les deux spawnSync de scripts/h2-report/cli.test.ts n'ont pas de délai ; un blocage du fils figerait la suite. Risque faible (TEST-7 refuse avant tout fournisseur, TEST-8 tourne en --dry-run). Attendu : même CHILD_TIMEOUT_MS et même assertion lisible que dans scripts/repo-conventions.test.mjs (#31). Tests seuls, jalon H2. origine: #31 »

Contraintes générales : aucun `.env` lu ni affiché ; aucun fournisseur hébergé appelé ; chemins relatifs au dépôt dans toute preuve ; gates `npm run build`, `npm run typecheck`, `npm run test` ; Node ≥ 22.18.

## État constaté dans le code (lecture du 2026-10-01, `main` 27bd9a1)

- Précédent de #31, `scripts/repo-conventions.test.mjs` : l.313-315 commentaire français et `const CHILD_TIMEOUT_MS = 60_000;` ; l.328 `timeout: CHILD_TIMEOUT_MS,` dans les options du `spawnSync`, après `encoding: "utf8",` ; l.330 `const timedOut = child.error?.code === "ETIMEDOUT" || child.signal === "SIGTERM";` ; l.331-334 `assert.ok(!timedOut, \`node --test ${file} : le sous-processus a dépassé le délai de ${CHILD_TIMEOUT_MS} ms et a été arrêté (erreur ${child.error?.code}, signal ${child.signal})\n${child.stdout}${child.stderr}\`)`, placé avant l'assertion de statut. Le fichier est en JavaScript (`.mjs`), non vérifié par `tsc`.
- `scripts/h2-report/cli.test.ts` (37 lignes, commentaires, titres et messages en anglais) :
  - l.3 `import { spawnSync } from "node:child_process";` ; l.7-9 commentaire d'en-tête ;
  - l.11-19, `TEST-7 (issue 33) cli.ts without arguments exits 1 on --cap-usd is required, stdout empty` : l.12-15 `spawnSync(process.execPath, ["scripts/h2-report/cli.ts"], { cwd: fileURLToPath(new URL("../../", import.meta.url)), encoding: "utf8" })`, **sans `timeout`** ; l.16 `assert.equal(child.status, 1, child.stderr)` ; l.17-18 assertions sur stderr et stdout ;
  - l.21-23 commentaire et `const SENTINEL = "sentinel-value-not-a-key";` ;
  - l.25-36, `TEST-8 (issue 42) cli.ts reads the rates under its own root and passes process.env, from any folder` : boucle de deux lancements (l.30) ; l.31 `spawnSync(process.execPath, [cli, "--cap-usd", "1", "--dry-run"], { cwd: tmpdir(), env: childEnv, encoding: "utf8" })` sur une seule ligne, **sans `timeout`** ; l.32-34 trois assertions sur stdout et stderr, aucune sur le statut.
- `tsconfig.json` : `include` couvre `scripts`, `strict: true` ; `npm run typecheck` (`tsc --noEmit`) vérifie donc `cli.test.ts`. Dans `@types/node`, `SpawnSyncReturns<T>.error` est typé `Error | undefined`, sans propriété `code` : l'expression `child.error?.code` du précédent, recopiée telle quelle dans ce fichier TypeScript, échouerait au typecheck. Le fichier utilise déjà l'espace de noms global `NodeJS` (`NodeJS.ProcessEnv`, l.29), qui porte `NodeJS.ErrnoException` (`code?: string`).
- Convention d'import de type des fichiers de `scripts/h2-report/` : ligne séparée `import type { … } from "…";` (`cap-guard.ts:4-5`, `run-report.ts:7`, `start-guard.ts:3`), jamais de spécificateur `type` en ligne.
- Convention de langue de `scripts/h2-report/` : messages et titres en anglais, « comme les voisins » (D6 et section « Tests » de docs/specs/2026-09-30-h2-report-runner-design.md, l.213 et l.286).
- Aucun autre `spawnSync`, `execSync`, `execFileSync` ni `child_process` sous `src/`, `tests/` et `scripts/` hors des deux fichiers ci-dessus (recherche du 2026-10-01) : ni `cli.ts`, ni les modules de `scripts/h2-report/` qu'il importe, ni `src/` (compilé dans `dist/`) ne lancent de sous-processus.

## Périmètre

Dans la PR :

- `scripts/h2-report/cli.test.ts` : un import de type, une constante, une fonction d'assertion, le délai et l'appel d'assertion dans `TEST-7 (issue 33)` (SPEC-1) ; le délai et l'appel d'assertion dans `TEST-8 (issue 42)` (SPEC-2).

Hors périmètre :

- `scripts/repo-conventions.test.mjs` (déjà borné par #31), `scripts/h2-report/cli.ts` et tout autre fichier de `scripts/h2-report/`, tout `src/`, `tests/`, `package.json`, `tsconfig.json`, `README.md`, `docs/rapport-h2.md`.
- Les titres des deux tests, leurs assertions existantes (l.16-18 et l.32-34), la constante `SENTINEL`, le filtrage de `GEMINI_API_KEY` (l.28) et la liste `launches` (l.29) : inchangés.
- La mise en commun de l'assertion de délai entre `repo-conventions.test.mjs` et `cli.test.ts` (D3).
- Les erreurs du fils autres que le délai (R-2).

## Conception

### SPEC-1 · Constante, fonction d'assertion et délai du fils de `TEST-7 (issue 33)`

Cinq changements dans `scripts/h2-report/cli.test.ts`, rien d'autre :

1. **Import de type**, ajouté juste après l'actuelle l.3 :

   ```ts
   import type { SpawnSyncReturns } from "node:child_process";
   ```

2. **Constante**, ajoutée après le commentaire d'en-tête (l.7-9) et avant `TEST-7`, précédée d'une ligne vide et d'un commentaire en anglais :

   ```ts
   // Timeout of the cli.ts child processes, as in scripts/repo-conventions.test.mjs (#31): a blocked
   // child fails its test instead of freezing the suite (#53).
   const CHILD_TIMEOUT_MS = 60_000;
   ```

3. **Fonction d'assertion** `assertNotTimedOut`, ajoutée juste après la constante, précédée d'une ligne vide. Condition et contenu du message sont ceux de #31 (D4 de #31) ; le code d'erreur est lu par `NodeJS.ErrnoException` pour passer le typecheck :

   ```ts
   function assertNotTimedOut(child: SpawnSyncReturns<string>, command: string): void {
     const code = (child.error as NodeJS.ErrnoException | undefined)?.code;
     const timedOut = code === "ETIMEDOUT" || child.signal === "SIGTERM";
     assert.ok(
       !timedOut,
       `${command}: the child process exceeded the ${CHILD_TIMEOUT_MS} ms timeout and was stopped (error ${code}, signal ${child.signal})\n${child.stdout}${child.stderr}`,
     );
   }
   ```

4. **Option** `timeout: CHILD_TIMEOUT_MS,` ajoutée à l'objet d'options du `spawnSync` de `TEST-7` (l.13-14), après `encoding: "utf8",`. `killSignal` reste le défaut (`SIGTERM`).

5. **Appel** `assertNotTimedOut(child, "node scripts/h2-report/cli.ts");` inséré entre le `spawnSync` de `TEST-7` et l'actuelle assertion `assert.equal(child.status, 1, child.stderr);` (l.16).

Message rendu à l'expiration réelle, première ligne : `node scripts/h2-report/cli.ts: the child process exceeded the 60000 ms timeout and was stopped (error ETIMEDOUT, signal SIGTERM)`, suivie de la sortie partielle du fils.

### SPEC-2 · Délai des deux fils de `TEST-8 (issue 42)`

Deux changements dans `scripts/h2-report/cli.test.ts`, dans le corps de la boucle de `TEST-8`, rien d'autre :

1. **Option** `timeout: CHILD_TIMEOUT_MS` ajoutée à l'objet d'options du `spawnSync` (l.31), après `encoding: "utf8"`. L'appel peut rester sur une ligne ou être replié sur plusieurs lignes ; les valeurs de `cwd`, `env` et `encoding` ne changent pas.

2. **Appel** `assertNotTimedOut(child, "node scripts/h2-report/cli.ts --cap-usd 1 --dry-run");` inséré entre ce `spawnSync` et l'actuelle assertion `assert.ok(!child.stderr.includes("ENOENT"), child.stderr);` (l.32). L'appel s'exécute pour chacun des deux lancements de la boucle.

Message rendu à l'expiration réelle, première ligne : `node scripts/h2-report/cli.ts --cap-usd 1 --dry-run: the child process exceeded the 60000 ms timeout and was stopped (error ETIMEDOUT, signal SIGTERM)`.

Le libellé `command` est un littéral relatif au dépôt, pas le chemin absolu `cli` : aucun chemin de la machine n'entre dans le message.

### Effet

- Chemin nominal (le fils finit) : chaque test passe comme avant ; `timedOut` est faux, les assertions existantes s'appliquent telles quelles.
- Chemin d'erreur (un fils dépasse 60 s) : Node arrête le fils, `spawnSync` rend la main, le test échoue sur le message de délai ; les autres tests de la suite s'exécutent.

## Chemins nominal et d'erreur

| Situation du fils | Avant #53 | Après #53 |
|---|---|---|
| `TEST-7` : finit, statut 1, `--cap-usd is required` | test vert | inchangé |
| `TEST-7` : bloqué | la suite reste figée, sans fin | arrêté à 60 s ; échec `node scripts/h2-report/cli.ts: the child process exceeded the 60000 ms timeout …` |
| `TEST-8` : chaque lancement finit avec le stderr attendu | test vert | inchangé |
| `TEST-8` : un lancement bloqué | la suite reste figée, sans fin | arrêté à 60 s ; échec `node scripts/h2-report/cli.ts --cap-usd 1 --dry-run: the child process exceeded the 60000 ms timeout …` |
| arrêté de l'extérieur par `SIGTERM` | `TEST-7` : `null !== 1` ; `TEST-8` : assertion de stderr | échec sur le message de délai, `error undefined, signal SIGTERM` (le message distingue ce cas) |
| sortie au-delà de `maxBuffer` (`ENOBUFS`) | idem | échec sur le message de délai, `error ENOBUFS, signal SIGTERM` (R-2) |
| lancement impossible (`ENOENT`, `EACCES`, sans signal) | idem | inchangé (R-2) |

## Symétrie

- Chemin nominal face au chemin d'erreur : le nominal est chacun des deux tests existants, vert avant comme après ; le chemin d'erreur (délai dépassé) est exercé par la mutation A de TEST-1 et de TEST-2, et le message obscur qu'il remplace par la mutation B.
- Les deux `spawnSync` du fichier reçoivent la même option et la même assertion : aucun fils du fichier ne reste sans délai après SPEC-2 (contrôle : `timeout: CHILD_TIMEOUT_MS` apparaît deux fois, `assertNotTimedOut(child,` deux fois).
- Lecture face à écriture : sans objet (aucune donnée écrite). Aucune énumération touchée.

## Données touchées

Aucune base, aucun fichier écrit, aucune variable d'environnement posée. L'environnement des fils est inchangé : `TEST-7` hérite de `process.env` comme avant ; `TEST-8` garde sa copie sans `GEMINI_API_KEY` puis la sentinelle. Aucun `.env` lu, aucune clé réelle dans le fichier touché.

## Dépendances

Aucune dépendance. (#31, origine de l'issue, est fusionnée par la PR #52, commit 491746a sur `main`.)

## Décisions et alternatives écartées

- **D1 · Même valeur, même nom** : `CHILD_TIMEOUT_MS = 60_000`, comme #31 (D1 de #31) et comme l'issue le demande. `TEST-7` et `TEST-8` lancent `node` sur `cli.ts` sans réseau ; 60 s laisse une large marge pour une machine chargée.
- **D2 · `timeout` de `spawnSync`, pas `{ timeout }` de `node:test`** : même raison que D2 de #31, l'appel synchrone bloque la boucle d'événements et le délai d'un `test()` ne peut pas s'armer pendant l'appel.
- **D3 · Constante et fonction locales à `cli.test.ts`, pas un module partagé** : `repo-conventions.test.mjs` est un `.mjs` hors typecheck, `cli.test.ts` un `.ts` vérifié ; un module commun demanderait un troisième fichier et toucherait le fichier déjà livré par #31, hors de la portée « tests seuls » de l'issue. Écarté.
- **D4 · Une fonction `assertNotTimedOut` dans le fichier, pas l'assertion recopiée deux fois** : trois sites d'exécution (`TEST-7`, et les deux tours de boucle de `TEST-8`) partagent un seul gabarit de message, qui ne peut donc pas diverger entre `TEST-7` et `TEST-8`. La condition et le contenu du message restent ceux de #31.
- **D5 · Lecture du code par `NodeJS.ErrnoException`** : `child.error?.code` ne passe pas `tsc` en mode strict (`Error` n'a pas de `code`). Le transtypage `(child.error as NodeJS.ErrnoException | undefined)?.code` est effacé par le retrait de types de Node et ne change pas le comportement de #31. Alternative écartée : `"code" in child.error`, plus long pour le même résultat.
- **D6 · Message en anglais, contenu identique à #31** : « même assertion lisible » est lu comme même condition (`ETIMEDOUT` ou `SIGTERM`), même information (commande, délai en ms, erreur, signal, sortie partielle), même place (avant toute autre assertion sur le fils). La langue suit celle du fichier, dont commentaires, titres et messages sont en anglais (`"the sentinel key was written"`, l.33), selon la règle « comme les voisins » de D6 de #33. Alternative écartée : recopier le texte français de #31, qui mélangerait deux langues dans les messages d'un même fichier.
- **D7 · Deux SPEC, un par test** : un SPEC = un commit = un test ; `TEST-7` et `TEST-8` sont deux tests distincts, prouvés chacun par sa propre mutation. SPEC-1 porte la constante et la fonction, parce que son test est le premier à s'en servir.
- **D8 · Type `test`, scope `scripts`** : seul un fichier de test change, comme `test(scripts)` de #31 (491746a) ; branche `chore/` d'après le label `T:chore`.

## Ordre des commits et preuves

Un SPEC = un commit = un test. La spécification et la checklist entrent dans le commit de SPEC-1 (précédent P1 de #31). Chemins relatifs au dépôt dans toute preuve.

Garde avant toute commande de test (précédent P6 de #26, repris par #31) : `node -e "process.exit(process.env.GEMINI_INTEGRATION === undefined ? 0 : 1)"` rend 0 ; sinon arrêter.

- **Vert** après chaque SPEC : `npm run typecheck` passe (preuve de D5) ; `npm run test` passe, `TEST-7 (issue 33)` et `TEST-8 (issue 42)` compris ; le total de tests est celui de la référence (aucun test ajouté).
- **Pas de rouge préalable** : le défaut couvert (un fils bloqué) ne se produit pas sur l'arbre de référence ; la preuve est portée par des mutations faites **après le commit du SPEC concerné**, sur l'arbre propre, après `npm run build`, annulées sans commit :
  - **Mutation A** (délai minuscule) : `const CHILD_TIMEOUT_MS = 60_000;` remplacé par `const CHILD_TIMEOUT_MS = 1;`, puis `node --test scripts/h2-report/cli.test.ts`.
  - **Mutation B** (message obscur évité), cumulée à A : l'appel `assertNotTimedOut(child, …)` du test visé retiré, puis la même commande.
  - Annulation : `git restore scripts/h2-report/cli.test.ts`, puis `git diff --stat -- scripts/h2-report/cli.test.ts` vide.
- Après SPEC-1 : la mutation A fait échouer `TEST-7 (issue 33)` avec un message contenant `node scripts/h2-report/cli.ts: the child process exceeded the 1 ms timeout and was stopped` et `ETIMEDOUT` ; `TEST-8 (issue 42)`, encore sans délai, passe. La mutation B (appel de `TEST-7` retiré) fait échouer `TEST-7` sur l'assertion `assert.equal(child.status, 1, child.stderr)`, avec un message qui ne contient pas `exceeded`.
- Après SPEC-2 : la mutation A fait échouer `TEST-7 (issue 33)` et `TEST-8 (issue 42)`, ce dernier avec un message contenant `node scripts/h2-report/cli.ts --cap-usd 1 --dry-run: the child process exceeded the 1 ms timeout and was stopped` et `ETIMEDOUT`. La mutation B (appel de `TEST-8` retiré) fait échouer `TEST-8` sur une de ses assertions existantes, avec un message qui ne contient pas `exceeded`.
- Sorties (lignes d'échec et compteurs `# tests`, `# pass`, `# fail`) montrées dans le rapport du builder et dans la description de la PR.

Gabarit (aucun `Co-Authored-By`) :

```
<type>(<scope>): <sujet>

<corps : ce qui change et la preuve, chemins relatifs au dépôt>

Refs: #53
Session: <id>
Model: <modèle>
Authorship: ai
```

| SPEC | Sujet (impératif, 72 caractères au plus type compris) |
|---|---|
| 1 | `test(scripts): borner le fils de TEST-7 de cli.test.ts à 60 s` (61) |
| 2 | `test(scripts): borner les fils de TEST-8 de cli.test.ts à 60 s` (62) |

### Message de squash proposé

```
test(scripts): borner les fils de cli.test.ts à 60 s (#<PR>)

Les deux tests de scripts/h2-report/cli.test.ts lancent cli.ts par
spawnSync, sans délai : un fils bloqué figeait toute la suite. Ils
reçoivent le délai de #31 (CHILD_TIMEOUT_MS, 60 000 ms) et échouent,
s'il expire, sur un message qui nomme la commande, le délai, l'erreur
et le signal, au lieu de « null !== 1 » ou d'une assertion de stderr.
La condition est celle de scripts/repo-conventions.test.mjs, réunie
dans assertNotTimedOut ; le message suit l'anglais du fichier.

L'environnement des fils est inchangé ; aucun fournisseur n'est
construit. Preuve par mutation locale du délai à 1 ms, annulée sans
commit.

Refs: #53
Session: <id>
Model: <modèle>
Authorship: ai
```

Sujet : 52 caractères sans le suffixe ; 58 avec ` (#NN)`. Le corps de la PR se termine par le même bloc de trailers `Refs` / `Session` / `Model` / `Authorship`.

## Tests

**TEST-1** (exerce SPEC-1) : le test existant `TEST-7 (issue 33) cli.ts without arguments exits 1 on --cap-usd is required, stdout empty`, modifié par SPEC-1 ; aucun test nouveau. Critères : vert sous `npm run test` avec 60 000 ms ; `npm run typecheck` vert ; rouge sous la mutation A avec `node scripts/h2-report/cli.ts: the child process exceeded the 1 ms timeout and was stopped` et `ETIMEDOUT` ; rouge sous A et B cumulées avec un message sans `exceeded` ; arbre propre après `git restore`.

**TEST-2** (exerce SPEC-2) : le test existant `TEST-8 (issue 42) cli.ts reads the rates under its own root and passes process.env, from any folder`, modifié par SPEC-2 ; aucun test nouveau. Critères : vert sous `npm run test` avec 60 000 ms ; `npm run typecheck` vert ; rouge sous la mutation A avec `node scripts/h2-report/cli.ts --cap-usd 1 --dry-run: the child process exceeded the 1 ms timeout and was stopped` et `ETIMEDOUT` ; rouge sous A et B cumulées (appel de `TEST-8` retiré) avec un message sans `exceeded` ; arbre propre après `git restore`.

Les deux tests sont déterministes sur le chemin nominal ; la mutation A repose sur un démarrage de Node toujours plus long que 1 ms (observé sous Windows 11 et Node v22.19.0 par #31, P4). Aucun réseau : `TEST-7` refuse avant tout fournisseur, `TEST-8` tourne en `--dry-run`.

## Estimation de taille

Hors `docs/` et `*.md`, lignes ajoutées et retirées :

| Fichier | Estimation |
|---|---|
| `scripts/h2-report/cli.test.ts`, SPEC-1 (import 1 ; constante, commentaire et ligne vide 4 ; fonction et ligne vide 9 ; option 1 ; appel 1) | +16 −0 |
| `scripts/h2-report/cli.test.ts`, SPEC-2 (option : ligne remplacée ou repliée ; appel 1) | +2 à +7 −1 |
| **Total** | **environ 20** (fourchette 15 à 30) |

Très en dessous du plafond de 400 ; aucune dérogation. La mesure (`pr_size.py`) fait foi à la PR.

## Hypothèses restantes

- **R-1 · Petit-fils** : sans objet ici, contrairement à R-2 de #31 (`node --test` relance le fichier testé dans un sous-processus). `cli.ts` est lancé directement par `node` et ne lance aucun sous-processus (aucun `child_process` sous `scripts/` hors des deux fichiers de test, ni sous `src/`) : l'arrêt du fils direct suffit.
- **R-2 · Autres erreurs du fils** : même comportement que R-3 de #31, puisque la condition est la même. Une sortie au-delà de `maxBuffer` (`ENOBUFS`) tombe sur le message de délai, libellé inexact mais erreur réelle affichée ; une erreur de lancement sans signal (`ENOENT`, `EACCES`) garde les messages existants. La sortie de `cli.ts` dans ces deux tests est de quelques lignes, loin de 1 Mio.
- **R-3 · Texte du commentaire** : il ne cite aucune durée observée des fils, aucune mesure n'ayant été faite pour cette spécification ; le texte est celui de SPEC-1, sans ajout.
- **R-4 · Langue du message** (D6) : si le pilote lit « même assertion lisible » comme « même texte, en français », seul le gabarit de `assertNotTimedOut` change (une ligne) et les critères de TEST-1 et TEST-2 suivent ; la structure ne bouge pas.
- **Node** ≥ 22.18 (retrait de types sans drapeau), constaté v22.19.0 par #20 et #31.
