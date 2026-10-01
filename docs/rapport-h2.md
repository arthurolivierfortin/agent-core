# Rapport H2 : modèle local contre Gemini, sous plafond

Ce document décrit comment produire le rapport H2, celui qui ferme l'issue #3 : la première comparaison réelle entre un modèle local (Ollama) et un modèle hébergé (Gemini). Le scénario est celui de H1, `aller aux reglages` : l'agent doit aller de la page `accueil` à la page `reglages` avec l'outil `navigate`. Chaque modèle le joue N fois (`--runs`, 5 par défaut). Le plafond en dollars (`--cap-usd`) ne vaut que pour le modèle hébergé : le modèle local ne coûte rien et n'est pas plafonné.

Le lancement est un geste manuel d'Arthur : aucune suite de tests ni aucune boucle d'agents ne le fait.

## Prérequis

- Node 22.18 ou plus (suppression des types activée par défaut), et `npm ci` fait une fois à la racine du dépôt.
- Ollama démarré, avec le modèle local tiré : `ollama pull qwen2.5:0.5b`. L'hôte effectif est annoncé avant tout appel, sur la ligne `local host:` (la valeur de `OLLAMA_HOST`, sinon `http://localhost:11434`).
- Si tous les runs locaux portent `Ollama request failed` dans la colonne `error` de `runs.csv`, le rapport est complet mais inutilisable : ne pas le commiter, réparer Ollama et relancer dans un autre `--out`.

## Les gestes d'Arthur, dans l'ordre

Toutes les commandes se lancent depuis la racine du dépôt. Le plafond `1` (un dollar) des commandes ci-dessous est un exemple : le remplacer par celui qu'Arthur choisit.

### 1. Vérifier le tarif dans data/rates.json

L'entrée du modèle hébergé (`gemini-2.5-flash` par défaut) a cette forme : `rate` porte deux prix strictement positifs, en dollars par million de jetons (`usdPerMillionTokensIn`, `usdPerMillionTokensOut`) ; `effectiveFrom` est la date d'effet, en `AAAA-MM-JJ` ; `source` est l'URL de la page de prix, sur une seule ligne. Tant que `rate` vaut `null`, le démarrage est refusé avant tout appel réseau. Le tarif se lit sur la page de prix de Google : ce document n'en recopie aucun.

### 2. Exposer GEMINI_API_KEY dans le shell

La clé ne s'écrit dans aucun fichier ni sur aucune ligne de commande : elle se saisit masquée, dans le shell qui lancera le rapport.

PowerShell (7.1 ou plus) :

```powershell
$env:GEMINI_API_KEY = Read-Host -MaskInput "GEMINI_API_KEY"
```

bash :

```bash
read -rs GEMINI_API_KEY && export GEMINI_API_KEY
```

### 3. Répéter à blanc (--dry-run)

PowerShell :

```powershell
npm run build; if ($LASTEXITCODE -eq 0) { node scripts/h2-report/cli.ts --cap-usd 1 --dry-run }
```

bash :

```bash
npm run build && node scripts/h2-report/cli.ts --cap-usd 1 --dry-run
```

La répétition ne construit aucun fournisseur et n'appelle rien. Relire l'annonce : les deux modèles, leurs tarifs avec date d'effet et source, l'hôte local (`local host:`), le nombre d'appels au plus, le plafond et le dossier `--out` (par défaut `docs/reports/h2-<AAAA-MM-JJ>/`). Un refus de démarrage (tarif ou clé absents, `--out` sous `docs/demo/` ou déjà occupé) sort en 1 avec son motif, avant tout appel.

### 4. Lancer

PowerShell :

```powershell
npm run build; if ($LASTEXITCODE -eq 0) { node scripts/h2-report/cli.ts --cap-usd 1 }
```

bash :

```bash
npm run build && node scripts/h2-report/cli.ts --cap-usd 1
```

Codes de sortie : 0 pour un rapport complet ; 1 pour un refus de démarrage, un rapport tronqué ou une écriture refusée.

- Rapport complet : `summary.csv` et `runs.csv` sous `--out`, et la ligne `H2 report written`.
- Rapport tronqué (plafond atteint, ou matrice coupée par une erreur de Gemini) : `summary.truncated.csv`, `runs.truncated.csv` et `TRUNCATED.txt` (cause, dépense, plafond, appels refusés, heure, modèles), et la ligne `H2 report TRUNCATED` sur la sortie d'erreur. Un rapport tronqué ne ferme pas #3 : lever la cause (plafond, quota, réseau), puis relancer dans un autre `--out`.
- Écriture refusée : si la valeur de `GEMINI_API_KEY` apparaît dans un des fichiers, rien n'est écrit ; le message nomme les fichiers, jamais la valeur.

Dans les fichiers écrits, les chemins de la machine sont réduits à `<repo>` (la racine du dépôt) et à `<home>` (le dossier personnel).

### 5. Commiter le CSV, qui ferme #3

1. Relire `summary.csv` et `runs.csv` : aucune clé, et des chemins réduits à `<repo>` et `<home>`.
2. Créer la branche `docs/3-rapport-h2` et y commiter `summary.csv` et `runs.csv`, seuls.
3. Ouvrir la PR ; son corps contient `Closes #3`.
4. Retirer la clé du shell : `Remove-Item Env:GEMINI_API_KEY` (PowerShell) ou `unset GEMINI_API_KEY` (bash).

## Lire H2 à H4 dans les CSV

- **H2** (le résultat d'un outil est renvoyé à Gemini en contenu `user`) : une ligne hébergée de `runs.csv` à `passed` `true` a fait un second appel après le résultat de `navigate`, que Gemini a accepté. Un refus se lit dans la colonne `error` (`Gemini 400 …`) et dans la troncature `cut: http_400`.
- **H3** (l'identifiant d'un `functionCall` est facultatif) : un run hébergé réussi corrobore le lien entre l'appel et son résultat par le nom seul ; le CSV ne dit pas si Gemini a renvoyé un identifiant.
- **H4** (`thoughtsTokenCount` compté en sortie) : une cellule `tokensUsed` non vide montre que les trois compteurs sont numériques ; le CSV ne sépare ni l'entrée, ni la sortie, ni la pensée : comparer `costUsd` au relevé de facturation de la console Google du même jour.
