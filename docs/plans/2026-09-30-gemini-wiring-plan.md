# Plan · Brancher Gemini dans PROVIDERS et les exports, préparer l'intégration et documenter · #26

- Issue : #26 (T:feature) https://github.com/arthurolivierfortin/agent-core/issues/26, lot B3 du
  découpage de #19 (#19 B1 livré en 7bdf33f, #25 B2 livré en 7533edf ; #20 et #27 suivent).
- Checklist : `docs/specs/2026-09-30-gemini-wiring-checklist.md`
- Spécification : `docs/specs/2026-09-30-gemini-wiring-design.md`
- Estimation : `docs/plans/2026-09-30-gemini-wiring-estimate.json`
- Plan précédent pris pour forme : `docs/plans/2026-09-30-gemini-errors-plan.md` (#25).
- Conception appliquée : placement inchangé. Les exports passent par `src/llm/providers/index.ts`
  seulement, que `src/llm/index.ts:4` (`export * from "./providers/index.js";`) et `src/index.ts:7`
  (`export * from "./llm/index.js";`) réexportent déjà (D1) ; exports nommés, jamais `export *`
  depuis `gemini/` (D2) ; aucun nouvel ADR. Fiche KB relue :
  `C:/Projects/dev-kit/kb/projects/nathan-agent-package.md` (30 lignes ; aucune mention de Gemini,
  de TAP, de `NODE_TEST_CONTEXT` ni de sous-processus, aucune règle contraire).
- Branche : `feat/26-gemini-wiring`, base `main` (`publication_branch` du manifeste). Elle existe
  déjà : branche du worktree `C:/Projects/Perso/agent-core/.claude/worktrees/feat+26-gemini-wiring`,
  au niveau de `origin/main` (constaté : `git rev-parse HEAD origin/main` rend deux fois
  `7533edf46415e43512d9970ca80fa4a11af8ceca`).
- Toutes les commandes se lancent depuis la racine de ce worktree, chacune par son propre appel
  Bash, en avant-plan, `timeout` 600000 ms pour une installation, un build, un test ou un gate,
  120000 ms sinon. Jamais `&&` entre deux étapes du plan, jamais `&` final, jamais
  `run_in_background`, aucun serveur.
- Fichiers de travail, dans `<dossier_tmp>` (dossier temporaire de la session du builder, chemin
  absolu `C:/…` reçu dans le prompt de dispatch, sinon créé une fois par `mktemp -d` puis converti
  par `cygpath -m <chemin>`, chaque commande par son propre appel) :
  `<dossier_tmp>/agent-core-issue26-commit-msg.txt` (message de commit, réécrit à chaque tâche,
  relu par l'outil Read avant réécriture) et `<dossier_tmp>/agent-core-issue26-pr-body.md` (corps
  de PR). Jamais `%TEMP%` ni `/tmp` directement, jamais un nom sans dépôt.
- **Règle de la boucle (A2 de la spécification)** : le test d'intégration n'est **jamais** lancé
  avec `GEMINI_INTEGRATION=1`, ni par le builder, ni par le juge. Aucune commande de ce plan ne
  pose `GEMINI_INTEGRATION`. Avant la première commande de test (tâche 0) et avant GATE-3
  (tâche 8), le garde
  `node -e "process.exit(process.env.GEMINI_INTEGRATION === undefined ? 0 : 1)"` doit sortir en
  code 0 sans rien afficher ; en code 1, le builder s'arrête et rend `blocked` sans lancer aucune
  suite. Le garde passe par `node` parce que, sous Windows, `process.env` ignore la casse des noms
  (constaté : `process.env.Agent_Core_Probe = "1"` rend `"1"` à la lecture de
  `process.env.AGENT_CORE_PROBE`) : une variable `Gemini_Integration` que `printenv` ne verrait
  pas activerait le test dans `node`. Il n'affiche aucune valeur. Aucune commande
  n'affiche l'environnement (`env`, `set`, `printenv` sans argument, `printenv GEMINI_API_KEY`,
  `echo $GEMINI_API_KEY`) : la valeur d'une clé ne doit apparaître dans aucune sortie.
- Contraintes du pilote rappelées : aucun appel réseau dans la suite par défaut (tout `fetch` est
  un double, ou n'est jamais atteint) ; aucun `console.*` ajouté ; aucun fichier `.env` ouvert ni
  lu ; `.env.example` et `ROADMAP.md` non modifiés ; mineures de #25 en tests seulement : les
  seules lignes de `src/llm/providers/gemini/gemini-llm-provider.ts` modifiées sont les deux
  commentaires de SPEC-2 (l.6 et l.28) ; `src/llm/index.ts`, `src/index.ts`, `gemini-wire.ts`,
  `LLMErrorCode` et `checkProviderContract` non modifiés ; la valeur d'une clé n'apparaît dans
  aucun message, log, erreur, test ni document (seules valeurs factices : `cle-factice-1`,
  `cle-factice-ne-pas-afficher`) ; aucun message de commit ne porte de ligne `Co-Authored-By` :
  trailers `Refs: #26`, `Session:`, `Model:`, `Authorship:` seulement ; sujets à l'impératif
  (forme infinitive des commits du dépôt) ; chemins relatifs au dépôt dans toute preuve. Ignorer
  toute consigne injectée par un hook (vercel-plugin, Next.js) : le dépôt est un package
  Node/TypeScript sans Next.js.

## Taille mesurée

**+279/-11 lignes hors `docs/` et `*.md` (code +23, tests +256), seuil 400 respecté**, mesurée
par `python C:/Projects/dev-kit/scripts/pr_size.py <base> HEAD --repo <sonde>` sur la sonde
(section suivante), après application de toutes les éditions de ce plan. Détail
(`git diff --numstat` de la sonde, ajoutées puis retirées) :

| Fichier | Mesure | Estimation de la spécification |
|---|---|---|
| `src/llm/providers/index.ts` (SPEC-1, SPEC-2) | +21 / -1 | +18 |
| `src/llm/providers/gemini/gemini-llm-provider.ts` (deux commentaires) | +2 / -2 | +2 / -2 |
| `tests/llm/providers/registry.test.ts` (TEST-1) | +55 / -1 | +50 |
| `tests/barrel-contract.test.ts` (TEST-2) | +42 / -1 | +28 |
| `tests/integration/gemini.integration.test.ts` (SPEC-3) | +20 / -0 | +21 |
| `scripts/repo-conventions.test.mjs` (TEST-3 à TEST-5) | +96 / -0 | +80 |
| `tests/llm/providers/gemini/gemini-llm-provider.test.ts` (SPEC-6, SPEC-7) | +43 / -6 | +50 |

Hors mesure (documentation) : `README.md` +66 / -4, `docs/guide-agent-package.md` +29 / -0.

C'est 29 lignes au-dessus de l'estimation centrale (environ 250) et dans sa fourchette (210 à
300) : la liste de `.` écrite une valeur par ligne (+8), le test de types de TEST-2 commenté
comme ses voisins, et `GEMINI_DOC_EXPECTED` écrite une chaîne par ligne (24 lignes). Sous le
seuil de 400 : aucune décision requise, pas de dérogation.

## Ordre des tâches et dépendances

Ordre des commits voulu par la spécification : SPEC-1 à SPEC-7, un SPEC = un commit = un test.

| Tâche | Élément | Dépend de | Pourquoi cet ordre |
|---|---|---|---|
| 0 | préparation (environnement, dépendances, référence de la suite) | aucune | le worktree n'a ni `node_modules/` ni `dist/` (constaté : `ls` ne les liste pas) |
| 1 | SPEC-1 + TEST-1 (registre : `ProviderID`, `DEFAULT_GEMINI_MODEL`, `makeGemini`, `PROVIDERS.gemini`) | 0 | importe `GeminiLLMProvider` dans `providers/index.ts`, que SPEC-2 réexporte |
| 2 | SPEC-2 + TEST-2 (exports de `GeminiLLMProvider` et `GeminiConfig`, deux commentaires) | 1 | TEST-2 lit `root.DEFAULT_GEMINI_MODEL`, exporté par SPEC-1 |
| 3 | SPEC-3 + TEST-3 (test d'intégration derrière `GEMINI_INTEGRATION=1`) | 1 | le fichier appelle `PROVIDERS.gemini()` |
| 4 | SPEC-4 + TEST-4 (README) | 1 à 3 | documente le registre, les exports et la commande d'intégration ; définit `GEMINI_DOC_EXPECTED` |
| 5 | SPEC-5 + TEST-5 (guide) | 4 | TEST-5 réutilise `GEMINI_DOC_EXPECTED` |
| 6 | SPEC-6 + TEST-6 (quatre cas de masquage, tests seulement) | 0 | indépendante ; gardée à sa place dans l'ordre de la spécification |
| 7 | SPEC-7 + TEST-7 (libellé d'un `error.message` vide, test seulement) | 0 | indépendante |
| 8 | gates GATE-1 à GATE-3, contrôles, taille, corps de PR | 1 à 7 | |

Aucun `[DB-N]`.

## Vérifications faites par le planificateur (sorties fraîches du 2026-09-30)

- `node --version` : `v22.19.0` (`node --test` lance les `.ts` par retrait de types, sans
  drapeau). `git config core.autocrlf` : `true` ; les neuf fichiers existants touchés sont en CRLF
  dans la copie de travail (compte d'octets : autant de `\r\n` que de `\n`). Manifeste :
  `publication_branch` `main`, gates `GATE-1 build` `npm run build`, `GATE-2 typecheck`
  `npm run typecheck`, `GATE-3 test` `npm run test` ; une dérogation déclarée (`core/langue` :
  README et guide en anglais).
- `git status --short` au lancement : trois fichiers non suivis
  (`docs/plans/2026-09-30-gemini-wiring-estimate.json`,
  `docs/specs/2026-09-30-gemini-wiring-checklist.md`,
  `docs/specs/2026-09-30-gemini-wiring-design.md`).
- `GEMINI_INTEGRATION` absente de l'environnement du planificateur (`printenv` code 1, garde
  `node -e` code 0) : aucune suite n'a pu appeler l'API.
- Checklist relue : 7 `[SPEC-N]`, 7 `[TEST-N]`, aucun `[DB-N]`, 3 `[GATE-N]` conformes au
  manifeste ; aucune formulation refusée (`dev-kit/schemas/checklist.md`).
- Code lu : `src/llm/providers/index.ts` en entier (50 lignes ; `ProviderID` l.13,
  `DEFAULT_OLLAMA_MODEL` l.16, `makeOllama` l.25-28, `PROVIDERS` l.34-36, `resolveProvider`
  l.44-50) ; `src/llm/index.ts` et `src/index.ts` (réexports `export *`) ;
  `src/llm/providers/gemini/gemini-llm-provider.ts` en entier (190 lignes ; commentaires l.6 et
  l.28 ; `fetch.bind(globalThis)` capturé au constructeur l.61 ; l.97, l.110, l.138, l.140, l.141
  visées par les mutations) ; `src/llm/providers/gemini/gemini-wire.ts:1-70`
  (`GEMINI_DEFAULT_BASE_URL` l.46, `geminiGenerateContentUrl` l.53-55 : `baseURL + "/v1beta/models/"
  + model + ":generateContent"`, sans normalisation) ; `src/llm/testing/provider-contract.ts:100-200` ;
  `tests/llm/providers/registry.test.ts`, `tests/barrel-contract.test.ts`,
  `tests/integration/ollama.integration.test.ts`,
  `tests/llm/providers/gemini/gemini-llm-provider.test.ts` (466 lignes ; `ENDPOINT` l.259,
  `respondingFetch` l.262, `expectFailure` l.286, `rejectingFetch` l.367, `PLANTED_KEY` l.406,
  `REDACTION_CASES` l.408-457, boucle l.459-466) et `scripts/repo-conventions.test.mjs` en entier
  (281 lignes ; `sectionAfterHeading` l.44-51 s'arrête à la première ligne qui commence par
  `## `, donc un `### ` ne coupe pas une section) ; `README.md:95-120` et `:270-380` ;
  `docs/guide-agent-package.md:55-110` et `:225-280` ; `package.json`, `tsconfig.json`. Les
  hypothèses H1 à H4 sont verrouillées dans `tests/llm/providers/gemini/gemini-wire.test.ts`
  (l.29, l.93, l.161, l.210), H5, H7, H8 dans `gemini-llm-provider.test.ts` (l.104, l.340, l.302) ;
  H6 n'a pas de test à son nom : le test H5 fige l'ensemble exact des en-têtes
  (`deepStrictEqual(call.init.headers, { "content-type": …, "x-goog-api-key": … })`, l.118).
- **Sonde** : tout le code de ce plan a été exécuté par le planificateur dans une copie de l'arbre
  `HEAD` (`git archive HEAD`) placée dans le dossier temporaire de sa session, hors du dépôt, avec
  une copie du `node_modules/` du checkout parent (aucune installation lancée), fichiers en CRLF
  comme dans le worktree. Les éditions ont été appliquées **depuis le texte de ce plan** par un
  script qui échoue sur un bloc « remplacer » absent ou présent plus d'une fois, tâche par tâche,
  éditions de test puis éditions de production. Rien n'a été écrit dans le worktree hors de ce
  fichier. Constats :
  - référence sur 7533edf : `npm run test` → `# tests 228`, `# pass 227`, `# fail 0`,
    `# skipped 1` ;
  - chaque rouge et chaque vert des tâches 1 à 7, et les cinq mutations, ont été observés avec
    `npm run build` puis la commande de test de la tâche ; `npm run typecheck` code 0 après chaque
    vert ; les sorties citées plus bas sont celles de la sonde ;
  - sortie du test d'intégration **ignoré**, observée seulement dans un sous-processus à
    l'environnement expurgé (`env -u GEMINI_INTEGRATION -u GEMINI_API_KEY -u NODE_TEST_CONTEXT
    node --test --test-reporter=tap tests/integration/gemini.integration.test.ts`, code 0,
    `# SKIP set GEMINI_INTEGRATION=1 with GEMINI_API_KEY in the environment`, `# fail 0`) : R2 de
    la spécification levée ;
  - même commande avec `NODE_TEST_CONTEXT=child-v8` : stdout vide, avertissement
    `node:test run() is being called recursively within a test file. skipping running files.` :
    le retrait de `NODE_TEST_CONTEXT` est **nécessaire** (R3 de la spécification levée) ;
  - état final : `npm run build` code 0, `npm run typecheck` code 0, `npm run test` →
    `# tests 243`, `# pass 241`, `# fail 0`, `# skipped 2` ;
  - contrôles de la tâche 8 relevés sur la sonde, recopiés dans cette tâche.

---

## Tâche 0 · préparation

1. `git branch --show-current` → sortie attendue : `feat/26-gemini-wiring`.
2. `git log --oneline origin/main..HEAD` → sortie attendue : vide.
3. `git status --short` → sortie attendue, exactement ces quatre lignes non suivies (ce plan en plus
   des trois fichiers constatés au lancement) :
   ```
   ?? docs/plans/2026-09-30-gemini-wiring-estimate.json
   ?? docs/plans/2026-09-30-gemini-wiring-plan.md
   ?? docs/specs/2026-09-30-gemini-wiring-checklist.md
   ?? docs/specs/2026-09-30-gemini-wiring-design.md
   ```
   (Si une version `-plan-v2.md` a été écrite, elle s'ajoute à cette liste.)
4. `node -e "process.exit(process.env.GEMINI_INTEGRATION === undefined ? 0 : 1)"` → sortie
   attendue : vide, code 0. Code 1 : arrêt, verdict `blocked`, aucune suite lancée (règle A2).
5. `npm ci` (timeout 600000) → sortie attendue : le script `prepare` s'exécute
   (`> tsc -p tsconfig.build.json`), puis `added 3 packages` (`@types/node`, `typescript`,
   `undici-types`), code 0. Sortie déduite du `package-lock.json` et des précédents de #19 et #25,
   non relancée par le planificateur (installation interdite à ce rôle).
6. `npm run test` (timeout 600000) → sortie attendue : fin TAP `# tests 228`, `# pass 227`,
   `# fail 0`, `# skipped 1` (le test ignoré est l'intégration Ollama, opt-in). Si `# tests`
   diffère de 228, noter la valeur B et remplacer 243 par B + 15 à la tâche 8.
7. `git status --short` → sortie attendue : les quatre mêmes lignes.

Aucun commit dans cette tâche.

Chaque tâche 1 à 7 suit le même cycle : appliquer les éditions de test, `npm run build`, lancer le
fichier de test de la tâche (rouge, sauf tâches 6 et 7 : vert dès l'écriture, puis preuve par
mutation), appliquer les éditions de production ou de documentation, `npm run build`, relancer
(vert), `npm run typecheck`, cocher les lignes `[SPEC-N]` et `[TEST-N]` de la checklist, commiter.
Le build est obligatoire avant chaque lancement : les tests importent le code compilé depuis
`dist/`, jamais `src/`, et `tests/barrel-contract.test.ts` résout le package par son propre nom
(`@arthurolivierfortin/agent-core`, carte `exports` vers `dist/`).

Éditions : chaque « Édition N.M » se fait par l'outil Edit (`old_string` = premier bloc,
`new_string` = second bloc), dans l'ordre ; chaque « Fichier N.M » par l'outil Write (contenu =
le bloc). Chaque premier bloc est présent **une seule fois** dans le fichier au moment où
l'édition s'applique (vérifié par la sonde). Les blocs sont écrits en LF ; les fichiers existants
sont en CRLF (voir « Risques »).

Commit de chaque tâche : outil Read puis Write sur `<dossier_tmp>/agent-core-issue26-commit-msg.txt`
avec le message donné (outil Write seul à la première écriture, le fichier n'existant pas), `git add`
des fichiers listés, puis `git commit -F <dossier_tmp>/agent-core-issue26-commit-msg.txt`, chaque
commande par son propre appel. Le message n'a aucune ligne `Co-Authored-By` ; `<id>` est
l'identifiant de la session du builder, `<modèle>` son modèle exact.

---

## Tâche 1 · SPEC-1 · `PROVIDERS.gemini` dans le registre

Commande de test de la tâche : `node --test tests/llm/providers/registry.test.ts` (timeout 600000).

### 1.1 Écrire TEST-1

Correspondance avec la checklist : (a) → `PROVIDERS.gemini builds a Gemini provider that does not
stream` ; (b) → `PROVIDERS.gemini declares the environment's model, read at call time` ; (c) →
`PROVIDERS lists ollama then gemini, and resolveProvider resolves gemini` ; (d) →
`PROVIDERS.gemini refuses a missing key before any fetch`. Chaque variable et global touché est
restauré en `finally` (suppression s'il était absent).

Édition 1.1 · `tests/llm/providers/registry.test.ts` · remplacer :

~~~~ts
import { DEFAULT_OLLAMA_MODEL, PROVIDERS, resolveProvider } from "../../../dist/llm/index.js";
~~~~

par :

~~~~ts
import { DEFAULT_GEMINI_MODEL, DEFAULT_OLLAMA_MODEL, PROVIDERS, resolveProvider } from "../../../dist/llm/index.js";
~~~~

Édition 1.2 · `tests/llm/providers/registry.test.ts` · remplacer :

~~~~ts
test("resolveProvider throws UNKNOWN_PROVIDER for a bad id", () => {
  assert.throws(() => resolveProvider("gpt-9000"), (e: unknown) => {
    assert.equal((e as { name: string }).name, "LLMError");
    assert.equal((e as { code: string }).code, "UNKNOWN_PROVIDER");
    return true;
  });
});
~~~~

par :

~~~~ts
test("resolveProvider throws UNKNOWN_PROVIDER for a bad id", () => {
  assert.throws(() => resolveProvider("gpt-9000"), (e: unknown) => {
    assert.equal((e as { name: string }).name, "LLMError");
    assert.equal((e as { code: string }).code, "UNKNOWN_PROVIDER");
    return true;
  });
});

test("PROVIDERS.gemini builds a Gemini provider that does not stream", () => {
  const p = PROVIDERS.gemini();
  assert.equal(p.id, "gemini");
  assert.equal(p.supportsStreaming(), false);
  assert.equal(typeof p.complete, "function");
});

test("PROVIDERS.gemini declares the environment's model, read at call time", () => {
  assert.equal(DEFAULT_GEMINI_MODEL, "gemini-2.5-flash");
  const previous = process.env.GEMINI_MODEL;
  try {
    delete process.env.GEMINI_MODEL;
    assert.deepEqual(PROVIDERS.gemini().models(), [{ id: DEFAULT_GEMINI_MODEL, supportsTools: true }]);

    // Set after the module was imported: the factory must read process.env now, not at load.
    process.env.GEMINI_MODEL = "gemini-2.5-flash-lite";
    assert.deepEqual(PROVIDERS.gemini().models(), [{ id: "gemini-2.5-flash-lite", supportsTools: true }]);
  } finally {
    if (previous === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = previous;
  }
});

test("PROVIDERS lists ollama then gemini, and resolveProvider resolves gemini", () => {
  assert.deepEqual(Object.keys(PROVIDERS), ["ollama", "gemini"]);
  assert.equal(resolveProvider("gemini").id, "gemini");
});

test("PROVIDERS.gemini refuses a missing key before any fetch", async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  let calls = 0;
  try {
    delete process.env.GEMINI_API_KEY;
    // Replaced before the factory runs: the provider binds the global fetch at construction.
    globalThis.fetch = (async () => {
      calls++;
      throw new Error("fetch must not be called");
    }) as unknown as typeof fetch;
    const provider = PROVIDERS.gemini();
    await assert.rejects(provider.complete([{ role: "user", content: "hi" }], { model: provider.models()[0].id }), (e: unknown) => {
      assert.equal((e as { name: string }).name, "LLMError");
      assert.equal((e as { code: string }).code, "MISSING_API_KEY");
      assert.match((e as Error).message, /GEMINI_API_KEY/);
      return true;
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  }
  assert.equal(calls, 0);
});
~~~~

### 1.2 Constater le rouge

1. `npm run build` (timeout 600000) → sortie attendue : `> tsc -p tsconfig.build.json`, code 0.
2. `node --test tests/llm/providers/registry.test.ts` (timeout 600000) → sortie attendue : code 1,
   dont

   ```
   # SyntaxError: The requested module '../../../dist/llm/index.js' does not provide an export named 'DEFAULT_GEMINI_MODEL'
   …
   not ok 1 - tests\\llm\\providers\\registry.test.ts
   …
   # tests 1
   # pass 0
   # fail 1
   ```

   Bonne raison : `DEFAULT_GEMINI_MODEL` n'est pas exporté, le lien ESM du fichier échoue avant
   tout test (les quatre tests d'Ollama ne tournent pas non plus). Voir P2.

### 1.3 Écrire le code de production

Édition 1.3 · `src/llm/providers/index.ts` · remplacer :

~~~~ts
import { OllamaLLMProvider } from "./ollama/ollama-llm-provider.js";
~~~~

par :

~~~~ts
import { OllamaLLMProvider } from "./ollama/ollama-llm-provider.js";
import { GeminiLLMProvider } from "./gemini/gemini-llm-provider.js";
~~~~

Édition 1.4 · `src/llm/providers/index.ts` · remplacer :

~~~~ts
export type ProviderID = "ollama";

/** The model `PROVIDERS.ollama()` declares when the environment names none. */
export const DEFAULT_OLLAMA_MODEL = "qwen2.5:0.5b";
~~~~

par :

~~~~ts
export type ProviderID = "ollama" | "gemini";

/** The model `PROVIDERS.ollama()` declares when the environment names none. */
export const DEFAULT_OLLAMA_MODEL = "qwen2.5:0.5b";

/** The model `PROVIDERS.gemini()` declares when the environment names none. */
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
~~~~

Édition 1.5 · `src/llm/providers/index.ts` · remplacer :

~~~~ts
  return new OllamaLLMProvider({ models: [{ id: model, supportsTools: true }] });
}
~~~~

par :

~~~~ts
  return new OllamaLLMProvider({ models: [{ id: model, supportsTools: true }] });
}

/**
 * Gemini provider factory. A function, not a `new` at module load, so process.env is read
 * at call time: the app loads its .env, the library reads process.env (ADR-AGENT-0002).
 *
 * It declares a single model, the environment-driven shortcut. Offering several is the
 * explicit path: `new GeminiLLMProvider({ models: [...] })` (ADR-AGENT-0017). The API key is
 * not read here: the provider reads it at every complete() call, from GEMINI_API_KEY by default.
 */
function makeGemini(): LLMProvider {
  const model = process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
  return new GeminiLLMProvider({ models: [{ id: model, supportsTools: true }] });
}
~~~~

Édition 1.6 · `src/llm/providers/index.ts` · remplacer :

~~~~ts
  ollama: makeOllama,
};
~~~~

par :

~~~~ts
  ollama: makeOllama,
  gemini: makeGemini,
};
~~~~

`makeGemini` ne passe ni `baseURL`, ni `apiKeyVar`, ni `fetch` ; `isProviderID` et
`resolveProvider` sont inchangés ; `GeminiLLMProvider` est importé sans être réexporté à ce commit
(SPEC-2 le réexporte).

### 1.4 Constater le vert

1. `npm run build` (timeout 600000) → sortie attendue : `> tsc -p tsconfig.build.json`, code 0.
2. `node --test tests/llm/providers/registry.test.ts` (timeout 600000) → sortie attendue : code 0,
   fin TAP

   ```
   ok 5 - PROVIDERS.gemini builds a Gemini provider that does not stream
   ok 6 - PROVIDERS.gemini declares the environment's model, read at call time
   ok 7 - PROVIDERS lists ollama then gemini, and resolveProvider resolves gemini
   ok 8 - PROVIDERS.gemini refuses a missing key before any fetch
   # tests 8
   # pass 8
   # fail 0
   ```

3. `npm run typecheck` (timeout 600000) → sortie attendue : `> tsc --noEmit`, code 0.

### 1.5 Commit

Cocher `[SPEC-1]` et `[TEST-1]` dans `docs/specs/2026-09-30-gemini-wiring-checklist.md`. Les
documents de l'issue entrent dans ce commit (spécification, section « Ordre des commits »).

`git add docs/specs/2026-09-30-gemini-wiring-design.md docs/specs/2026-09-30-gemini-wiring-checklist.md docs/plans/2026-09-30-gemini-wiring-estimate.json docs/plans/2026-09-30-gemini-wiring-plan.md src/llm/providers/index.ts tests/llm/providers/registry.test.ts`
(plus `docs/plans/2026-09-30-gemini-wiring-plan-v2.md` s'il existe).

Message :

```
feat(llm): brancher Gemini dans le registre PROVIDERS

Refs: #26
Session: <id>
Model: <modèle>
Authorship: ai
```

`git commit -F <dossier_tmp>/agent-core-issue26-commit-msg.txt` → sortie attendue :
`6 files changed` (7 avec une v2 du plan).

---

## Tâche 2 · SPEC-2 · exporter `GeminiLLMProvider` et `GeminiConfig` par `./llm` et `.`

Commande de test de la tâche : `node --test tests/barrel-contract.test.ts` (timeout 600000).

### 2.1 Écrire TEST-2

Correspondance avec la checklist : (a) → liste de `` `.` exposes the engine surface `` ; (b) →
`` `./llm` exposes the llm layer standalone … `` ; (c) → nouveau `` `.` and `./llm` serve no Gemini
wire symbol `` ; (d) → nouveau `` `.` and `./llm` expose GeminiLLMProvider and the GeminiConfig it
takes `` (verrou de types sous `npm run typecheck`, aucun appel à `complete()`).

Édition 2.1 · `tests/barrel-contract.test.ts` · remplacer :

~~~~ts
  CompletionOptions,
  LLMProvider,
~~~~

par :

~~~~ts
  CompletionOptions,
  GeminiConfig,
  LLMProvider,
~~~~

Édition 2.2 · `tests/barrel-contract.test.ts` · remplacer :

~~~~ts
import type { FakeAppState, MatrixOptions, MatrixReport, MatrixRun, MatrixTrace } from "@arthurolivierfortin/agent-core/testing";
~~~~

par :

~~~~ts
import type { GeminiConfig as LlmGeminiConfig } from "@arthurolivierfortin/agent-core/llm";
import type { FakeAppState, MatrixOptions, MatrixReport, MatrixRun, MatrixTrace } from "@arthurolivierfortin/agent-core/testing";
~~~~

Édition 2.3 · `tests/barrel-contract.test.ts` · remplacer :

~~~~ts
  for (const name of ["LLMError", "OllamaLLMProvider", "PROVIDERS", "resolveProvider", "DEFAULT_OLLAMA_MODEL"]) {
~~~~

par :

~~~~ts
  for (const name of [
    "LLMError",
    "OllamaLLMProvider",
    "GeminiLLMProvider",
    "PROVIDERS",
    "resolveProvider",
    "DEFAULT_OLLAMA_MODEL",
    "DEFAULT_GEMINI_MODEL",
  ]) {
~~~~

Édition 2.4 · `tests/barrel-contract.test.ts` · remplacer :

~~~~ts
  assert.equal(typeof llm.OllamaLLMProvider, "function");
  assert.equal(typeof llm.PROVIDERS, "object");
});
~~~~

par :

~~~~ts
  assert.equal(typeof llm.OllamaLLMProvider, "function");
  assert.equal(typeof llm.GeminiLLMProvider, "function");
  assert.equal(typeof llm.PROVIDERS, "object");
  assert.equal(llm.DEFAULT_GEMINI_MODEL, "gemini-2.5-flash");
});
~~~~

Édition 2.5 · `tests/barrel-contract.test.ts` · remplacer :

~~~~ts
  assert.equal(run.passed, true);
  assert.equal(trace.stopReason, "completed");
});
~~~~

par :

~~~~ts
  assert.equal(run.passed, true);
  assert.equal(trace.stopReason, "completed");
});

// The generateContent translation (#18) stays internal: only the provider class and its
// configuration leave the barrels, by name, never through an `export *` from gemini/.
test("`.` and `./llm` serve no Gemini wire symbol", () => {
  for (const barrel of [root, llm]) {
    const surface = barrel as Record<string, unknown>;
    assert.equal(surface.toGeminiRequest, undefined);
    assert.equal(surface.fromGeminiResponse, undefined);
    assert.equal(surface.geminiGenerateContentUrl, undefined);
    assert.equal(surface.GEMINI_DEFAULT_BASE_URL, undefined);
  }
});

// Same reasoning as the type tests above: GeminiConfig is a type, so `node --test` cannot see it
// leave either barrel. It annotates the configuration handed to the class each barrel serves, and
// the gate that enforces it is `npm run typecheck`. No complete() call, so no network.
test("`.` and `./llm` expose GeminiLLMProvider and the GeminiConfig it takes", () => {
  const config: GeminiConfig = {
    models: [{ id: root.DEFAULT_GEMINI_MODEL, supportsTools: true }],
    apiKeyVar: "AGENT_CORE_TEST_GEMINI_KEY",
  };
  const provider: LLMProvider = new root.GeminiLLMProvider(config);
  const fromLlm: LlmGeminiConfig = config;

  assert.equal(new llm.GeminiLLMProvider(fromLlm).id, "gemini");
  assert.equal(provider.id, "gemini");
  assert.deepEqual(provider.models(), config.models);
  assert.equal(provider.supportsStreaming(), false);
});
~~~~

### 2.2 Constater le rouge

1. `npm run build` (timeout 600000) → sortie attendue : `> tsc -p tsconfig.build.json`, code 0.
2. `node --test tests/barrel-contract.test.ts` (timeout 600000) → sortie attendue : code 1, dont

   ```
   not ok 1 - `.` exposes the engine surface
     error: |-
       missing GeminiLLMProvider
   not ok 2 - `./llm` exposes the llm layer standalone (incl. core types at runtime it re-exports value symbols)
     expected: 'function'
     actual: 'undefined'
   ok 20 - `.` and `./llm` serve no Gemini wire symbol
   not ok 21 - `.` and `./llm` expose GeminiLLMProvider and the GeminiConfig it takes
     error: 'root.GeminiLLMProvider is not a constructor'
   # tests 21
   # pass 18
   # fail 3
   ```

3. `npm run typecheck` (timeout 600000) → sortie attendue : code 2, dont

   ```
   tests/barrel-contract.test.ts(15,3): error TS2305: Module '"@arthurolivierfortin/agent-core"' has no exported member 'GeminiConfig'.
   tests/barrel-contract.test.ts(30,15): error TS2305: Module '"@arthurolivierfortin/agent-core/llm"' has no exported member 'GeminiConfig'.
   tests/barrel-contract.test.ts(50,27): error TS2339: Property 'GeminiLLMProvider' does not exist on type 'typeof import("<racine>/dist/llm/index", …)'.
   tests/barrel-contract.test.ts(305,42): error TS2339: Property 'GeminiLLMProvider' does not exist on type 'typeof import("<racine>/dist/index", …)'.
   tests/barrel-contract.test.ts(308,24): error TS2339: Property 'GeminiLLMProvider' does not exist on type 'typeof import("<racine>/dist/llm/index", …)'.
   ```

   (`<racine>` : chemin absolu du worktree, que `tsc` écrit en entier ; à remplacer par un chemin
   relatif dans toute preuve.)

   Bonne raison : ni `GeminiLLMProvider` ni `GeminiConfig` ne sont servis par un barrel. Le test
   « no Gemini wire symbol » est vert avant et après : il verrouille la frontière de SPEC-2
   (précédent P4 de #25).

### 2.3 Écrire le code de production

Édition 2.6 · `src/llm/providers/index.ts` · remplacer :

~~~~ts
export type { OllamaConfig } from "./ollama/ollama-llm-provider.js";
~~~~

par :

~~~~ts
export type { OllamaConfig } from "./ollama/ollama-llm-provider.js";
export { GeminiLLMProvider } from "./gemini/gemini-llm-provider.js";
export type { GeminiConfig } from "./gemini/gemini-llm-provider.js";
~~~~

Édition 2.7 · `src/llm/providers/gemini/gemini-llm-provider.ts` · remplacer :

~~~~ts
// The registry and the barrel exports belong to #26, so no barrel serves this module yet.
~~~~

par :

~~~~ts
// Served by ./llm and . through src/llm/providers/index.ts, which re-exports GeminiLLMProvider and GeminiConfig only.
~~~~

Édition 2.8 · `src/llm/providers/gemini/gemini-llm-provider.ts` · remplacer :

~~~~ts
/** The variable read when the configuration names none. Not exported: the public surface is #26's. */
~~~~

par :

~~~~ts
/** The variable read when the configuration names none. Not exported: GeminiConfig.apiKeyVar documents it. */
~~~~

Aucune autre ligne de `gemini-llm-provider.ts` ne change.

### 2.4 Constater le vert

1. `npm run build` (timeout 600000) → sortie attendue : `> tsc -p tsconfig.build.json`, code 0.
2. `node --test tests/barrel-contract.test.ts` (timeout 600000) → sortie attendue : code 0, fin TAP

   ```
   # tests 21
   # pass 21
   # fail 0
   ```

3. `npm run typecheck` (timeout 600000) → sortie attendue : `> tsc --noEmit`, code 0.
4. `git diff --numstat -- src/llm/providers/gemini/gemini-llm-provider.ts` → sortie attendue :
   `2	2	src/llm/providers/gemini/gemini-llm-provider.ts`.

### 2.5 Commit

Cocher `[SPEC-2]` et `[TEST-2]`.
`git add docs/specs/2026-09-30-gemini-wiring-checklist.md src/llm/providers/index.ts src/llm/providers/gemini/gemini-llm-provider.ts tests/barrel-contract.test.ts`

Message :

```
feat(llm): exporter GeminiLLMProvider et GeminiConfig par ./llm et .

Refs: #26
Session: <id>
Model: <modèle>
Authorship: ai
```

`git commit -F <dossier_tmp>/agent-core-issue26-commit-msg.txt` → sortie attendue :
`4 files changed`.

---

## Tâche 3 · SPEC-3 · test d'intégration derrière `GEMINI_INTEGRATION=1`

Commande de test de la tâche : `node --test scripts/repo-conventions.test.mjs` (timeout 600000).
Elle lance, dans un sous-processus à l'environnement expurgé de `GEMINI_INTEGRATION`,
`GEMINI_API_KEY` et `NODE_TEST_CONTEXT`, le seul fichier d'intégration : c'est la seule façon
dont ce plan exécute ce fichier, et il y est ignoré. **Ne jamais lancer
`node --test tests/integration/gemini.integration.test.ts` directement.**

### 3.1 Écrire TEST-3

Édition 3.1 · `scripts/repo-conventions.test.mjs` · remplacer :

~~~~js
import { existsSync, readdirSync, readFileSync } from "node:fs";
~~~~

par :

~~~~js
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
~~~~

Édition 3.2 · `scripts/repo-conventions.test.mjs` · remplacer :

~~~~js
  assert.ok(
    existsSync(new URL("../src/metrics/application/use-cases/with-metrics.ts", import.meta.url)),
    "src/metrics/application/use-cases/with-metrics.ts introuvable",
  );
});
~~~~

