# Intégration de la chronologie et du réseau routier validés

## Principe d’autorité

Le classeur de recherche validé constitue désormais la source prioritaire pour les fiches qui correspondent à une ancienne entrée. Lorsqu’une correspondance suffisamment nette est trouvée, les champs chronologiques et documentaires validés sont fusionnés dans la projection existante. L’identifiant stable, le libellé de compatibilité et les relations internes de l’ancienne fiche sont conservés afin de ne casser aucun lien entre une personne, un lieu et un événement.

L’enregistrement autoritatif n’est alors pas affiché une seconde fois. Une ancienne fiche sans correspondance démontrée reste affichée telle quelle. Cette règle évite à la fois les doublons et les suppressions silencieuses, et permet de compléter progressivement le rapprochement des identifiants.

Le contrôle de compatibilité vérifie que chaque fiche autoritative est projetée ou fusionnée exactement une fois.

## Années historiques

La conversion part des colonnes `Année début`, `Ère début`, `Année fin` et `Ère fin` du classeur. Les ancres visuelles ne sont jamais utilisées comme dates historiques.

- `-1` représente 1 av. n. è. ;
- `1` représente 1 de n. è. ;
- l’année `0` est interdite ;
- les périodes scientifiques hors échelle ou les séquences futures relatives ne reçoivent pas de date inventée sur l’axe principal.

## Frise

Les directives `Zoom min`, `Zoom max`, `Label court`, `Priorité du label`, `Voie verticale` et `Mode de rendu` sont conservées dans chaque projection. La frise applique cinq niveaux sémantiques internes, de 0 à 4, sans fusionner les événements distincts.

Les lignes de la couche `Personnages` forment le ruban de vie. Les règnes, ministères prophétiques, fonctions, voyages et ministères chrétiens partageant le même `ID personnage principal` sont intégrés comme activités de ce ruban.

### Exception demandée pour les livres bibliques

Les lignes « Période couverte par un livre biblique » continuent d’utiliser le rail graphique actuel de l’Atlas, sur deux lignes, avec le même comportement de libellé et de sélection. Les lignes « Rédaction d’un livre biblique » restent des événements ordinaires et ne sont pas placées dans ce rail.

## Carte et réseau routier

Le réseau est rendu dans un `LayerGroup` séparé des marqueurs, des anciens itinéraires schématiques et de l’itinéraire sélectionné. Chaque mise à jour commence par `clearLayers()`.

La certitude reste visible même lors d’une sélection :

- `high` : trait continu ;
- `probable` : tirets ;
- `hypothetical` : pointillés espacés.

La sélection augmente l’épaisseur et le contraste, mais ne transforme jamais un segment incertain en trait plein. Les 124 nœuds restent des ancres approximatives à rapprocher des `feature_id` validés ; ils ne remplacent aucune coordonnée existante.

Les huit itinéraires qui ne disposent pas encore d’un lien avec le réseau restent schématiques. Aucun chemin exact n’est inventé entre leurs étapes.

## Régénération locale

L’extraction du classeur utilise `@oai/artifact-tool` dans un environnement local de travail. La normalisation produit des JSON déterministes dans `src/data/generated`.

Après une nouvelle extraction :

```bash
node scripts/normalize-authoritative-extract.mjs <extract.json> <roads.geojson> <nodes.geojson> <links.json> src/data/generated
pnpm research:validate
pnpm typecheck
pnpm test
pnpm build
```

Le fichier Excel et les images sources ne sont pas publiés dans l’application. Seuls les faits, les références courtes, les URL, les niveaux de certitude et les géométries de travail sont intégrés.
