# Spécification · chore: nommer GEMINI_API_KEY et GEMINI_MODEL dans .env.example · #27

Issue : https://github.com/arthurolivierfortin/agent-core/issues/27
Checklist : docs/specs/2026-09-30-env-example-gemini-checklist.md
Date : 2026-09-30
Type : chore

## Objectif

Faire nommer par `.env.example` les deux variables que le fournisseur Gemini lit dans `process.env`, `GEMINI_API_KEY` et `GEMINI_MODEL`, en lignes commentées sans valeur, et ajuster le test « .env.example nomme les variables sans valeur » qui fige aujourd'hui les lignes du fichier.

## Constats sur le code réel (relevés le 2026-09-30, branche `chore/27-env-example-gemini`, base `76d02c1`)

- `.env.example` compte 11 lignes : un en-tête de 4 lignes de commentaire (dont, ligne 4, « documented in README.md (Setting up Ollama, Configuration) »), une ligne vide, puis `# LLM_PROVIDER=`, `# OLLAMA_HOST=`, `# OLLAMA_MODEL=`, chacun sous un commentaire de groupe. Aucune variable Gemini. Commentaires en anglais ; aucune ligne de plus de 84 colonnes.
- `src/llm/providers/gemini/gemini-llm-provider.ts:33` : `DEFAULT_API_KEY_VAR = "GEMINI_API_KEY"` ; `:63` : `apiKeyVar = config.apiKeyVar ?? DEFAULT_API_KEY_VAR` ; `:81` : la clé est lue dans `process.env[this.apiKeyVar]` à chaque `complete()`. Aucune valeur par défaut.
- `src/llm/providers/index.ts:45` : `makeGemini` lit `process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL` (`"gemini-2.5-flash"`, `:22`) au moment de l'appel de `PROVIDERS.gemini()`.
- `scripts/repo-conventions.test.mjs:69-71` : le test `TEST-2 .env.example nomme les variables sans valeur` appelle `checkEnvExample(".env.example", ["# LLM_PROVIDER=", "# OLLAMA_HOST=", "# OLLAMA_MODEL="])`. `checkEnvExample` (`:18-35`) exige que toute ligne soit vide ou commentée, que la liste des lignes contenant `=` soit exactement la liste attendue, et qu'aucune ligne ne contienne `localhost` ni `qwen` (valeurs par défaut d'Ollama). Ajouter deux lignes au fichier sans toucher au test fait échouer GATE-3.
- `checkEnvExample` sert aussi `TEST-3 examples/web-chat/.env.example nomme les variables sans valeur` (`:73-75`).
- `scripts/repo-conventions.test.mjs:285-286` : `GOOGLE_KEY_SHAPE = /AIza[0-9A-Za-z_-]{35}/`, déclaré après `checkEnvExample` et utilisé par les tests des issues 26 et 42 (`:313`, `:363`, `:376`, `:433`). `.env.example` n'est soumis à aucun contrôle de forme de clé.
- Aucun fichier de `src/`, `scripts/`, `tests/` ni `examples/navigation/` ne charge un `.env` (aucun `dotenv`, aucun `loadEnvFile`) : le lanceur du rapport H2 passe `process.env` (`scripts/h2-report/cli.ts:13`) et lit `GEMINI_API_KEY` dans cet objet (`scripts/h2-report/run-report.ts:189`). Seul `examples/web-chat/` charge un `.env`, par Vite, dans son propre dossier et pour des variables `VITE_`.
- `docs/rapport-h2.md`, section « 2. Exposer GEMINI_API_KEY dans le shell » : « La clé ne s'écrit dans aucun fichier ni sur aucune ligne de commande : elle se saisit masquée, dans le shell qui lancera le rapport. » `README.md:406` dit de même pour le test d'intégration Gemini.
- Le rapport H2 ne lit pas `GEMINI_MODEL` : `scripts/h2-report/run-report.ts:66` (« OLLAMA_MODEL and GEMINI_MODEL change nothing ») ; le modèle hébergé vient de `--gemini-model` (`scripts/h2-report/report-args.ts:62`).

## Cohérence avec docs/rapport-h2.md et la règle du package

L'ajout est cohérent, à une condition que la spécification impose : le commentaire Gemini de `.env.example` le dit en toutes lettres.

