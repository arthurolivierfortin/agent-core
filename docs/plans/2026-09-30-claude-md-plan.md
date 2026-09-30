# Plan · docs(claude-md): corriger le compte des ADR, retirer les clés DEV-xxx et déclarer la langue des documents · #7

- Issue : #7 (T:docs) https://github.com/arthurolivierfortin/agent-core/issues/7
- Checklist : `docs/specs/2026-09-30-claude-md-checklist.md`
- Spécification : `docs/specs/2026-09-30-claude-md-design.md`
- Estimation : `docs/plans/2026-09-30-claude-md-estimate.json`
- Branche : `docs/7-claude-md`, base `main` (`publication_branch` du manifeste). Elle existe déjà :
  c'est la branche du worktree `C:/Projects/Perso/agent-core/.claude/worktrees/docs+7-claude-md`,
  au niveau de `origin/main` = `030122c` (constaté le 2026-09-30 : `git log --oneline origin/main..HEAD`
  vide, `git log --oneline -1 origin/main` → `030122c feat(testing): exporter la matrice en CSV, ...`).
- Autorisation : Arthur, 2026-09-30, « je confirme les trois corrections de CLAUDE.md et la
  dérogation de langue », consignée en commentaire sur #7 (relu par le researcher avec
  `gh issue view 7 --comments` : la confirmation et l'ajout de `ROADMAP.md:139` y figurent).
- Périmètre fermé : `CLAUDE.md` (trois remplacements exacts), `ROADMAP.md` (une ligne déplacée),
  `scripts/repo-conventions.test.mjs` (quatre cas ajoutés, un import élargi). **Aucun fichier sous
  `src/` ni `tests/`**, aucune autre ligne de `CLAUDE.md`, aucun fichier `.env` lu.
- Toutes les commandes se lancent depuis la racine du worktree (répertoire courant de la session),
  chacune par son propre appel Bash, en avant-plan, `timeout` 600000 ms pour une installation, un
  test ou un gate, 120000 ms sinon. Rien en arrière-plan, aucun serveur.
