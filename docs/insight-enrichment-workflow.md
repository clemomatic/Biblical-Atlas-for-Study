# Enrichissement progressif avec Étude perspicace

## Portée du pilote

Le premier lot traite uniquement l’article **« Isaac »** d’*Étude perspicace des Écritures* (volume 1). Il ne réalise aucun parcours automatique de la bibliothèque et ne conserve ni extrait long ni média.

Les faits relus sont enregistrés séparément dans `content/reviewed/claims/insight-isaac.json` :

- naissance d’Isaac indiquée en 1918 av. n. è. ;
- naissance d’Ésaü et Jacob indiquée en 1858 av. n. è. ;
- âge d’Isaac à cette naissance : 60 ans ;
- décès d’Isaac indiqué en 1738 av. n. è. ;
- âge d’Isaac à son décès : 180 ans.
- durée de vie composée des deux bornes explicitement indiquées.

Chaque affirmation conserve la source, une référence courte, sa certitude et son statut de relecture.

## Séparation entre faits et calculs

Une valeur directement indiquée par l’article reste un `HistoricalClaim` d’origine `reviewed` avec une preuve `direct`. Une opération arithmétique est décrite par une `HistoricalCalculationDefinition` dans `content/reviewed/calculations/`.

La commande `pnpm historical:generate` régénère `content/generated/calculated-claims.json`. Une sortie calculée conserve toujours :

- les identifiants des affirmations d’entrée ;
- la formule ;
- l’explication du raisonnement ;
- la période résultante ;
- la marge d’incertitude propagée ;
- la certitude avant éventuel conflit ;
- la méthode `calculated`.

Le résultat ne devient donc jamais une preuve `direct` et n’écrase aucune affirmation relue.

## Calculs du pilote

Deux contrôles indépendants produisent la naissance d’Isaac :

1. naissance de Jacob en 1858 av. n. è. moins 60 ans ;
2. décès d’Isaac en 1738 av. n. è. moins 180 ans.

Les opérations utilisent l’axe temporel continu de `shiftHistoricalYear`. Elles sautent l’année zéro : 1 av. n. è. est immédiatement suivi de 1 de n. è.

## Incertitude et conflits

Les marges de la date et de la durée sont additionnées. Une entrée approximative rend le résultat approximatif, et le niveau de certitude final ne peut pas dépasser celui de l’entrée la moins certaine.

Après génération, chaque résultat est comparé :

- aux autres affirmations du même prédicat ;
- à la borne de début d’une durée de vie pour une naissance ;
- à la borne de fin d’une durée de vie pour un décès ;
- aux autres calculs portant sur le même sujet.

Une divergence conserve toutes les affirmations, ajoute un signalement `review-required`, abaisse au maximum la certitude à `possible` et place `eligibleForCertainRelations` à `false`. Le moteur de relations actuel ne consomme pas les affirmations calculées ; une future intégration devra obligatoirement respecter ce verrou.

## Recalcul et dépendances

Les sorties ne sont jamais éditées à la main. Toute modification d’une entrée est prise en compte à la prochaine génération. Le graphe des dépendances est vérifié avant calcul et toute boucle est refusée.

Commandes utiles :

```bash
pnpm historical:validate
pnpm historical:generate
pnpm historical:report:insight
pnpm historical:check:insight
```

Le rapport reproductible se trouve dans `content/generated/import-reports/insight-isaac-report.json`.

## Étendre à un nouvel article

1. vérifier manuellement un article officiel déjà relié à une entité ;
2. ajouter une entrée distincte au catalogue des sources ;
3. enregistrer uniquement les faits courts et explicites dans `reviewed/claims` ;
4. créer une recette seulement si les prémisses du calcul sont elles-mêmes des affirmations ;
5. générer puis examiner les conflits ;
6. contrôler la fiche de la personne ;
7. valider le rapport avant de passer à un autre article ou lot thématique.

Une ambiguïté reste dans `staging` ou dans une note de relecture ; elle ne doit pas être complétée de mémoire.