- `.env.example` est le modèle du `.env` d'une **application consommatrice** : c'est elle qui charge son `.env` et remplit `process.env` ; le package ne lit que `process.env`, jamais un fichier `.env` (`CLAUDE.md`, règles propres ; en-tête de `.env.example`, lignes 1-2, inchangées). Nommer `GEMINI_API_KEY` dans ce modèle ne fait lire aucun fichier par le package.
- `docs/rapport-h2.md` porte sur un outil **de ce dépôt** (`scripts/h2-report/`), qui ne charge aucun `.env` : une clé écrite dans un `.env` à la racine n'y aurait aucun effet. La règle « la clé ne s'écrit dans aucun fichier » du rapport reste donc entière.
- Sans précision, un lecteur pourrait pourtant copier `.env.example` en `.env` pour lancer le rapport H2, écrire la clé dans un fichier, et constater qu'elle n'est pas lue. Le commentaire de groupe Gemini (D2) dit donc qu'aucun script ni test du dépôt ne charge de `.env` et renvoie, pour le rapport H2 et le test d'intégration, à l'exposition de la clé dans le shell (`docs/rapport-h2.md`, étape 2 ; `README.md`, Setting up Gemini).
- `docs/rapport-h2.md` n'est pas modifié.

## Périmètre

1. `.env.example` : en-tête réécrit sur 5 lignes pour citer « Setting up Gemini » ; après le bloc Ollama, une ligne vide puis un bloc Gemini de 6 lignes (4 de commentaire, 2 de variables) ; texte exact en D1, D2 et Comportement attendu.
2. `scripts/repo-conventions.test.mjs` : le test `TEST-2 .env.example nomme les variables sans valeur` attend les cinq noms ; `checkEnvExample` refuse aussi les valeurs par défaut de Gemini et toute forme de clé d'API Google (détail en D4).

## Hors périmètre