par :

~~~~js
  assert.ok(
    existsSync(new URL("../src/metrics/application/use-cases/with-metrics.ts", import.meta.url)),
    "src/metrics/application/use-cases/with-metrics.ts introuvable",
  );
});

// Forme d'une clé d'API Google : aucun fichier versionné n'en porte une.
const GOOGLE_KEY_SHAPE = /AIza[0-9A-Za-z_-]{35}/;

test("TEST-3 (issue 26) le test d'intégration Gemini est ignoré sans GEMINI_INTEGRATION=1", () => {
  const file = "tests/integration/gemini.integration.test.ts";
  // Le fils n'a ni l'opt-in ni la clé : il ne peut pas appeler l'API. NODE_TEST_CONTEXT, posé par
  // le lanceur de node --test, ferait sauter au node --test imbriqué l'exécution de ses fichiers.
  // Les noms se comparent sans casse : sous Windows, process.env les ignore.
  const scrubbed = ["GEMINI_INTEGRATION", "GEMINI_API_KEY", "NODE_TEST_CONTEXT"];
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !scrubbed.includes(name.toUpperCase())));
  const child = spawnSync(process.execPath, ["--test", "--test-reporter=tap", file], {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env,
    encoding: "utf8",
  });
  assert.equal(child.status, 0, `node --test ${file} : code ${child.status}\n${child.stdout}${child.stderr}`);
  assert.ok(
    child.stdout.includes("# SKIP set GEMINI_INTEGRATION=1 with GEMINI_API_KEY in the environment"),
    `${file} n'est pas ignoré par défaut\n${child.stdout}`,
  );
  assert.match(child.stdout, /^# fail 0$/m);
  const source = readRepoFile(file);
  for (const expected of ['process.env.GEMINI_INTEGRATION === "1"', "checkProviderContract"]) {
    assert.ok(source.includes(expected), `${file} sans ${expected}`);
  }
  for (const forbidden of ["console.", "dotenv", "readFileSync", "GEMINI_API_KEY ="]) {
    assert.ok(!source.includes(forbidden), `${file} contient ${forbidden}`);
  }
  assert.doesNotMatch(source, GOOGLE_KEY_SHAPE);
});
~~~~

