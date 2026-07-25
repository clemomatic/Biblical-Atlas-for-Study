# Chaîne de données historiques sourcées

## Objectif

Cette chaîne sépare trois états qui ne doivent jamais être confondus :

1. `staging` contient des extractions non vérifiées ;
2. `reviewed` contient uniquement des données relues et sourcées ;
3. `generated` contient des relations recalculables produites par un script.

Le corpus historique actuel de l’application n’est pas déplacé par ce lot. Les
nouveaux dossiers réels sont volontairement vides. Le seul contenu démonstratif
se trouve sous `content/test-fixtures` et porte partout des IDs et libellés
fictifs.

## Organisation

```text
content/
├── sources/
│   └── source-catalog.json
├── staging/
├── reviewed/
│   ├── people/
│   ├── events/
│   ├── places/
│   ├── claims/
│   └── presences/
├── generated/
│   ├── relations.json
│   └── historical-index.json
└── test-fixtures/
    ├── sources/
    ├── staging/
    └── reviewed/
```

Les fichiers d’un même dossier contiennent des tableaux JSON. Ils peuvent être
répartis en plusieurs fichiers pour faciliter la relecture.

## Règles de passage entre les états

### 1. Extraction dans `staging`

Une extraction commence avec :

- un ID provisoire ;
- le type d’entité envisagé ;
- `workflowStatus: "staging"` ;
- le contenu brut dans `payload` ;
- des indications de source et notes d’extraction facultatives.

Ce contenu est une piste de travail. Il n’est ni affiché par l’application, ni
utilisé par `historical:generate`. Un fichier de `staging` marqué `reviewed` ou
`presentedAsValidated: true` fait échouer la validation.

Les longs extraits et images de publications ne doivent pas être déposés dans le
dépôt. Une courte indication permettant de retrouver le passage suffit.

### Promotion explicite d’un fichier staging

La promotion n’est jamais automatique. Un fichier peut être contrôlé sans
écriture :

```bash
pnpm historical:promote -- --file content/staging/a7-b-debut-ministere.json
```

L’option `--write` est nécessaire pour produire les fichiers `events`, `claims`
et `presences` dans `content/reviewed/`. La commande refuse une ligne relue si
elle ne possède pas :

- une source existante et relue ;
- une référence précise ;
- un degré de certitude ;
- une période valide ;
- une date de relecture ;
- la confirmation explicite que les identifiants ont été vérifiés.

Une ligne dont le statut de relecture reste `pending` est ignorée. Une fois les
sorties versionnées, l’option `--verify-output` vérifie qu’elles correspondent
toujours exactement au staging :

```bash
pnpm historical:promote -- --verify-output
```

### 2. Relecture dans `reviewed`

La relecture consiste à :

1. créer ou vérifier l’entrée du catalogue de sources ;
2. attribuer un ID canonique et stable ;
3. transformer la donnée en personne, événement, lieu, claim ou présence ;
4. relier chaque donnée à une source relue ou vérifiée ;
5. représenter explicitement la période et l’incertitude ;
6. relire les preuves et leur méthode ;
7. retirer l’enregistrement correspondant de `staging`.

Une donnée `reviewed` sans source est invalide. Une source `unverified` ou
`rejected` ne peut pas justifier une donnée relue.

### 3. Génération dans `generated`

`historical:generate` :

1. recharge le catalogue et `reviewed` ;
2. exécute l’ensemble des validations ;
3. s’arrête avant toute écriture si une erreur est détectée ;
4. calcule les relations à partir des personnes, activités, affirmations et
   épisodes de présence validés ;
5. valide les IDs et dépendances de la sortie ;
6. construit les index temporels et relationnels compacts ;
7. remplace `content/generated/relations.json` et
   `content/generated/historical-index.json`.

Le script ne lit jamais `staging` pour ses calculs. Le résultat est déterministe :
il ne contient ni date d’exécution dépendant de l’horloge ni ordre dépendant du
système. Le champ `generatedAt` est dérivé du catalogue des sources et reste donc
stable tant que les données d’entrée ne changent pas.

Les niveaux de relation, les règles de prudence et le format des index sont
détaillés dans [historical-relation-engine.md](./historical-relation-engine.md).

Une relation générée conserve :

- les personnes et le lieu concernés ;
- le caractère certain ou seulement possible du chevauchement ;
- les IDs des claims d’entrée ;
- les IDs des épisodes de présence ;
- le nom et la version de l’algorithme.

Une relation automatique ne prouve pas une rencontre. Une interaction attestée
doit rester un `HistoricalClaim` distinct avec une preuve directe.

## Catalogue des sources