- `docs/rapport-h2.md`, `README.md`, `docs/guide-agent-package.md` : inchangés (le README documente déjà les deux variables, `README.md:386-389` et `:433`).
- `examples/web-chat/.env.example` : inchangé (le client web ne parle qu'à Ollama).
- Les variables d'activation de tests (`GEMINI_INTEGRATION`, `OLLAMA_INTEGRATION`, `AGENT_CORE_WRITE_DEMO`) : ce sont des interrupteurs de la suite du dépôt, pas des variables qu'une application consommatrice fournit au package.
- `GEMINI_MODEL` dans le rapport H2 (ignoré au profit de `--gemini-model`) : non mentionné dans `.env.example` ; le dire exigerait d'écrire `--gemini-model`, que le contrôle des valeurs par défaut (`gemini-`) refuse, et ce n'est pas l'objet du fichier.
- Tout fichier sous `src/`, `tests/`, `scripts/h2-report/` ; tout fichier `.env` réel, ni lu ni créé.

## Comportement attendu

### Nominal

Contenu exact de `.env.example` après le changement (19 lignes, fin de ligne finale conservée, encodage UTF-8 sans BOM, fins de ligne du fichier conservées) :

```
# Copy to `.env` (never commit it). The APPLICATION loads this file;
# the library only reads process.env (CLAUDE.md, packaging).
# Every variable is optional: uncomment it and give it a value only to
# override its default, documented in README.md (Setting up Ollama,
# Setting up Gemini, Configuration).

# Active LLM provider: must match a key of the PROVIDERS union.
# LLM_PROVIDER=

# Ollama: local, free, no key.
# OLLAMA_HOST=
# OLLAMA_MODEL=

# Gemini: hosted, paid. The key has no default; only Gemini needs it.
# No script or test of this repository loads a .env: for the H2 report
# and the integration test, expose the key in the shell, in no file
# (docs/rapport-h2.md, step 2; README.md, Setting up Gemini).
# GEMINI_API_KEY=
# GEMINI_MODEL=
```

Aucune ligne de commentaire ne contient `=`, `localhost`, `qwen`, `gemini-` ni `googleapis` ; les lignes contenant `=` sont exactement, dans l'ordre, `# LLM_PROVIDER=`, `# OLLAMA_HOST=`, `# OLLAMA_MODEL=`, `# GEMINI_API_KEY=`, `# GEMINI_MODEL=`. Aucune ligne ne dépasse 80 colonnes.

### Erreurs

Changement de configuration d'exemple et de test : aucun chemin d'erreur à l'exécution. La face « échec » est le test : il échoue si une valeur apparaît après un `=`, si une ligne ni vide ni commentée apparaît, si une valeur par défaut d'Ollama ou de Gemini est recopiée, si une forme de clé d'API Google apparaît n'importe où dans le fichier, ou si le renvoi au shell (`docs/rapport-h2.md`) ou à « Setting up Gemini » disparaît.

## Données touchées

Aucune base. Fichiers modifiés : `.env.example`, `scripts/repo-conventions.test.mjs`. Fichiers lus par le test : `.env.example` et `examples/web-chat/.env.example`, jamais un `.env`.

## Décisions

- **D1. En-tête : « Setting up Gemini » ajouté, ligne 4 recoupée.** L'en-tête renvoie aux sections du README qui documentent les valeurs par défaut ; sans « Setting up Gemini », il nommerait une variable sans renvoyer à sa section. L'ajout porterait la ligne 4 à 102 colonnes ; elle est recoupée en deux, sans autre changement de texte. Écarté : en-tête inchangé (renvoi incomplet).
- **D2. Commentaire de groupe Gemini de 4 lignes**, texte exact ci-dessus. Il dit que la clé n'a pas de défaut (l'en-tête parle de « override its default », faux pour la clé sans cette phrase), et qu'aucun script ni test du dépôt ne charge de `.env`, avec le renvoi au shell (voir « Cohérence »). Il ne contient ni `=`, ni `gemini-`, ni `googleapis`. Écarté : un commentaire d'une ligne « Gemini: hosted, paid. » sur le modèle d'Ollama (laisserait croire qu'un `.env` à la racine sert au rapport H2).
- **D3. Commentaires de `.env.example` en anglais.** Le fichier est entièrement en anglais, comme les commentaires de code du dépôt ; un bloc en français au milieu d'un fichier anglais nuirait à sa lecture. Écarté : bloc en français. Ce choix est un écart au socle (« français dans la documentation ») que la dérogation `core/langue` ne couvre pas, puisqu'elle ne liste pas `.env.example` : il est signalé ici (R1) pour que la PR le cite.
- **D4. Ajustement du test, en un seul cas, sans renommage.** Le titre `TEST-2 .env.example nomme les variables sans valeur` reste identique (traçabilité avec l'issue 1). Modifications de `scripts/repo-conventions.test.mjs` :
  - le commentaire `// Forme d'une clé d'API Google : aucun fichier versionné n'en porte une.` et la déclaration `const GOOGLE_KEY_SHAPE = /AIza[0-9A-Za-z_-]{35}/;` remontent, inchangés, juste après `splitLines` et avant `checkEnvExample`, pour que l'aide ne dépende pas de l'ordre d'évaluation du module ;
  - dans `checkEnvExample`, le filtre « valeur par défaut recopiée » devient `["localhost", "qwen", "gemini-", "googleapis"].some((value) => line.includes(value))`, message inchangé ;
  - dans `checkEnvExample`, ajout de `assert.doesNotMatch(envLines.join("\n"), GOOGLE_KEY_SHAPE, ...)` avec le message `${relativePath} : forme de clé d'API Google` ;
  - dans `TEST-2`, la liste attendue devient `["# LLM_PROVIDER=", "# OLLAMA_HOST=", "# OLLAMA_MODEL=", "# GEMINI_API_KEY=", "# GEMINI_MODEL="]`, et deux assertions vérifient que `readRepoFile(".env.example")` contient `Setting up Gemini` et `docs/rapport-h2.md`, chacune avec un message en français qui nomme `.env.example` et le texte manquant.
  Le durcissement de `checkEnvExample` vaut aussi pour `examples/web-chat/.env.example` (TEST-3), qui reste vert. Le nombre de cas de test de la suite ne change pas. Écarté : un nouveau cas `TEST-1 (issue 27)` à côté de `TEST-2` (deux cas pour un fichier, et TEST-2 aurait dû changer de toute façon).
- **D5. Un SPEC, un commit, un test.** Le fichier et son test changent dans le même commit : séparés, l'un des deux commits casserait GATE-3.

## Preuve de pertinence du test

- Rouge avant le livrable : le test modifié, lancé seul sur le `.env.example` de la base `76d02c1` (`node --test scripts/repo-conventions.test.mjs`), échoue sur « lignes avec = inattendues ».
- Mutations locales de `.env.example`, appliquées une à une après le livrable, chacune faisant échouer `TEST-2`, puis annulées par `git restore .env.example` **sans commit** (`git diff --stat -- .env.example` vide au commit ; le livrable est alors déjà commité, ou mis de côté par un commit WIP, jamais par un `git stash` nu) :
  - M1 : `# GEMINI_MODEL=` devient `# GEMINI_MODEL=x` (lignes avec `=` inattendues) ;
  - M2 : ajout de la ligne `# default model gemini-2.5-flash` (valeur par défaut recopiée) ;
  - M3 : ajout d'une ligne de commentaire `# AIza` suivie de 35 caractères `x` (forme de clé d'API Google ; chaîne factice, jamais commitée) ;
  - M4 : retrait de `docs/rapport-h2.md` de la ligne qui le cite (renvoi au shell absent).
