# Atlas biblique interactif

Application d’étude en lecture seule permettant d’explorer une frise chronologique et une carte Leaflet synchronisées. Elle est conçue pour la consultation, la recherche simple et la navigation entre événements, lieux et personnages.

L’application n’intègre aucun outil public d’ajout ou d’importation de données. Le corpus est versionné avec le code afin que son évolution puisse être relue et vérifiée. Les dates et affirmations historiques d’origine sont conservées : aucune datation ne doit être modifiée sans source vérifiable.

## Installation

Prérequis :

- Node.js 22 ;
- pnpm 11.

```bash
pnpm install
pnpm dev
```

L’application est ensuite disponible sur `http://localhost:3000`.

### Installation comme application

Le build de production est une Progressive Web App (PWA). Sur Chrome et Edge,
une proposition d’installation apparaît dans l’application dès que le navigateur
la juge installable. Sur Safari pour iPhone ou iPad, utilisez **Partager**, puis
**Sur l’écran d’accueil**.

Une fois installée, l’application s’ouvre dans une fenêtre autonome. La frise,
les données et l’interface sont disponibles hors connexion. Les zones de carte
déjà consultées sont conservées temporairement ; une connexion reste nécessaire
pour charger de nouvelles tuiles cartographiques.

Les icônes sont générées depuis `public/favicon.svg` :

```bash
pnpm pwa:assets
pnpm build
pnpm pwa:check
```

## Vérifications

```bash
pnpm typecheck
pnpm build
pnpm check
```

`pnpm check` exécute le contrôle TypeScript puis le build de production. La GitHub Action `.github/workflows/ci.yml` lance ces vérifications pour chaque pull request vers `main` et chaque push sur `main`.

## Fonctionnement

### Recherche et filtres

- recherche globale dans les événements, lieux et personnages ;
- ouverture rapide de la recherche avec la touche `/` ;
- filtres de catégories persistés localement ;
- état de navigation partageable dans l’URL ;
- interface responsive avec panneau de filtres adapté aux écrans mobiles.

### Frise

- zoom logarithmique, déplacement horizontal et vue annuelle avec repères mensuels ;
- événements toujours distincts, sans fusion visuelle ;
- modes de densité pour ajuster la quantité de texte affichée ;
- rendu limité aux événements qui croisent le viewport, avec une marge autour de la zone visible ;
- transmission en continu de la période affichée à la carte.

### Carte

- carte volontairement limitée aux points d’intérêt documentés ;
- nettoyage du groupe de marqueurs à chaque mise à jour pour éviter les doublons ;
- fond « Relief naturel » par défaut et fond clair CARTO mémorisé localement ;
- légende des lieux conforme aux catégories des cartes documentaires ;
- libellés cartographiques progressifs en quatre niveaux : majeur, régional, étude et local ;
- filtrage temporel lorsque les dates d’une entité sont connues ;
- navigation dans les deux sens entre carte, frise et fiches documentaires.

### Fiches d’étude

Les fiches regroupent la synthèse, les relations et les références d’une entité. Elles permettent de poursuivre la navigation sans perdre le contexte de consultation.

## Structure des données

Les interfaces sont définies dans `src/types.ts`. Chaque entité utilise un identifiant stable ; les anciennes données dépourvues d’ID reçoivent un identifiant déterministe à partir de leurs champs stables.

Champs documentaires communs :

| Champ | Rôle |
| --- | --- |
| `biblicalReferences` | Références bibliques |
| `documentaryReferences` | Références documentaires ou archéologiques |
| `sources` | Sources structurées avec ID, libellé, URL et citation optionnelles |
| `encyclopediaReferences` | Articles correspondants dans *Étude perspicace* ou documentation WOL complémentaire |
| `certainty` | `certain`, `probable`, `possible` ou `unknown` |
| `notes` | Notes éditoriales |
| `lastVerified` | Date de dernière vérification au format `AAAA-MM-JJ` |
| `mapLabelLevel` | Priorité d’affichage du nom d’un lieu selon le zoom cartographique |