- Fichiers de travail : `<dossier_tmp>/agent-core-issue7-commit-msg.txt` (message de commit,
  réécrit à chaque tâche, relu par l'outil Read avant réécriture) et
  `<dossier_tmp>/agent-core-issue7-pr-body.md` (corps de PR). Jamais `%TEMP%` ni `/tmp`.
- Modifications de fichiers : outil Edit, remplacements exacts donnés ci-dessous. Chaque chaîne
  `old_string` de ce plan a été vérifiée présente **une seule fois** dans le fichier réel.

## Ordre des tâches et dépendances

| Tâche | Élément | Dépend de | Pourquoi cet ordre |
|---|---|---|---|
| 0 | préparation (dépendances, référence de la suite) | aucune | le worktree n'a pas de `node_modules/` (constaté : `ls node_modules` → `No such file or directory`) |
| 1 | SPEC-1 + TEST-1 | 0 | élargit l'import `node:fs` (`readdirSync`) ; premier commit, versionne aussi spec, checklist, estimation et plan |
| 2 | SPEC-2 + TEST-2 | 1 | réutilise `readdirSync` importé en tâche 1 ; s'ajoute après TEST-1 |
| 3 | SPEC-3 + TEST-3 | 2 | s'ajoute après TEST-2 ; indépendante du texte des tâches 1 et 2 |
| 4 | SPEC-4 + TEST-4 | 3 | ajoute `existsSync` à l'import ; s'ajoute après TEST-3 |
| 5 | gates GATE-1 à GATE-3, cochage de la checklist (commit `chore(checklist)`), preuves de PR | 1 à 4 | |

L'ordre SPEC-1 → SPEC-4 est celui de D6 de la spécification ; aucune dépendance de données entre
les livrables, seulement l'ordre d'ajout dans le fichier de test.

## Vérifications faites par le researcher (sorties fraîches du 2026-09-30)

- `ls docs/decisions` : 20 fichiers `ADR-AGENT-0001-…` à `ADR-AGENT-0020-…`, plus `README.md`.
- `CLAUDE.md` ligne 18 contient `(ADR-AGENT-0001 à 0021)` ; ligne 20 contient
  « Les clés `DEV-xxx` citées dans les ADR et le ROADMAP renvoient » et `feat/DEV-197-test-harness` ;
  ligne 13 : `derogations: []`.
- `grep -c "DEV-xxx" ROADMAP.md` → `0` ; `grep -nE "\bDEV-[0-9]+\b" ROADMAP.md` → vide ;
  `grep -lE "\bDEV-[0-9]+\b" docs/decisions/ADR-AGENT-*.md` →
  `ADR-AGENT-0014-configurable-termination-strategy.md`, `ADR-AGENT-0018-demo-app-not-shipped-ui-component.md`.
- `ROADMAP.md` : `130:  llm/`, `139:    infrastructure/with-metrics.ts     withMetrics (LLMProvider → MetricsCollector decorator)`,
  `140:  context/`, `152:  metrics/`, `155:    services/aggregate.ts        pure: records → MetricsTotal (with RateTable)`,
  `157:  voice/                          [V4]: the whole framework`.
- `ls src/metrics/application/use-cases/` → `metrics-collector.ts`, `with-metrics.ts`.
- Fins de ligne : `git config --get core.autocrlf` → `true` ; `git ls-files --eol` → `i/lf w/crlf`
  pour `CLAUDE.md`, `ROADMAP.md` et `scripts/repo-conventions.test.mjs`. Les tests découpent par
  `/\r?\n/` et tolèrent les deux. Aucun BOM (`od -c` : `CLAUDE.md` commence par `<!-`,
  `ROADMAP.md` par `# R`).
- `node --version` → `v22.19.0`. `node --test scripts/repo-conventions.test.mjs` sur la base →
  `# tests 11`, `# pass 11`, `# fail 0`.
- **Code de test de ce plan exécuté** dans une sonde temporaire (supprimée depuis, jamais dans
  l'arbre suivi) qui lisait les fichiers réels, avec les remplacements de ce plan appliqués en
  mémoire, pas à pas : base → 4 rouges avec les messages cités tâche par tâche ; après SPEC-1 →
  1 vert, 3 rouges ; après SPEC-2 → 2/2 ; après SPEC-3 → 3/1 ; après SPEC-4 → `# pass 4`, `# fail 0`.
- **Lecture du manifeste après SPEC-3 simulée** en appelant `parse_manifest` de
  `C:/Projects/dev-kit/scripts/manifest.py` sur le texte de `CLAUDE.md` modifié en mémoire :
  `derogations` rendu à un élément (`rule` `core/langue`, `reason` intégral apostrophes comprises,
  `revue_le` `2026-12-31`), `gates` identiques aux trois d'avant. Le texte de `reason` fait
  388 caractères, sans guillemet double ni double espace.

## Hypothèses (à recopier dans la checklist, section « Hypothèses », préfixe `- [H]`, et dans la PR)

- **H1 (R1 de la spécification).** Le socle déclare `core` non dérogeable
  (`dev-kit/conventions/core.md`, tableau de `dev-kit/conventions/derogations.md`) alors que le même
  `core.md` dit que tout écart est déclaré dans `derogations`. La dérogation `core/langue` est
  écrite telle qu'Arthur l'a confirmée le 2026-09-30 ; la contradiction est signalée au juge, sans
  changer la décision. Suivi recommandé hors de cette PR : dans `dev-kit`, rendre le point de
  langue dérogeable ou consigner l'exception.
- **H2.** TEST-2 lit « la ligne de `CLAUDE.md` qui contient `` `DEV-xxx` `` » comme une ligne
  unique : il exige qu'exactement une ligne cite `` `DEV-xxx` `` (vrai aujourd'hui : ligne 20).
- **H3.** TEST-3 borne le manifeste entre la ligne égale à `<!-- core-project` et la première ligne
  égale à `-->` du fichier (le bloc est en tête de `CLAUDE.md`, lignes 1 à 14).
- **H4.** La ligne ajoutée à `ROADMAP.md` est en anglais, comme le reste du document hérité :
  couvert par « mises à jour comprises » de la dérogation (D2).
- **H5.** Les sujets de commit sont ceux de D6, à l'infinitif (forme de l'historique du dépôt :
  `exporter`, `résumer`), sans `Co-Authored-By` (D6).
- **H6 (R2 de la spécification levée).** Les commentaires de #7 ont été relus par le researcher
  (`gh issue view 7 --comments`, 2026-09-30) : ils confirment les trois corrections et l'ajout de
  `ROADMAP.md:139`, sans autre élément de périmètre.
- **H7.** L'outil Edit peut écrire des fins de ligne LF dans une copie de travail en CRLF ; sans
  effet sur l'index (`core.autocrlf=true` normalise en LF), vérifié en tâche 5 par
  `git ls-files --eol`.
- **H8.** Les documents de l'issue (spécification, checklist, estimation, plan) entrent dans le
  commit de la tâche 1, et un cinquième commit `chore(checklist)` coche les gates et consigne les
  hypothèses : même pratique que le plan de #9 (`docs/plans/2026-09-30-csv-rejeu-demo-plan.md`) ; D6 (« un SPEC = un commit ») reste respecté pour
  les quatre livrables.

## Risques

- La dérogation `core/langue` contredit la mention « non dérogeable » du socle (H1) : le juge peut
  la relever ; la PR cite la dérogation et R1 dans « Risques et suivi ».
- Hors périmètre, non corrigé : dans le sous-arbre `  metrics/` de `ROADMAP.md`,
  `interfaces/metrics-collector.ts` et `infrastructure/collector.ts` restent périmés (le code livré
  a `src/metrics/application/use-cases/metrics-collector.ts`). À proposer en issue séparée dans la PR.
- TEST-1 échouera à l'ajout d'un ADR `0021` tant que `CLAUDE.md` n'est pas mis à jour : c'est le
  but du verrou, à signaler dans la PR.

---

## Tâche 0 · préparation