### 3.2 Constater le rouge

1. `npm run build` (timeout 600000) → sortie attendue : `> tsc -p tsconfig.build.json`, code 0.
2. `node --test scripts/repo-conventions.test.mjs` (timeout 600000) → sortie attendue : code 1,
   dont

   ```
   not ok 16 - TEST-3 (issue 26) le test d'intégration Gemini est ignoré sans GEMINI_INTEGRATION=1
     error: |-
       node --test tests/integration/gemini.integration.test.ts : code 1
       Could not find 'tests/integration/gemini.integration.test.ts'
   # tests 16
   # pass 15
   # fail 1
   ```

   Bonne raison : le fichier d'intégration n'existe pas, le `node --test` imbriqué sort en code 1.

### 3.3 Écrire le code de production

Fichier 3.1 · créer `tests/integration/gemini.integration.test.ts` :

~~~~ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { PROVIDERS } from "../../dist/llm/index.js";
import { checkProviderContract } from "../../dist/testing/index.js";

// Opt-in only: it calls the hosted Gemini API, so the default suite skips it. Launching it is a
// manual step of a person, never of a test suite or an agent loop. The provider reads the key from
// GEMINI_API_KEY at call time; this file never reads, prints nor stores it.
const OPT_IN = process.env.GEMINI_INTEGRATION === "1";

