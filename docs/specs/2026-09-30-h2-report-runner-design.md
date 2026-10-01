# Spécification · Annoncer le rapport H2 et le répéter à blanc sans réseau · #33 (C2a)

Date : 2026-09-30
Issue : https://github.com/arthurolivierfortin/agent-core/issues/33 (type feature, `T:feature`, jalon H2, sous le parapluie #3 ; C2a du découpage de #33 décidé par le pilote le 2026-09-30 ; dépend de #20, #35, #39, fusionnés)
Suite : https://github.com/arthurolivierfortin/agent-core/issues/42 (C2b : lancement plafonné, écriture sûre des CSV, troncature, documentation ; dépend de #33)
Checklist : docs/specs/2026-09-30-h2-report-runner-checklist.md
Branche : `feat/33-h2-report-runner` (worktree `.claude/worktrees/feat+33-h2-report-runner`, `main` 528db1d)
Continuité : docs/specs/2026-09-30-h2-report-guards-design.md (#20 : `loadRateFile`, `parseReportArgs`, `assertReadyToStart`, règles communes des modules de `scripts/h2-report/`) ; docs/specs/2026-09-30-cap-guard-design.md (#35) ; docs/specs/2026-09-30-cap-guard-finite-cost-design.md (#39)

## Objectif

Livrer sous `scripts/h2-report/` le runner du rapport H2 jusqu'à son annonce : il refuse de démarrer sur tout défaut, protège `--out`, imprime l'annonce exacte, sort en 0 avec `--dry-run` et refuse explicitement le lancement réel (renvoi à #42). Aucun fournisseur n'est construit et aucun réseau n'est touché, quel que soit le chemin.

## Source de l'issue (corps recadré le 2026-09-30) et décisions du pilote

Corps (C2a) : `loadRateEntries(text)` ; `defaultProviders(args)` à modèles explicites, jamais `PROVIDERS` ; `runReport(io)` qui refuse de démarrer (stderr, sortie 1, aucune fabrique appelée) si `parseReportArgs`, `loadRateFile` ou `assertReadyToStart` lèvent, ou si les deux modèles sont identiques ; protection de `--out` avant tout réseau ; annonce exacte sur stdout avant toute construction de fournisseur ; `--dry-run` : l'annonce puis « dry run », sortie 0 ; sans `--dry-run` : refus explicite, sortie 1, renvoi à #42 ; `scripts/h2-report/cli.ts`, point d'entrée mince qui pose `process.exitCode`. Contraintes : aucun appel réseau dans la suite, aucune exécution réelle, aucune valeur de clé nulle part, les tests ne figent pas le vrai `data/rates.json`, `docs/demo/` intact, PR sous 400 lignes hors `docs/` et `*.md`, sans dérogation.

Décisions du pilote (font foi) :

- P-1 · L'annonce cite la date d'effet et la source de chaque tarif.
- P-2 · `docs/demo` est refusé quelle que soit la casse.
- P-3 · Refus si un fichier cible existe déjà. Les noms visés sont `summary.csv`, `runs.csv`, `summary.truncated.csv`, `runs.truncated.csv` et `TRUNCATED.txt`, parce que C2b (#42) écrira en `'wx'` (création exclusive) : le refus au démarrage évite de dépenser puis d'échouer à l'écriture.
- P-4 · `budget.maxIterations` vaut 10 et est posé explicitement ; le nombre maximal d'appels annoncé en découle.
- P-5 · Dans C2a, rien ne peut dépenser : aucune fabrique de fournisseur n'est appelée, sur aucun chemin.
- P-6 · La marque « tronqué » (option b du pilote : `summary.truncated.csv`, `runs.truncated.csv` et `TRUNCATED.txt`) relève de #42 ; C2a n'en retient que les noms de fichiers, pour la protection de P-3.

## État constaté dans le code (lecture du 2026-09-30, `main` 528db1d)

- `scripts/h2-report/rates.ts:47-57` : `readEntry(id, entry)` valide `rate`, `effectiveFrom` et `source`, puis rend seulement le tarif (`Rate | null`) ; `:63-72` : `loadRateFile(text)` construit la `RateTable` par `Object.fromEntries`. `effectiveFrom` et `source` sont écartés, alors que l'annonce doit les citer (hypothèse restante de #20, docs/specs/2026-09-30-h2-report-guards-design.md:289).
- `scripts/h2-report/report-args.ts:6-9` : `ReportArgs = { capUsd, runs, ollamaModel, geminiModel, out, dryRun }` ; `:34` : `parseReportArgs(argv, today = new Date())` ; `--dry-run` y est reconnu sans effet (« --dry-run acts in #33 », l.32).
- `scripts/h2-report/start-guard.ts:16-43` : `assertReadyToStart(args, rates, env)` lève un seul `Error` préfixé `refusing to start before any network call:`, qui liste les défauts de tarif et l'absence de `GEMINI_API_KEY`, sans jamais écrire sa valeur.
- `scripts/h2-report/cap-guard.ts` : `capGuard`, non utilisé par C2a (il est branché par #42).
- `src/llm/providers/index.ts:31-47` : `PROVIDERS.ollama()` et `PROVIDERS.gemini()` lisent `process.env.OLLAMA_MODEL` et `process.env.GEMINI_MODEL`, qui changeraient en silence le modèle annoncé. `DEFAULT_OLLAMA_MODEL` (`qwen2.5:0.5b`) et `DEFAULT_GEMINI_MODEL` (`gemini-2.5-flash`) sont servis par `.`.
- `src/llm/providers/ollama/ollama-llm-provider.ts:48-56` : le constructeur lit `process.env.OLLAMA_HOST` quand aucun `baseURL` n'est donné, et n'appelle pas le réseau. `src/llm/providers/gemini/gemini-llm-provider.ts:59-66` : le constructeur ne lit aucun environnement et n'appelle pas le réseau ; la clé est lue à chaque `complete()` (l.81). `id` vaut `"ollama"` et `"gemini"`.
- `src/agent/application/use-cases/step.ts:17` : `DEFAULT_MAX_ITERATIONS = 10`. Aux l.155-158, le run atterrit dès que `iterations >= maxIterations` ; aux l.204-228, l'atterrissage fait un appel de plus. Un run fait donc au plus `maxIterations + 1` appels au modèle (11 pour 10). La détection de répétition ne peut qu'avancer l'atterrissage.
- `tests/agent/testing/matrix-demo.test.ts:35-41` : le scénario H1 « aller aux reglages » et l'agent `navigateur`. #42 les recopiera ; C2a n'en cite que le nom.
- `package.json:36` : `test` = `npm run build && node --test`, qui découvre `scripts/h2-report/*.test.ts`. `tsconfig.json:14` couvre `scripts` avec `allowImportingTsExtensions`. Node local v22.19.0, retrait de types sans drapeau (#20).
- `scripts/` ne contient ni `run-report.ts`, ni `cli.ts`, ni les noms `runReport`, `defaultProviders`, `loadRateEntries`, `REPORT_FILES`.

## Périmètre

Dans la PR :

- `scripts/h2-report/rates.ts` et `rates.test.ts` (SPEC-1, TEST-1).
- `scripts/h2-report/run-report.ts` et `scripts/h2-report/run-report.test.ts` (SPEC-2 à SPEC-6, TEST-2 à TEST-6).
- `scripts/h2-report/cli.ts` et `scripts/h2-report/cli.test.ts` (SPEC-7, TEST-7).

Hors périmètre, livré par **#42** (C2b) : `runMatrix`, le scénario et l'agent H1 recopiés, `capGuard` branché, l'appel de la fabrique `providers`, l'écriture des CSV et le remplacement des chemins de la machine (`<repo>`, `<home>`), le contrôle de la valeur de `GEMINI_API_KEY` dans les textes écrits, la troncature et sa marque (option b du pilote), `docs/rapport-h2.md`, le lien depuis le README, la ligne `docs/reports/** -text` de `.gitattributes`.

Hors périmètre tout court : `src/`, `package.json`, `tsconfig*.json`, `data/rates.json`, `docs/demo/`, les barrels, `report-args.ts`, `start-guard.ts`, `cap-guard.ts`.

## Conception

Les règles communes de #20 s'appliquent (docs/specs/2026-09-30-h2-report-guards-design.md, « Conception ») : TypeScript effaçable seulement, `import type` pour les types, code du paquet importé de `../../dist/index.js`, modules voisins importés en `./<nom>.ts`, aucun `console.`, aucun `.env`, aucun `index.ts` sous `scripts/`, aucun barrel. Seule exception déclarée : `cli.ts` (SPEC-7) lit `process.argv`, `process.env`, `process.stdout` et `process.stderr` et pose `process.exitCode`. C'est son rôle, et aucun autre module ne le fait. Les messages et l'annonce sont en anglais, comme ceux de `start-guard.ts` et `cap-guard.ts`.

### Placement

| Fichier | Contenu |
|---|---|
| `scripts/h2-report/rates.ts` | `RateEntry`, `loadRateEntries` ; `loadRateFile` se construit dessus |
| `scripts/h2-report/run-report.ts` | types `Sink`, `ReportProviders`, `ReportIO` ; constantes `REPORT_FILES` (exportée) et `REPORT_MAX_ITERATIONS` (exportée) ; `defaultProviders`, `runReport` (exportées) ; fonctions non exportées `assertOutFree`, `announcement`, `rateText`, `messageOf` |
| `scripts/h2-report/cli.ts` | point d'entrée, sans export |

### SPEC-1 · `loadRateEntries(text)` (`scripts/h2-report/rates.ts`)

```ts
export type RateEntry = { readonly rate: Rate | null; readonly effectiveFrom: string; readonly source: string };
export function loadRateEntries(text: string): Readonly<Record<string, RateEntry>>;
```

- Mêmes validations, dans le même ordre et avec les mêmes messages que `loadRateFile` aujourd'hui (tableau de SPEC-2 de #20, règle R1 du zéro comprise). `readEntry` rend désormais un `RateEntry` neuf `{ rate, effectiveFrom, source }`, où `rate` est l'objet neuf déjà construit par `readRate`, ou `null`.
- Le résultat est construit par `Object.fromEntries` : une clé `__proto__` du JSON reste une entrée propre.
- `loadRateFile(text)` garde sa signature et son comportement : `Object.fromEntries(Object.entries(loadRateEntries(text)).map(([id, entry]) => [id, entry.rate]))`. Son TSDoc dit qu'il écarte `effectiveFrom` et `source`, que `loadRateEntries` rend.

### SPEC-2 · `defaultProviders(args)` (`scripts/h2-report/run-report.ts`)

```ts
export type ReportProviders = { readonly local: LLMProvider; readonly hosted: LLMProvider };
export function defaultProviders(args: Pick<ReportArgs, "ollamaModel" | "geminiModel">): ReportProviders;
```

- Rend `{ local: new OllamaLLMProvider({ models: [{ id: args.ollamaModel, supportsTools: true }] }), hosted: new GeminiLLMProvider({ models: [{ id: args.geminiModel, supportsTools: true }] }) }`. Jamais `PROVIDERS` ni `resolveProvider` : `OLLAMA_MODEL` et `GEMINI_MODEL` ne changent pas le modèle annoncé. Aucun `baseURL`, `apiKeyVar` ni `fetch` n'est passé : `OLLAMA_HOST` reste honoré (voir Hypothèses, R-2).
- Construire n'appelle pas le réseau. En revanche **`runReport` ne l'appelle pas dans C2a** (P-5) : c'est la fabrique par défaut que #42 utilisera. Le TSDoc de la fonction le dit.

### SPEC-3 · Refus de démarrer (`runReport`)

```ts
export type Sink = { write(text: string): unknown };
export type ReportIO = {
  readonly argv: readonly string[];
  readonly env: Readonly<Record<string, string | undefined>>;
  /** The text of data/rates.json, read by the caller. */
  readonly ratesText: string;
  /** Absolute root of the repository: --out is resolved against it. */
  readonly repo: string;
  /** Absolute home directory of the machine; unused by #33, read by #42 to replace machine paths. */
  readonly home: string;
  readonly stdout: Sink;
  readonly stderr: Sink;
  /** Dates the default --out; defaults to the current date (parseReportArgs). */
  readonly today?: Date;
  /** Builds the providers; never called by #33, whatever the path (P-5). #42 defaults it to defaultProviders. */
  readonly providers?: (args: ReportArgs) => ReportProviders;
};
export async function runReport(io: ReportIO): Promise<number>;
```

`runReport` rend le code de sortie ; il ne lève jamais. Contrôles dans cet ordre, dans un seul `try`. Le premier qui lève arrête tout : `io.stderr.write(messageOf(error) + "\n")`, rien n'est écrit sur `io.stdout`, `runReport` rend `1`, aucune fabrique n'est appelée.

1. `const args = parseReportArgs(io.argv, io.today)` : ses erreurs sont reprises telles quelles, celles de `parseArgs` comprises.
2. Si `args.ollamaModel === args.geminiModel` : `Error("--ollama-model and --gemini-model must differ, got '<id>' for both")`. Sans ce refus, #42 aiguillerait les deux valeurs de l'axe `model` vers le même fournisseur.
3. `const entries = loadRateEntries(io.ratesText)` et `const rates = loadRateFile(io.ratesText)` : ils lèvent le même message au même défaut, et le premier appel lève le premier.
4. `assertReadyToStart(args, rates, io.env)`.
5. `assertOutFree(args.out, io.repo)` : voir SPEC-4.

`messageOf(error)` rend `error.message` pour une instance d'`Error`, et `String(error)` sinon. La valeur de `GEMINI_API_KEY` n'entre dans aucun message : aucun des contrôles ne la lit, sauf `assertReadyToStart`, qui ne l'écrit jamais.

### SPEC-4 · Protection de `--out` (`assertOutFree(out, repo)`, non exportée)

```ts
export const REPORT_FILES = ["summary.csv", "runs.csv", "summary.truncated.csv", "runs.truncated.csv", "TRUNCATED.txt"] as const;
```

- `const target = resolve(repo, out)` ; `const segments = relative(repo, target).split(/[\\/]/)`. Si `segments[0]?.toLowerCase() === "docs"` et `segments[1]?.toLowerCase() === "demo"`, alors `Error("--out must not be under docs/demo/ (the H1 proof there is compared byte for byte), got '<out>'")`. Sont refusés `docs/demo`, `docs/demo/`, `docs/demo/h1-matrix/`, `Docs/DEMO/x`, `./docs/../docs/demo` et un chemin absolu dans `<repo>/docs/demo`. Ne sont pas refusés `docs/demonstration/` ni `docs/reports/h2-2026-09-30/` (P-2).
- Ensuite, `const taken = REPORT_FILES.filter((name) => existsSync(join(target, name)))`. Si `taken` n'est pas vide : `Error("--out already holds <noms joints par ', ' dans l'ordre de REPORT_FILES>; choose another --out or move them away")`. Les cinq noms sont ceux que #42 écrira, en `'wx'`, pour un rapport complet (`summary.csv`, `runs.csv`) ou tronqué (`summary.truncated.csv`, `runs.truncated.csv`, `TRUNCATED.txt`, option b du pilote) (P-3). Un dossier `--out` absent n'est pas une erreur : C2a ne le crée pas.
- Le contrôle ne fait que lire le système de fichiers (`existsSync`) ; il n'écrit rien et ne crée aucun dossier.

### SPEC-5 · Annonce exacte (`announcement(args, entries)`, non exportée)

`export const REPORT_MAX_ITERATIONS = 10;` (P-4 : #42 le pose dans `budget: { maxIterations: REPORT_MAX_ITERATIONS }`). Appels au plus par run : `REPORT_MAX_ITERATIONS + 1` (l'atterrissage, `step.ts:204-228`).

Après les contrôles de SPEC-3 et SPEC-4, et avant toute construction de fournisseur, `runReport` écrit sur `io.stdout`, en une seule écriture, le texte suivant. Chaque ligne se termine par `\n`, les nombres sont écrits par `String(n)` et `<perRun>` vaut `REPORT_MAX_ITERATIONS + 1` :

```
H2 report: announcement, before any network call
scenario: aller aux reglages
runs per model (N): <runs>
local model: <ollamaModel>; <rateText(local)>; effective <effectiveFrom>; source <source>
hosted model: <geminiModel>; <rateText(hosted)>; effective <effectiveFrom>; source <source>
max calls: <2 × runs × perRun>, of which <runs × perRun> hosted (at most <perRun> per run: maxIterations <REPORT_MAX_ITERATIONS> plus the landing call)
cap: <capUsd> USD on the hosted model
out: <out>
```

- `rateText(entry)` rend `rate null` si `entry.rate === null`, sinon `rate <usdPerMillionTokensIn> USD in, <usdPerMillionTokensOut> USD out per million tokens`.
- `local` et `hosted` sont `entries[args.ollamaModel]` et `entries[args.geminiModel]`. Leur présence en clé propre est garantie par `assertReadyToStart`, qui passe avant.
- `<out>` est `args.out` tel que donné (défaut `docs/reports/h2-<AAAA-MM-JJ>/`).
- Exemple, pour `--cap-usd 2.5 --runs 3` et les modèles de test `local-x` (`{ 0, 0 }`, `2026-09-30`, `local`) et `hosted-x` (`{ 0.3, 2.5 }`, `2026-10-01`, `https://example.test/pricing`) : `max calls: 66, of which 33 hosted (at most 11 per run: maxIterations 10 plus the landing call)`.
- L'annonce ne contient ni clé ni variable d'environnement.

### SPEC-6 · `--dry-run` et refus du lancement réel

Après l'annonce :

- Avec `args.dryRun === true`, `runReport` écrit sur `io.stdout` `dry run: no provider built, no call made\n` et rend `0`.
- Sinon, il écrit sur `io.stderr` `refusing the real run: it is delivered by #42 (capped matrix, safe CSV writing); nothing was called, rerun with --dry-run\n` et rend `1`.

Sur les deux chemins, `io.providers` n'est pas appelé (P-5) et `globalThis.fetch` n'est pas appelé. Le texte de l'annonce est identique sur les deux chemins, au caractère près.

### SPEC-7 · `scripts/h2-report/cli.ts`

Contenu, dans cet ordre (retouche de forme laissée au builder) :

```ts
// Entry point of the H2 report (#33): the only module of scripts/h2-report/ that reads process.*.
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runReport } from "./run-report.ts";

process.exitCode = await runReport({
  argv: process.argv.slice(2),
  env: process.env,
  ratesText: readFileSync(new URL("../../data/rates.json", import.meta.url), "utf8"),
  repo: dirname(dirname(dirname(fileURLToPath(import.meta.url)))),
  home: homedir(),
  stdout: process.stdout,
  stderr: process.stderr,
});
```

- La racine du dépôt vient de l'emplacement du fichier, jamais de `process.cwd()` : `--out` se résout pareil quel que soit le dossier courant.
- Aucun `providers` n'est passé. Le fichier n'est importé par aucun module ni aucun test, qui l'exécutent en processus enfant : sinon, l'importer le lancerait.
- Commande (documentée par #42) : `npm run build`, puis `node scripts/h2-report/cli.ts --cap-usd <USD> --dry-run`.

## Chemins nominal et d'erreur

| Situation | stdout | stderr | Code | Fabrique appelée |
|---|---|---|---|---|
| argument invalide, tarifs illisibles, démarrage refusé, modèles identiques (SPEC-3) | rien | le message | 1 | non |
| `--out` sous `docs/demo` ou fichier cible présent (SPEC-4) | rien | le message | 1 | non |
| tout va bien, `--dry-run` (SPEC-5, SPEC-6) | annonce + `dry run: …` | rien | 0 | non |
| tout va bien, sans `--dry-run` (SPEC-5, SPEC-6) | annonce | refus du lancement réel | 1 | non |

## Symétrie

- Écriture face à lecture : `effectiveFrom` et `source`, validés par `loadRateEntries` (SPEC-1), sont lus par l'annonce (SPEC-5). `REPORT_FILES` et `REPORT_MAX_ITERATIONS` sont posés ici et relus par #42 (écriture en `'wx'`, `budget`). `ReportIO.providers` et `ReportIO.home` sont déclarés ici et lus par #42 : C2a ne les appelle ni ne les lit, ce que TEST-3, TEST-4 et TEST-6 verrouillent pour `providers`.
- Nominal face à erreur : annonce avec `--dry-run` (0) face au lancement réel refusé (1), et face aux refus de démarrage (1) ; dossier `--out` libre face à `docs/demo` et face à un fichier présent.
- Énumération `REPORT_FILES` : une seule couche applicative ici, sans base, sans API ni libellé. #42 doit écrire exactement ces noms.

## Données touchées

Aucune base. Aucun fichier du dépôt n'est écrit par le code. Les tests créent des dossiers temporaires (`mkdtempSync(join(tmpdir(), "h2-report-"))`) qui servent de `repo`, y déposent des fichiers vides pour TEST-4, et les suppriment (`rmSync(…, { recursive: true, force: true })`). Tarifs des tests : un texte littéral, jamais `data/rates.json`. Clé : la sentinelle `sentinel-value-not-a-key`, dans un objet `env` littéral ; aucune variable d'environnement n'est posée.

## Décisions et alternatives écartées

- **D1 · `loadRateEntries` plus `loadRateFile`**, plutôt que d'étendre `RateTable` (le type du paquet ne porte ni date ni source, `src/` est hors périmètre) ou que de relire le JSON dans le runner (validation dupliquée).
- **D2 · Les contrôles de `--out` passent avant l'annonce.** Une annonce imprimée puis un refus laisseraient croire que tout était prêt.
- **D3 · L'annonce est imprimée aussi sans `--dry-run`, avant le refus.** Le texte est alors identique sur les deux chemins, comme il le sera dans #42 avant le lancement, et TEST-6 le compare au caractère près.
- **D4 · `--dry-run` passe par `assertReadyToStart`, qui exige `GEMINI_API_KEY`** : la répétition est complète, dans l'ordre des gestes d'Arthur (clé exposée, puis dry-run). Écarté : un dry-run sans clé, qui annoncerait un départ que le vrai lancement refuserait.
- **D5 · Refus des modèles identiques** : sans lui, les deux valeurs de l'axe se confondraient dans l'aiguillage de #42.
- **D6 · Messages en anglais**, comme `start-guard.ts` et `cap-guard.ts`, dont les messages passent par le même stderr.
- **D7 · `runReport` rend un code et ne lève pas**, et `cli.ts` pose `process.exitCode` plutôt que d'appeler `process.exit`, pour que les flux se vident.
- **D8 · Fichier `cli.ts` séparé**, plutôt qu'un bloc d'entrée dans `run-report.ts` : importer `run-report.ts` dans un test ne doit rien lancer, et `import.meta.main` n'est pas garanti par le Node 22 de la CI.
- **D9 · `--out` résolu contre `repo`, pas contre le dossier courant**, qui peut varier.

## Ordre des commits et preuve de rouge

Un SPEC = un commit = un test, dans l'ordre SPEC-1 à SPEC-7. La spécification et la checklist entrent dans le commit de SPEC-1 (précédent P1 de #20, #35, #39). Les preuves de rouge passent par `npm run test`, avec des chemins relatifs au dépôt dans toute preuve ; la sortie doit montrer les titres `TEST-N (issue 33)`.

État intermédiaire : des commits de SPEC-3 à celui de SPEC-5, quand tous les contrôles passent, `runReport` rend `1` sans rien écrire de plus que ce que les SPEC déjà livrés prévoient. Le chemin qui rend `0` n'existe qu'à partir de SPEC-6. Aucun commit n'appelle la fabrique `providers`.

- TEST-1 avant SPEC-1 : `loadRateEntries` n'est pas exporté (`SyntaxError` à l'import).
- TEST-2 avant SPEC-2 : `scripts/h2-report/run-report.ts` est introuvable.
- TEST-3 avant SPEC-3 : `runReport` n'existe pas.
- TEST-4 avant SPEC-4 : `--out docs/demo/h1-matrix/` n'est pas refusé (le stderr ne contient pas `--out must not be under docs/demo/`).
- TEST-5 avant SPEC-5 : stdout vide.
- TEST-6 avant SPEC-6 : aucune ligne `dry run: …` et un code différent de 0.
- TEST-7 avant SPEC-7 : `scripts/h2-report/cli.ts` est introuvable ; le processus enfant sort en 1 avec `ERR_MODULE_NOT_FOUND` au lieu de `--cap-usd is required`.

Gabarit (aucun `Co-Authored-By`) :

```
<type>(<scope>): <sujet>

Refs: #33
Session: <id>
Model: <modèle>
Authorship: ai
```

| SPEC | Sujet (impératif, 72 caractères au plus type compris) |
|---|---|
| 1 | `feat(scripts): lire la date d'effet et la source avec loadRateEntries` (69) |
| 2 | `feat(scripts): fixer les modèles H2 sans passer par PROVIDERS` (61) |
| 3 | `feat(scripts): refuser de démarrer le rapport H2 sur un défaut` (62) |
| 4 | `feat(scripts): refuser un --out sous docs/demo ou déjà occupé` (61) |
| 5 | `feat(scripts): annoncer le rapport H2 avant tout appel réseau` (61) |
| 6 | `feat(scripts): répéter à blanc par --dry-run et refuser le lancement` (68) |
| 7 | `feat(scripts): ajouter le point d'entrée cli.ts du rapport H2` (61) |

### Message de squash proposé

```
feat(scripts): annoncer le rapport H2 et le répéter à blanc

Ajoute scripts/h2-report/run-report.ts et cli.ts : le runner du
rapport H2 jusqu'à son annonce. Rien ne peut dépenser : aucun
fournisseur n'est construit, aucun appel réseau, quel que soit le
chemin.

- loadRateEntries rend le tarif, la date d'effet et la source de
  chaque modèle ; loadRateFile se construit dessus.
- defaultProviders construit Ollama et Gemini avec les modèles de
  --ollama-model et --gemini-model, jamais PROVIDERS.
- runReport refuse de démarrer (sortie 1) sur un argument, un tarif,
  une clé absente, deux modèles identiques, un --out sous docs/demo
  (toute casse) ou déjà occupé par un fichier que #42 écrira.
- L'annonce cite scénario, N, modèles, tarifs avec date d'effet et
  source, appels au plus (maxIterations 10 plus l'atterrissage),
  plafond et --out.
- --dry-run sort en 0 ; sans lui, le lancement réel est refusé
  (sortie 1) jusqu'à #42.

Refs: #33
Session: <id>
Model: <modèle>
Authorship: ai
```

Sujet : 59 caractères sans le suffixe, 65 avec ` (#NN)`.

## Tests

Déterministes, sans réseau, sans horloge, sans fournisseur réel appelé. Aucune variable d'environnement n'est posée ; `env` est un objet littéral. Titres en anglais, comme les voisins, préfixés `TEST-N (issue 33)`. Dans `run-report.test.ts`, les fixtures sont les suivantes :

- `RATES_TEXT`, qui déclare `local-x` avec `{ 0, 0 }`, `2026-09-30` et `local`, puis `hosted-x` avec `{ 0.3, 2.5 }`, `2026-10-01` et `https://example.test/pricing` ;
- `KEY = "sentinel-value-not-a-key"` et `ENV = { GEMINI_API_KEY: KEY }` ;
- `MODELS = ["--ollama-model", "local-x", "--gemini-model", "hosted-x"]` ;
- l'aide `report(argv, overrides?)`, qui crée un `repo` temporaire, capture `stdout` et `stderr`, passe une fabrique `providers` qui compte ses appels, et rend `{ code, stdout, stderr, factoryCalls }`, puis supprime le dossier.

- **TEST-1** (exerce SPEC-1, `scripts/h2-report/rates.test.ts`) : `loadRateEntries` du texte à deux entrées rend `{ id: { rate, effectiveFrom, source } }` au `deepEqual`. `loadRateFile` du même texte rend toujours la table sans `effectiveFrom` ni `source`. Sur une entrée sans `source`, les deux fonctions lèvent le même message `rates['<id>']: missing field 'source'`. Une clé `__proto__` reste une entrée propre de `loadRateEntries`.
- **TEST-2** (exerce SPEC-2) : `defaultProviders({ ollamaModel: "local-x", geminiModel: "hosted-x" })` rend `local` instance d'`OllamaLLMProvider`, d'`id` `"ollama"` et de `models()` `[{ id: "local-x", supportsTools: true }]`, et `hosted` instance de `GeminiLLMProvider`, d'`id` `"gemini"` et de `models()` `[{ id: "hosted-x", supportsTools: true }]`. Des modèles qui ne sont pas les défauts montrent que ni `OLLAMA_MODEL` ni `GEMINI_MODEL` n'interviennent.
- **TEST-3** (exerce SPEC-3), une ligne par cas. Chaque ligne attend le code 1, un stdout `""`, un stderr égal au message attendu suivi de `\n` (ou qui commence par le préfixe donné), et `factoryCalls` 0 :
  - `[]` → `--cap-usd is required` ;
  - `["--cap-usd", "1", "--ollama-model", "hosted-x", "--gemini-model", "hosted-x"]` → `--ollama-model and --gemini-model must differ, got 'hosted-x' for both` ;
  - `ratesText` `"not json"` → préfixe `rates: not valid JSON:` ;
  - `hosted-x` à `rate: null` → préfixe `refusing to start before any network call:`, avec `'hosted-x'.rate is null` dans le message ;
  - `env` `{}` → message qui contient `environment variable GEMINI_API_KEY is unset or empty`.

  Le stderr d'aucune ligne ne contient `KEY`.
- **TEST-4** (exerce SPEC-4) :
  - `--out` vaut `docs/demo`, `docs/demo/h1-matrix/`, `Docs/DEMO/x`, puis `./docs/../docs/demo`, puis le chemin absolu `join(repo, "docs", "demo")` : chaque fois code 1, stderr égal à `--out must not be under docs/demo/ (the H1 proof there is compared byte for byte), got '<out>'\n`, `factoryCalls` 0 ;
  - pour chacun des cinq noms de `REPORT_FILES` déposé seul (fichier vide) dans `--out` : code 1 et stderr `--out already holds <nom>; choose another --out or move them away\n` ;
  - `summary.csv` et `TRUNCATED.txt` déposés ensemble → `--out already holds summary.csv, TRUNCATED.txt; choose another --out or move them away\n` ;
  - `--out docs/demonstration/`, puis `--out` absent, chacun avec `--dry-run` : le stderr ne contient pas `--out` et `factoryCalls` vaut 0. L'assertion ne porte pas sur le code, pour rester vraie avant SPEC-6.
- **TEST-5** (exerce SPEC-5) : `["--cap-usd", "2.5", "--runs", "3", ...MODELS, "--out", "docs/reports/h2-test/", "--dry-run"]` donne un stdout qui commence par le texte exact de SPEC-5, où `local model: local-x; rate 0 USD in, 0 USD out per million tokens; effective 2026-09-30; source local`, `hosted model: hosted-x; rate 0.3 USD in, 2.5 USD out per million tokens; effective 2026-10-01; source https://example.test/pricing`, `max calls: 66, of which 33 hosted (at most 11 per run: maxIterations 10 plus the landing call)`, `cap: 2.5 USD on the hosted model` et `out: docs/reports/h2-test/`. Avec un `local-x` à `rate: null`, la ligne locale porte `rate null`. `REPORT_MAX_ITERATIONS` vaut 10.
- **TEST-6** (exerce SPEC-6), `globalThis.fetch` remplacé le temps du test par un compteur, puis restauré dans un `finally` :
  - avec `--dry-run` : code 0, stdout égal à l'annonce suivie de `dry run: no provider built, no call made\n`, stderr `""` ;
  - sans `--dry-run` : code 1, stdout égal à l'annonce seule, au caractère près, stderr égal au message de refus de SPEC-6 ;
  - sur les deux : `factoryCalls` 0, le compteur de `fetch` à 0, et `KEY` absente de stdout et de stderr.
- **TEST-7** (exerce SPEC-7, `scripts/h2-report/cli.test.ts`) : `spawnSync(process.execPath, ["scripts/h2-report/cli.ts"], { cwd: <racine du dépôt tirée de import.meta.url>, encoding: "utf8" })` rend `status` 1, un stderr qui contient `--cap-usd is required` et un stdout `""`. L'analyse des arguments échoue avant tout tarif et toute clé, donc le contenu réel de `data/rates.json` et l'environnement hérité n'entrent pas dans le résultat. Le stderr est comparé par `includes`, parce que Node peut y ajouter un avertissement sur le retrait de types.

## Estimation de taille

Lignes ajoutées ou modifiées, hors `docs/` et `*.md` :

| Fichier | Estimation |
|---|---|
| `scripts/h2-report/rates.ts` (`RateEntry`, `loadRateEntries`, `readEntry` et `loadRateFile` retouchés) | 14 |
| `scripts/h2-report/rates.test.ts` (TEST-1) | 20 |
| `scripts/h2-report/run-report.ts` (en-tête 3, imports 10, types 20, constantes 6, `defaultProviders` 8, `assertOutFree` 14, `announcement` et `rateText` 18, `runReport` et `messageOf` 24, TSDoc 12) | 115 |
| `scripts/h2-report/run-report.test.ts` (imports et fixtures 22, aide `report` 22, TEST-2 10, TEST-3 20, TEST-4 25, TEST-5 20, TEST-6 25) | 145 |
| `scripts/h2-report/cli.ts` | 17 |
| `scripts/h2-report/cli.test.ts` (TEST-7) | 16 |
| **Total** | **environ 325** (fourchette 270 à 390) |

Sous le plafond de 400, sans dérogation, mais au-dessus des 230 annoncés par l'issue. L'écart vient surtout des tests en tables (TEST-3, TEST-4) et de l'aide `report` à dossier temporaire. Les estimations précédentes ont été dépassées à la mesure (#35 : 278 estimées, 356 mesurées) ; si le builder approche 400, le premier levier est de réduire TEST-4 à trois noms de `REPORT_FILES` au lieu de cinq. La mesure (`pr_size.py`) fait foi à la PR.

## Hypothèses restantes

- **R-1 · Retour à la ligne dans `source`.** Une `source` qui contient `\n` casserait la forme d'une ligne par modèle de l'annonce ; `loadRateFile` l'accepte, comme toute chaîne non vide. Ce n'est pas traité : la source est saisie par Arthur (URL de la page de prix).
- **R-2 · `OLLAMA_HOST` est honoré par `defaultProviders`** (hôte, pas modèle), et il n'est pas annoncé. La consigne ne vise que les variables qui changent le modèle ; #42 pourra l'annoncer si le pilote le veut.
- **R-3 · Casse de `repo`.** La comparaison `docs/demo` se fait sur les segments de `relative(repo, target)`. Sous Windows, `path.relative` compare les racines sans tenir compte de la casse ; ailleurs, un `repo` écrit avec une autre casse que le chemin réel rendrait un chemin relatif en `..`, donc non refusé. `cli.ts` tire `repo` de `import.meta.url`, qui a la casse réelle.
- **Node** ≥ 22.18 (retrait de types sans drapeau, `await` de premier niveau dans `cli.ts`) : constaté v22.19.0 par #20.