Le corpus de la Terre promise conserve un lien direct vers la carte documentaire
[« La Terre promise », dans *Voyez le bon pays*, p. 18-19](https://wol.jw.org/fr/wol/d/r30/lp-f/1102003103).
Les positions affichées sont géoréférencées depuis les symboles de cette carte
et de son encart « Les environs de Jérusalem ».

Relations principales :

- `EventData.associatedLocationIds`, `associatedCharacterIds` ;
- `BiblicalPlace.associatedEventIds`, `associatedCharacterIds`.

Les anciens champs textuels `associatedEvents` et `associatedCharacters` restent lisibles. Ils sont convertis en relations par ID lorsque la correspondance exacte existe.

### Liens vers Étude perspicace

Chaque personnage de la frise et chaque lieu de la carte possède une référence
vers l’article correspondant dans
[*Étude perspicace des Écritures*](https://wol.jw.org/fr/wol/library/r30/lp-f/toutes-les-publications/%C3%A9tude-perspicace).
Le nom affiché dans l’application reste celui couramment employé dans la
*Traduction du monde nouveau* révisée, tandis que `linkedName` conserve la
correspondance avec l’ancien intitulé Rbi8 lorsque les deux formes diffèrent.

Les références générées sont versionnées dans
`src/data/insightReferences.generated.ts`. Pour les mettre à jour ou les
contrôler :

```bash
pnpm references:insight
pnpm references:check
pnpm references:check:online
```

La dernière commande vérifie également l’accessibilité des pages officielles.
Alep et Ébla, qui ne disposent pas d’une entrée autonome dans l’encyclopédie,
sont reliées à une documentation WOL spécifique et clairement signalée comme
complémentaire dans l’interface.

### Ouverture dans JW Library

Dans l’onglet **Références** d’une fiche, les références bibliques utilisent le
format officiel de partage `jw.org/finder`. Sur un appareil qui prend ce type de
lien en charge, la référence peut s’ouvrir dans JW Library ; un bouton **WOL**
reste toujours disponible pour accéder directement à la Bibliothèque en ligne.

Le même fonctionnement est appliqué aux articles d’*Étude perspicace*, aux
cartes actuelles de *Voyez le bon pays* et aux appendices B2/B3 de la Bible
d’étude. Toute nouvelle source WOL possédant un identifiant de document peut
réutiliser automatiquement ce mécanisme.

La commande `pnpm run references:jw` vérifie que toutes les références bibliques
actuellement déclarées peuvent produire un lien JW Finder et un lien WOL.

### Provenance du corpus cartographique

Les fichiers `src/data/promisedLandPlaces.ts` et
`src/data/patriarchAndExodusPlaces.ts` intègrent les villes, lieux, reliefs,
eaux et étapes relevés dans les documents cartographiques. Les références de
grille et les catégories documentaires sont conservées dans `mapReferences` et
`mapCategory`. Les tracés et polygones territoriaux ne sont pas affichés tant
qu’un corpus géographique suffisamment fiable n’est pas disponible.

Les coordonnées de la Terre promise sont dérivées du centre des symboles visibles
sur les cartes fournies, puis géoréférencées pour Leaflet. Le champ
`coordinateSource` conserve la carte utilisée, la position dans l’image, ses
dimensions et la méthode de report. La valeur `cartographic` de
`coordinatePrecision` signifie que le point reproduit la position publiée sur
la carte ; elle ne constitue pas une affirmation archéologique supplémentaire.
Les cours d’eau, reliefs et étendues conservent une précision
`representative`.

Cette intégration n’ajoute aucun outil d’importation dans l’application : le
corpus reste statique, versionné et relisible. Elle ne modifie aucune date de la
frise.

## Organisation du code

```text
src/
├── components/       interface, recherche, frise, carte et fiches
├── data/             corpus intégré de la frise et de la carte
├── utils/            dates, IDs et normalisation des relations
├── App.tsx           état partagé et synchronisation des vues
└── types.ts          modèles de données
```

Les tuiles de fond sont fournies par CARTO, Stadia Maps, Stamen et
OpenStreetMap. Leur premier chargement nécessite une connexion réseau ; les
zones déjà visitées peuvent ensuite être relues depuis le cache hors ligne.