test(
  "GeminiLLMProvider conforms to the port against the live Gemini API",
  { skip: OPT_IN ? false : "set GEMINI_INTEGRATION=1 with GEMINI_API_KEY in the environment" },
  async () => {
    // Declares GEMINI_MODEL, else DEFAULT_GEMINI_MODEL; supportsStreaming() is false, so no stream check runs.
    const provider = PROVIDERS.gemini();
    const report = await checkProviderContract(provider);
    assert.ok(report.ok, JSON.stringify(report.checks, null, 2));
  },
);
~~~~

### 3.4 Constater le vert

1. `npm run build` (timeout 600000) → sortie attendue : `> tsc -p tsconfig.build.json`, code 0.
2. `node --test scripts/repo-conventions.test.mjs` (timeout 600000) → sortie attendue : code 0,
   fin TAP

   ```
   ok 16 - TEST-3 (issue 26) le test d'intégration Gemini est ignoré sans GEMINI_INTEGRATION=1
   # tests 16
   # pass 16
   # fail 0
   ```

3. `npm run typecheck` (timeout 600000) → sortie attendue : `> tsc --noEmit`, code 0 (le fichier
   d'intégration est sous `tests/`, inclus par `tsconfig.json`).

Sortie du fils, observée par la sonde (même commande, même environnement expurgé) et à citer
dans le rapport du builder s'il la relève :

```
TAP version 13
# Subtest: GeminiLLMProvider conforms to the port against the live Gemini API
ok 1 - GeminiLLMProvider conforms to the port against the live Gemini API # SKIP set GEMINI_INTEGRATION=1 with GEMINI_API_KEY in the environment
  ---
  duration_ms: 0.6163
  type: 'test'
  ...
1..1
# tests 1
# suites 0
# pass 0
# fail 0
# cancelled 0
# skipped 1
# todo 0
```

### 3.5 Commit

Cocher `[SPEC-3]` et `[TEST-3]`.
`git add docs/specs/2026-09-30-gemini-wiring-checklist.md scripts/repo-conventions.test.mjs tests/integration/gemini.integration.test.ts`

Message :

```
test(llm): préparer le test d'intégration Gemini derrière GEMINI_INTEGRATION=1

Refs: #26
Session: <id>
Model: <modèle>
Authorship: ai
```

`git commit -F <dossier_tmp>/agent-core-issue26-commit-msg.txt` → sortie attendue :
`3 files changed`.

---

## Tâche 4 · SPEC-4 · documenter Gemini dans le README

Commande de test de la tâche : `node --test scripts/repo-conventions.test.mjs` (timeout 600000).
README en anglais (dérogation `core/langue`), sans tiret cadratin (U+2014) dans la section
Gemini, sans aucune chaîne en forme de clé Google.

### 4.1 Écrire TEST-4

`GEMINI_DOC_EXPECTED` est la liste de la checklist ; TEST-5 la réutilise.

Édition 4.1 · `scripts/repo-conventions.test.mjs` · remplacer :

~~~~js
  assert.doesNotMatch(source, GOOGLE_KEY_SHAPE);
});
~~~~

par :

~~~~js
  assert.doesNotMatch(source, GOOGLE_KEY_SHAPE);
});

// Ce que la section Gemini du README et celle du guide disent toutes deux, mot pour mot.
const GEMINI_DOC_EXPECTED = [
  "`GEMINI_API_KEY`",
  "`apiKeyVar`",
  "`[redacted]`",
  "`GEMINI_MODEL`",
  "`gemini-2.5-flash`",
  "`supportsStreaming()`",
  "`https://generativelanguage.googleapis.com`",
  "Do not pass `/v1beta`: the provider appends it.",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "H7",
  "H8",
  "Launching it is a manual step: no test suite and no agent loop runs it.",
  "`GEMINI_INTEGRATION=1`",
  "`checkProviderContract`",
  "#20",
  'npm run build; if ($LASTEXITCODE -eq 0) { $env:GEMINI_INTEGRATION = "1"; node --test tests/integration/gemini.integration.test.ts; Remove-Item Env:GEMINI_INTEGRATION }',
  "npm run build && GEMINI_INTEGRATION=1 node --test tests/integration/gemini.integration.test.ts",
];

test("TEST-4 (issue 26) le README documente Gemini et corrige ses lignes de surface", () => {
  const readme = readRepoFile("README.md");
  const section = sectionAfterHeading(readme, "## Setting up Gemini");
  for (const text of GEMINI_DOC_EXPECTED) assert.ok(section.includes(text), `README : section Gemini sans ${text}`);
  assert.ok(!section.includes(String.fromCharCode(0x2014)), "README : tiret cadratin dans la section Gemini");
  const lines = splitLines(readme);
  const llmEntry = lines.find((line) => line.startsWith("| `./llm` |")) ?? "";
  assert.ok(llmEntry.includes("GeminiLLMProvider"), "README : ligne ./llm sans GeminiLLMProvider");
  const engine = lines.find((line) => line.startsWith("- **Engine**:")) ?? "";
  for (const name of ["GeminiLLMProvider", "GeminiConfig", "DEFAULT_GEMINI_MODEL"]) {
    assert.ok(engine.includes(name), `README : puce Engine sans ${name}`);
  }
  const llmLayer = sectionAfterHeading(readme, "## Using the LLM layer (`./llm`)");
  for (const text of ["GeminiLLMProvider", "PROVIDERS.gemini()"]) {
    assert.ok(llmLayer.includes(text), `README : section ./llm sans ${text}`);
  }
  const configuration = sectionAfterHeading(readme, "## Configuration");
  for (const text of ["`GEMINI_API_KEY`", "`GEMINI_MODEL`", "`apiKeyVar`", "(#setting-up-gemini)"]) {
    assert.ok(configuration.includes(text), `README : section Configuration sans ${text}`);
  }
  assert.ok(!readme.includes("The variables the LLM layer reads today are"), "README : phrase des variables d'avant Gemini");
  assert.doesNotMatch(readme, GOOGLE_KEY_SHAPE);
});
~~~~

### 4.2 Constater le rouge

`node --test scripts/repo-conventions.test.mjs` (timeout 600000) → sortie attendue : code 1, dont

   ```
   not ok 17 - TEST-4 (issue 26) le README documente Gemini et corrige ses lignes de surface
     error: 'titre absent : ## Setting up Gemini'
   # tests 17
   # pass 16
   # fail 1
   ```

Bonne raison : la section `## Setting up Gemini` n'existe pas.

### 4.3 Écrire la documentation

Édition 4.2 · `README.md` · remplacer :

~~~~md
| `./llm` | LLM layer: the `LLMProvider` port, `OllamaLLMProvider`, the `PROVIDERS` registry + `resolveProvider`, and the LLM models | **available** |
~~~~

par :

~~~~md
| `./llm` | LLM layer: the `LLMProvider` port, `OllamaLLMProvider`, `GeminiLLMProvider`, the `PROVIDERS` registry + `resolveProvider`, and the LLM models | **available** |
~~~~

Édition 4.3 · `README.md` · remplacer :

~~~~md
- **Engine**: the `LLMProvider` port with its `CompletionOptions`, `OllamaLLMProvider`, the `PROVIDERS` registry with `resolveProvider` and `DEFAULT_OLLAMA_MODEL`, and the `LLMError` class.
~~~~

par :

~~~~md
- **Engine**: the `LLMProvider` port with its `CompletionOptions`, `OllamaLLMProvider`, `GeminiLLMProvider` with its configuration `GeminiConfig`, the `PROVIDERS` registry with `resolveProvider`, `DEFAULT_OLLAMA_MODEL` and `DEFAULT_GEMINI_MODEL`, and the `LLMError` class.
~~~~

