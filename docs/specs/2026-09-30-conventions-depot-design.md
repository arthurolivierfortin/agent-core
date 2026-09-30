# Spécification · mettre la copie aux conventions du dépôt · #1

Date : 2026-09-30
Issue : https://github.com/arthurolivierfortin/agent-core/issues/1 (T:chore)
Checklist : docs/specs/2026-09-30-conventions-depot-checklist.md

## Objectif

Faire de la copie du package d'agents de NATHAN un dépôt qui se lit et se pilote sous ses propres conventions (dev-kit, issues GitHub, consommateur Marcel), sans toucher au code du moteur ni à sa suite de tests.

## Source de l'issue (texte relevé le 2026-09-30)

Titre : « chore: mettre la copie aux conventions du dépôt (ROADMAP, notes d'origine, labels, fiche KB) ». À faire, liste fermée de l'issue :

1. `ROADMAP.md` : garder le plan V1 à V4, remplacer les références Jira par les issues de ce dépôt, retirer ce qui n'a de sens qu'à l'université (IDE NATHAN comme consommateur, S7 janvier 2027) ; le consommateur de référence devient Marcel (bloc agent).
2. `docs/guide-agent-package.md` et les ADR : une note d'en-tête qui dit que les clés `DEV-xxx` renvoient au projet d'origine ; aucun ADR n'est réécrit.
3. Labels créés par `issue_cycle.py labels` (T:*, S:*, P:high, appcore-candidat) ; jalons H1 à H3 posés sur chaque issue.
4. `.env.example` : vérifier qu'il ne nomme que des variables, aucune valeur.
5. Fiche projet dans le KB (`kb/projects/agent-core.md`) : ce que c'est, d'où ça vient, ce qui manque, le lien avec Marcel J8 et Maestro.

Contrainte de l'issue : documentation et outillage seulement ; aucun changement sous `src/` ni `tests/`.

## État constaté dans le code (lecture du 2026-09-30, branche `chore/1-conventions-depot`)

- `ROADMAP.md` ne contient **aucune** clé `DEV-xxx` (contrairement à ce que dit `CLAUDE.md`). Ses renvois au projet d'origine sont : titre `# Roadmap: nathan-agent-core` (l.1) ; `docs/plans/2026-07-21-v1-decoupage-pr.md` (l.5 et l.40, fichier absent de ce dépôt) ; consommateur « NATHAN's accessible IDE (project ADR-0006, Flux E) », « blind people », « MicroPython » (l.11) ; « integration into the IDE repo » (l.57) ; « Accessibility stake: for a blind person dictating their code » (l.90) ; section « ## The cycle with the IDE repo » (l.182 à 194) avec `PMC/CONTEXT-AGENT.md`, la clé Jira `TECH-19`, « S7 (January 2027) » (l.192) ; tableau « Deferred with no date » : « IDE repo » (l.212, l.215), « IDE integration » (l.216).
- `docs/guide-agent-package.md` : clés `DEV-194` (l.253, l.255) ; renvois à `PMC/CONTEXT-AGENT.md` (l.7), `PMC/` (l.44), `CONTRIBUTING.md` (l.18, l.250 ; fichier absent de ce dépôt) ; `docs/specs/` et `docs/plans/` décrits « Not versioned (.gitignore) » (l.15, l.16). Règle du guide (l.28) : pas de tiret cadratin dans les livrables écrits.
- ADR : `docs/decisions/ADR-AGENT-0001` à `ADR-AGENT-0020` (0021 n'existe pas, contrairement à `CLAUDE.md`) ; clés `DEV-xxx` dans `ADR-AGENT-0014` et `ADR-AGENT-0018`. `docs/decisions/README.md` pose l'immuabilité (« An ADR is immutable once accepted », l.5) et renvoie à `NATHAN-console/docs/decisions/` et `PMC/CONTEXT-AGENT.md` (l.3, l.9, l.55).
- `.env.example` (racine) porte trois **valeurs** : `LLM_PROVIDER=ollama`, `OLLAMA_HOST=http://localhost:11434`, `OLLAMA_MODEL=qwen2.5:0.5b`. `examples/web-chat/.env.example` porte `VITE_OLLAMA_HOST=http://localhost:11434`, `VITE_OLLAMA_MODEL=qwen2.5:0.5b`. Ce sont les défauts du code, pas des secrets.
- Les lecteurs de ces variables retombent sur leur défaut par `??` : `src/llm/providers/index.ts:26` (`process.env.OLLAMA_MODEL ?? DEFAULT_OLLAMA_MODEL`), `src/llm/providers/ollama/ollama-llm-provider.ts:50` (`config.baseURL ?? process.env.OLLAMA_HOST ?? "http://localhost:11434"`), `examples/web-chat/src/app/config.ts:13-14` (`import.meta.env.VITE_OLLAMA_* ?? DEFAULT_*`). `??` ne remplace pas une chaîne vide.
- `.gitignore` ignore `/docs/specs` (l.13) et `/docs/plans` (l.17), « décision de l'équipe » NATHAN. Or la boucle dev-kit versionne ces dossiers : `/dev-loop` retrouve la checklist par `ls docs/specs/*-checklist.md`, `builder` coche la checklist « dans le commit de l'élément », `evaluator` compte `docs/plans/<date>-<slug>-estimate.json` parmi les fichiers de la PR. En l'état, la checklist de cette issue ne peut pas être commitée.
- `package.json` : `"test": "npm run build && node --test"`, sans motif ; Node 22 applique alors ses motifs par défaut, dont `**/*.test.mjs`. `tsconfig.json` n'inclut que `src` et `tests` : un `.mjs` hors de ces dossiers n'entre pas dans `npm run typecheck`.
- Manifeste (`CLAUDE.md`, bloc `core-project`) : gates `GATE-1 build` (`npm run build`), `GATE-2 typecheck` (`npm run typecheck`), `GATE-3 test` (`npm run test`) ; `derogations: []`.

## Périmètre

Dans la PR :

- `.gitignore` : `docs/specs/` et `docs/plans/` deviennent versionnés (SPEC-1).
- `.env.example` et `examples/web-chat/.env.example` : variables nommées, sans valeur, sous forme commentée (SPEC-2, SPEC-3).
- `docs/guide-agent-package.md` : note d'en-tête (SPEC-4).
- `docs/decisions/README.md` : note d'en-tête commune aux ADR ; aucun fichier `ADR-AGENT-*` modifié (SPEC-5).
- `ROADMAP.md` : consommateur Marcel, retrait des éléments universitaires, renvois aux issues #2, #3, #4, retrait des renvois locaux de l'origine (SPEC-6 à SPEC-10).
- `scripts/repo-conventions.test.mjs` : un cas de test par SPEC (TEST-1 à TEST-10).

Hors PR (actions GitHub ou autre dépôt, voir « Actions hors PR ») :

- labels et jalons (SPEC-11, barré : déjà fait) ;
- note KB (SPEC-12, barré : déposée par `/kb-note` dans `dev-kit/kb/inbox/agent-core/`, jamais dans `kb/projects/`).

Hors périmètre (constaté, non traité ici) :

- `README.md` l.12 (« Private, restricted package (`@a-world-felt`). Repo: `A-World-Felt/NATHAN-agent-package` ») et la section « Installation » (registre `A-World-Felt`) : relèvent de la publication, #4 (jalon H3).
- `package.json` `publishConfig` : #4.
- Corps du guide (sections « Branch and commit conventions », « Where to find the why ») et titre `nathan-agent-core` de `docs/decisions/README.md` : non réécrits ; la note d'en-tête les déclare caducs.
- `docs/schema/README.md`, `docs/theory/**`, `docs/conventions/architecture.md` : renvois à NATHAN non visés par l'issue.
- Traduction en français des documents anglais (`ROADMAP.md`, guide, ADR) : non demandée. Le manifeste ne porte aucune dérogation « documentation en anglais » ; signalé au pilote.
- `CLAUDE.md` : la prose dit « ADR-AGENT-0001 à 0021 » (0020 est le dernier) et « clés DEV-xxx citées dans ... le ROADMAP » (il n'y en a pas). Aucun agent ne modifie `CLAUDE.md` ; signalé au pilote.
- Ligne `_jira-scratch/` de `.gitignore` : conservée (elle protège d'un `.env` copié si le dossier réapparaît).
- Fiche `dev-kit/kb/projects/nathan-agent-package.md` : consolidation par `/dream` seulement.

## Comportement attendu

### SPEC-1 · `.gitignore`

Retirer les lignes `/docs/specs` et `/docs/plans` et leurs commentaires (l.12 « # spec de travail, non versionnée (décision de l'équipe) », l.15 et l.16 « # plans de travail, non versionnés ... »). Toutes les autres lignes restent identiques. Le commit de SPEC-1 ajoute aussi au suivi la spécification, la checklist et, s'ils existent, le plan et l'estimation de cette issue, désormais visibles de git.

### SPEC-2 · `.env.example` (racine)

Chaque variable est nommée sur une ligne commentée sans valeur ; aucune valeur n'apparaît, ni en affectation ni en commentaire. Contenu cible :

```
# Copy to `.env` (never commit it). The APPLICATION loads this file;
# the library only reads process.env (CLAUDE.md, packaging).
# Every variable is optional: uncomment it and give it a value only to
# override its default, documented in README.md (Setting up Ollama, Configuration).

# Active LLM provider: must match a key of the PROVIDERS union.
# LLM_PROVIDER=

# Ollama: local, free, no key.
# OLLAMA_HOST=
# OLLAMA_MODEL=
```

Chemin d'erreur écarté : `OLLAMA_HOST=` non commenté, une fois copié en `.env` et chargé, donne `process.env.OLLAMA_HOST === ""`, que `??` ne remplace pas : `baseURL` vaudrait `""` et `PROVIDERS.ollama()` déclarerait un modèle `""`. La forme commentée garde le défaut du code.

### SPEC-3 · `examples/web-chat/.env.example`

Même règle ; contenu cible :

```
# Copy to .env to target a different server or model. Read at `vite` startup
# (restart the dev server after changing it). Every variable is optional:
# uncomment it and give it a value only to override its default, documented
# in examples/web-chat/README.md (Configuration table).

# VITE_OLLAMA_HOST=
# VITE_OLLAMA_MODEL=
```

Même motif d'erreur : Vite expose une variable vide comme `""`, et `config.ts` utilise `??`.

### SPEC-4 · note d'en-tête du guide

Insérer en tête de `docs/guide-agent-package.md`, avant `# Claude Code Guidelines for nathan-agent-core`, un bloc de citation en français suivi d'une ligne vide. La première ligne du fichier commence par `> **Note d'origine`. Le bloc dit, sans tiret cadratin (règle l.28 du guide) :

- que le guide est copié tel quel, le 2026-09-29, du package d'agents de NATHAN (`A-World-Felt/NATHAN-agent-package`) ;
- que les clés `DEV-xxx` renvoient au suivi Jira de ce projet d'origine, et qu'ici le suivi est en issues GitHub de `arthurolivierfortin/agent-core` ;
- que les renvois à `PMC/`, `NATHAN-console` et `CONTRIBUTING.md` visent des dépôts ou fichiers de l'origine, absents ici ;
- que les conventions de branches, de commits et de PR sont celles de dev-kit (`CLAUDE.md`), et non la section « Branch and commit conventions » ; que `docs/specs/` et `docs/plans/` sont versionnés.

Le reste du fichier est inchangé.

### SPEC-5 · note d'en-tête commune aux ADR

Insérer en tête de `docs/decisions/README.md`, avant `# Architecture decisions: nathan-agent-core`, un bloc de citation en français suivi d'une ligne vide. La première ligne commence par `> **Note d'origine`. Le bloc dit, sans tiret cadratin :

- que les ADR `ADR-AGENT-0001` à `ADR-AGENT-0020` sont copiés du projet d'origine le 2026-09-29 et qu'aucun ADR n'est réécrit (la phrase contient littéralement « aucun ADR n'est réécrit ») ;
- que les clés `DEV-xxx` qu'ils citent renvoient au suivi Jira du projet d'origine ;
- que `NATHAN-console`, `PMC/` et les ADR de projet `ADR-0001` à `ADR-0007` sont des dépôts et documents de l'origine, absents ici ;
- qu'une décision revue ici prend un nouvel ADR, selon la règle d'immuabilité déjà écrite dans ce README.

Aucun fichier `docs/decisions/ADR-AGENT-*.md` n'est modifié.

### SPEC-6 · ROADMAP, consommateur de référence

Dans `## Target consumer`, remplacer le paragraphe l.11 (« The package first serves **NATHAN's accessible IDE** ... MicroPython. ») par :

« The reference consumer is **Marcel**: its agent block (milestone J8) imports this package, and its first consumption, J8.1, is tracked by #4 (milestone H3). »

La contrainte permanente (l.13 à l.17) est conservée.

### SPEC-7 · ROADMAP, section du cycle

- Titre l.182 `## The cycle with the IDE repo` devient `## The cycle with Marcel`.
- Dans le schéma (l.187), `integration into the IDE repo` devient `integration into Marcel (#4)` ; l'alignement des lignes l.188 et l.189 est ajusté.
- Le paragraphe l.192 (« **Point of vigilance.** According to `PMC/CONTEXT-AGENT.md` ... `TECH-19` ... S7 (January 2027) ... ») est supprimé.
- Le paragraphe l.194 devient : « Practical consequence: **keep V1 truly minimal.** Every abstraction added before Marcel consumes the package is a bet with no feedback, and that is exactly how you build the wrong abstraction. »

### SPEC-8 · ROADMAP, autres mentions de l'IDE

- l.57 : `**Then**: integration into the IDE repo, and back here when a wall appears.` devient `**Then**: integration into Marcel (#4), and back here when a wall appears.`
- l.90 : la ligne « Accessibility stake: for a blind person dictating their code, ... » est supprimée.
- l.212 : `when the IDE repo needs it; ...` devient `when Marcel needs it; ...`.
- l.215 : `in the IDE repo, never in the package` devient `in the consumer (Marcel), never in the package`.
- l.216 : `after IDE integration surfaces the real shape needed` devient `after Marcel's integration surfaces the real shape needed`.

Après SPEC-6 à SPEC-8, `ROADMAP.md` ne contient plus le mot `IDE` (casse exacte, mot entier) ni `blind`.

### SPEC-9 · ROADMAP, renvois aux issues du dépôt

- Après le tableau « Breakdown into six PRs » (après l.49), ajouter : « PRs 1 to 5 were delivered in the origin project before the copy of 2026-09-29; PR 6 is tracked by #2 (milestone H1). »
- Dans `## V2`, après la liste à puces (après l.66), ajouter : « Tracked by #3 (milestone H2): the Gemini provider, the one Marcel uses, and a first real comparison report. »

### SPEC-10 · ROADMAP, renvois locaux de l'origine

- l.1 : `# Roadmap: nathan-agent-core` devient `# Roadmap: agent-core`.
- l.5 : la phrase « The V1 PR breakdown is in `docs/plans/2026-07-21-v1-decoupage-pr.md`. » est supprimée.
- l.40 : la phrase « Full detail, pitfalls included: `docs/plans/2026-07-21-v1-decoupage-pr.md`. » est supprimée.

### Tests (TEST-1 à TEST-10)

Un seul fichier, `scripts/repo-conventions.test.mjs`, en JavaScript ESM (`node:test`, `node:assert/strict`, `node:fs`), avec une fonction `readRepoFile(relativePath)` qui lit un fichier depuis la racine du dépôt (`new URL("../" + relativePath, import.meta.url)`) en UTF-8. Un cas `test(...)` par SPEC, ajouté dans le commit de ce SPEC ; TEST-1 crée le fichier. Chaque cas échoue sur l'état actuel (constaté ci-dessus) et passe après son SPEC.

Pourquoi ce fichier et pas `tests/` : l'issue interdit tout changement sous `tests/` (suite du moteur, TypeScript, typecheckée, qui importe `dist/`). Le manifeste ne porte pas la dérogation `definition-of-done/3`, donc chaque SPEC a un test. `scripts/` est de l'outillage du dépôt ; `node --test` sans motif y trouve `*.test.mjs`, donc GATE-3 l'exécute sans changer `package.json` ; `tsconfig.json` ne l'inclut pas, donc GATE-2 n'est pas touché. Le fichier ne lit **aucun** `.env`, seulement les deux `.env.example`.

## Données touchées

Aucune base, aucun schéma. Fichiers : `.gitignore`, `.env.example`, `examples/web-chat/.env.example`, `docs/guide-agent-package.md`, `docs/decisions/README.md`, `ROADMAP.md`, `scripts/repo-conventions.test.mjs` (nouveau), et les fichiers de boucle sous `docs/specs/` et `docs/plans/`.

## Contraintes vérifiées avant la PR

Le builder exécute et recopie la sortie dans le corps de PR :

- `git diff --name-only origin/main...HEAD -- src tests` : sortie vide.
- `git diff --name-only origin/main...HEAD -- "docs/decisions/ADR-AGENT-*"` : sortie vide.
- Aucun agent n'ouvre, n'affiche ni ne lit un fichier `.env` ; seuls les `.env.example` sont lus.

## Actions hors PR

### Labels et jalons (SPEC-11, barré)

Constaté par le cockpit le 2026-09-30 : `issue_cycle.py labels` rend « aucun créé, tous présents » (T:*, S:*, P:high, appcore-candidat) et les jalons H1 à H3 sont posés sur #1 à #4. Ce sont des actions GitHub sans fichier : pas de commit, pas de SPEC actif. Le builder recopie dans le corps de PR la sortie de :

```
gh issue list -R arthurolivierfortin/agent-core --state all --json number,milestone --jq ".[] | [.number, .milestone.title] | @tsv"
```

### Note KB (SPEC-12, barré)

La convention dev-kit interdit d'écrire dans `dev-kit/kb/` hors `kb/inbox/` (seul `/dream` consolide `kb/projects/`), et ce KB est dans un autre dépôt. La fiche demandée par l'issue devient une note brute déposée, après ouverture de la PR, par la session `/dev-loop` depuis la racine du projet :

```
python C:/Projects/dev-kit/scripts/kb_note.py --project agent-core "<texte ci-dessous>"
```

`--project agent-core` est obligatoire : sans lui, le script dérive le projet du nom du dossier courant, qui est ici le worktree `chore+1-conventions-depot`. Le fichier créé est `C:/Projects/dev-kit/kb/inbox/agent-core/2026-MM-JJ-<session[:8]>.md` ; son chemin est recopié dans le corps de PR.

Texte de la note (tel quel) :

> agent-core (arthurolivierfortin/agent-core, privé, C:/Projects/Perso/agent-core) : cœur d'agent TypeScript réutilisable, `@arthurolivierfortin/agent-core` 0.4.0-alpha ; `defineAgent`, boucle `AgenticLLM` à budget et `stopReason`, outils dispatchés sans exception, port `LLMProvider` (Ollama seul), `FakeLLMProvider`, `checkProviderContract`, harnais de scénarios (simulateur avec état, `defineScenario`, `runScenario`). Origine : copie sans historique, le 2026-09-29, du package d'agents de NATHAN (`A-World-Felt/NATHAN-agent-package`, branche démo fusionnée avec le harnais DEV-197), auteur unique Arthur-Olivier Fortin ; l'original continue à l'université ; les clés DEV-xxx des ADR renvoient au Jira de l'origine. Ce qui manque : `runMatrix`, métriques par exécution, rapport JSON/CSV (#2, jalon H1) ; fournisseur Gemini et première comparaison réelle (#3, H2) ; publication et consommation par Marcel (#4, H3). Liens : Marcel importe le paquet pour son bloc agent (jalon J8, première consommation J8.1) ; Maestro en fera une dépendance (agents TypeScript par exécuteur externe, schéma de run commun), reprise après H1. Gates : npm run build, typecheck, test ; aucun fournisseur hébergé dans les tests par défaut ; le package ne lit que process.env.

## Décisions prises et alternatives écartées

| Décision | Alternatives écartées | Motif |
|---|---|---|
| Note ADR dans `docs/decisions/README.md` seulement | une ligne d'en-tête dans chacun des 20 ADR | les ADR sont immuables (README l.5) ; « aucun ADR n'est réécrit » se vérifie alors par un diff vide |
| `.env.example` : `# NAME=` commenté | `NAME=` vide ; garder les valeurs | `NAME=` vide casse le repli `??` (chaîne vide) ; garder les valeurs contredit l'issue |
| Inclure `examples/web-chat/.env.example` | racine seule | même règle, même risque ; l'invariant « aucune valeur dans un `.env.example` » vaut pour le dépôt |
| Versionner `docs/specs/` et `docs/plans/` | laisser l'ignore | la boucle dev-kit commite checklist, plan et estimation ; sans cela #1 ne peut pas cocher sa checklist |
| Tests dans `scripts/repo-conventions.test.mjs` | `tests/` ; dérogation `definition-of-done/3` ; aucun test | `tests/` interdit par l'issue ; la dérogation est une décision humaine absente du manifeste ; sans test la checklist ne passe pas le juge |
| Labels, jalons et KB hors PR, SPEC barrés | SPEC actifs sans fichier | un SPEC est un commit ; ces actions n'ont pas de fichier dans ce dépôt |
| Texte inséré dans `ROADMAP.md` en anglais, notes d'en-tête en français | tout en français | chaque document garde une seule langue ; les notes suivent la ligne 1 de `README.md`, déjà en français |

## Hypothèses restantes

- Node 22 (`node --test` sans argument) découvre `scripts/repo-conventions.test.mjs` par son motif par défaut `**/*.test.mjs`. À confirmer par le researcher au premier lancement (TEST-1 doit apparaître rouge dans la sortie de `npm run test`). S'il n'apparaît pas, rendre `blocked` : changer `package.json` sort du périmètre de ce contrat.
- Les numéros d'issue #2, #3, #4 et les jalons H1, H2, H3 sont ceux relevés par le cockpit (`cockpit/STATUS.md`, `cockpit/projects/agent-core.md`).