`SourceCatalogEntry` décrit une publication sans en recopier le contenu :

```json
{
  "id": "source-identifiant-stable",
  "title": "Titre du document",
  "publication": "Nom de la publication",
  "chapterOrAppendix": "Chapitre ou appendice",
  "pageOrSection": "Page, section ou figure",
  "url": "https://exemple.invalid/document",
  "documentType": "map",
  "language": "fr",
  "accessedAt": "2026-07-25",
  "factualDataUseAllowed": true,
  "longTextReproductionAllowed": false,
  "imageReproductionAllowed": false,
  "verificationStatus": "reviewed"
}
```

La politique d’utilisation est volontairement explicite :

- seules les données factuelles et références sont intégrées ;
- aucun long passage n’est recopié ;
- aucune image n’est recopiée par cette chaîne.

Une référence de claim est limitée à 280 caractères. Elle doit de préférence
indiquer un verset, une page, une section, une figure ou une formulation très
courte.

## Affirmations historiques

Un `HistoricalClaim` relie un sujet à un prédicat contrôlé :

- `birth` ;
- `death` ;
- `presence` ;
- `residence` ;
- `travel` ;
- `reign` ;
- `prophecy` ;
- `office` ;
- `participation` ;
- `family-relation` ;
- `attested-interaction`.

Il peut aussi référencer un objet, un lieu, un événement et une période.

Chaque preuve indique :

- `sourceId` ;
- `shortReference` ;
- `method` : `direct`, `calculated` ou `inferred` ;
- `inputClaimIds` pour les dépendances ;
- `calculationExplanation` pour un calcul ou une inférence ;
- `humanReviewStatus`.

Une preuve calculée sans claims d’entrée ou sans explication est refusée. Une
preuve placée dans `reviewed` mais non relue humainement est également refusée.
Le dossier `reviewed/claims` refuse toute entrée ayant `origin: "generated"`.

## Épisodes de présence

Un `PresenceEpisode` relie une personne, un lieu et une période. Les types
disponibles sont :

- `resident` ;
- `visitor` ;
- `traveler` ;
- `ministry` ;
- `reign-seat` ;
- `imprisonment` ;
- `possible-presence`.

Chaque épisode doit citer au moins un claim justificatif. Les événements
associés sont optionnels, mais leurs IDs doivent exister.

Une association générale entre une personne et un lieu ne suffit pas à créer un
épisode de présence. La période et la justification doivent être relues.

## Validation automatique

```bash
pnpm historical:validate
pnpm historical:promote -- --verify-output
pnpm historical:generate
pnpm historical:report:a7b
pnpm test
pnpm check
```

Pour contrôler uniquement le jeu fictif :

```bash
node --experimental-strip-types scripts/validate-historical-data.mjs --fixtures
```

La validation refuse notamment :

- les IDs dupliqués ;
- les sources inexistantes ou non relues ;
- une donnée relue sans source ;
- une preuve calculée sans claims d’entrée ou explication ;
- une période impossible ou une année zéro ;
- les personnages, lieux, événements, routes ou territoires inexistants ;
- un élément de `staging` présenté comme validé ;
- une affirmation générée déposée dans `reviewed` ;
- une preuve non relue dans `reviewed` ;
- une référence courte dépassant 280 caractères ;
- une relation générée privée de ses claims ou présences d’entrée.

La convention des années reste celle de
[`historical-temporal-model.md`](historical-temporal-model.md) :
`-1` signifie 1 av. n. è., `1` signifie 1 de n. è. et `0` est interdit.

## Jeu de test fictif

`content/test-fixtures` contient :

- une publication fictive ;
- deux personnes fictives ;
- un lieu et un événement fictifs ;
- trois claims de test ;
- deux épisodes de présence fictifs ;
- une extraction `staging` qui doit être ignorée.

La génération en mémoire produit une relation de co-présence déterministe. Aucun
de ces éléments ne doit être importé par l’application ou déplacé vers le corpus
réel.

## Checklist de relecture humaine

Avant de déplacer une donnée vers `reviewed`, vérifier :

- [ ] l’identité et l’édition de la source ;
- [ ] le localisateur exact et la brièveté de la référence ;
- [ ] la conformité de la politique factuelle ;
- [ ] la stabilité des IDs et l’existence de toutes les relations ;
- [ ] la convention des années et l’absence de zéro ;
- [ ] la précision, l’approximation et la certitude ;
- [ ] la distinction entre fait direct, calcul et inférence ;
- [ ] les claims d’entrée et l’explication de tout calcul ;
- [ ] l’absence de long extrait ou d’image reproduite ;
- [ ] le retrait de l’ancienne entrée `staging`.