1. `git branch --show-current` → sortie attendue : `docs/7-claude-md`.
2. `git log --oneline origin/main..HEAD` → sortie attendue : vide.
3. `git status --short` → sortie attendue, exactement quatre lignes :
   ```
   ?? docs/plans/2026-09-30-claude-md-estimate.json
   ?? docs/plans/2026-09-30-claude-md-plan.md
   ?? docs/specs/2026-09-30-claude-md-checklist.md
   ?? docs/specs/2026-09-30-claude-md-design.md
   ```
4. `npm ci` (timeout 600000) → sortie attendue : le script `prepare` s'exécute
   (`> tsc -p tsconfig.build.json`), puis `added 3 packages` (`@types/node`, `typescript`,
   `undici-types`, les trois entrées `node_modules/` de `package-lock.json`), code de sortie 0.
5. `npm run test` (timeout 600000) → sortie attendue : fin TAP avec `# fail 0` et `# skipped 1`
   (seul test ignoré : `tests/integration/ollama.integration.test.ts`, opt-in par
   `OLLAMA_INTEGRATION=1`, variable à ne pas poser). **Noter la valeur de `# tests` : c'est la
   référence B** ; en tâche 5, GATE-3 doit montrer `# tests` = B + 4.
6. `node --test scripts/repo-conventions.test.mjs` → sortie attendue : `# tests 11`, `# pass 11`,
   `# fail 0`.

Aucun commit dans cette tâche.

---

## Tâche 1 · SPEC-1 · `CLAUDE.md` cite `ADR-AGENT-0001 à 0020`

### 1.1 Écrire TEST-1 (issue 7)

Edit sur `scripts/repo-conventions.test.mjs`, import :

- `old_string` : `import { readFileSync } from "node:fs";`
- `new_string` : `import { readdirSync, readFileSync } from "node:fs";`

Edit sur `scripts/repo-conventions.test.mjs`, ajout en fin de fichier :

- `old_string` (fin du cas `TEST-8 (issue 9)`, deux lignes) :
  ```js
    for (const name of ["runMatrix", "replayRun"]) assert.ok(entry.includes(name), `README : ligne ./testing sans ${name}`);
  });
  ```
- `new_string` : les deux mêmes lignes, puis une ligne vide, puis :
  ```js
  test("TEST-1 (issue 7) CLAUDE.md cite l'intervalle exact des ADR", () => {
    const numbers = readdirSync(new URL("../docs/decisions/", import.meta.url))
      .map((name) => /^ADR-AGENT-(\d{4})-.+\.md$/.exec(name))
      .filter((match) => match !== null)
      .map((match) => Number(match[1]))
      .sort((a, b) => a - b);
    const count = numbers.length;
    assert.ok(count > 0, "docs/decisions/ : aucun fichier ADR-AGENT-NNNN-*.md");
    assert.deepEqual(
      numbers,
      Array.from({ length: count }, (_, index) => index + 1),
      "docs/decisions/ : numéros d'ADR non contigus depuis 0001",
    );
    const claude = readRepoFile("CLAUDE.md");
    assert.equal(claude.split("(ADR-AGENT-0001 à ").length - 1, 1, "CLAUDE.md : « (ADR-AGENT-0001 à » absent ou répété");
    const expected = `(ADR-AGENT-0001 à ${String(count).padStart(4, "0")})`;
    assert.ok(claude.includes(expected), `CLAUDE.md : intervalle des ADR attendu ${expected}`);
  });
  ```

### 1.2 Observer l'échec

`node --test scripts/repo-conventions.test.mjs` → sortie attendue (extraits), code de sortie 1 :

```
not ok 12 - TEST-1 (issue 7) CLAUDE.md cite l'intervalle exact des ADR
  error: 'CLAUDE.md : intervalle des ADR attendu (ADR-AGENT-0001 à 0020)'
# tests 12
# pass 11
# fail 1
```

Bonne raison : 20 ADR, `CLAUDE.md` dit `0021`.

### 1.3 Livrable

Edit sur `CLAUDE.md` :

- `old_string` : `(ADR-AGENT-0001 à 0021)`
- `new_string` : `(ADR-AGENT-0001 à 0020)`

Contrôle : `grep -o "(ADR-AGENT-0001 à [0-9]*)" CLAUDE.md` → sortie attendue : `(ADR-AGENT-0001 à 0020)`.

### 1.4 Constater le vert

`node --test scripts/repo-conventions.test.mjs` → sortie attendue : `ok 12 - TEST-1 (issue 7) ...`,
`# tests 12`, `# pass 12`, `# fail 0`, code 0.

### 1.5 Commit

