# Audit de cohérence de la frise biographique

## Conclusion

Les recherches détaillées n’étaient pas absentes du corpus. Elles étaient rendues invisibles par trois problèmes de projection : plusieurs identifiants pour une même personne, des périodes d’activité dessinées comme des lignes autonomes et des repères relatifs ignorés faute d’année numérique.

Le corpus validé contient actuellement :

- 427 enregistrements chronologiques ;
- 65 enregistrements explicitement classés « Vie » et 69 enregistrements assimilables à des périodes de vie ;
- 144 enregistrements munis d’un `personId` ;
- 256 sous-éléments reliés à un parent visuel ;
- 29 sous-éléments relatifs sans année chiffrée.

Ces 29 éléments ne doivent pas recevoir une date inventée. Ils appartiennent à la fiche biographique, où ils sont présentés comme des repères narratifs non espacés à l’échelle.

## Samuel

La recherche validée contient notamment :

- son enfance dans sa famille à Rama ;
- sa présentation au sanctuaire après le sevrage ;
- son service auprès du tabernacle à Silo ;
- les visites annuelles de ses parents ;
- son appel pendant sa jeunesse ;
- son activité comme prophète ;
- sa fonction de juge ;
- son circuit judiciaire annuel ;
- sa maison, son autel et son activité à Rama ;
- l’onction de Saül et celle de David ;
- sa mort et son enterrement.

Les entrées `event-samuel-8qh05i` et `samuel-vie` représentaient la même personne sans alias. Elles sont désormais réunies sous `samuel-vie`. La ligne principale conserve la plage publiée vers 1180–1080 av. n. è. Les étapes sans année restent dans la fiche et ne sont pas placées artificiellement sur l’axe.

L’entrée « Naissance de Samuel » conserve la formulation « peu après 1200 ». Son année numérique 1200 était explicitement décrite comme un simple repère de tri : elle n’est donc plus dessinée comme un point factuel à 1200 sur la frise.

## Saül et Jonathan

Le corpus documente le règne de Saül de 1117 à 1078 av. n. è., mais ne documente pas son année de naissance. Commencer sa ligne de vie à 1117 confondait naissance et début de règne.

La naissance approximative de Jonathan vers 1138 av. n. è. fournit seulement une limite relationnelle : Saül est nécessairement né plus tôt. La frise représente donc une ligne ouverte vers le passé à partir de cette limite, avec le libellé « né avant vers 1138 av. n. è. ». Ce choix autorise uniquement des résultats minimaux :

- au moins 21 ans au début du règne ;
- au moins 60 ans à la mort ou dernière borne.

Ces valeurs ne sont pas des âges estimés centraux et ne doivent jamais être reformulées comme des âges exacts.

Les identifiants `event-saul-z98f25` et `atlas-0087` sont désormais réunis. De même, `person-wcg-jonathan` et `wcg-jonathan` désignent une seule personne.

## Audit général des identités

Le rapprochement contrôlé des lignes de vie relues et du classeur a identifié 33 noms communs. Trente-deux correspondances non ambiguës ont reçu un alias stable, notamment Adam, Abraham, David, Moïse, Noé, Isaac, Jacob, Sara, Josué, Ézéchiel, Pierre et plusieurs personnages WCG.

« Anne » n’a volontairement pas été fusionnée : ce nom peut désigner des personnes différentes selon le corpus (la mère de Samuel ou le grand prêtre mentionné dans les Évangiles). Cette ambiguïté doit être résolue par les références et non par le seul libellé.


## Règles visuelles retenues

1. Une personne possède une seule ligne principale.
2. La durée de vie forme le ruban de base.
3. Les règnes, ministères, fonctions, résidences et déplacements sont intégrés au ruban.
4. Une borne « avant » ou « après » est signalée par une ouverture et n’est jamais transformée en date exacte.
5. Une date approximative conserve des extrémités atténuées.
6. Les périodes relatives apparaissent dans la mini-chronologie de la fiche.
7. Les calculs utilisent la convention sans année zéro.
8. Une plage n’est jamais remplacée par une moyenne artificielle.

## Fiche de personnage

Chaque fiche exploite désormais les informations disponibles pour afficher :

- période de vie ;
- borne de naissance ;
- décès ou dernière borne ;
- âge exact, approximatif, en plage, minimal ou maximal à la dernière borne ;
- fonctions et périodes d’activité ;
- âge au début et à la fin d’une activité lorsqu’il est calculable ;
- durée de l’activité ;
- repères biographiques documentés ;
- provenance et limites de chaque repère.

Une valeur impossible à calculer est explicitement signalée au lieu d’être complétée par supposition.

## Limites connues et décisions de relecture

- La plage de vie de Samuel et le repère de sa mort proviennent de formulations de précision différente. Ils restent séparés et leurs provenances sont conservées.
- L’âge de 12 ans attribué à Samuel lors de son appel est une information extra-biblique rapportée par Josèphe. Il demeure attribué et ne devient pas une date biblique.
- La naissance de Saül reste inconnue. La borne issue de Jonathan est une inférence possible, pas une affirmation directe.
- Certaines activités du classeur n’ont pas encore de `personId`. Le rapport les inventorie afin de permettre une correction progressive sans fusion par simple homonymie.

## Contrôle reproductible

La commande suivante vérifie les repères critiques, les parents biographiques orphelins, les activités sans personne et les doublons de lignes de vie :

```bash
pnpm timeline:coherence
```

Elle doit être exécutée après chaque nouvelle génération du classeur chronologique.
