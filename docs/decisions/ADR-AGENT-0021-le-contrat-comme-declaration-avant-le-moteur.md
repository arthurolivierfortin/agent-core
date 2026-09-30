# ADR-AGENT-0021 : le contrat est une déclaration typée, écrite avant tout moteur

- **Statut** : ✅ Accepté, complète ADR-AGENT-0006 (harnais) et ADR-AGENT-0007 (métriques)
- **Date** : 2026-09-30
- **Décideur** : Arthur-Olivier Fortin
- **Portée** : `@arthurolivierfortin/agent-core`, et toute réécriture de la même conception dans un autre langage ou un autre dépôt (Maestro, un projet C# tiers). Cet ADR fixe une définition, pas du code : rien n'oblige les implémentations à partager une ligne.

## Contexte

Le besoin revient sous trois formes qui se ressemblent trop pour rester séparées :

1. **Le harnais** (H1, livré le 2026-09-30) exécute un scénario sur une matrice de modèles et de contextes, mesure et rapporte. Un scénario dit ce qu'on donne à l'agent et ce qu'on attend de lui, mais il le dit dans le vocabulaire du test (`defineScenario`, `expect.finalState`), pas dans celui de la tâche.
2. **Une tâche d'agent chez un tiers** : quelqu'un déclare des entrées (dont des questions à poser à l'utilisateur), des sorties, un fournisseur et des paramètres à évaluer ; quelqu'un d'autre lance et vérifie le résultat paramètre par paramètre. La tentation est d'écrire cet agent « à la main », comme un consommateur ordinaire du package, et d'obtenir un agent qui marche pour cette tâche et rien de réutilisable.
3. **Maestro**, le moteur d'auto-recherche (docs/REPRISE-2026-09-29-moteur.md dans son dépôt) : on lui donne un contrat, il construit l'intérieur, l'exécute N fois, mesure, mute, publie. Son coût est dans tout ce qui vient après le contrat.

Ce qui est commun aux trois, c'est la déclaration. Ce qui les distingue, c'est ce qu'on fait de la déclaration : la tester, l'exécuter une fois, l'optimiser. La discipline de la règle de trois (`docs/theory/memory/README.md`) interdit de construire le mécanisme général avant la troisième instance ; elle n'interdit pas de nommer la donnée que les trois partagent.

## Options considérées

- **A : pas de contrat, chaque usage décrit sa tâche dans son propre vocabulaire.** Le statu quo. Le harnais garde ses scénarios, le tiers écrit son agent à la main, Maestro inventera son format. Trois formats pour une même chose, et aucune passerelle : un scénario du harnais ne peut pas devenir un contrat de Maestro sans traduction. Rejeté.
- **B : le contrat de Maestro en entier, tout de suite.** Contrat, construction automatique, fonction de fitness, mutation, publication. C'est le moteur, pas la déclaration, et il n'a encore aucun consommateur prêt. Le bloc engin de Maestro est à E0 ; le package agent ne doit pas en porter le poids. Rejeté.
- **C : le contrat comme déclaration typée, et un moteur volontairement bête.** Le contrat est une donnée : entrées, sorties, outils, fournisseur, évaluateurs. Le moteur minimal ne fait que collecter, exécuter, valider, évaluer, rapporter. Tout ce que Maestro ajoutera (optimiser, muter) se branche sur la même donnée sans la modifier. **Retenu.**

## Décision

Un **contrat** est une valeur, sans comportement, à cinq membres. Les noms sont normatifs pour la conception ; leur orthographe dans chaque langage est libre.

| Membre | Rôle | Règles |
|---|---|---|
| `inputs` | schéma des entrées | Chaque entrée a un nom, un type et une provenance : `given` (fournie au lancement), `asked` (demandée à un humain pendant l'exécution, par l'outil `askUser`), ou `derived` (calculée par l'agent). Une entrée `asked` a une question en texte et un type de réponse fermé. |
| `outputs` | schéma des sorties | Chaque sortie a un nom et un type. La sortie de l'agent est **validée contre ce schéma avant toute évaluation** ; une sortie invalide est un échec, pas une note basse. |
| `tools` | surface d'outils | Liste fermée, nommée. `askUser` en fait partie quand une entrée est `asked`, et il est borné : nombre de questions maximal, pas de question hors des entrées déclarées. Aucun outil implicite. |
| `provider` | fournisseur et paramètres | Nom du fournisseur, modèle, paramètres (température, budget de jetons, plafond de coût). Le contrat ne contient jamais une clé : seulement le nom de la variable d'environnement qui la porte (ADR-AGENT-0017). |
| `evaluators` | un évaluateur par sortie ou par paramètre | Chaque évaluateur rend un verdict borné (réussi / échoué, ou une valeur dans un intervalle déclaré), avec une preuve lisible. Aucun score composite au niveau du contrat (ADR-AGENT-0007 : le résumé n'agrège pas ce que le lecteur doit juger). |

Le **moteur minimal** qui exécute un contrat fait exactement cinq choses, dans cet ordre, et rien d'autre :

1. **Collecter** les entrées : `given` depuis l'appel, `asked` depuis un humain ou depuis un double en test (une table question → réponse).
2. **Exécuter** la boucle d'agent avec le fournisseur déclaré et la surface d'outils du contrat, dans les bornes de `provider`.
3. **Valider** la sortie contre `outputs`.
4. **Évaluer** chaque sortie ou paramètre par son évaluateur.
5. **Rapporter** : une ligne par sortie évaluée, avec le verdict, la preuve, la durée, les jetons et le coût ; jetons et coût valent `null` quand une donnée manque, jamais 0 (ADR-AGENT-0007).

Un contrat exécuté N fois, sur plusieurs fournisseurs ou plusieurs jeux de paramètres, est une **matrice** au sens d'ADR-AGENT-0006 : le rapport du moteur est le `summary` du harnais, une ligne par couple (contrat, combinaison). Le harnais actuel reste valide : un scénario est un contrat dont les entrées sont toutes `given`, dont les sorties sont l'état final, et dont l'évaluateur unique est `expect`.

## Ce que cet ADR ne décide pas

- **L'auto-recherche.** Construire l'intérieur d'un contrat, muter ses paramètres, choisir par fitness, publier : c'est Maestro, jalons E0 à E5, et cela viendra se brancher sur cette donnée. Rien de cela n'entre dans le package agent.
- **L'interface humaine d'`askUser`.** Console, formulaire, chat : c'est l'application. Le package ne fixe que le contrat de l'outil (question, type de réponse, borne) et fournit le double de test.
- **La persistance des contrats et des rapports.** Fichiers, base, registre : hors portée, tant qu'aucun consommateur n'en a deux.
- **Le partage de code entre dépôts.** Une réécriture dans un autre langage suit cette définition ; elle ne copie pas les fichiers. La frontière de propriété entre un dépôt personnel et un dépôt d'employeur se règle par la conception partagée, pas par le code partagé.

## Conséquences

- **Dans agent-core** : une issue « contrat » (jalon H3 ou suivant) qui ajoute le type `Contract`, la provenance des entrées, l'outil `askUser` avec son double, la validation des sorties et l'évaluateur par champ, en réutilisant `runMatrix`, `withMetrics` et le rapport CSV tels quels. Estimation à faire par le spec-writer ; découpage probable en deux ou trois PR sous 400 lignes.
- **Dans Maestro** : le format de contrat de E0 part de cette table ; ce qui s'y ajoute (espace de mutation, fitness) s'y ajoute sans renommer ces cinq membres.
- **Pour une réécriture tierce** : la même table, le même moteur en cinq étapes, le même rapport par paramètre. Un contrat écrit là-bas doit rester lisible ici, et inversement, à la traduction de syntaxe près.
- **Ce qui devient interdit** : un agent « à la main » avec ses entrées et sorties dans le code plutôt que dans un contrat, quand la tâche est de celles qu'un autre devra relancer et vérifier.

## Références

- ADR-AGENT-0006 : conception du harnais (scénarios, matrice, rapport).
- ADR-AGENT-0007 : métriques, absent n'est pas zéro, pas de score composite.
- ADR-AGENT-0015 : test de contrat des fournisseurs, dont `askUser` suit le modèle.
- ADR-AGENT-0017 : le fournisseur est le vendeur, la clé n'est jamais dans la conception.
- Maestro, `docs/REPRISE-2026-09-29-moteur.md` : le moteur qui consommera ces contrats.
