# Spécification · docs(claude-md): corriger le compte des ADR, retirer les clés DEV-xxx et déclarer la langue des documents · #7

Issue : https://github.com/arthurolivierfortin/agent-core/issues/7
Checklist : docs/specs/2026-09-30-claude-md-checklist.md
Date : 2026-09-30
Type : docs

## Objectif

Rendre exact ce que `CLAUDE.md` et `ROADMAP.md` affirment du dépôt (nombre d'ADR, emplacement des clés `DEV-xxx`, emplacement de `withMetrics`) et déclarer dans le manifeste `core-project` l'écart de langue des documents hérités de NATHAN, chaque fait étant verrouillé par un test de `scripts/repo-conventions.test.mjs`.

## Autorisation

Arthur a confirmé dans la session du 2026-09-30 : « je confirme les trois corrections de CLAUDE.md et la dérogation de langue » (consigné en commentaire sur #7). Le périmètre ci-dessous est celui de cette confirmation, plus la correction de `ROADMAP.md` relevée dans les commentaires de #7.

## Constats sur le code réel (relevés le 2026-09-30, branche `docs/7-claude-md`, base `030122c`)

- `docs/decisions/` contient 20 fichiers `ADR-AGENT-NNNN-*.md`, numérotés sans trou de `ADR-AGENT-0001` à `ADR-AGENT-0020`, plus `README.md`. `CLAUDE.md:18` annonce « ADR-AGENT-0001 à 0021 » : faux d'une unité. La note d'origine de `docs/decisions/README.md:1` dit déjà « `ADR-AGENT-0001` à `ADR-AGENT-0020` ».
- `CLAUDE.md:20` : « Les clés `DEV-xxx` citées dans les ADR et le ROADMAP renvoient au suivi Jira ». `ROADMAP.md` ne contient plus aucune correspondance de `DEV-\d+` ni la chaîne `DEV-xxx` (retirées par #1). Les ADR en citent encore : `docs/decisions/ADR-AGENT-0014-configurable-termination-strategy.md:58` (`DEV-194`) et `docs/decisions/ADR-AGENT-0018-demo-app-not-shipped-ui-component.md:34-51` (`DEV-107`, `DEV-205`, `DEV-172`, `DEV-68`). La mention « dans les ADR » reste donc vraie ; seule « et le ROADMAP » est fausse.
- `CLAUDE.md:20` cite aussi la branche d'origine `feat/DEV-197-test-harness` : c'est un nom de branche historique, pas une clé citée dans un document ; elle reste.
- `CLAUDE.md:13` : `derogations: []`. Le socle (`dev-kit/conventions/core.md`, Conduite, premier point) impose « Français dans les échanges, la documentation et les commits ». Le corps des documents hérités de NATHAN est en anglais : `README.md` (hors note d'origine ligne 1), `ROADMAP.md`, `docs/guide-agent-package.md` (hors note d'origine), `docs/decisions/` (ADR et registre, hors note d'origine), `docs/conventions/architecture.md`, `docs/theory/`, `docs/schema/README.md`, `docs/plans/2026-07-21-v1-decoupage-pr.md` (hors note d'origine). Cet écart n'est déclaré nulle part.
- `ROADMAP.md:139`, dans la carte « Full tree » : `    infrastructure/with-metrics.ts     withMetrics (LLMProvider → MetricsCollector decorator)` placé sous `  llm/`. Le fichier livré est `src/metrics/application/use-cases/with-metrics.ts` (PR #13). Le guide a déjà été corrigé par #9 (PR #16) et `TEST-8 (issue 9)` interdit `llm/infrastructure/with-metrics.ts` dans le guide, pas dans `ROADMAP.md`.
- `scripts/repo-conventions.test.mjs` existe, est découvert par `node --test` via `npm run test` (GATE-3), et fournit `readRepoFile(relativePath)` et `splitLines(text)`.
- `dev-kit/scripts/manifest.py` lit le bloc `<!-- core-project ... -->` : une dérogation peut s'étaler sur plusieurs lignes indentées (`- rule: ...` puis `reason: "..."` puis `revue_le: ...`) ; une valeur entre guillemets doubles est rendue telle quelle, apostrophes et doubles espaces compris. Précédent au même format : `dev-kit/CLAUDE.md:13-16`.

## Périmètre

1. `CLAUDE.md:18` : « (ADR-AGENT-0001 à 0021) » devient « (ADR-AGENT-0001 à 0020) ».
2. `CLAUDE.md:20` : « Les clés `DEV-xxx` citées dans les ADR et le ROADMAP renvoient » devient « Les clés `DEV-xxx` citées dans les ADR renvoient » ; le reste de la phrase et du paragraphe est inchangé.
3. `CLAUDE.md:13` : `derogations: []` est remplacé par une dérogation de langue au format du socle (voir D1 à D3).
4. `ROADMAP.md` : la ligne 139 quitte le sous-arbre `  llm/` ; une ligne `    application/use-cases/with-metrics.ts   withMetrics (LLMProvider → MetricsCollector decorator)` est ajoutée dans le sous-arbre `  metrics/`, juste après la ligne `    services/aggregate.ts        pure: records → MetricsTotal (with RateTable)`.
5. `scripts/repo-conventions.test.mjs` : quatre cas de test, un par point, nommés `TEST-N (issue 7) ...` comme les cas de l'issue 9.

## Hors périmètre

- Toute autre ligne de `CLAUDE.md` : description, règles propres, bloc manifeste hors `derogations` (gates, `ux_verifier`, branches restent identiques).
- Les autres lignes périmées du sous-arbre `  metrics/` de `ROADMAP.md` (`interfaces/metrics-collector.ts` et `infrastructure/collector.ts`, alors que le code livré a `src/metrics/application/use-cases/metrics-collector.ts`) : non couvertes par l'autorisation ; à ouvrir en issue séparée si Arthur le veut.
- La mention `DEV-194` du guide (`docs/guide-agent-package.md:273-275`) : couverte par sa propre note d'origine ; `CLAUDE.md` ne prétend pas en dresser la liste exhaustive.
- Toute traduction ou réécriture d'un document hérité ; tout fichier sous `src/` et `tests/` ; tout fichier `.env`.
- La règle de dérogeabilité dans `dev-kit` (voir Hypothèses restantes, R1) : dépôt distinct, hors de cette PR.

## Comportement attendu

### Nominal

- `CLAUDE.md` cite l'intervalle d'ADR égal à la liste des fichiers `docs/decisions/ADR-AGENT-*.md`.
- `CLAUDE.md` ne rapporte les clés `DEV-xxx` qu'aux ADR, qui en contiennent effectivement.
- `python <dev-kit>/scripts/manifest.py --project . --json` rend `derogations` à un élément : `rule` = `core/langue`, `reason` = la phrase de D2, `revue_le` = `2026-12-31` ; les trois gates sont rendus à l'identique d'avant.
- La carte « Full tree » de `ROADMAP.md` place `withMetrics` sous `metrics/application/use-cases/`, emplacement réel.

### Erreurs

Changement documentaire : aucun chemin d'erreur à l'exécution. La face « échec » de chaque livrable est le test qui le verrouille : chaque `TEST-N` échoue sur la base `030122c` et échoue à nouveau si le fait documenté redevient faux (ADR ajouté sans mise à jour de `CLAUDE.md`, clé `DEV-` réintroduite dans `ROADMAP.md`, dérogation retirée ou déformée, `withMetrics` replacé sous `llm/`). Chaque assertion porte un message en français qui nomme le fichier et le fait attendu.

## Données touchées

Aucune base. Fichiers : `CLAUDE.md`, `ROADMAP.md`, `scripts/repo-conventions.test.mjs`. Fichiers lus seulement par les tests : `docs/decisions/` (liste et contenu des ADR), `src/metrics/application/use-cases/with-metrics.ts` (existence seule). Encodage UTF-8 sans BOM, fins de ligne existantes conservées.

## Décisions

- **D1. Identifiant `rule: core/langue`.** `dev-kit/conventions/derogations.md` demande « le nom de la convention ou d'un de ses points ». La règle de langue est le premier point de la section Conduite de `core.md`, qui n'est pas numéroté. Écarté : `core/conduite-1` (numéro fragile, non porté par le document source) ; `core` seul (dérogerait à tout le socle).
- **D2. Texte de `reason`, une phrase, entre guillemets doubles, sans guillemet double interne ni double espace :**
  `reason: "le corps des documents hérités de NATHAN et copiés le 2026-09-29 reste en anglais, sans traduction, mises à jour comprises (README.md, ROADMAP.md, docs/guide-agent-package.md, docs/decisions/, docs/conventions/, docs/theory/, docs/schema/, docs/plans/2026-07-21-v1-decoupage-pr.md) ; leurs notes d'origine et tout nouveau document sont en français ; décision d'Arthur du 2026-09-30 sur #7"`
  La confirmation cite « README, ADR, guide, plans hérités » ; la liste est étendue à `ROADMAP.md`, `docs/conventions/`, `docs/theory/` et `docs/schema/`, qui sont hérités et en anglais au même titre : les omettre laisserait un écart non déclaré. « Mises à jour comprises » couvre SPEC-4, écrit en anglais dans `ROADMAP.md`. Écarté : une liste réduite aux quatre familles citées (écart résiduel non déclaré).
- **D3. `revue_le: 2026-12-31`**, même échéance que la dérogation de `dev-kit/CLAUDE.md`. Écarté : pas de date (la convention l'exige).
- **D4. Forme multiligne** du précédent `dev-kit/CLAUDE.md:13-16` : `derogations:` sans valeur, puis `  - rule: core/langue`, `    reason: "..."`, `    revue_le: 2026-12-31`, indentations de 2 et 4 espaces. Écarté : une seule ligne (plus de 300 caractères, illisible).
- **D5. Tests en Node, pas en Python.** Le contrôle « manifest.py lit toujours le manifeste » n'entre pas dans la suite : `manifest.py` vit hors du dépôt, sous `dev-kit`, et un test qui l'appellerait dépendrait d'un chemin absolu et d'un interpréteur Python. TEST-3 vérifie la forme ligne à ligne ; la lecture par `manifest.py` est une preuve jointe à la PR (voir Preuves attendues).
- **D6. Un SPEC = un commit = un test**, dans l'ordre SPEC-1 à SPEC-4 ; chaque commit ajoute son cas de test et le livrable. Gabarits (sans `Co-Authored-By`) :
  - SPEC-1 : `docs(claude-md): corriger le compte des ADR (0001 à 0020)`
  - SPEC-2 : `docs(claude-md): ne plus rapporter les clés DEV-xxx au ROADMAP`
  - SPEC-3 : `docs(claude-md): déclarer la dérogation de langue des documents hérités`
  - SPEC-4 : `docs(roadmap): placer withMetrics sous metrics/application/use-cases`
  Chacun suivi des trailers `Refs: #7`, `Session: <id>`, `Model: <modèle>`, `Authorship: ai`.

## Preuves attendues dans la PR

- Sortie de `npm run build`, `npm run typecheck`, `npm run test` (GATE-1 à GATE-3), les quatre cas `(issue 7)` à `ok`.
- Extrait `derogations` de la sortie de `python <dev-kit>/scripts/manifest.py --project . --json`, lancé depuis la racine du dépôt, montrant `rule`, `reason` et `revue_le` de D1 à D3, et les trois gates inchangés.
- Section Risques et suivi de la PR : citation de la dérogation `core/langue` (exigence de `derogations.md`, « Comment un agent applique une dérogation », point 3) et de R1.
- Tout chemin cité relatif au dépôt ; aucun fichier `.env` lu.

## Hypothèses restantes

- **R1. `core` est déclaré non dérogeable** (`dev-kit/conventions/core.md` et le tableau de `dev-kit/conventions/derogations.md`), alors que le même `core.md` dit « Tout écart est déclaré dans le bloc `core-project` (`derogations`) ». La dérogation de langue est explicitement confirmée par Arthur, auteur unique du socle, et elle est écrite ici telle qu'approuvée ; le juge peut toutefois relever la contradiction. Suivi recommandé, hors de cette PR : dans `dev-kit`, rendre le point de langue dérogeable ou y consigner l'exception (issue `dev-kit` ou `/kb-note`).
- **R2. Commentaires de #7 non relus par cet agent** (pas de shell disponible) : le périmètre repose sur le prompt de dispatch, qui les résume (withMetrics dans `ROADMAP.md:139`, guide déjà corrigé par #9).
