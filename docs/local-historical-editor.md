# Éditeur historique local

L’éditeur accélère la saisie et la vérification sans contourner la chaîne
documentaire :

```text
édition locale → staging → validation → relecture humaine → reviewed → génération
```

## Démarrage

Sous PowerShell :

```powershell
$env:VITE_ENABLE_EDITOR='true'
pnpm dev
```

Ouvrir ensuite `http://localhost:3000/edition`.

La constante de compilation reste fausse pour `vite build`, même si la variable
est présente dans l’environnement. Le composant, son libellé et l’endpoint
d’écriture sont donc retirés du build public. `node scripts/check-public-editor.mjs`
vérifie cette propriété après le build.

## Données gérées

La vue propose des formulaires pour :

- une personne et sa période de vie ;
- une période d’activité rattachée à une personne ;
- un événement, ses participants et ses lieux ;
- une référence du catalogue des sources ;
- un lot JSON proposé par une IA.

Les relations vers les personnes, événements, lieux et sources existants sont
sélectionnées par leur nom. L’ID stable n’est conservé qu’en interne.

La prévisualisation utilise les mêmes fonctions pures que la frise. Elle montre
notamment l’âge possible au début et à la fin d’une activité, sa durée, le ruban
biographique et les événements déjà associés.

## Garde-fous

Le validateur local refuse :

- l’année zéro ;
- une fin antérieure au début ;
- une source, une personne, un lieu ou un événement inexistant ;
- une proposition historique sans source ;
- un identifiant de proposition dupliqué ;
- un lot prétendant être déjà relu.

Une activité hors de la vie connue reste un avertissement, et non un rejet
automatique : une donnée approximative légitime doit pouvoir être soumise à la
relecture.

L’API de développement :

- n’existe qu’avec `vite serve` et `VITE_ENABLE_EDITOR=true` ;
- accepte uniquement un lot staging en attente ;
- limite la taille de la requête ;
- valide le nom du fichier ;
- résout et contrôle le chemin final ;
- écrit un fichier temporaire puis effectue un renommage atomique ;
- ne peut écrire que dans `content/staging/editor`.

## Propositions assistées par IA

Une IA peut produire un `EditorStagingBatch` version 1 avec :

- `createdBy: "ai-proposal"` ;
- une source principale précise ;
- une note d’extraction ;
- une ou plusieurs propositions de type `person`, `activity`, `event` ou
  `source` ;
- `workflowStatus: "staging"` ;
- `humanReviewStatus: "pending"`.

Elle ne peut ni déclarer une proposition relue, ni promouvoir le lot. L’écran
« Propositions à vérifier » permet de comparer et retirer chaque entrée avant
enregistrement.

## Promotion

« Préparer la promotion » valide le lot et affiche la commande adaptée. Cette
action n’écrit rien dans `reviewed`. Les formats historiques déjà pris en charge
par `historical:promote` restent la référence ; les nouveaux types de proposition
doivent être relus et transformés conformément au workflow avant leur promotion.