1. Cocher `[SPEC-1]` et `[TEST-1]` dans `docs/specs/2026-09-30-claude-md-checklist.md`
   (`- [ ]` → `- [x]`, rien d'autre).
2. `git add docs/specs/2026-09-30-claude-md-design.md docs/specs/2026-09-30-claude-md-checklist.md docs/plans/2026-09-30-claude-md-estimate.json docs/plans/2026-09-30-claude-md-plan.md CLAUDE.md scripts/repo-conventions.test.mjs`
   → sortie attendue : vide ou avertissements `LF will be replaced by CRLF` seulement.
3. Écrire `<dossier_tmp>/agent-core-issue7-commit-msg.txt` (outil Write ; outil Read d'abord si le
   fichier existe), en remplaçant `<id>` par l'identifiant de session du builder et `<modèle>` par
   l'identifiant de son modèle :
   ```
   docs(claude-md): corriger le compte des ADR (0001 à 0020)

   docs/decisions/ contient ADR-AGENT-0001 à ADR-AGENT-0020, sans trou :
   CLAUDE.md annonçait 0021. Le cas TEST-1 (issue 7) de
   scripts/repo-conventions.test.mjs compte les ADR et exige l'intervalle
   exact dans CLAUDE.md. Versionne aussi la spécification, la checklist,
   l'estimation et le plan de l'issue.

   Refs: #7
   Session: <id>
   Model: <modèle>
   Authorship: ai
   ```
4. `git commit -F <dossier_tmp>/agent-core-issue7-commit-msg.txt` → sortie attendue :
   `[docs/7-claude-md <sha>] docs(claude-md): corriger le compte des ADR (0001 à 0020)`,
   `6 files changed`.

---

## Tâche 2 · SPEC-2 · les clés `DEV-xxx` ne sont plus rapportées au ROADMAP

### 2.1 Écrire TEST-2 (issue 7)

Edit sur `scripts/repo-conventions.test.mjs`, ajout après TEST-1 (issue 7) :

- `old_string` (fin de TEST-1 (issue 7), deux lignes) :
  ```js
    assert.ok(claude.includes(expected), `CLAUDE.md : intervalle des ADR attendu ${expected}`);
  });
  ```
- `new_string` : les deux mêmes lignes, puis une ligne vide, puis :
  ```js
  test("TEST-2 (issue 7) CLAUDE.md ne rapporte les clés DEV-xxx qu'aux ADR", () => {
    const claude = readRepoFile("CLAUDE.md");
    const keyLines = splitLines(claude).filter((line) => line.includes("`DEV-xxx`"));
    assert.equal(keyLines.length, 1, "CLAUDE.md : une et une seule ligne doit citer `DEV-xxx`");
    assert.ok(keyLines[0].includes("citées dans les ADR renvoient"), "CLAUDE.md : les clés DEV-xxx ne sont pas rapportées aux seuls ADR");
    assert.ok(!keyLines[0].includes("ROADMAP"), "CLAUDE.md : les clés DEV-xxx sont encore rapportées au ROADMAP");
    assert.ok(claude.includes("feat/DEV-197-test-harness"), "CLAUDE.md : branche d'origine feat/DEV-197-test-harness disparue");
    const roadmap = readRepoFile("ROADMAP.md");
    assert.ok(!roadmap.includes("DEV-xxx"), "ROADMAP.md contient DEV-xxx");
    assert.ok(!/\bDEV-\d+\b/.test(roadmap), "ROADMAP.md contient une clé DEV-NNN");
    const adrs = readdirSync(new URL("../docs/decisions/", import.meta.url)).filter(
      (name) => name.startsWith("ADR-AGENT-") && name.endsWith(".md"),
    );
    assert.ok(
      adrs.some((name) => /\bDEV-\d+\b/.test(readRepoFile(`docs/decisions/${name}`))),
      "docs/decisions/ : aucun ADR ne cite de clé DEV-NNN, CLAUDE.md ne doit plus les rapporter aux ADR",
    );
  });
  ```

### 2.2 Observer l'échec

`node --test scripts/repo-conventions.test.mjs` → sortie attendue (extraits), code 1 :

```
not ok 13 - TEST-2 (issue 7) CLAUDE.md ne rapporte les clés DEV-xxx qu'aux ADR
  error: 'CLAUDE.md : les clés DEV-xxx ne sont pas rapportées aux seuls ADR'
# tests 13
# pass 12
# fail 1
```

Bonne raison : la ligne 20 dit encore « citées dans les ADR et le ROADMAP renvoient ».

### 2.3 Livrable

Edit sur `CLAUDE.md` :

- `old_string` : ``Les clés `DEV-xxx` citées dans les ADR et le ROADMAP renvoient``
- `new_string` : ``Les clés `DEV-xxx` citées dans les ADR renvoient``

Contrôles :
- `grep -c "ROADMAP" CLAUDE.md` → sortie attendue : `0`.
- `grep -c "feat/DEV-197-test-harness" CLAUDE.md` → sortie attendue : `1`.

### 2.4 Constater le vert

`node --test scripts/repo-conventions.test.mjs` → `# tests 13`, `# pass 13`, `# fail 0`, code 0.

### 2.5 Commit

1. Cocher `[SPEC-2]` et `[TEST-2]` dans la checklist.
2. `git add docs/specs/2026-09-30-claude-md-checklist.md CLAUDE.md scripts/repo-conventions.test.mjs`
   → sortie attendue : vide ou avertissements `LF will be replaced by CRLF` seulement.
3. Message (outil Read puis Write sur `<dossier_tmp>/agent-core-issue7-commit-msg.txt`) :
   ```
   docs(claude-md): ne plus rapporter les clés DEV-xxx au ROADMAP

   ROADMAP.md ne cite plus aucune clé DEV-NNN depuis #1 ; les ADR 0014 et
   0018 en citent encore. La phrase d'origine de CLAUDE.md ne parle plus
   que des ADR ; la branche d'origine feat/DEV-197-test-harness reste
   citée. Le cas TEST-2 (issue 7) verrouille les trois faits.

   Refs: #7
   Session: <id>
   Model: <modèle>
   Authorship: ai
   ```
4. `git commit -F <dossier_tmp>/agent-core-issue7-commit-msg.txt` → sortie attendue :
   `[docs/7-claude-md <sha>] docs(claude-md): ne plus rapporter les clés DEV-xxx au ROADMAP`,
   `3 files changed`.

---

## Tâche 3 · SPEC-3 · le manifeste déclare la dérogation `core/langue`

### 3.1 Écrire TEST-3 (issue 7)

Edit sur `scripts/repo-conventions.test.mjs`, ajout après TEST-2 (issue 7) :

- `old_string` (fin de TEST-2 (issue 7), trois lignes) :
  ```js
      "docs/decisions/ : aucun ADR ne cite de clé DEV-NNN, CLAUDE.md ne doit plus les rapporter aux ADR",
    );
  });
  ```
- `new_string` : les trois mêmes lignes, puis une ligne vide, puis :
  ```js
  test("TEST-3 (issue 7) le manifeste déclare la dérogation de langue", () => {
    const lines = splitLines(readRepoFile("CLAUDE.md"));
    const start = lines.indexOf("<!-- core-project");
    const end = lines.indexOf("-->");
    assert.ok(start !== -1 && end > start, "CLAUDE.md : bloc <!-- core-project ... --> introuvable");
    const block = lines.slice(start + 1, end);
    assert.ok(!block.includes("derogations: []"), "CLAUDE.md : le manifeste déclare encore derogations: []");
    const at = block.indexOf("derogations:");
    assert.notEqual(at, -1, "CLAUDE.md : ligne derogations: absente du manifeste");
    assert.equal(block[at + 1], "  - rule: core/langue", "CLAUDE.md : derogations: n'est pas suivi de la règle core/langue");
    const reason = block[at + 2] ?? "";
    assert.ok(reason.startsWith('    reason: "') && reason.endsWith('"'), "CLAUDE.md : la ligne reason n'est pas entre guillemets doubles");
    assert.equal(reason.split('"').length - 1, 2, "CLAUDE.md : guillemet double dans le texte de reason");
    assert.ok(!reason.slice(4).includes("  "), "CLAUDE.md : deux espaces consécutifs dans reason");
    for (const expected of [
      "anglais",
      "français",
      "README.md",
      "ROADMAP.md",
      "docs/guide-agent-package.md",
      "docs/decisions/",
      "docs/plans/2026-07-21-v1-decoupage-pr.md",
      "#7",
    ]) {
      assert.ok(reason.includes(expected), `CLAUDE.md : reason de la dérogation sans ${expected}`);
    }
    assert.equal(block[at + 3], "    revue_le: 2026-12-31", "CLAUDE.md : revue_le de la dérogation absent ou différent");
    for (const gate of [
      "  - id: GATE-1  name: build  cmd: npm run build",
      "  - id: GATE-2  name: typecheck  cmd: npm run typecheck",
      "  - id: GATE-3  name: test  cmd: npm run test",
    ]) {
      assert.ok(block.includes(gate), `CLAUDE.md : gate perdu dans le manifeste : ${gate.trim()}`);
    }
  });
  ```

### 3.2 Observer l'échec

`node --test scripts/repo-conventions.test.mjs` → sortie attendue (extraits), code 1 :

```
not ok 14 - TEST-3 (issue 7) le manifeste déclare la dérogation de langue
  error: 'CLAUDE.md : le manifeste déclare encore derogations: []'
# tests 14
# pass 13
# fail 1
```

### 3.3 Livrable

Edit sur `CLAUDE.md` (ligne 13, seule occurrence) :

- `old_string` : `derogations: []`
- `new_string`, exactement quatre lignes (indentations de 2 puis 4 espaces ; la ligne `reason` est
  la phrase de D2, sans aucun changement) :
  ```
  derogations:
    - rule: core/langue
      reason: "le corps des documents hérités de NATHAN et copiés le 2026-09-29 reste en anglais, sans traduction, mises à jour comprises (README.md, ROADMAP.md, docs/guide-agent-package.md, docs/decisions/, docs/conventions/, docs/theory/, docs/schema/, docs/plans/2026-07-21-v1-decoupage-pr.md) ; leurs notes d'origine et tout nouveau document sont en français ; décision d'Arthur du 2026-09-30 sur #7"
      revue_le: 2026-12-31
  ```
  (Dans le fichier, `derogations:` est en colonne 0, `- rule` précédé de 2 espaces, `reason` et
  `revue_le` de 4 espaces ; le bloc ci-dessus est indenté de 2 pour la liste Markdown.)

Contrôles :
- `sed -n 12,18p CLAUDE.md` → sortie attendue :
  ```
  ux_verifier: disabled
  derogations:
    - rule: core/langue
      reason: "le corps des documents hérités de NATHAN ... sur #7"
      revue_le: 2026-12-31
  -->

  ```
  (la ligne `reason` complète ; `-->` en ligne 17, ligne 18 vide).
- `python C:/Projects/dev-kit/scripts/manifest.py --project . --json` → sortie attendue : les
  champs `nom` à `evaluator` inchangés (`"evaluator": "enabled"`, les trois `gates`
  `GATE-1 build npm run build`, `GATE-2 typecheck npm run typecheck`, `GATE-3 test npm run test`),
  et :
  ```
    "derogations": [
      {
        "rule": "core/langue",
        "reason": "le corps des documents hérités de NATHAN et copiés le 2026-09-29 reste en anglais, sans traduction, mises à jour comprises (README.md, ROADMAP.md, docs/guide-agent-package.md, docs/decisions/, docs/conventions/, docs/theory/, docs/schema/, docs/plans/2026-07-21-v1-decoupage-pr.md) ; leurs notes d'origine et tout nouveau document sont en français ; décision d'Arthur du 2026-09-30 sur #7",
        "revue_le": "2026-12-31"
      }
    ]
  ```
  **Conserver cette sortie** : c'est la preuve de lecture par `manifest.py` exigée dans la PR.

### 3.4 Constater le vert

`node --test scripts/repo-conventions.test.mjs` → `# tests 14`, `# pass 14`, `# fail 0`, code 0.

### 3.5 Commit

1. Cocher `[SPEC-3]` et `[TEST-3]` dans la checklist.
2. `git add docs/specs/2026-09-30-claude-md-checklist.md CLAUDE.md scripts/repo-conventions.test.mjs`
3. Message (outil Read puis Write sur `<dossier_tmp>/agent-core-issue7-commit-msg.txt`) :
   ```
   docs(claude-md): déclarer la dérogation de langue des documents hérités

   Le manifeste core-project déclare core/langue : le corps des documents
   hérités de NATHAN reste en anglais, mises à jour comprises ; notes
   d'origine et nouveaux documents en français. Décision d'Arthur du
   2026-09-30 sur #7, revue le 2026-12-31. manifest.py lit la dérogation
   et rend les trois gates inchangés. Le cas TEST-3 (issue 7) verrouille la
   forme ligne à ligne.

   Refs: #7
   Session: <id>
   Model: <modèle>
   Authorship: ai
   ```
4. `git commit -F <dossier_tmp>/agent-core-issue7-commit-msg.txt` → sortie attendue :
   `[docs/7-claude-md <sha>] docs(claude-md): déclarer la dérogation de langue des documents hérités`,
   `3 files changed`.

---

## Tâche 4 · SPEC-4 · `ROADMAP.md` place `withMetrics` sous `metrics/application/use-cases/`

### 4.1 Écrire TEST-4 (issue 7)

Edit sur `scripts/repo-conventions.test.mjs`, import :

- `old_string` : `import { readdirSync, readFileSync } from "node:fs";`
- `new_string` : `import { existsSync, readdirSync, readFileSync } from "node:fs";`

Edit sur `scripts/repo-conventions.test.mjs`, ajout après TEST-3 (issue 7) :

- `old_string` (fin de TEST-3 (issue 7), trois lignes) :
  ```js
      assert.ok(block.includes(gate), `CLAUDE.md : gate perdu dans le manifeste : ${gate.trim()}`);
    }
  });
  ```
- `new_string` : les trois mêmes lignes, puis une ligne vide, puis :
  ```js
  test("TEST-4 (issue 7) ROADMAP place withMetrics sous metrics/application/use-cases", () => {
    const roadmap = readRepoFile("ROADMAP.md");
    assert.ok(!roadmap.includes("infrastructure/with-metrics.ts"), "ROADMAP.md : ancien emplacement infrastructure/with-metrics.ts");
    const lines = splitLines(roadmap);
    const llm = lines.indexOf("  llm/");
    const context = lines.indexOf("  context/");
    assert.ok(llm !== -1 && context > llm, "ROADMAP.md : sous-arbres llm/ puis context/ introuvables");
    assert.ok(!lines.slice(llm, context).some((line) => line.includes("with-metrics")), "ROADMAP.md : with-metrics encore sous llm/");
    const metrics = lines.indexOf("  metrics/");
    const voice = lines.findIndex((line, index) => index > metrics && line.startsWith("  voice/"));
    assert.ok(metrics !== -1 && voice !== -1, "ROADMAP.md : sous-arbres metrics/ puis voice/ introuvables");
    assert.ok(
      lines.slice(metrics, voice).some((line) => line.includes("application/use-cases/with-metrics.ts") && line.includes("withMetrics")),
      "ROADMAP.md : withMetrics absent de metrics/application/use-cases/",
    );
    assert.ok(
      existsSync(new URL("../src/metrics/application/use-cases/with-metrics.ts", import.meta.url)),
      "src/metrics/application/use-cases/with-metrics.ts introuvable",
    );
  });
  ```

### 4.2 Observer l'échec

`node --test scripts/repo-conventions.test.mjs` → sortie attendue (extraits), code 1 :

```
not ok 15 - TEST-4 (issue 7) ROADMAP place withMetrics sous metrics/application/use-cases
  error: 'ROADMAP.md : ancien emplacement infrastructure/with-metrics.ts'
# tests 15
# pass 14
# fail 1
```

### 4.3 Livrable

Edit 1 sur `ROADMAP.md` (retrait de la ligne 139) :

- `old_string` (deux lignes) :
  ```
      infrastructure/with-metrics.ts     withMetrics (LLMProvider → MetricsCollector decorator)
    context/
  ```
- `new_string` (une ligne) :
  ```
    context/
  ```
  (Dans le fichier : `    infrastructure/…` a 4 espaces de tête, `  context/` en a 2.)

Edit 2 sur `ROADMAP.md` (ajout sous `  metrics/`) :

- `old_string` : `    services/aggregate.ts        pure: records → MetricsTotal (with RateTable)`
- `new_string` (deux lignes, 4 espaces de tête chacune, 3 espaces entre `.ts` et `withMetrics`) :
  ```
      services/aggregate.ts        pure: records → MetricsTotal (with RateTable)
      application/use-cases/with-metrics.ts   withMetrics (LLMProvider → MetricsCollector decorator)
  ```

Contrôles :
- `grep -n "with-metrics" ROADMAP.md` → sortie attendue, une seule ligne :
  `155:    application/use-cases/with-metrics.ts   withMetrics (LLMProvider → MetricsCollector decorator)`.
- `sed -n 151,156p ROADMAP.md` → sortie attendue :
  ```
    metrics/
      models/index.ts              UsageRecord · MetricsTotal · RateTable
      interfaces/metrics-collector.ts
      services/aggregate.ts        pure: records → MetricsTotal (with RateTable)
      application/use-cases/with-metrics.ts   withMetrics (LLMProvider → MetricsCollector decorator)
      infrastructure/collector.ts  MetricsCollector
  ```
  (Les lignes `interfaces/metrics-collector.ts` et `infrastructure/collector.ts` restent : hors
  périmètre, voir « Risques ».)

### 4.4 Constater le vert

`node --test scripts/repo-conventions.test.mjs` → `# tests 15`, `# pass 15`, `# fail 0`, code 0.

### 4.5 Commit

1. Cocher `[SPEC-4]` et `[TEST-4]` dans la checklist.
2. `git add docs/specs/2026-09-30-claude-md-checklist.md ROADMAP.md scripts/repo-conventions.test.mjs`
3. Message (outil Read puis Write sur `<dossier_tmp>/agent-core-issue7-commit-msg.txt`) :
   ```
   docs(roadmap): placer withMetrics sous metrics/application/use-cases

   La carte Full tree de ROADMAP.md plaçait withMetrics dans
   llm/infrastructure/ ; il est livré dans
   src/metrics/application/use-cases/with-metrics.ts (PR #13). La ligne
   passe dans le sous-arbre metrics/, après services/aggregate.ts. Le cas
   TEST-4 (issue 7) verrouille l'emplacement et l'existence du fichier.

   Refs: #7
   Session: <id>
   Model: <modèle>
   Authorship: ai
   ```
4. `git commit -F <dossier_tmp>/agent-core-issue7-commit-msg.txt` → sortie attendue :
   `[docs/7-claude-md <sha>] docs(roadmap): placer withMetrics sous metrics/application/use-cases`,
   `3 files changed`.

---

## Tâche 5 · gates, cochage de la checklist et preuves de PR

### 5.1 Gates du manifeste

Commandes lues dans `python C:/Projects/dev-kit/scripts/manifest.py --project . --json`, chacune
par son propre appel, timeout 600000 :

| Gate | Commande | Sortie attendue |
|---|---|---|
| GATE-1 build | `npm run build` | `> tsc -p tsconfig.build.json`, code 0, aucune erreur |
| GATE-2 typecheck | `npm run typecheck` | `> tsc --noEmit`, code 0, aucune erreur (`tsconfig.json` n'inclut que `src` et `tests`, pas `scripts/`) |
| GATE-3 test | `npm run test` | fin TAP : `# tests` = B + 4 (B relevé en tâche 0), `# fail 0`, `# skipped 1`, et les quatre lignes `ok … - TEST-1 (issue 7) CLAUDE.md cite l'intervalle exact des ADR`, `ok … - TEST-2 (issue 7) CLAUDE.md ne rapporte les clés DEV-xxx qu'aux ADR`, `ok … - TEST-3 (issue 7) le manifeste déclare la dérogation de langue`, `ok … - TEST-4 (issue 7) ROADMAP place withMetrics sous metrics/application/use-cases` |

Juste après GATE-3 : `git status --short` → sortie attendue : vide (la suite n'écrit aucun fichier
suivi ; `dist/` et `node_modules/` sont ignorés).

### 5.2 Cocher les gates et consigner les hypothèses

Dans `docs/specs/2026-09-30-claude-md-checklist.md` : cocher `[GATE-1]`, `[GATE-2]`, `[GATE-3]`
(`- [ ]` → `- [x]`), et inscrire sous `## Hypothèses` les lignes H1 à H8 de la section
« Hypothèses » de ce plan, une par ligne, préfixées `- [H]`, recopiées en entier.

1. `grep -c "\- \[ \]" docs/specs/2026-09-30-claude-md-checklist.md` → sortie attendue : `0`.
2. `grep -c "^- \[H\]" docs/specs/2026-09-30-claude-md-checklist.md` → sortie attendue : `8`.
3. `git add docs/specs/2026-09-30-claude-md-checklist.md`
4. Message (outil Read puis Write sur `<dossier_tmp>/agent-core-issue7-commit-msg.txt`) :
   ```
   chore(checklist): cocher les gates et consigner les hypothèses

   Refs: #7
   Session: <id>
   Model: <modèle>
   Authorship: ai
   ```
5. `git commit -F <dossier_tmp>/agent-core-issue7-commit-msg.txt` → sortie attendue :
   `[docs/7-claude-md <sha>] chore(checklist): cocher les gates et consigner les hypothèses`,
   `1 file changed`.

### 5.3 Contrôles de périmètre et de forme

Chaque commande par son propre appel ; résultats à recopier dans le corps de PR, chemins relatifs
au dépôt :

1. `git fetch origin` → sortie attendue : vide ou une ligne de mise à jour.
2. `git log --oneline HEAD..origin/main` → sortie attendue : vide (sinon `main` a bougé : le
   signaler au pilote avant la PR, sans rebase ni merge décidé seul).
3. `git diff --name-only origin/main...HEAD` → sortie attendue, exactement ces 7 chemins :
   ```
   CLAUDE.md
   ROADMAP.md
   docs/plans/2026-09-30-claude-md-estimate.json
   docs/plans/2026-09-30-claude-md-plan.md
   docs/specs/2026-09-30-claude-md-checklist.md
   docs/specs/2026-09-30-claude-md-design.md
   scripts/repo-conventions.test.mjs
   ```
   Aucun chemin sous `src/` ni `tests/`.
4. `git diff --stat origin/main...HEAD -- CLAUDE.md ROADMAP.md` → sortie attendue :
   `CLAUDE.md  | 9 ++++++---` (3 lignes retirées : 13, 18, 20 ; 6 ajoutées), `ROADMAP.md | 2 +-`,
   `2 files changed, 7 insertions(+), 4 deletions(-)`.
5. `git ls-files --eol CLAUDE.md ROADMAP.md scripts/repo-conventions.test.mjs` → sortie attendue :
   `i/lf` pour les trois (H7).
6. `git log --format=%B origin/main..HEAD` → cinq messages (quatre de D6, plus
   `chore(checklist)`), chacun avec `Refs: #7`, `Session:`, `Model:`, `Authorship: ai`, aucun
   `Co-Authored-By`.
7. `python C:/Projects/dev-kit/scripts/manifest.py --project . --json` → sortie de l'étape 3.3
   (preuve de lecture de la dérogation, lancée depuis la racine du worktree).

### 5.4 Corps de PR

`<dossier_tmp>/agent-core-issue7-pr-body.md` (outil Write ; outil Read d'abord s'il existe), à
relire (outil Read) dans l'appel qui précède immédiatement toute commande qui le publie. Contenu :

- sorties de GATE-1 à GATE-3, les quatre cas `(issue 7)` à `ok` ;
- les rouges observés : TEST-1 (`CLAUDE.md : intervalle des ADR attendu (ADR-AGENT-0001 à 0020)`),
  TEST-2 (`CLAUDE.md : les clés DEV-xxx ne sont pas rapportées aux seuls ADR`), TEST-3
  (`CLAUDE.md : le manifeste déclare encore derogations: []`), TEST-4
  (`ROADMAP.md : ancien emplacement infrastructure/with-metrics.ts`) ;
- extrait `gates` et `derogations` de la sortie de `manifest.py --project .` (contrôle 7) ;
- les contrôles 1 à 6 de 5.3 avec leur résultat ;
- section « Risques et suivi » : citation de la dérogation `core/langue` (`rule`, `reason`,
  `revue_le`), exigée par `dev-kit/conventions/derogations.md` (« Comment un agent applique une
  dérogation », point 3) ; H1 (R1 de la spécification, `core` non dérogeable) ; les lignes
  périmées restantes du sous-arbre `metrics/` de `ROADMAP.md`, proposées en issue séparée ; le verrou
  de TEST-1 à l'ajout d'un ADR ;
- section « Hypothèses » : H1 à H8, chacune recopiée en entier ;
- aucun fichier `.env` ouvert ni lu ; aucun fichier sous `src/` ni `tests/` modifié ;
  dérogation invoquée : `core/langue` (la ligne ajoutée à `ROADMAP.md` est en anglais) ;
- le message de squash proposé, sans ligne `Co-Authored-By`, trailers `Refs: #7` / `Session` /
  `Model` / `Authorship: ai`.
