# Vue « À ce moment-là »

La vue « À ce moment-là » est une projection de consultation. Elle ne crée
aucune affirmation historique et ne modifie pas le corpus relu.

## Entrées utilisées

La projection consomme uniquement :

- `content/generated/historical-index.json` pour les vies, activités,
  événements, présences et relations qui recoupent la période ;
- `content/generated/relations.json` pour les relations déjà calculées ;
- les entités de `content/reviewed/` pour les noms, périodes et preuves ;
- `content/sources/source-catalog.json` pour présenter la provenance.

Les tables de correspondance sont construites une fois au chargement. Un
changement de viewport exécute des recherches dans les intervalles triés ; il
ne relance jamais le moteur de relations.

## Niveaux affichés

| Mention | Signification dans cette vue |
| --- | --- |
| Attesté | Résultat certain directement soutenu par une donnée relue |
| Calculé | Résultat certain obtenu par intersection d’intervalles ou relation générée |
| Probable | La donnée d’entrée porte la certitude `probable` |
| Possible | La donnée d’entrée porte la certitude `possible` ou `unknown` |
| Localisation inconnue | Aucun épisode de présence validé ne localise le participant pour l’événement concerné |

Une relation de même événement n’est jamais présentée comme une interaction.
Une interaction attestée exige toujours une relation générée de niveau
`documented-interaction` et affiche ses affirmations justificatives.

## Périodes larges

Une plage supérieure à cinq ans déclenche un avertissement. Les événements
sont regroupés par libellé de période et les présences par lieu. Le panneau
précise que les personnes n’ont pas nécessairement été simultanément
présentes pendant toute la plage.

## Navigation

- une personne ouvre sa fiche documentaire ;
- un événement est sélectionné dans la frise ;
- un lieu ouvre la carte ;
- une connexion déplie les références courtes et les sources utilisées.

Le panneau est un dialogue latéral sur ordinateur et une bottom sheet sur
mobile. Il piège le focus, se ferme avec `Échap` et restaure le focus au bouton
d’ouverture.

## Limites actuelles du pilote A7-B

Le pilote ne fournit pas encore de durées de vie validées. La section
« Personnes vivantes » reste donc vide au lieu de déduire une vie par mémoire
ou à partir d’une simple association. Les présences de type `ministry` peuvent
alimenter « Personnes actives », car elles constituent des épisodes validés et
indexés.
