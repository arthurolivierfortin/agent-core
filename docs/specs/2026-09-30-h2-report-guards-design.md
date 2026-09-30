# Spécification · Garde-fous du rapport H2 avant tout réseau · #20

Date : 2026-09-30 (révision du même jour : option C du pilote, `capGuard` sorti vers #35)
Issue : https://github.com/arthurolivierfortin/agent-core/issues/20 (type feature ; C1 du découpage de #20 ; #34 = statut HTTP sur `LLMError`, #35 = C1b `capGuard`, #33 = C2 runner)
Checklist : docs/specs/2026-09-30-h2-report-guards-checklist.md
Branche : `feat/20-h2-report-runner` (worktree `.claude/worktrees/feat+20-h2-report-runner`, `main` 349ee1d, #26 fusionné)

## Objectif

Poser, sous `scripts/h2-report/`, les garde-fous du premier rapport réel qui refusent de démarrer avant tout appel réseau (tarifs datés et sourcés, arguments, conditions de démarrage), sans rien lancer.

## Source de l'issue (corps relevé le 2026-09-30, après l'option C)

C1 de #20 : `loadRateFile(text)`, `data/rates.json`, `parseReportArgs(argv)`, `assertReadyToStart(args, rates, env)`. `capGuard` est déplacé dans #35 (qui dépend de #20 et de #34). Code en TypeScript sous `scripts/`, couvert par `npm run typecheck` (tsconfig de typecheck étendu à `scripts/**`, pas celui du build), exécuté comme les tests d'intégration, hors de tout barrel. Aucun appel réseau dans la suite, aucune exécution réelle, la valeur d'une clé n'apparaît nulle part, aucun `.env` lu. PR sous 400 lignes hors `docs/` et `*.md`, sans dérogation.

Décisions du pilote reprises :

- (a) TypeScript sous `scripts/`, typecheck via `tsconfig.json`, `allowImportingTsExtensions: true` dans `tsconfig.json`, remis à `false` dans `tsconfig.build.json` qui garde `include: ["src"]`.
- (b) `GEMINI_API_KEY` absente ou vide refusée par `assertReadyToStart`, nom sans valeur.
- (c) `--dry-run` reconnu par `parseReportArgs` (booléen) ; son effet est livré par #33.
- (d) `--out` par défaut `docs/reports/h2-<AAAA-MM-JJ>/` (date du jour du lancement), jamais `docs/demo/` (preuve H1 comparée octet à octet).
- (e) Tarif hébergé `null` tant qu'Arthur n'a pas saisi une valeur vérifiée ; `qwen2.5:0.5b` à 0 avec la source `"local"` ; règle du zéro : 0 seulement pour un modèle local, le modèle hébergé doit avoir ses deux composantes > 0 pour démarrer.
- (f) Rien dans C1 ne dépend de #34.

## État constaté dans le code (lecture du 2026-09-30, `main` 349ee1d)

- `package.json:34-36` : `build` = `tsc -p tsconfig.build.json` ; `typecheck` = `tsc --noEmit` (donc `tsconfig.json`) ; `test` = `npm run build && node --test` (sans argument ni drapeau).
- `tsconfig.json:13` : `include: ["src", "tests"]`, `noEmit: true`, `module`/`moduleResolution` `NodeNext`. `tsconfig.build.json` étend `tsconfig.json`, pose `noEmit: false`, `rootDir: "src"`, `include: ["src"]` : le build ne compile que `src/`, et un fichier hors `src/` tiré dans le build y serait une erreur `rootDir`.
- Les tests `.ts` (`tests/**/*.test.ts`, dont `tests/integration/*.integration.test.ts`) sont exécutés tels quels par `node --test` : Node 22 retire les types et `node --test` sans argument découvre `**/*.test.ts` dans tout le dépôt hors `node_modules`, `scripts/repo-conventions.test.mjs` compris (précédent : docs/specs/2026-09-30-gemini-wiring-design.md:45). Ils importent le code livré par `dist/`, jamais `src/` : les fichiers de `src/` s'importent entre eux en `.js`, que le retrait de types ne réécrit pas.
- Conséquence pour `scripts/` : un test `.ts` qui importe un module `.ts` voisin doit écrire l'extension `.ts` (`./rates.ts`), que Node exige et que `tsc` refuse sans `allowImportingTsExtensions` ; cette option exige `noEmit`, que `tsconfig.json` a et que `tsconfig.build.json` retire (erreur TS5096 au build si elle y est héritée).
- `package-lock.json:25-26` : TypeScript 5.9.3. `@types/node` 22.20.1 (`util.parseArgs` typé). `.github/workflows/publish.yml:52` : Node 22.
- `src/metrics/models/index.ts:20-31` : `Rate = { usdPerMillionTokensIn, usdPerMillionTokensOut }`, `RateTable = Readonly<Record<string, Rate | null>>`, servis par `.` (`src/index.ts:13`).
- `src/llm/providers/index.ts:19,22` : `DEFAULT_OLLAMA_MODEL = "qwen2.5:0.5b"`, `DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"`, servis par `.` (`src/index.ts:7` → `src/llm/index.ts:4`).
- `.gitattributes:2` : `docs/demo/** -text` seulement ; aucun dossier `docs/reports/` dans le dépôt.
- `scripts/repo-conventions.test.mjs:1-2` : fichier des conventions du dépôt, hors de `tests/` ; `:286` : `GOOGLE_KEY_SHAPE = /AIza[0-9A-Za-z_-]{35}/`.
- Aucun nom `loadRateFile`, `parseReportArgs`, `defaultReportOut`, `assertReadyToStart`, aucun dossier `data/` ni `scripts/h2-report/` dans le dépôt.

## Périmètre

Dans la PR :

- `tsconfig.json`, `tsconfig.build.json` (SPEC-1) ; `scripts/repo-conventions.test.mjs` (TEST-1).
- `scripts/h2-report/rates.ts` et `rates.test.ts` (SPEC-2, SPEC-3, TEST-4) ; `data/rates.json` (SPEC-4).
- `scripts/h2-report/report-args.ts` et `report-args.test.ts` (SPEC-5).
- `scripts/h2-report/start-guard.ts` et `start-guard.test.ts` (SPEC-8, SPEC-9).

Numérotation : SPEC-6 et SPEC-7 (et TEST-6, TEST-7) de la première rédaction portaient `capGuard` (plafond, puis coupure au premier rejet). Ils sont **barrés avec un renvoi à #35**, pas renumérotés : les numéros SPEC-8 et SPEC-9 déjà cités par le pilote restent valides, conformément à la règle de stabilité de `dev-kit/schemas/checklist.md`.

Hors périmètre, livré par **#35** (C1b) : `capGuard` entier, c'est-à-dire le plafond partagé, `spentUsd()`, les refus (`cap_reached`, `cost_unknown`, `unpriced_model`), la coupure au premier appel hébergé rejeté, `cutReason()` et sa classification (`rate_limited`, `http_<statut>`, `network`, et la quatrième raison `unclassified` acceptée par le pilote), ainsi que la troisième couche de la règle du zéro (R3 : refuser dans `capGuard` un modèle à tarif ≤ 0).

Hors périmètre, livré par **#34** : le statut HTTP sur `LLMError`. C1 n'importe rien de `LLMError` et ne lit aucun message d'erreur de fournisseur.

Hors périmètre, livré par **#33** (C2) : le runner, l'annonce, l'effet de `--dry-run` (imprimer l'annonce, sortir en 0), l'écriture du rapport et sa protection (écriture sûre), le rapport tronqué, la documentation (README, guide), toute exécution réelle, et la ligne `docs/reports/** -text` de `.gitattributes` (voir Décisions).

Hors périmètre tout court : toute modification de `src/`, de `package.json`, des barrels ; la saisie d'un tarif Gemini (Arthur).

## Conception

Règles communes aux modules de `scripts/h2-report/` : TypeScript effaçable seulement (ni `enum`, ni `namespace`, ni propriété de paramètre de constructeur), car Node retire les types sans les compiler ; tout import de type en `import type` ; le code du paquet vient de `../../dist/index.js`, les modules voisins de `./<nom>.ts`. Aucun `console.`, aucune lecture de `.env`, aucun accès réseau, aucune lecture de `process.env` ni de `process.argv` par les modules (l'environnement et les arguments arrivent en paramètre). Aucun fichier `index.ts` sous `scripts/`.

### SPEC-1 · Typecheck étendu à `scripts/`, build inchangé

- `tsconfig.json` : `include` devient `["src", "tests", "scripts"]` ; ajout de `"allowImportingTsExtensions": true` dans `compilerOptions`.
- `tsconfig.build.json` : ajout de `"allowImportingTsExtensions": false` dans `compilerOptions` ; `include` reste `["src"]`, `rootDir` reste `"src"`.
- Effet : `npm run typecheck` vérifie `scripts/**/*.ts` ; `npm run build` ne les compile pas et n'émet rien sous `dist/` pour eux ; `npm run test` les exécute par la découverte de `node --test` (`scripts/h2-report/*.test.ts`), sans changement de `package.json`.

### SPEC-2 · `loadRateFile(text: string): RateTable` (`scripts/h2-report/rates.ts`)

Forme attendue : un objet JSON dont chaque clé est un identifiant de modèle et chaque valeur `{ "rate": { "usdPerMillionTokensIn": n, "usdPerMillionTokensOut": n } | null, "effectiveFrom": "AAAA-MM-JJ", "source": "…" }`.

Refus, chacun par un `Error` levé au premier défaut, message préfixé `rates` et nommant l'entrée et le champ :

| Défaut | Message |
|---|---|
| JSON illisible | `rates: not valid JSON: <message de SyntaxError>` |
| racine `null`, tableau ou non objet | `rates: the root must be an object keyed by model id` |
| clé vide `""` | `rates: a model id must not be empty` |
| entrée non objet (ou `null`, tableau) | `rates['<id>']: must be an object` |
| champ manquant parmi `rate`, `effectiveFrom`, `source` | `rates['<id>']: missing field '<champ>'` |
| champ en trop | `rates['<id>']: unexpected field '<champ>'` |
| `effectiveFrom` non chaîne, hors `^\d{4}-\d{2}-\d{2}$`, ou date inexistante (`2026-02-30`) | `rates['<id>'].effectiveFrom: must be a real YYYY-MM-DD date` |
| `source` non chaîne ou vide après `trim()` | `rates['<id>'].source: must be a non-empty string` |
| `rate` ni `null` ni objet | `rates['<id>'].rate: must be null or an object` |
| champ manquant ou en trop dans `rate` | `rates['<id>'].rate: missing field '<champ>'` / `unexpected field '<champ>'` |
| composante non `number`, non finie ou négative | `rates['<id>'].rate.<champ>: must be a finite number >= 0` |

- Date réelle : `new Date(s + "T00:00:00Z")` valide et `toISOString().slice(0, 10) === s`.
- Rendu : un objet neuf construit par `Object.fromEntries`, `{ id: null }` ou `{ id: { usdPerMillionTokensIn, usdPerMillionTokensOut } }` (objet neuf), `effectiveFrom` et `source` validés puis non repris (la `RateTable` du paquet ne les porte pas). `Object.fromEntries` crée des propriétés propres : une clé `__proto__` du JSON reste une entrée, jamais un prototype.
- Chemin nominal testé : un fichier à deux entrées (une `null`, une chiffrée) rend la table attendue.

### SPEC-3 · Règle du prix à zéro (dans `loadRateFile`)

Règle exacte, en deux couches dans C1 (R1 ici, R2 en SPEC-8) ; la troisième couche (R3, refus dans `capGuard`) est livrée par #35 :

- **R1** (`loadRateFile`) : une composante égale à 0 n'est acceptée que si la `source` de l'entrée vaut exactement `"local"` ; sinon `rates['<id>'].rate.<champ>: a zero price requires source "local"`. Une source `"local"` n'impose pas 0 (un tarif local positif ou `null` est accepté).
- **R2** (`assertReadyToStart`) : le modèle hébergé (`args.geminiModel`) doit avoir un tarif dont les deux composantes sont strictement positives, quelle que soit sa source ; une source `"local"` sur le modèle hébergé ne l'exempte pas.

Ainsi, dans C1, un 0 ne permet jamais de démarrer avec le modèle hébergé : R1 ne l'admet qu'avec la source `"local"`, et R2 refuse le démarrage même dans ce cas.

### SPEC-4 · `data/rates.json`

Contenu exact (deux entrées, indentation de deux espaces) :

```json
{
  "gemini-2.5-flash": {
    "rate": null,
    "effectiveFrom": "2026-09-30",
    "source": "non saisi : tarif à vérifier par Arthur sur la page de prix de l'API Gemini"
  },
  "qwen2.5:0.5b": {
    "rate": { "usdPerMillionTokensIn": 0, "usdPerMillionTokensOut": 0 },
    "effectiveFrom": "2026-09-30",
    "source": "local"
  }
}
```

- Aucun tarif hébergé inventé : `gemini-2.5-flash` reste `null` ; tant qu'il l'est, `assertReadyToStart` refuse de démarrer avec les valeurs par défaut (verrouillé par TEST-8 sur le vrai fichier).
- Modèle local (`DEFAULT_OLLAMA_MODEL`) : 0 explicite avec la source `"local"` (décision du pilote) : le rapport de #33 affichera un coût Ollama de 0 lu comme « non facturé », et non `null` lu comme « inconnu ».
- Saisie par Arthur : remplacer `rate` par les deux prix en dollars US par million de jetons, `effectiveFrom` par la date de vérification, `source` par l'URL de la page de prix.

### SPEC-5 · `parseReportArgs(argv, today?): ReportArgs` et `defaultReportOut(today)` (`scripts/h2-report/report-args.ts`)

```ts
export type ReportArgs = {
  readonly capUsd: number; readonly runs: number; readonly ollamaModel: string;
  readonly geminiModel: string; readonly out: string; readonly dryRun: boolean;
};
export const DEFAULT_RUNS = 5;
export function defaultReportOut(today: Date): string;
export function parseReportArgs(argv: readonly string[], today: Date = new Date()): ReportArgs;
```

- `defaultReportOut(today)` rend `docs/reports/h2-<AAAA>-<MM>-<JJ>/` (barre oblique finale comprise), construit à partir de `today.getFullYear()`, `today.getMonth() + 1` et `today.getDate()` (date **locale** de la machine qui lance, mois et jour sur deux chiffres). Exemples : `new Date(2026, 8, 30, 23, 30)` → `docs/reports/h2-2026-09-30/` ; `new Date(2026, 0, 5)` → `docs/reports/h2-2026-01-05/`. Le préfixe est une constante non exportée `"docs/reports/h2-"` : aucun défaut ne peut désigner `docs/demo/`.
- `parseReportArgs` : `today` sert seulement au défaut de `--out` ; il est optionnel pour que l'appel de #33 reste `parseReportArgs(process.argv.slice(2))` et qu'un test fixe la date.
- Analyse par `parseArgs` de `node:util`, `strict: true`, `allowPositionals: false`, options `cap-usd`, `runs`, `ollama-model`, `gemini-model`, `out` (type `string`) et `dry-run` (type `boolean`). Formes `--opt valeur` et `--opt=valeur` acceptées ; une option répétée garde sa dernière valeur (comportement de `parseArgs`). Une option inconnue, un argument positionnel, une option à valeur sans valeur ou `--dry-run=x` lèvent l'erreur de `parseArgs` (codes `ERR_PARSE_ARGS_UNKNOWN_OPTION`, `ERR_PARSE_ARGS_UNEXPECTED_POSITIONAL`, `ERR_PARSE_ARGS_INVALID_OPTION_VALUE`), non enveloppée.
- `--cap-usd` obligatoire : absent → `Error("--cap-usd is required")` ; valeur hors `^\d+(\.\d+)?$` ou égale à 0 → `Error("--cap-usd must be a decimal number > 0, got '<valeur>'")` (refuse `0`, `0.00`, `-1`, `1e3`, `.5`, `1,5`, `abc`).
- `--runs` : défaut `DEFAULT_RUNS` ; valeur hors `^[1-9]\d*$` → `Error("--runs must be an integer >= 1, got '<valeur>'")`.
- `--ollama-model` : défaut `DEFAULT_OLLAMA_MODEL` ; `--gemini-model` : défaut `DEFAULT_GEMINI_MODEL` ; `--out` : défaut `defaultReportOut(today)`. Valeur vide → `Error("--<option> must not be empty")`. Une valeur explicite de `--out` est rendue telle quelle (voir Décisions pour `docs/demo/`).
- `--dry-run` : `dryRun: true` si présent, `false` sinon. Aucun effet ici.

### ~~SPEC-6~~ · retiré : `capGuard` (plafond partagé) déplacé dans #35

### ~~SPEC-7~~ · retiré : coupure de `capGuard` au premier rejet et `cutReason()` déplacés dans #35

### SPEC-8 · `assertReadyToStart(args, rates, env)` : tarifs (`scripts/h2-report/start-guard.ts`)

Signature : `assertReadyToStart(args: Pick<ReportArgs, "ollamaModel" | "geminiModel">, rates: RateTable, env: Readonly<Record<string, string | undefined>>): void`. Elle collecte tous les défauts, puis lève un seul `Error` dont le message commence par `refusing to start before any network call:` suivi d'une ligne par défaut (`\n- <défaut>`), dans cet ordre :

- `args.ollamaModel` sans clé propre dans `rates` (`Object.hasOwn`) → `data/rates.json has no entry for '<id>' (--ollama-model)` ;
- `args.geminiModel` sans clé propre → `data/rates.json has no entry for '<id>' (--gemini-model)` ;
- tarif hébergé `null` → `data/rates.json: '<id>'.rate is null; enter a verified { usdPerMillionTokensIn, usdPerMillionTokensOut } with its effectiveFrom and source` ;
- tarif hébergé à composante ≤ 0 (R2) → `data/rates.json: '<id>'.rate.<champ> must be > 0 for the hosted model`, une ligne par composante fautive, `usdPerMillionTokensIn` avant `usdPerMillionTokensOut`.

Le tarif du modèle local peut être `null` ou chiffré (0 compris). Aucun défaut → retour sans valeur.

### SPEC-9 · `assertReadyToStart` : clé d'API

- `env.GEMINI_API_KEY` `undefined`, ou vide après `trim()` → ligne `environment variable GEMINI_API_KEY is unset or empty`, ajoutée après celles de SPEC-8. Le nom vient d'une constante non exportée `GEMINI_API_KEY_VAR = "GEMINI_API_KEY"` (le défaut de `GeminiLLMProvider`, non exporté par le paquet).
- La valeur de la clé n'entre dans aucun message, dans aucun cas (clé présente et autre défaut compris).
- Aucune lecture de `process.env` : #33 passe `process.env`.

## Chemins nominal et d'erreur

| Élément | Nominal | Erreur |
|---|---|---|
| typecheck | `scripts/**/*.ts` vérifiés (SPEC-1) | build : `scripts/` exclu, option `.ts` coupée (SPEC-1) |
| tarifs | table rendue (SPEC-2) | onze défauts nommés (SPEC-2) ; zéro hors `local` (SPEC-3) |
| fichier de tarifs | chargé par `loadRateFile` (SPEC-4) | hébergé `null` : démarrage refusé (SPEC-8, TEST-8) |
| arguments | défauts nommés, `--out` daté sous `docs/reports/`, `--dry-run` booléen (SPEC-5) | cap absent, nul, mal formé ; runs invalide ; valeur vide ; option inconnue ; positionnel (SPEC-5) |
| démarrage | aucun défaut : retour (SPEC-8, SPEC-9) | entrée absente, hébergé `null` ou ≤ 0 (SPEC-8) ; clé absente ou vide (SPEC-9) |

## Symétrie

- Écriture face à lecture : `data/rates.json` écrit (SPEC-4) et relu par `loadRateFile` (TEST-4) ; `ReportArgs` produit par `parseReportArgs` (TEST-5) et consommé par `assertReadyToStart` (TEST-8 lui passe les défauts de `parseReportArgs`) ; `out` produit ici, consommé par l'écriture de #33.
- Énumération : aucune dans C1 (les raisons de refus et de coupure sont un type de #35). Aucune base, aucune interface.
- Règle du zéro : couverte à ses deux couches de C1 (R1 TEST-3, R2 TEST-8) ; R3 est testée par #35.

## Données touchées

`data/rates.json` créé ; `tsconfig.json`, `tsconfig.build.json` modifiés. Aucune base. Aucune variable d'environnement lue par le code ni posée par les tests (l'environnement est un paramètre ; les tests passent des objets littéraux).

## Décisions et alternatives écartées

- **`capGuard` sorti vers #35** (option C du pilote) : C1 ne dépend plus de #34. Écarté : garder `capGuard` dans C1 avec une classification par forme de message (couplage aux messages de `GeminiLLMProvider`, taille estimée à environ 488 lignes).
- **SPEC-6 et SPEC-7 barrés, non renumérotés** : règle de stabilité des numéros de `dev-kit/schemas/checklist.md` ; SPEC-8 et SPEC-9 gardent leur sens partout où ils sont cités.
- **`.gitattributes` laissé à #33** : C1 ne crée ni n'écrit aucun fichier sous `docs/reports/` (il ne fait que nommer le défaut de `--out`) ; la ligne `docs/reports/** -text` accompagne le premier fichier versionné sous ce dossier, que #33 produit. Le corps de #20 cite encore cette ligne sous `parseReportArgs` : à déplacer dans #33 (pilote).
- **Date locale, pas UTC, pour le défaut de `--out`** : « le jour du lancement » est celui de la personne qui lance ; en UTC, un lancement en soirée au Québec serait daté du lendemain.
- **`today` en second paramètre optionnel** plutôt que lu dans la fonction sans recours : le test fixe la date sans simuler l'horloge, et la signature `parseReportArgs(argv)` de l'issue reste valide.
- **Barre oblique finale dans le défaut** : forme littérale de l'issue (`docs/reports/h2-<AAAA-MM-JJ>/`).
- **Un `--out` explicite sous `docs/demo/` n'est pas refusé par C1** : la décision du pilote porte sur le défaut ; la protection des fichiers existants à l'écriture relève de l'écriture sûre de #33.
- **Modèle local à 0 / `"local"`** plutôt que `null` : voir SPEC-4.
- **`parseArgs` de `node:util`** plutôt qu'une boucle écrite à la main : options inconnues, positionnels et valeurs manquantes refusés par `strict`, moins de lignes.
- **`allowImportingTsExtensions`** plutôt que `rewriteRelativeImportExtensions` : rien n'est émis pour `scripts/`, l'option suffit au typecheck, et le build la coupe explicitement.
- **Tests sous `scripts/h2-report/`**, à côté du code, pas sous `tests/` : `tests/` reste la suite du moteur (`scripts/repo-conventions.test.mjs:1-2`).

## Ordre des commits et preuve de rouge

Un SPEC = un commit = un test, dans l'ordre SPEC-1, 2, 3, 4, 5, 8, 9. Preuve de rouge par `npm run test` (chemins relatifs au dépôt dans toute preuve) : TEST-1 échoue avant SPEC-1 (`include` sans `scripts`) ; TEST-2, TEST-5, TEST-8 échouent avant leur SPEC (module introuvable) ; TEST-3 échoue avant SPEC-3 (le zéro hors `local` est accepté) ; TEST-4 avant SPEC-4 (`data/rates.json` absent) ; TEST-9 avant SPEC-9 (pas de ligne de clé). La sortie de `npm run test` doit montrer les titres `TEST-N (issue 20)` des fichiers `scripts/h2-report/*.test.ts` : c'est la preuve que `node --test` les découvre. La sortie de `npm run build` suivie d'un listage de `dist/` doit montrer qu'aucun fichier n'y est émis pour `scripts/`.

Gabarit (aucun `Co-Authored-By`) :

```
<type>(<scope>): <sujet>

Refs: #20
Session: <id>
Model: <modèle>
Authorship: ai
```

| SPEC | Sujet (72 caractères au plus, type compris) |
|---|---|
| 1 | `chore(scripts): typer scripts/ au typecheck sans le compiler au build` |
| 2 | `feat(scripts): valider le fichier de tarifs avec loadRateFile` |
| 3 | `feat(scripts): n'accepter un prix à zéro qu'avec la source local` |
| 4 | `feat(data): poser data/rates.json sans tarif hébergé inventé` |
| 5 | `feat(scripts): lire les arguments du rapport H2 avec parseReportArgs` |
| 8 | `feat(scripts): refuser de démarrer sans tarif hébergé vérifié` |
| 9 | `feat(scripts): refuser de démarrer sans GEMINI_API_KEY` |

### Message de squash proposé

```
feat(scripts): poser les garde-fous du rapport H2 avant le réseau

Pose sous scripts/h2-report/ les garde-fous du premier rapport réel,
qui refusent de démarrer avant tout appel réseau. La PR ne lance rien.

- loadRateFile valide data/rates.json (date réelle, source, tarif) et
  n'accepte un prix à zéro qu'avec la source "local".
- data/rates.json : gemini-2.5-flash à null tant qu'Arthur n'a pas
  saisi un tarif vérifié ; qwen2.5:0.5b à 0, source "local".
- parseReportArgs : --cap-usd obligatoire et > 0, --runs 5 par défaut,
  modèles par défaut nommés, --out par défaut
  docs/reports/h2-<AAAA-MM-JJ>/ (date locale du lancement), --dry-run
  reconnu (effet : #33).
- assertReadyToStart : refuse une entrée absente, un tarif hébergé null
  ou à composante <= 0, une GEMINI_API_KEY absente ou vide (nom seul,
  jamais la valeur).
- tsconfig.json vérifie scripts/ ; tsconfig.build.json ne le compile pas.

capGuard (plafond partagé, coupure au premier rejet) est livré par #35.

Refs: #20
Session: <id>
Model: <modèle>
Authorship: ai
```

## Tests

Tous déterministes, sans réseau, sans fournisseur (ni `FakeLLMProvider`, ni `GeminiLLMProvider`, ni `PROVIDERS`), sans variable d'environnement posée. Titres préfixés `TEST-N (issue 20)`. Cas d'erreur en tables (une ligne par cas) pour tenir la taille.

- TEST-1 : `tsconfig.json` a `include` égal à `["src", "tests", "scripts"]` et `allowImportingTsExtensions: true` ; `tsconfig.build.json` a `include` égal à `["src"]`, `rootDir` `"src"` et `allowImportingTsExtensions: false`.
- TEST-2 : nominal (deux entrées) puis une ligne par défaut du tableau de SPEC-2, chacune `assert.throws` avec le message attendu ; plus une clé `__proto__` rendue comme entrée propre.
- TEST-3 : zéro avec `source: "local"` accepté ; zéro sur une composante avec `source: "pricing page"` refusé avec le message de R1 ; tarif local positif accepté.
- TEST-4 : `readFileSync` de `data/rates.json` ; `loadRateFile` le charge ; `gemini-2.5-flash` → `null` ; `qwen2.5:0.5b` → `{ 0, 0 }` ; le texte ne correspond pas à `/AIza[0-9A-Za-z_-]{35}/`.
- TEST-5 : `parseReportArgs(["--cap-usd", "2.5"], new Date(2026, 8, 30, 23, 30))` rend `{ capUsd: 2.5, runs: 5, ollamaModel: "qwen2.5:0.5b", geminiModel: "gemini-2.5-flash", out: "docs/reports/h2-2026-09-30/", dryRun: false }` ; `defaultReportOut(new Date(2026, 0, 5))` rend `"docs/reports/h2-2026-01-05/"` ; `parseReportArgs(["--cap-usd", "1"]).out` commence par `docs/reports/h2-` et ne commence pas par `docs/demo/` ; toutes options posées (forme `--opt=valeur` comprise, `--out` explicite rendu tel quel) et `--dry-run` → `dryRun: true` ; table des refus, un `argv` par ligne : `[]` ; `["--cap-usd", "0"]` ; `["--cap-usd", "0.00"]` ; `["--cap-usd=-1"]` ; `["--cap-usd", "1e3"]` ; `["--cap-usd", ".5"]` ; `["--cap-usd", "abc"]` ; `["--cap-usd", "1", "--runs", "0"]` ; `["--cap-usd", "1", "--runs", "1.5"]` ; `["--cap-usd", "1", "--out", ""]` ; `["--cap-usd", "1", "--model", "x"]` (option inconnue) ; `["--cap-usd", "1", "extra"]` (positionnel).
- ~~TEST-6~~ : retiré, déplacé dans #35 avec SPEC-6.
- ~~TEST-7~~ : retiré, déplacé dans #35 avec SPEC-7.
- TEST-8 : défauts de `parseReportArgs(["--cap-usd", "1"])`, table `loadRateFile(data/rates.json)`, `env` `{ GEMINI_API_KEY: "sentinel-value-not-a-key" }` → rejet dont le message commence par `refusing to start before any network call:` et contient `data/rates.json`, `gemini-2.5-flash`, `usdPerMillionTokensIn`, `usdPerMillionTokensOut` ; entrée Ollama absente et entrée Gemini absente nommées ; tarif hébergé `{ 0, 1 }` chargé par `loadRateFile` avec source `"local"` (admis par R1) puis refusé par R2 sur `usdPerMillionTokensIn` ; table complète et positive → aucun rejet.
- TEST-9 : `env` `{}`, `{ GEMINI_API_KEY: "" }`, `{ GEMINI_API_KEY: "   " }` → ligne `environment variable GEMINI_API_KEY is unset or empty` ; clé `sentinel-value-not-a-key` avec tarif hébergé `null` → rejet dont le message ne contient pas `sentinel-value-not-a-key`.

## Estimation de taille

Hors `docs/` et `*.md`, lignes ajoutées ou modifiées, après retrait de `capGuard` :

| Fichier | Estimation |
|---|---|
| `tsconfig.json`, `tsconfig.build.json` | 4 |
| `scripts/repo-conventions.test.mjs` (TEST-1) | 12 |
| `scripts/h2-report/rates.ts` | 60 |
| `scripts/h2-report/rates.test.ts` (TEST-2 à 4) | 55 |
| `data/rates.json` | 12 |
| `scripts/h2-report/report-args.ts` (avec `defaultReportOut`) | 55 |
| `scripts/h2-report/report-args.test.ts` | 42 |
| `scripts/h2-report/start-guard.ts` | 35 |
| `scripts/h2-report/start-guard.test.ts` (TEST-8, 9) | 40 |
| **Total** | **environ 315** |

Sous le plafond de 400 avec une marge d'environ 85 lignes ; aucune dérogation nécessaire.

## Hypothèses restantes

- Node local ≥ 22.18 (retrait de types actif sans drapeau) : déduit du fait que `npm run test` exécute déjà les `tests/**/*.test.ts` sans drapeau. À confirmer par la sortie de GATE-3 montrant les titres de `scripts/h2-report/`.
- `effectiveFrom` d'une entrée à tarif `null` = date de rédaction de l'entrée (2026-09-30), faute d'autre sens.
- `loadRateFile` valide `effectiveFrom` et `source` sans les rendre (la `RateTable` du paquet ne les porte pas) : si l'annonce de #33 doit les citer, #33 ajoutera une lecture qui les rend.