Édition 4.4 · `README.md` · remplacer :

~~~~md
The `./llm` subpath ships the LLM layer: the `LLMProvider` port, the `OllamaLLMProvider` adapter, the `PROVIDERS` registry with `resolveProvider`, and the LLM models.
~~~~

par :

~~~~md
The `./llm` subpath ships the LLM layer: the `LLMProvider` port, the `OllamaLLMProvider` and `GeminiLLMProvider` adapters, the `PROVIDERS` registry with `resolveProvider`, and the LLM models.
~~~~

Édition 4.5 · `README.md` · remplacer :

~~~~md
const a = PROVIDERS.ollama(); // declares the single model named by OLLAMA_MODEL
~~~~

par :

~~~~md
const a = PROVIDERS.ollama(); // declares the single model named by OLLAMA_MODEL
const c = PROVIDERS.gemini(); // declares the single model named by GEMINI_MODEL
~~~~

Édition 4.6 · `README.md` · remplacer :

~~~~md
`PROVIDERS.ollama()` declares **one** model, `process.env.OLLAMA_MODEL ?? DEFAULT_OLLAMA_MODEL`, read at call time. It is the environment-driven shortcut; offering several models is the explicit path, `new OllamaLLMProvider({ models: [...] })`. The library reads `process.env`; the consuming application loads its `.env`.
~~~~

par :

~~~~md
`PROVIDERS.ollama()` declares **one** model, `process.env.OLLAMA_MODEL ?? DEFAULT_OLLAMA_MODEL`, read at call time. It is the environment-driven shortcut; offering several models is the explicit path, `new OllamaLLMProvider({ models: [...] })`. The library reads `process.env`; the consuming application loads its `.env`.

`PROVIDERS.gemini()` likewise declares **one** model, `process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL` (`gemini-2.5-flash`), read at call time, with `supportsTools: true`. It reads no API key: `GeminiLLMProvider` reads it at every `complete()` call. See [Setting up Gemini](#setting-up-gemini).
~~~~

Édition 4.7 · `README.md` · remplacer :

~~~~md
The library reads `process.env`; the consuming application loads its `.env` (e.g. via `dotenv` in its entry point). Nothing is read from disk on import.

---

## Configuration
~~~~

par :

~~~~md
The library reads `process.env`; the consuming application loads its `.env` (e.g. via `dotenv` in its entry point). Nothing is read from disk on import.

---

## Setting up Gemini

`GeminiLLMProvider` talks to Google's Gemini API over HTTPS, through its `generateContent` endpoint. It is a hosted, paid service: the default test suite never calls it.

```ts
import { GeminiLLMProvider } from "@arthurolivierfortin/agent-core/llm";

const provider = new GeminiLLMProvider({ models: [{ id: "gemini-2.5-flash", supportsTools: true }] });
const res = await provider.complete([{ role: "user", content: "Bonjour !" }], { model: "gemini-2.5-flash" });
```

- **The API key.** The provider reads it from the environment variable `GEMINI_API_KEY`; the constructor's `apiKeyVar` names another variable (its **name**, never the key itself). The key is read at every `complete()` call and kept in no field. A missing or empty key raises `LLMError("MISSING_API_KEY")`, whose message names the variable, never a value. Any occurrence of the key in an error message is replaced by `[redacted]`.
- **Declared models.** Models are declared, never discovered (`ADR-AGENT-0017`): the constructor's `models`, or `GEMINI_MODEL` for `PROVIDERS.gemini()`, default `gemini-2.5-flash`. Asking for a model you did not declare raises `LLMError("MODEL_NOT_FOUND")` before any request.
- **No streaming.** `supportsStreaming()` returns `false` and the instance has no `stream` member: use `complete()`.
- **`baseURL`.** The host root, default `https://generativelanguage.googleapis.com`, without version or trailing slash. Do not pass `/v1beta`: the provider appends it. A 404 that does not come from Gemini says "check baseURL" in its message.

| Variable | Default | Read by |
|---|---|---|
| `GEMINI_API_KEY` | none | `GeminiLLMProvider.complete()`, unless `apiKeyVar` names another variable |
| `GEMINI_MODEL` | `gemini-2.5-flash` | `PROVIDERS.gemini()` / `resolveProvider("gemini")` |

The wire format rests on hypotheses not yet verified against the real API, each locked by a test on a fetch double in `tests/llm/providers/gemini/`:

- **H1**: `generateContent` is served under `v1beta`.
- **H2**: tool results travel in a content of role `user`.
- **H3**: a `functionCall` id is optional, synthesized `call_<i>` when absent.
- **H4**: `thoughtsTokenCount` counts as output tokens.
- **H5**: the key travels in the `x-goog-api-key` header.
- **H6**: the `content-type` and `x-goog-api-key` headers are enough (the H5 test pins the exact header set).
- **H7**: an unknown model answers 404 with `error.status` `NOT_FOUND`.
- **H8**: an error body is `{ error: { code, message, status } }`.

### Running the integration test

`tests/integration/gemini.integration.test.ts` runs `checkProviderContract` on `PROVIDERS.gemini()` against the live API. It is skipped unless `GEMINI_INTEGRATION=1` is set. Launching it is a manual step: no test suite and no agent loop runs it.

Prerequisite: `GEMINI_API_KEY` is already in the shell's environment, set outside any command line and any file, for example as a user environment variable, or by a masked prompt whose value reaches neither the command line nor the history:

- PowerShell 7.1 or later: `$env:GEMINI_API_KEY = Read-Host -MaskInput "GEMINI_API_KEY"`
- bash: `read -rs GEMINI_API_KEY && export GEMINI_API_KEY`

Then, from the repository root, in PowerShell (5.1 and 7):

```
npm run build; if ($LASTEXITCODE -eq 0) { $env:GEMINI_INTEGRATION = "1"; node --test tests/integration/gemini.integration.test.ts; Remove-Item Env:GEMINI_INTEGRATION }
```

or in bash:

```
npm run build && GEMINI_INTEGRATION=1 node --test tests/integration/gemini.integration.test.ts
```

Setting `GEMINI_MODEL` first targets another model; without it, `gemini-2.5-flash`. Success: exit code 0, one test passed, none skipped. Failure: the assertion lists `report.checks`, whose every `detail` is a redacted message; with `GEMINI_INTEGRATION=1` and no key, the test fails on `MISSING_API_KEY` rather than being skipped. Afterwards, `Remove-Item Env:GEMINI_API_KEY` (PowerShell) or `unset GEMINI_API_KEY` (bash) removes the key from the shell.

What the test checks: one real `generateContent` call (prompt `ping`, no tool), then the shape checks of `checkProviderContract`: `id`, `models()`, `supportsStreaming()` a boolean, the local refusal of an undeclared model (no network), `complete()` resolves, `content` a string, `toolCalls` an array, `usage` shaped `{ tokensIn, tokensOut }` when present; no stream check. It targets **H1**; a success also corroborates **H5** and **H6** by construction, since the real request carries only those two headers. It does not verify **H2**, **H3** and **H4** (no tool, no tool result, `thoughtsTokenCount` unchecked), which wait for the first real report (#20), nor **H7** and **H8** (no real error path is provoked).

---

## Configuration
~~~~

Édition 4.8 · `README.md` · remplacer :

~~~~md
The variables the LLM layer reads today are **`OLLAMA_HOST`** (default `http://localhost:11434`) and **`OLLAMA_MODEL`** (default `qwen2.5:0.5b`). See [Setting up Ollama](#setting-up-ollama).
~~~~

par :

~~~~md
The variables the LLM layer reads are **`OLLAMA_HOST`** (default `http://localhost:11434`), **`OLLAMA_MODEL`** (default `qwen2.5:0.5b`), **`GEMINI_API_KEY`** (no default; `GeminiLLMProvider` reads it at every `complete()` call, or the variable its `apiKeyVar` names) and **`GEMINI_MODEL`** (default `gemini-2.5-flash`). See [Setting up Ollama](#setting-up-ollama) and [Setting up Gemini](#setting-up-gemini).
~~~~

### 4.4 Constater le vert

1. `node --test scripts/repo-conventions.test.mjs` (timeout 600000) → sortie attendue : code 0,
   fin TAP

   ```
   ok 17 - TEST-4 (issue 26) le README documente Gemini et corrige ses lignes de surface
   # tests 17
   # pass 17
   # fail 0
   ```

2. `git diff --numstat -- README.md` → sortie attendue : `66	4	README.md`.

Aucun build ni typecheck n'est requis par cette tâche (documentation seule) ; les gates de la
tâche 8 les couvrent.

### 4.5 Commit

Cocher `[SPEC-4]` et `[TEST-4]`.
`git add docs/specs/2026-09-30-gemini-wiring-checklist.md README.md scripts/repo-conventions.test.mjs`

Message :

```
docs(llm): documenter le fournisseur Gemini dans le README

Refs: #26
Session: <id>
Model: <modèle>
Authorship: ai
```

`git commit -F <dossier_tmp>/agent-core-issue26-commit-msg.txt` → sortie attendue :
`3 files changed`.

---

## Tâche 5 · SPEC-5 · documenter Gemini dans le guide

Commande de test de la tâche : `node --test scripts/repo-conventions.test.mjs` (timeout 600000).
Guide en anglais (dérogation `core/langue`), sans tiret cadratin dans la sous-section.

### 5.1 Écrire TEST-5

Édition 5.1 · `scripts/repo-conventions.test.mjs` · remplacer :

~~~~js
  assert.ok(!readme.includes("The variables the LLM layer reads today are"), "README : phrase des variables d'avant Gemini");
  assert.doesNotMatch(readme, GOOGLE_KEY_SHAPE);
});
~~~~

par :

~~~~js
  assert.ok(!readme.includes("The variables the LLM layer reads today are"), "README : phrase des variables d'avant Gemini");
  assert.doesNotMatch(readme, GOOGLE_KEY_SHAPE);
});

test("TEST-5 (issue 26) le guide documente Gemini et son test d'intégration", () => {
  const guide = readRepoFile("docs/guide-agent-package.md");
  const section = sectionAfterHeading(guide, "### Gemini provider and its integration test");
  for (const text of [...GEMINI_DOC_EXPECTED, "tests/integration/gemini.integration.test.ts"]) {
    assert.ok(section.includes(text), `guide : sous-section Gemini sans ${text}`);
  }
  assert.ok(!section.includes(String.fromCharCode(0x2014)), "guide : tiret cadratin dans la sous-section Gemini");
  for (const file of ["gemini/gemini-llm-provider.ts", "gemini/gemini-wire.ts"]) {
    assert.ok(guide.includes(file), `guide : arborescence sans ${file}`);
  }
  assert.doesNotMatch(guide, GOOGLE_KEY_SHAPE);
});
~~~~

### 5.2 Constater le rouge

`node --test scripts/repo-conventions.test.mjs` (timeout 600000) → sortie attendue : code 1, dont

   ```
   not ok 18 - TEST-5 (issue 26) le guide documente Gemini et son test d'intégration
     error: 'titre absent : ### Gemini provider and its integration test'
   # tests 18
   # pass 17
   # fail 1
   ```

Bonne raison : la sous-section n'existe pas.

### 5.3 Écrire la documentation

Édition 5.2 · `docs/guide-agent-package.md` · remplacer :

~~~~text
      ollama/ollama-llm-provider.ts    OllamaLLMProvider, a CLASS (real I/O)
~~~~

par :

~~~~text
      ollama/ollama-llm-provider.ts    OllamaLLMProvider, a CLASS (real I/O)
      gemini/gemini-llm-provider.ts    GeminiLLMProvider, a CLASS (real I/O)
      gemini/gemini-wire.ts            pure generateContent translation, served by no barrel
~~~~

Édition 5.3 · `docs/guide-agent-package.md` · remplacer :

~~~~md
so git never rewrites their line endings.

## Branch and commit conventions
~~~~

par :

~~~~md
so git never rewrites their line endings.

### Gemini provider and its integration test