- La sortie de chaque passe est montrée dans le rapport du builder ; chemins relatifs au dépôt.

## Commits

Gabarit (aucun `Co-Authored-By`) :

```
<type>(<scope>): <sujet>

Refs: #27
Session: <id>
Model: <modèle>
Authorship: ai
```

| SPEC | Sujet (impératif, 72 caractères au plus type compris) |
|---|---|
| 1 | `chore(env-example): nommer GEMINI_API_KEY et GEMINI_MODEL sans valeur` (69) |

`chore` dit vrai : ni fonctionnalité ni correction du package, un fichier d'exemple et son test de conventions. Les documents de l'issue (spécification, checklist, plan) entrent dans ce commit (précédent P1 de #20, #35, #39).

### Message de squash proposé

```
chore(env-example): nommer les variables Gemini sans valeur (#<PR>)

.env.example nomme GEMINI_API_KEY et GEMINI_MODEL, commentées et sans
valeur, et son en-tête renvoie à Setting up Gemini. Le commentaire du
bloc Gemini dit qu'aucun script ni test du dépôt ne charge de .env :
pour le rapport H2 et le test d'intégration, la clé s'expose dans le
shell, dans aucun fichier (docs/rapport-h2.md, étape 2). Le package
continue de ne lire que process.env.

Le test « .env.example nomme les variables sans valeur » attend les
cinq noms, et checkEnvExample refuse aussi les valeurs par défaut de
Gemini (gemini-, googleapis) et toute forme de clé d'API Google.

Refs: #27
Session: <id>
Model: <modèle>
Authorship: ai
```

Sujet : 59 caractères sans le suffixe ; 65 avec ` (#NN)`.

## Taille estimée

Diff hors documents de l'issue : `.env.example` +9 / −1, `scripts/repo-conventions.test.mjs` environ +8 / −4, soit une vingtaine de lignes. Avec la spécification, la checklist et le plan : environ 300 lignes, sous le seuil de 400.

## Preuves attendues dans la PR

- Sortie de `npm run build`, `npm run typecheck`, `npm run test` (GATE-1 à GATE-3), `TEST-2 .env.example nomme les variables sans valeur` et `TEST-3 examples/web-chat/.env.example nomme les variables sans valeur` à `ok`, nombre de tests inchangé par rapport à la base.
- Sorties du rouge et des mutations M1 à M4.
- Section Risques et suivi : R1 cité.
- Tout chemin cité relatif au dépôt ; aucun fichier `.env` lu ni créé ; aucune valeur de clé dans le diff, les sorties ou les messages.

## Hypothèses restantes

- **R1. Langue de `.env.example`.** Les commentaires ajoutés sont en anglais (D3), alors que la dérogation `core/langue` ne liste pas `.env.example`. À trancher par Arthur à la revue : soit accepter (fichier de configuration, comme le code), soit ajouter `.env.example` à la dérogation dans une issue séparée. Ce choix ne bloque pas l'issue.
- **R2. Corps de l'issue non relu par cet agent** (pas de shell disponible) : le périmètre repose sur le corps transmis par le prompt de dispatch.
