<!-- core-project
nom: agent-core
categorie: perso
github: arthurolivierfortin/agent-core
publication_branch: main
work_branch: main
stack: node-typescript
gates:
  - id: GATE-1  name: build  cmd: npm run build
  - id: GATE-2  name: typecheck  cmd: npm run typecheck
  - id: GATE-3  name: test  cmd: npm run test
ux_verifier: disabled
derogations: []
-->

# agent-core

Cœur d'agent réutilisable : `defineAgent`, boucle `AgenticLLM` à budget, outils dispatchés sans exception, port `LLMProvider` et adaptateurs, harnais de scénarios (simulateur avec état, `defineScenario`, `runScenario`). Voir README.md et `docs/guide-agent-package.md` ; décisions dans `docs/decisions/` (ADR-AGENT-0001 à 0021).

Origine : copie sans historique, le 2026-09-29, du package d'agents du projet NATHAN (`A-World-Felt/NATHAN-agent-package`, branche `feat/demo-navigation-app` fusionnée avec `feat/DEV-197-test-harness`), dont Arthur-Olivier Fortin est l'unique auteur. Les clés `DEV-xxx` citées dans les ADR et le ROADMAP renvoient au suivi Jira de ce projet d'origine ; ici, le suivi est en issues GitHub et les conventions sont celles de dev-kit.

Règles propres : le package ne lit que `process.env`, jamais un fichier `.env` (c'est l'application qui le charge) ; aucun fournisseur hébergé n'est appelé dans la suite de tests par défaut ; le harnais émet des données et n'affiche rien.