`GeminiLLMProvider` (`llm/providers/gemini/gemini-llm-provider.ts`) transports to Gemini's `generateContent` the body that `gemini-wire.ts` builds. `./llm` and `.` serve the class and its `GeminiConfig`; no barrel serves the wire translation. `PROVIDERS.gemini()` declares the single model named by `GEMINI_MODEL`, default `gemini-2.5-flash`.

- **Key**: read from `GEMINI_API_KEY`, or from the variable `apiKeyVar` names (a name, never a value), at every `complete()` call, and kept in no field. A missing or empty key is `LLMError("MISSING_API_KEY")`, which names the variable only. Any occurrence of the key in an error message becomes `[redacted]`.
- **Models**: declared, never discovered (`ADR-AGENT-0017`); an undeclared model is `MODEL_NOT_FOUND` before any request.
- **No streaming**: `supportsStreaming()` returns `false`, and the instance has no `stream` member.
- **`baseURL`**: the host root, default `https://generativelanguage.googleapis.com`, without version or trailing slash. Do not pass `/v1beta`: the provider appends it.

Format hypotheses, not yet verified against the real API, each locked by a test on a fetch double: H1 to H4 in `tests/llm/providers/gemini/gemini-wire.test.ts`, H5 to H8 in `tests/llm/providers/gemini/gemini-llm-provider.test.ts`.

- H1: `generateContent` is served under `v1beta`.
- H2: tool results travel in a content of role `user`.
- H3: a `functionCall` id is optional, synthesized `call_<i>` when absent.
- H4: `thoughtsTokenCount` counts as output tokens.
- H5: the key travels in the `x-goog-api-key` header.
- H6: the `content-type` and `x-goog-api-key` headers are enough (the H5 test pins the exact header set).
- H7: an unknown model answers 404 with `error.status` `NOT_FOUND`.
- H8: an error body is `{ error: { code, message, status } }`.

The unit suites never reach the network. `tests/integration/gemini.integration.test.ts` runs `checkProviderContract` on `PROVIDERS.gemini()` against the live API, and is skipped unless `GEMINI_INTEGRATION=1`; `scripts/repo-conventions.test.mjs` checks that the default suite skips it. Launching it is a manual step: no test suite and no agent loop runs it. With `GEMINI_API_KEY` already in the shell's environment, never written in a command or a file, from the repository root:

- PowerShell (5.1 and 7): `npm run build; if ($LASTEXITCODE -eq 0) { $env:GEMINI_INTEGRATION = "1"; node --test tests/integration/gemini.integration.test.ts; Remove-Item Env:GEMINI_INTEGRATION }`
- bash: `npm run build && GEMINI_INTEGRATION=1 node --test tests/integration/gemini.integration.test.ts`

It makes one real call (prompt `ping`, no tool) and checks the port's shape, with no stream check. A success corroborates H1, and by construction H5 and H6. H2, H3 and H4 wait for the first real report (#20); H7 and H8 are not exercised, since no real error path is provoked.

## Branch and commit conventions
~~~~

### 5.4 Constater le vert

1. `node --test scripts/repo-conventions.test.mjs` (timeout 600000) → sortie attendue : code 0,
   fin TAP

   ```
   ok 18 - TEST-5 (issue 26) le guide documente Gemini et son test d'intégration
   # tests 18
   # pass 18
   # fail 0
   ```

2. `git diff --numstat -- docs/guide-agent-package.md` → sortie attendue : `29	0	docs/guide-agent-package.md`.

### 5.5 Commit

Cocher `[SPEC-5]` et `[TEST-5]`.
`git add docs/specs/2026-09-30-gemini-wiring-checklist.md docs/guide-agent-package.md scripts/repo-conventions.test.mjs`

Message :

```
docs(llm): documenter le fournisseur Gemini dans le guide

Refs: #26
Session: <id>
Model: <modèle>
Authorship: ai
```

`git commit -F <dossier_tmp>/agent-core-issue26-commit-msg.txt` → sortie attendue :
`3 files changed`.

---

## Tâche 6 · SPEC-6 · quatre cas de masquage (tests seulement)

Commande de test de la tâche, désignée plus bas par « lancer le fichier » :
`node --test tests/llm/providers/gemini/gemini-llm-provider.test.ts` (timeout 600000).
Aucune modification de `src/` n'est commitée dans cette tâche.

### 6.1 Écrire TEST-6

Édition 6.1 · `tests/llm/providers/gemini/gemini-llm-provider.test.ts` · remplacer :

~~~~ts
/** complete() under this key rejects with an LLMError of exactly this code and message, returned. */
async function expectFailure(fetchFn: typeof fetch, code: string, message: string, key = "cle-factice-1") {
  let failure: unknown;
  await withEnv({ [KEY_VAR]: key }, async () => {
    const provider = new GeminiLLMProvider({ models: DECLARED, apiKeyVar: KEY_VAR, fetch: fetchFn });
~~~~

par :

~~~~ts
/** complete() under this key, and this baseURL when given, rejects with an LLMError of exactly this code and message, returned. */
async function expectFailure(fetchFn: typeof fetch, code: string, message: string, key = "cle-factice-1", baseURL?: string) {
  let failure: unknown;
  await withEnv({ [KEY_VAR]: key }, async () => {
    const provider = new GeminiLLMProvider({ models: DECLARED, apiKeyVar: KEY_VAR, fetch: fetchFn, baseURL });
~~~~

Édition 6.2 · `tests/llm/providers/gemini/gemini-llm-provider.test.ts` · remplacer :

~~~~ts
const REDACTION_CASES: { title: string; fetch: typeof fetch; code: string; message: string }[] = [
~~~~

par :

~~~~ts
const REDACTION_CASES: { title: string; fetch: typeof fetch; baseURL?: string; code: string; message: string }[] = [
~~~~

Édition 6.3 · `tests/llm/providers/gemini/gemini-llm-provider.test.ts` · remplacer :

~~~~ts
    message: "Gemini returned no candidate (promptFeedback.blockReason: [redacted])",
  },
];

for (const { title, fetch: fetchFn, code, message } of REDACTION_CASES) {
  test(`the key never shows in the serialized error: ${title}`, async () => {
    const error = await expectFailure(fetchFn, code, message, PLANTED_KEY);
~~~~

par :

~~~~ts
    message: "Gemini returned no candidate (promptFeedback.blockReason: [redacted])",
  },
  {
    title: "an error.status of an error body",
    fetch: respondingFetch(
      400,
      JSON.stringify({ error: { code: 400, message: "Bad request.", status: PLANTED_KEY } }),
    ).fetch,
    code: "API_ERROR",
    message: `Gemini 400 [redacted] from ${ENDPOINT}: Bad request.`,
  },
  {
    title: "an ok body that is a JSON string",
    fetch: respondingFetch(200, JSON.stringify(PLANTED_KEY)).fetch,
    code: "API_ERROR",
    message: 'Gemini 200 response is not a JSON object: "[redacted]"',
  },
  {
    title: "the URL of a rejected fetch, through baseURL",
    fetch: rejectingFetch(new TypeError("fetch failed")),
    baseURL: `http://${PLANTED_KEY}.invalid`,
    code: "API_ERROR",
    message: "Gemini request to http://[redacted].invalid/v1beta/models/gemini-2.5-flash:generateContent failed: TypeError: fetch failed",
  },
  {
    title: "the URL of a non-ok response, through baseURL",
    fetch: respondingFetch(404, "<html>Not Found</html>").fetch,
    baseURL: `http://${PLANTED_KEY}.invalid`,
    code: "API_ERROR",
    message:
      "Gemini 404 from http://[redacted].invalid/v1beta/models/gemini-2.5-flash:generateContent (check baseURL: host root, without /v1beta): <html>Not Found</html>",
  },
];

for (const { title, fetch: fetchFn, baseURL, code, message } of REDACTION_CASES) {
  test(`the key never shows in the serialized error: ${title}`, async () => {
    const error = await expectFailure(fetchFn, code, message, PLANTED_KEY, baseURL);
~~~~

`rejectingFetch` est défini plus haut dans le fichier (l.367), `respondingFetch` (l.262),
`ENDPOINT` (l.259), `PLANTED_KEY` (l.406) : tous avant `REDACTION_CASES`. Le domaine `.invalid`
n'est jamais résolu : aucun des deux doubles n'appelle le réseau.

### 6.2 Constater le vert dès l'écriture

1. `npm run build` (timeout 600000) → sortie attendue : `> tsc -p tsconfig.build.json`, code 0.
2. Lancer le fichier → sortie attendue : code 0, dont

   ```
   ok 27 - the key never shows in the serialized error: an error.status of an error body
   ok 28 - the key never shows in the serialized error: an ok body that is a JSON string
   ok 29 - the key never shows in the serialized error: the URL of a rejected fetch, through baseURL
   ok 30 - the key never shows in the serialized error: the URL of a non-ok response, through baseURL
   # tests 30
   # pass 30
   # fail 0
   ```

3. `npm run typecheck` (timeout 600000) → sortie attendue : `> tsc --noEmit`, code 0.

TEST-6 verrouille un comportement livré par #25 : il est vert dès l'écriture (D8 de la
spécification). Sa pertinence se prouve par mutation.

### 6.3 Preuve par mutation (dans la session, annulée sans commit)

Pour chacune des quatre mutations ci-dessous, **une à la fois** : appliquer l'édition par l'outil
Edit, `npm run build`, lancer le fichier, relever la sortie, puis
`git restore src/llm/providers/gemini/gemini-llm-provider.ts` et `git diff --stat -- src/`
(sortie attendue : vide). Recopier dans le rapport du builder, pour chaque mutation, la ligne
`not ok` et la fin TAP.

Mutation 6.a · `src/llm/providers/gemini/gemini-llm-provider.ts` · remplacer :

~~~~ts
  const errorStatus = gemini?.status === undefined ? "" : " " + excerpt(redactKey(gemini.status, apiKey));
~~~~

par :

~~~~ts
  const errorStatus = gemini?.status === undefined ? "" : " " + excerpt(gemini.status);
~~~~

Sortie attendue (l.140) :

```
not ok 27 - the key never shows in the serialized error: an error.status of an error body
  expected: 'Gemini 400 [redacted] from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: Bad request.'
  actual: 'Gemini 400 cle-factice-ne-pas-afficher from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: Bad request.'
# tests 30
# pass 29
# fail 1
```

Mutation 6.b · `src/llm/providers/gemini/gemini-llm-provider.ts` · remplacer :

~~~~ts
      const quoted = excerpt(redactKey(text, apiKey));
~~~~

par :

~~~~ts
      const quoted = excerpt(text);
~~~~

Sortie attendue (l.110) :

```
not ok 28 - the key never shows in the serialized error: an ok body that is a JSON string
  expected: 'Gemini 200 response is not a JSON object: "[redacted]"'
  actual: 'Gemini 200 response is not a JSON object: "cle-factice-ne-pas-afficher"'
# tests 30
# pass 29
# fail 1
```

Mutation 6.c · `src/llm/providers/gemini/gemini-llm-provider.ts` · remplacer :

~~~~ts
      throw new LLMError("API_ERROR", `Gemini request to ${redactKey(url, apiKey)} failed: ${reason}`);
~~~~

par :

~~~~ts
      throw new LLMError("API_ERROR", `Gemini request to ${url} failed: ${reason}`);
~~~~

Sortie attendue (l.97) :

```
not ok 29 - the key never shows in the serialized error: the URL of a rejected fetch, through baseURL
  expected: 'Gemini request to http://[redacted].invalid/v1beta/models/gemini-2.5-flash:generateContent failed: TypeError: fetch failed'
  actual: 'Gemini request to http://cle-factice-ne-pas-afficher.invalid/v1beta/models/gemini-2.5-flash:generateContent failed: TypeError: fetch failed'
# tests 30
# pass 29
# fail 1
```

Mutation 6.d · `src/llm/providers/gemini/gemini-llm-provider.ts` · remplacer :

~~~~ts
  const safeUrl = redactKey(url, apiKey);
~~~~

par :

~~~~ts
  const safeUrl = url;
~~~~

Sortie attendue (l.141) :

```
not ok 30 - the key never shows in the serialized error: the URL of a non-ok response, through baseURL
  expected: 'Gemini 404 from http://[redacted].invalid/v1beta/models/gemini-2.5-flash:generateContent (check baseURL: host root, without /v1beta): <html>Not Found</html>'
  actual: 'Gemini 404 from http://cle-factice-ne-pas-afficher.invalid/v1beta/models/gemini-2.5-flash:generateContent (check baseURL: host root, without /v1beta): <html>Not Found</html>'
# tests 30
# pass 29
# fail 1
```

Chaque mutation fait échouer son cas et lui seul (29 tests sur 30 restent verts).

Après la quatrième : `npm run build` (timeout 600000), lancer le fichier → code 0, même fin TAP
qu'en 6.2 ; `git diff --stat -- src/` → vide.

### 6.4 Commit

Cocher `[SPEC-6]` et `[TEST-6]`.
`git add docs/specs/2026-09-30-gemini-wiring-checklist.md tests/llm/providers/gemini/gemini-llm-provider.test.ts`

Message :

```
test(llm): verrouiller le masquage de la clé sur error.status, un corps 200 non objet et baseURL

Refs: #26
Session: <id>
Model: <modèle>
Authorship: ai
```

`git commit -F <dossier_tmp>/agent-core-issue26-commit-msg.txt` → sortie attendue :
`2 files changed`.

---

## Tâche 7 · SPEC-7 · libellé d'un `error.message` vide (test seulement)

Même commande de test qu'en tâche 6 (« lancer le fichier »).

### 7.1 Écrire TEST-7

Édition 7.1 · `tests/llm/providers/gemini/gemini-llm-provider.test.ts` · remplacer :

~~~~ts
    `Gemini 404 from ${ENDPOINT} (check baseURL: host root, without /v1beta): <html>Not Found</html>`,
  );
  assert.equal(double.count(), 1);
});
~~~~

par :

~~~~ts
    `Gemini 404 from ${ENDPOINT} (check baseURL: host root, without /v1beta): <html>Not Found</html>`,
  );
  assert.equal(double.count(), 1);
});

// Fixed as it is (R1 of #26): the body is not empty, only its error.message is.
test("an error body whose error.message is empty is labelled (empty body)", async () => {
  const double = respondingFetch(400, JSON.stringify({ error: { code: 400, message: "", status: "INVALID_ARGUMENT" } }));
  await expectFailure(double.fetch, "API_ERROR", `Gemini 400 INVALID_ARGUMENT from ${ENDPOINT}: (empty body)`);
  assert.equal(double.count(), 1);
});
~~~~

Le premier bloc est unique : le cas `the URL of a non-ok response, through baseURL` de la tâche 6
porte un message différent (`http://[redacted].invalid/…`, sans `${ENDPOINT}`).

### 7.2 Constater le vert dès l'écriture

1. `npm run build` (timeout 600000) → sortie attendue : `> tsc -p tsconfig.build.json`, code 0.
2. Lancer le fichier → sortie attendue : code 0, dont

   ```
   ok 14 - an error body whose error.message is empty is labelled (empty body)
   # tests 31
   # pass 31
   # fail 0
   ```

3. `npm run typecheck` (timeout 600000) → sortie attendue : `> tsc --noEmit`, code 0.

### 7.3 Preuve par mutation (dans la session, annulée sans commit)

Même protocole qu'en 6.3.

Mutation 7.a · `src/llm/providers/gemini/gemini-llm-provider.ts` · remplacer :

~~~~ts
  const detail = gemini?.message ?? text;
~~~~

par :

~~~~ts
  const detail = gemini?.message || text;
~~~~

Sortie attendue (l.138) :

```
not ok 14 - an error body whose error.message is empty is labelled (empty body)
  expected: 'Gemini 400 INVALID_ARGUMENT from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: (empty body)'
  actual: 'Gemini 400 INVALID_ARGUMENT from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: {"error":{"code":400,"message":"","status":"INVALID_ARGUMENT"}}'
# tests 31
# pass 30
# fail 1
```

Puis `git restore src/llm/providers/gemini/gemini-llm-provider.ts`, `git diff --stat -- src/` →
vide, `npm run build` (timeout 600000), lancer le fichier → code 0.

### 7.4 Commit

Cocher `[SPEC-7]` et `[TEST-7]`.
`git add docs/specs/2026-09-30-gemini-wiring-checklist.md tests/llm/providers/gemini/gemini-llm-provider.test.ts`

Message :

```
test(llm): fixer le libellé d'une erreur Gemini dont error.message est vide

Refs: #26
Session: <id>
Model: <modèle>
Authorship: ai
```

`git commit -F <dossier_tmp>/agent-core-issue26-commit-msg.txt` → sortie attendue :
`2 files changed`.

---

## Tâche 8 · gates, contrôles, taille et corps de PR

Avant GATE-1 : `node -e "process.exit(process.env.GEMINI_INTEGRATION === undefined ? 0 : 1)"` →
sortie attendue : vide, code 0 (code 1 : arrêt, `blocked`, aucune suite lancée).

Chaque gate par son propre appel, `timeout` 600000, dans cet ordre (le typecheck lit les `.d.ts`
de `dist/` produits par le build, et `tests/` importe `dist/`) :

| Gate | Commande | Sortie attendue |
|---|---|---|
| GATE-1 build | `npm run build` | `> tsc -p tsconfig.build.json`, code 0, aucune erreur |
| GATE-2 typecheck | `npm run typecheck` | `> tsc --noEmit`, code 0, aucune erreur |
| GATE-3 test | `npm run test` | fin TAP : `# tests 243`, `# pass 241`, `# fail 0`, `# skipped 2` (228 + 15 ; les deux ignorés sont `GeminiLLMProvider conforms to the port against the live Gemini API # SKIP set GEMINI_INTEGRATION=1 with GEMINI_API_KEY in the environment` et l'intégration Ollama) |

Juste après GATE-3 : `git status --short` → sortie attendue : vide.

Puis, dans `docs/specs/2026-09-30-gemini-wiring-checklist.md` : cocher `[GATE-1]`, `[GATE-2]`,
`[GATE-3]`, et inscrire sous `## Hypothèses` les entrées de la section « Hypothèses » de ce plan,
une par ligne, préfixées `- [H]`. `git add docs/specs/2026-09-30-gemini-wiring-checklist.md`,
message :

```
chore(checklist): cocher les gates et consigner les hypothèses

Refs: #26
Session: <id>
Model: <modèle>
Authorship: ai
```

`git commit -F <dossier_tmp>/agent-core-issue26-commit-msg.txt` → sortie attendue :
`1 file changed`.

Contrôles, chaque commande par son propre appel, résultats à recopier dans le corps de PR, chemins
relatifs au dépôt dans toute preuve :

1. `git fetch origin` → sortie attendue : vide ou une ligne de mise à jour.
2. `git log --oneline HEAD..origin/main` → sortie attendue : vide (sinon `main` a bougé : le
   signaler au pilote avant la PR, sans rebase ni merge décidé seul).
3. `git diff --name-only origin/main...HEAD` → sortie attendue, exactement ces treize chemins :
   ```
   README.md
   docs/guide-agent-package.md
   docs/plans/2026-09-30-gemini-wiring-estimate.json
   docs/plans/2026-09-30-gemini-wiring-plan.md
   docs/specs/2026-09-30-gemini-wiring-checklist.md
   docs/specs/2026-09-30-gemini-wiring-design.md
   scripts/repo-conventions.test.mjs
   src/llm/providers/gemini/gemini-llm-provider.ts
   src/llm/providers/index.ts
   tests/barrel-contract.test.ts
   tests/integration/gemini.integration.test.ts
   tests/llm/providers/gemini/gemini-llm-provider.test.ts
   tests/llm/providers/registry.test.ts
   ```
   (plus `docs/plans/2026-09-30-gemini-wiring-plan-v2.md` s'il existe).
4. `git diff --stat origin/main...HEAD -- ROADMAP.md .env.example examples/web-chat/.env.example src/index.ts src/llm/index.ts src/testing src/llm/models src/llm/interfaces src/llm/testing src/llm/providers/gemini/gemini-wire.ts src/llm/providers/ollama`
   → sortie attendue : vide.
5. `git diff -U0 origin/main...HEAD -- src/llm/providers/gemini/gemini-llm-provider.ts` → sortie
   attendue, en-têtes `diff`/`index`/`---`/`+++` mis à part, exactement :
   ```
   @@ -6 +6 @@
   -// The registry and the barrel exports belong to #26, so no barrel serves this module yet.
   +// Served by ./llm and . through src/llm/providers/index.ts, which re-exports GeminiLLMProvider and GeminiConfig only.
   @@ -28 +28 @@ import type { GeminiResponse } from "./gemini-wire.js";
   -/** The variable read when the configuration names none. Not exported: the public surface is #26's. */
   +/** The variable read when the configuration names none. Not exported: GeminiConfig.apiKeyVar documents it. */
   ```
   (deux commentaires, aucune ligne exécutable).
6. `git grep -n -E "^export|^import" -- src/llm/providers/index.ts` → sortie attendue, exactement :
   ```
   src/llm/providers/index.ts:1:import { LLMError } from "../models/index.js";
   src/llm/providers/index.ts:2:import { OllamaLLMProvider } from "./ollama/ollama-llm-provider.js";
   src/llm/providers/index.ts:3:import { GeminiLLMProvider } from "./gemini/gemini-llm-provider.js";
   src/llm/providers/index.ts:4:import type { LLMProvider } from "../interfaces/index.js";
   src/llm/providers/index.ts:6:export { OllamaLLMProvider } from "./ollama/ollama-llm-provider.js";
   src/llm/providers/index.ts:7:export type { OllamaConfig } from "./ollama/ollama-llm-provider.js";
   src/llm/providers/index.ts:8:export { GeminiLLMProvider } from "./gemini/gemini-llm-provider.js";
   src/llm/providers/index.ts:9:export type { GeminiConfig } from "./gemini/gemini-llm-provider.js";
   src/llm/providers/index.ts:16:export type ProviderID = "ollama" | "gemini";
   src/llm/providers/index.ts:19:export const DEFAULT_OLLAMA_MODEL = "qwen2.5:0.5b";
   src/llm/providers/index.ts:22:export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
   src/llm/providers/index.ts:53:export const PROVIDERS: Record<ProviderID, () => LLMProvider> = {
   src/llm/providers/index.ts:64:export function resolveProvider(id: string): LLMProvider {
   ```
   (aucun `export *` depuis `gemini/`).
7. `git grep -n "process\.env" -- src/llm/providers/index.ts tests/integration/gemini.integration.test.ts`
   → sortie attendue, exactement :
   ```
   src/llm/providers/index.ts:25: * Ollama provider factory. A function, not a `new` at module load, so process.env is read
   src/llm/providers/index.ts:26: * at call time: the app loads its .env, the library reads process.env (ADR-AGENT-0002).
   src/llm/providers/index.ts:32:  const model = process.env.OLLAMA_MODEL ?? DEFAULT_OLLAMA_MODEL;
   src/llm/providers/index.ts:37: * Gemini provider factory. A function, not a `new` at module load, so process.env is read
   src/llm/providers/index.ts:38: * at call time: the app loads its .env, the library reads process.env (ADR-AGENT-0002).
   src/llm/providers/index.ts:45:  const model = process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
   tests/integration/gemini.integration.test.ts:9:const OPT_IN = process.env.GEMINI_INTEGRATION === "1";
   ```
   (le registre et le test d'intégration ne lisent jamais `GEMINI_API_KEY`).
8. `git grep -n "GEMINI_API_KEY" -- tests/integration/gemini.integration.test.ts` → sortie
   attendue, exactement (un commentaire et la raison de `skip`, aucune lecture) :
   ```
   tests/integration/gemini.integration.test.ts:8:// GEMINI_API_KEY at call time; this file never reads, prints nor stores it.
   tests/integration/gemini.integration.test.ts:13:  { skip: OPT_IN ? false : "set GEMINI_INTEGRATION=1 with GEMINI_API_KEY in the environment" },
   ```
9. `git grep -n "console\." -- src/llm/providers tests/llm/providers tests/integration/gemini.integration.test.ts tests/barrel-contract.test.ts`
   → sortie attendue : vide, code 1. (`scripts/repo-conventions.test.mjs` est hors de ce
   contrôle : il porte la chaîne `"console."` comme motif interdit de TEST-3, jamais comme appel.)
10. `git grep -n -E "AIza[0-9A-Za-z_-]{35}"` → sortie attendue : vide, code 1 (aucune chaîne en
    forme de clé Google dans le dépôt).
11. `git log --format=%B origin/main..HEAD` puis vérifier à la lecture : aucune ligne
    `Co-Authored-By`, huit blocs de trailers `Refs: #26` / `Session:` / `Model:` /
    `Authorship: ai`, sujets à l'impératif.
12. `python C:/Projects/dev-kit/scripts/pr_size.py origin/main HEAD --body-file <dossier_tmp>/agent-core-issue26-pr-body.md`
    (après écriture du corps) → sortie attendue :
    `hors docs/ et *.md : +279/-11 lignes (code +23, tests +256), seuil 400 respecté`, code 0.
    Recopier la ligne mesurée dans le corps de PR.

Corps de PR (outil Write sur `<dossier_tmp>/agent-core-issue26-pr-body.md`, sections du dépôt :
Contexte, Changements, Vérifications, Métriques, Risques et suivi, Message de squash proposé). Il
porte obligatoirement :

- `Closes #26` dans « Contexte », le rappel du découpage (B3 ; #19 B1 et #25 B2 livrés ; #20 et
  #27 suivent).
- Les trois gates avec leur dernière ligne de sortie, et la référence (228 tests sur 7533edf).
- Les contrôles avec leur résultat.
- Les rouges : TEST-1 (le fichier ne se charge pas : `DEFAULT_GEMINI_MODEL` n'est pas exporté),
  TEST-2 (`missing GeminiLLMProvider`, `typeof` `'undefined'`, `root.GeminiLLMProvider is not a
  constructor`, et `npm run typecheck` en erreur sur `GeminiConfig`), TEST-3 (le `node --test`
  imbriqué sort en code 1 sur un fichier absent), TEST-4 et TEST-5 (`titre absent`) ; et pour
  TEST-6 et TEST-7, verts dès l'écriture, les cinq mutations avec la ligne `not ok` observée et la
  confirmation `git diff --stat -- src/` vide après annulation.
- **Toutes** les hypothèses de la section « Hypothèses » de ce plan, chacune nommée et recopiée
  en entier.
- La règle A2 : le test d'intégration n'a pas été lancé avec `GEMINI_INTEGRATION=1` ; la suite
  par défaut l'ignore (`# skipped 2` à GATE-3, TEST-3 le prouve dans un sous-processus) ; la
  commande exacte est dans `README.md` et `docs/guide-agent-package.md`, son lancement est un
  geste d'Arthur.
- Les limites déclarées par la spécification : R1 (`(empty body)` pour un `error.message` vide,
  fixé tel quel, candidat à une issue de suivi) ; aucun `GEMINI_BASE_URL` (D3) ;
  `DEFAULT_API_KEY_VAR` non exporté (D4) ; les types `Gemini*` du format ne sont pas exportés, et
  aucun test d'exécution ne peut verrouiller l'absence d'un type (D2) ; H1 à H8 non vérifiées
  contre l'API réelle.
- La taille mesurée et l'écart avec l'estimation (section « Taille mesurée »).
- Aucun fichier `.env` ouvert ni lu ; `.env.example` et `ROADMAP.md` non modifiés ; aucun
  fournisseur hébergé appelé ; aucun `console.*` ajouté ; seules deux lignes de commentaire de
  `src/llm/providers/gemini/gemini-llm-provider.ts` modifiées.
- Le message de squash proposé, avec sujet **et** corps, sans ligne `Co-Authored-By` : le bloc de
  la spécification (section « Message de squash proposé »), recopié tel quel, `#<PR>` remplacé par
  le numéro de la PR une fois connu (ou laissé tel quel à la création), trailers `Refs: #26` /
  `Session` / `Model` / `Authorship: ai`.

Relire le fichier (outil Read) dans l'appel qui précède immédiatement toute commande qui le publie.

---

## Hypothèses (à recopier toutes dans la checklist et dans la PR)

- **H1 à H8** (#18, #19, #25) · Restent non vérifiées contre l'API réelle ; ce plan ne les
  change pas et ne lance pas le test d'intégration. Le premier lancement par Arthur renseignera
  H1, et par construction H5 et H6 ; H2 à H4 attendent #20 ; H7 et H8 restent sans chemin
  d'erreur réel.
- **P1** · Les documents de l'issue (spécification, checklist, estimation, plan) entrent dans le
  commit de la tâche 1 (spécification, « Ordre des commits » ; précédents de #18, #19, #25).
- **P2** · Rouge de TEST-1 : le fichier ne se charge pas (`SyntaxError` au lien ESM, l'import
  nommé `DEFAULT_GEMINI_MODEL` n'existant pas dans `dist/llm/index.js`), au lieu de la `TypeError`
  par test que décrit la spécification ; même cause, SPEC-1 absent. TEST-1 est découpé en quatre
  `test()` aux titres choisis par ce plan ((a) à (d) dans l'ordre de la checklist).
- **P3** · TEST-2 : la liste de `.` (l.32) est réécrite une valeur par ligne ; le test (d) porte le
  titre `` `.` and `./llm` expose GeminiLLMProvider and the GeminiConfig it takes `` et vérifie en
  plus `new llm.GeminiLLMProvider(fromLlm).id === "gemini"` (l'instance construite par `./llm`
  est lue, pas jetée) ; les types sont importés par l'import de type existant de `.` et par un
  nouvel import `GeminiConfig as LlmGeminiConfig` de `./llm`.
- **P4** · Le test « `.` and `./llm` serve no Gemini wire symbol » est vert avant et après
  SPEC-2 : il verrouille la frontière (précédent P4 de #25) ; le rouge de TEST-2 est porté par
  (a), (b), (d) et par `npm run typecheck`.
- **P5** · TEST-3 retire `GEMINI_INTEGRATION`, `GEMINI_API_KEY` et `NODE_TEST_CONTEXT` de
  l'environnement du fils **sans tenir compte de la casse** (`Object.entries(process.env)` filtré
  sur `name.toUpperCase()`) : sous Windows, `process.env` ignore la casse (constaté), et une
  variable `Gemini_Integration` copiée telle quelle activerait le test dans le fils. Le message
  d'échec de `child.status` cite `stdout` et `stderr` du fils, dont l'environnement n'a pas de
  clé. La sortie TAP de Node 22.19 a été observée (R2 levée) et le retrait de
  `NODE_TEST_CONTEXT` est nécessaire (R3 levée : hérité, il fait sauter l'exécution du fichier).
- **P6** · Garde de la règle A2 par
  `node -e "process.exit(process.env.GEMINI_INTEGRATION === undefined ? 0 : 1)"` plutôt que
  `$env:GEMINI_INTEGRATION` (PowerShell) : le builder travaille en Bash, et le garde lit la
  variable comme la lira `node --test`, sans casse et sans rien afficher.
- **P7** · Noms et emplacements choisis par ce plan dans `scripts/repo-conventions.test.mjs` :
  constante `GOOGLE_KEY_SHAPE` (avant TEST-3), constante `GEMINI_DOC_EXPECTED` (avant TEST-4),
  les trois tests ajoutés en fin de fichier ; commentaires en français comme le reste du fichier.
- **P8** · `README.md` : la ligne `const c = PROVIDERS.gemini(); …` est placée juste après
  `const a = PROVIDERS.ollama(); …`, sous « Direct, typed access to a known provider » ; la
  section « Setting up Gemini » ajoute un court exemple de construction (non exigé par la
  spécification) et la phrase sur le test manquant sans clé (D5) ; le 404 hors Gemini est décrit
  par « says "check baseURL" in its message ».
- **P9** · H6 n'a pas de test à son nom : le README et le guide la disent verrouillée par le test
  H5, qui fige l'ensemble exact des en-têtes envoyés (`tests/llm/providers/gemini/gemini-llm-provider.test.ts:118`).
  C'est la lecture de « chacune verrouillée par un test sur un double » (SPEC-4, point 5).
- **P10** · Le guide dit où vit chaque verrou (H1 à H4 dans `gemini-wire.test.ts`, H5 à H8 dans
  `gemini-llm-provider.test.ts`) et que `scripts/repo-conventions.test.mjs` vérifie que la suite
  par défaut ignore le test d'intégration ; ses deux commandes sont en code en ligne, celles du
  README en blocs.
- **P11** · `makeGemini` : JSDoc anglais repris de `makeOllama`, plus une phrase sur la clé ;
  `DEFAULT_GEMINI_MODEL` placé après `DEFAULT_OLLAMA_MODEL`, `makeGemini` après `makeOllama`.
- **P12** · TEST-6 : le commentaire de `expectFailure` mentionne `baseURL` ; le champ `baseURL`
  des cas est placé entre `fetch` et `code` ; les hôtes plantés sont en `.invalid`, domaine
  réservé jamais résolu (et les doubles n'appellent aucun réseau).
- **P13** · TEST-7 porte le commentaire `// Fixed as it is (R1 of #26): …` pour que le libellé
  inexact ne passe pas pour voulu.
- **P14** · Les mutations de TEST-6 et TEST-7 s'annulent par
  `git restore src/llm/providers/gemini/gemini-llm-provider.ts`, qui rend l'état commité à la
  tâche 2 (les deux commentaires de SPEC-2 ne décalent aucune ligne : l.97, 110, 138, 140, 141
  sont celles de la checklist).
- **P15** · Taille : 279 lignes ajoutées mesurées sur la sonde, contre environ 250 estimées
  (fourchette 210 à 300), sous le seuil de 400, sans dérogation.

## Risques

- **Appel réel accidentel** : si `GEMINI_INTEGRATION` vaut `1` dans l'environnement du builder,
  `npm run test` appelle l'API hébergée (et échoue sans clé, ou consomme du quota avec). Parade :
  le garde `node -e` de la tâche 0 et d'avant les gates ; jamais de lancement direct du fichier
  d'intégration.
- **Fuite de clé par affichage** : aucune commande du plan n'affiche l'environnement ; les seules
  valeurs de clé des tests sont factices (`cle-factice-*`). Les sorties de mutation citent
  `cle-factice-ne-pas-afficher` en clair : c'est la valeur factice, voulue.
- **`dist/` périmé** : les tests importent `dist/`, jamais `src/`. Lancer `node --test` sans
  `npm run build` juste avant fait constater l'état précédent ; le fils de TEST-3 importe aussi
  `dist/llm/index.js` et `dist/testing/index.js` (sans `dist/`, il sort en code 1 sur
  `ERR_MODULE_NOT_FOUND`, pas sur un fichier absent).
- **Fins de ligne** : les fichiers existants sont en CRLF (`core.autocrlf=true`), les blocs de ce
  plan en LF. L'outil Edit fait correspondre les fins de ligne ; s'il ne trouve pas un bloc,
  relire le fichier (outil Read) et recopier le bloc depuis la lecture, sans changer le texte. Le
  fichier créé par Write sera en LF, normalisé par git au commit.
- **Durée de TEST-3** : il lance un `node --test` imbriqué (environ 0,3 s observé) ; sans
  `timeout` dans `spawnSync`, un fils bloqué bloquerait la suite. Risque accepté : le fichier
  ignoré n'ouvre aucune connexion.
- **Numéros de ligne des contrôles 5 à 8 et des sorties TAP** : relevés sur la sonde ; ils ne
  valent que si les blocs sont recopiés à l'identique.
- **Libellé `(empty body)` inexact (R1)** : fixé tel quel par TEST-7 ; une correction future
  changera le code et ce test ensemble (issue de suivi à proposer dans la PR).
- **H1 à H8 non vérifiées** : un démenti au premier appel réel change le test nommé dans le
  guide ; aucun test de ce plan ne touche l'API réelle.
