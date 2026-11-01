# Bible Lab — Study Studio (0.7.0)

**Bible Lab Study Studio 0.4** conserve le plugin Atlas biblique existant et y ajoute un panneau d'étude WOL/JW Library, un index des cartes bibliques et la bibliothèque des appendices. L'identifiant technique `atlas-biblique` ne change pas : la version 0.3 remplace la version 0.2 dans le même dossier, sans créer un second plugin ni réécrire les notes du coffre.

### Nouveau lecteur de références — 0.7

L'onglet **Références** remplace **Versets**. Le plugin détecte dans la note active :

- les références bibliques classiques (`Matthieu 10:29`, `2 Co 4:16`...) ;
- les marqueurs `!!référence!!` (plusieurs références séparées par `;`) ;
- les mentions de publication entre crochets, par exemple `[w24 Novembre p. 14-19]` ;
- les liens Markdown WOL `[Titre de l'article](https://wol.jw.org/fr/wol/d/...)`, y compris les URLs directes entre `[crochets]`.

Chaque référence est un **panneau dépliable**, chargé seulement sur demande, avec le texte de la source WOL, les notes disponibles, les renvois et les documents cités. Les liens vers les documents repérés permettent d'ouvrir un deuxième niveau de lecture **dans le même panneau**, sans remplacer le texte consulté. Les liens WOL officiels restent disponibles si l'extraction ne fonctionne pas.

Les versets ouvrent leur **chapitre de la Bible d'étude**, avec tentative d'isoler le verset exact, ses notes et renvois à partir du HTML officiel. La structure de WOL peut changer : un message le signale et le lien officiel permet de poursuivre. Les articles ne sont **pas** recopiés dans le coffre ; le panneau garde un cache temporaire en mémoire.

**Correction importante :** les références de publication utilisent `https://wol.jw.org/fr/wol/l/r30/lp-f?q=w24+Novembre+p.+14-19` et non la route de recherche `/wol/s/`.

Confidentialité : récupération à la demande depuis `wol.jw.org` uniquement, jamais via l'ancien service tiers d'aperçu. Le contenu externe est affiché en texte simple, sans exécuter de HTML provenant du site.

### Nouvelle passerelle JW intégrée — 0.6.0

**Plus besoin du script Python pour importer :** dans **Bible Lab → Studio → Ouvrir la passerelle**, les opérations s'exécutent dans Obsidian avec un moteur SQLite WebAssembly embarqué.

- **Importer une publication JWPUB :** sélectionner le fichier `.jwpub`, consulter la liste des articles, puis importer les documents en Markdown. WebCrypto assure le déchiffrement, les fichiers images inclus dans la publication sont conservés dans `assets`.
- **Importer une sauvegarde JW Library :** sélectionner le fichier `.jwlibrary`, vérifier l'empreinte SHA-256, le schéma SQLite (14, 15, 16) et le nombre de notes, puis créer dans un dossier neuf les notes éditables, l'index thématique et le manifeste de provenance. Les GUID et les étiquettes sont conservés.
- **Créer une nouvelle sauvegarde :** sélectionner le fichier d'origine, choisir l'import correspondant, comparer la liste des titres et contenus modifiés, puis créer une **nouvelle copie** dans `Atlas biblique/Exports` après validation du hachage, du nombre de notes, de l'intégrité SQL et des relations SQLite. Le fichier source n'est jamais écrasé.

Les modifications réexportées portent sur les **titres et contenus des notes existantes uniquement**. Les changements d'étiquettes, surlignages, annotations de publications et signets ne sont pas écrits dans la sauvegarde. Conserver le marqueur technique en bas du frontmatter des notes importées et modifier les titres via la propriété `title` du frontmatter, pas seulement via le nom du fichier.

**Sécurité :** toutes les opérations sont effectuées sur l'appareil, sans connexion à Google Drive, WOL ou un serveur tiers. Une sauvegarde restaurée dans JW Library remplace les données locales. **Ne restaure pas un export sur ton appareil principal avant d'avoir vérifié son ouverture sur un profil de test vierge.** Les sauvegardes volumineuses peuvent saturer la mémoire sur certains téléphones ; l'export est expérimental sur Android jusqu'à vérification sur appareil réel.

Le script `tools/bible_lab_bridge.py` reste une solution de secours/diagnostic facultative.

### Passerelle JW — 0.5

Le panneau **Studio → Importer des notes** accepte les archives ZIP contenant les notes Markdown produites par **Bible Lab Bridge**. Tous les fichiers sont placés dans un nouveau dossier, sans écraser de note existante ; les illustrations et les métadonnées JSON accompagnent l’import. La commande « Importer une archive ZIP Markdown » est également disponible dans la palette de commandes.

L’inspection des archives JWPUB / JW Library vérifie désormais le hachage SHA-256 du fichier SQLite et ne décompresse pas les médias annexes. Elle prend en charge les sauvegardes volumineuses (jusqu’à 140 Mo de ZIP), comme la sauvegarde du 27 octobre 2026 testée hors dépôt.

Pour le **véritable déchiffrement JWPUB → Markdown** et l’édition/réexport d’une sauvegarde JW Library sur des copies locales, utiliser le programme Python `tools/bible_lab_bridge.py`. Instructions et limites dans [JW_BRIDGE.md](../docs/JW_BRIDGE.md). Ce moteur n’est pas encore embarqué dans le plugin Android ; ne pas confondre les fonctions du script et celles de l'interface Obsidian.

### Nouvelle interface Study Studio 0.4

L'accueil se concentre sur la recherche et la lecture : navigation à six pictogrammes, cartes compactes, repères de sources, affichage adaptatif aux thèmes clair/sombre et animations désactivées si le système demande une réduction du mouvement.

- **Accueil** : texte du jour et sommaire de la réunion de semaine (le bouton **Actualiser** charge la page officielle WOL ; aucune note du coffre n'est envoyée).
- **Studio** : plans de discours enregistrés sous `Atlas biblique/Discours`, avec introduction, développement, conclusion, minutage indicatif, sources et liste de préparation.
- **Archives JW** : sélection locale d'un fichier `.jwpub` ou `.jwlibrary`, contrôle de taille de l'archive, lecture des métadonnées et création d'un inventaire Markdown sous `Atlas biblique/Imports`. L'archive d'origine n'est jamais modifiée.

**Important** : le décodage intégral d'un JWPUB et l'édition suivie d'une réexportation compatible d'une sauvegarde JW Library ne sont **pas encore implémentés** dans le plugin. Le travail préparatoire d'inspection ne doit pas être confondu avec ces fonctions. Une restauration d'une sauvegarde JW Library peut remplacer toutes les données de l'appareil ; toujours créer et conserver une sauvegarde récente avant toute expérimentation.

Le texte du jour est limité à un aperçu ; le programme de réunion montre ses titres et rubriques, sans archiver une publication entière. Les liens WOL officiels restent disponibles si le chargement ou la structure de la page change.

### Découvrir le laboratoire

1. Ouvrez la commande **Ouvrir le laboratoire biblique** ou l'icône **livre** dans la barre d'Obsidian.
2. **WOL** : tapez `Matthieu 10:29` ou un sujet, ouvrez la recherche ou le passage officiel, copiez le lien ou insérez-le dans votre note active. Le bouton JW Library utilise le lien `jw.org/finder` lorsqu'une référence biblique complète est reconnue.
3. **Versets** : les références du document actif apparaissent automatiquement. Écrivez `!!Jean 3:16!!` pour marquer une référence WOL ; les versets rédigés explicitement en français sont également détectés. En mode lecture, le marqueur devient un lien ouvrant le panneau.
4. **Cartes** : recherchez un lieu dans l'index de *Voyez le bon pays* ; chaque résultat indique les pages et repères alphanumériques, puis ouvre directement la carte correspondante. **Charger l'index complet** tente de récupérer les noms et repères de l'index officiel ; la petite liste de secours reste disponible si l'accès réseau est bloqué.
5. **Outils** : retrouvez les appendices A, B et C, les cartes B2, B3, B4, B6, B7, B10 et B13, des schémas, le calendrier hébreu et *Étude perspicace*. Copiez les liens ou insérez-les dans une note.
6. **Atlas** : la commande et le bouton de navigation de l'ancien Atlas restent disponibles : carte, frise, personnages, âges, routes, notes modifiables et enquêtes Canvas.

### Respect des données et de WOL

- Les notes et Canvas sont des fichiers locaux Markdown/JSON du coffre. Une mise à jour du plugin ne les remplace pas.
- Les recherches WOL et JW Library ouvrent les sites officiels avec le terme demandé ; aucune note complète n'est envoyée automatiquement.
- **Aperçu WOL** : contrairement aux liens directs, cette option manuelle utilise `https://wol-worker.iaremark.us`, service tiers employé par WOL Reference Tools. Le plugin n'y envoie que le terme de la recherche au moment du clic, et n'affiche que le texte nettoyé du HTML renvoyé. Un cache en mémoire de 30 minutes réduit les requêtes. Ne l'utilisez pas pour des informations confidentielles. Le service est facultatif et peut devenir indisponible.
- **Index des cartes** : l'actualisation télécharge la page publique de l'index officiel ; elle peut échouer à cause de protections réseau. Dans ce cas, les liens officiels restent proposés.
- Aucun texte complet de publication ni fichier JW Library n'est fourni ou modifié par ce plugin. Il s'agit d'une passerelle vers les outils officiels, pas d'une synchronisation avec JW Library.

### Installation et mises à jour

Le paquet compilé ZIP est publié parmi les **artifacts** des tests GitHub Actions lorsque la vérification réussit. Son dossier porte encore le nom `atlas-biblique`. Fermez Obsidian avant de remplacer `main.js`, `styles.css` et `manifest.json` dans ce même dossier, puis relancez-le et activez le plugin.

Sur Android, un gestionnaire de fichiers donnant accès au dossier caché `.obsidian/plugins/` peut être nécessaire. Testez d'abord sur une copie du coffre ; les tests d'interface automatisés ne remplacent pas un essai dans l'application native.

### Limites connues

- Une recherche par sujet utilise la recherche officielle WOL et non une API de résultats intégrée ; l'aperçu facultatif repose sur un service indépendant qui peut être inaccessible.
- La recherche de lieux depuis l'index ouvre la carte officielle, mais ne calcule pas encore automatiquement une coordonnée géographique à partir des repères imprimés.
- Les liens JW Finder suivent le comportement de l'appareil et ne garantissent pas que l'application JW Library soit installée ou intercepte le lien.
- Le panneau est conçu pour Obsidian ordinateur et mobile ; sa validation native reste à faire.

## Installer sur Windows ou Android

1. Décompressez `atlas-biblique-0.2.0.zip`.
2. Copiez le dossier `atlas-biblique` dans le dossier `.obsidian/plugins/` de votre coffre. Les fichiers doivent se trouver directement dans `.obsidian/plugins/atlas-biblique/main.js`, `manifest.json` et `styles.css`.
3. Dans Obsidian, ouvrez **Paramètres → Modules complémentaires**, autorisez les modules complémentaires si nécessaire, puis rechargez Obsidian.
4. Activez **Atlas biblique interactif**.
5. Touchez l’icône de carte ou lancez la commande **Atlas biblique interactif : Ouvrir l’Atlas**.

Sur Android, un gestionnaire de fichiers capable d’afficher les dossiers cachés peut être nécessaire pour accéder à `.obsidian`. Le coffre doit être accessible dans les fichiers de l’appareil. Il n’est pas nécessaire de compiler le plugin sur le téléphone.

Cette version s’installe manuellement ; elle n’est pas publiée dans le catalogue communautaire. Obsidian 1.6.0 ou ultérieur est requis. Pour un premier essai, utilisez un coffre de test, puis copiez les fichiers du plugin dans votre coffre habituel.

## Un premier parcours

1. Cherchez un personnage ou un lieu avec **Recherche**.
2. Ouvrez sa fiche, puis **Note d’étude** pour créer ou ouvrir une note liée.
3. Dans **Mon carnet**, choisissez **Nouvelle recherche** pour noter une question.
4. Pour associer une note déjà écrite, utilisez **Relier** et sélectionnez-la. Le plugin ajoute uniquement ses propriétés `atlas_entities` et, si elle est absente, `atlas_schema` ; il conserve le texte et les autres propriétés.
5. Utilisez **Retenir** sur plusieurs fiches, puis **Enquête**. Un tableau Canvas et une note de recherche sont créés. Vous pouvez déplacer les cartes, ajouter des images et légender les fils dans Canvas.

Les fiches proposées autour d’une enquête sont uniquement les associations déjà présentes dans le corpus. Les fils du tableau portent le libellé « À explorer » : ils ne créent pas de nouvelles affirmations historiques.

## Modifier toutes les fiches et les tracés

Ouvrez une fiche puis **Modifier**. L’éditeur propose quatre sections :

- **Texte et dates** : titre, description Markdown, notes, certitude et années.
- **Carte et étapes** : coordonnées, symbole et couleur d’un lieu ; couleur, noms, ordre et positions des étapes d’un itinéraire. Une étape peut suivre un lieu existant ou garder une position indépendante.
- **Liens et sources** : versets, sources et associations entre fiches.
- **Données complètes** : toutes les propriétés de la fiche, dont les activités, les bornes incertaines, les mois/jours, les illustrations et les références détaillées. Le format est JSON ; les données sont validées avant enregistrement.

Le bouton **Gérer toutes les fiches** (réglages dans la barre de l’Atlas) permet de rechercher chaque personnage, événement, lieu et itinéraire, d’en créer, de masquer/réafficher une fiche ou de restaurer l’original. Les corridors du réseau routier historique sont également des itinéraires éditables.

Sur la carte, sélectionnez **Modifier la carte** pour déplacer les repères. Avec une route sélectionnée, déplacez les étapes numérotées, cliquez sur un endroit vide pour en ajouter, ou utilisez un clic droit/appui long sur une étape pour la retirer. Une route doit garder au moins deux étapes. L’éditeur permet aussi ces opérations sans geste sur la carte.

Une première modification crée une note sous `Atlas biblique/Entités` (ou votre dossier configuré). Son corps est la description de la fiche : modifiez-le librement dans Obsidian, avec Markdown et liens internes. Les propriétés `atlas_entity` et `atlas_data` conservent l’identifiant et les autres données. Les changements actualisent la carte, la frise et les calculs. Les textes issus des fiches personnalisées portent cette provenance ; les anciennes déductions du corpus ne servent pas de preuve aux nouvelles dates.

**Note d’étude** ouvre cette note personnalisée lorsqu’elle existe. Les notes d’étude ou recherches créées auparavant restent éditables et sont conservées séparément ; leur texte n’est pas remplacé lors de la création d’une personnalisation. Si une note change pendant que l’éditeur est ouvert, l’enregistrement est refusé pour préserver le texte le plus récent : rouvrez l’éditeur.

**Restaurer l’original** envoie uniquement la note de personnalisation à la corbeille Obsidian. **Retirer la fiche** fait de même pour une fiche créée personnellement. Les autres notes liées sont conservées. Si la même personnalisation est dupliquée, le carnet indique le conflit et l’original reste affiché jusqu’à sa résolution.

## Âge des personnages au repère

La barre **Âges au…** accompagne la frise. Le trait vertical muni d’une poignée ↔ se déplace à la souris ou au doigt ; au clavier, les flèches déplacent le repère d’environ un mois, Maj+flèche de dix ans. Les rubans des personnages traversés par le trait affichent leur âge calculable. La fiche sélectionnée conserve également son âge dans la barre.

**Date précise** permet de saisir une année, puis éventuellement un mois et un jour civils. **Tous les personnages** ouvre la liste des âges, avec recherche et option d’affichage avant/après leur vie. **Suivre la frise** reprend le centre de la période visible ou le début de l’événement sélectionné.

Le calcul utilise les données actuelles de vos fiches et saute l’année zéro. Une date de naissance complète permet un âge révolu ; des années seules donnent une estimation, et des bornes variables une fourchette. Une naissance inconnue reste « Âge inconnu ». Avant la naissance connue, la fiche indique « Pas encore né » ; après le décès, elle affiche l’âge au décès. Les mois hébraïques ne sont pas convertis arbitrairement en anniversaires civils. Ces calculs ne constituent pas de nouvelles attestations historiques.

## Ajouter ses propres événements et lieux

Dans **Mon carnet → Nouvelle recherche**, choisissez **Événement sur la frise** ou **Lieu sur la carte**.

- Un événement attend une année de début ; l’année de fin est facultative. Saisissez `-607` pour une année avant notre ère. L’année zéro est refusée.
- Un lieu attend une latitude et une longitude numériques. Ses coordonnées sont personnelles et leur précision n’est pas validée par le corpus.
- Les événements personnels sont regroupés dans **Mes recherches**, et leurs dates sont affichées comme approximatives. Les fiches indiquent leur provenance personnelle.
- Modifier ces propriétés dans la note actualise les vues. Supprimer la note retire sa projection personnelle ; le corpus inclus reste intact.

Les notes invalides restent dans le carnet avec une explication. Elles ne sont pas projetées sur la carte ou la frise.

Exemple d’événement personnel (l’année ci-dessous est un exemple de saisie, pas une nouvelle donnée du corpus) :

```yaml
---
atlas_schema: 1
atlas_kind: event
atlas_uid: ma-piste-stable-001
atlas_title: Ma recherche sur cette période
atlas_start_year: -607
atlas_entities:
  - place:jerusalem
atlas_references:
  - Jérémie 25:11
---
```

Les identifiants du corpus sont conservés dans `atlas_entities`, sous la forme `person:identifiant`, `place:identifiant`, `event:identifiant` ou `route:identifiant`. Les notes créées par le plugin les remplissent automatiquement. Conservez `atlas_uid` lors d’un déplacement ou renommage d’une fiche personnelle ; attribuez un nouvel identifiant si vous dupliquez la fiche pour créer un autre sujet.

## Liens depuis les notes

Les notes documentaires créées par le plugin contiennent un lien « Explorer dans l’Atlas ». La commande **Explorer les fiches de la note active** ouvre la première fiche liée disponible.

Vous pouvez aussi insérer un bloc :

````markdown
```atlas
place:jerusalem
```
````

## Hors connexion et confidentialité

La frise, le corpus, les repères géographiques, les notes et Canvas fonctionnent sans compte distant ni service d’IA.

Un fond Natural Earth simplifié est inclus dans le plugin et fonctionne immédiatement sans téléchargement. Les tuiles détaillées utilisent désormais **OpenFreeMap**, sans clé d’API, via l’API réseau publique d’Obsidian. Le chargement en ligne reste désactivé par défaut ; activez-le dans les réglages pour charger et conserver les tuiles consultées.

Pour préparer une étude sans réseau :

1. Ouvrez **Cartes hors connexion** (icône de téléchargement dans l’Atlas ou commande du même nom).
2. Choisissez **Terre promise**, **Égypte et Sinaï**, **Méditerranée et Proche-Orient**, la zone actuellement visible ou des coordonnées personnalisées.
3. Choisissez le niveau de détail puis **Télécharger cette zone**. La fenêtre indique le nombre de tuiles, la progression et la taille reçue.
4. Attendez **Disponible hors connexion**. Le téléchargement utilise au plus quatre requêtes simultanées, 3 000 tuiles et 50 Mo par préparation ; les zones trop grandes sont refusées et le téléchargement s’arrête avec une marge avant la limite de taille. Une interruption garde les tuiles déjà reçues et signale un résultat partiel.
5. Désactivez le chargement en ligne ou coupez le réseau. Les tuiles enregistrées sont relues du coffre, même après redémarrage. Au-delà du détail téléchargé, une tuile parente est agrandie ; hors zone, le fond inclus reste disponible.

Le relief Natural Earth est limité à son détail natif (zoom 6). Les données vectorielles apportent des contours d’eau, occupation des sols et bâtiments jusqu’au zoom 12 ; elles ne représentent pas des frontières ou reliefs historiques. Les routes et repères bibliques restent les éléments interactifs de l’Atlas. Ces fonds ne comprennent pas de photographie satellite.

Les fichiers sont sous `Atlas biblique/Cartes` (ou le dossier configuré au démarrage du plugin). Ne modifiez pas les tuiles binaires. **Retirer les cartes téléchargées** libère ce cache sans toucher aux notes. Pour une synchronisation entre appareils, le service de synchronisation doit aussi transporter les fichiers `.pbf`, `.png` et `.json` du coffre. Les liens JW/WOL nécessitent leurs applications ou une connexion pour ouvrir leur contenu.

Attribution : [OpenFreeMap](https://openfreemap.org/), [OpenMapTiles](https://openmaptiles.org/), [OpenStreetMap](https://www.openstreetmap.org/copyright) et [Natural Earth](https://www.naturalearthdata.com/).

La synchronisation entre appareils dépend de la synchronisation de votre coffre Obsidian ; le plugin ne fournit pas son propre service de synchronisation.

## Données et mises à jour

- Les mises à jour du corpus passent par les versions du plugin. Les notes de personnalisation priment sur le corpus fourni et sont conservées lors des mises à jour ; restaurez l’original pour reprendre la fiche de la version installée.
- Une fiche créée depuis le corpus est un instantané, avec `atlas_corpus_version`. Ses références restent consultables dans le plugin ; elle n’est pas réécrite lors d’une mise à jour.
- Les notes peuvent être déplacées ou renommées dans Obsidian : leurs propriétés assurent le lien avec l’Atlas.
- Remplacez `main.js`, `manifest.json` et `styles.css` pour mettre le plugin à jour, puis désactivez/réactivez-le. Conservez `data.json` si vous souhaitez conserver les réglages.
- Désactiver ou désinstaller le plugin laisse les notes et fichiers `.canvas` exploitables dans Obsidian. Les blocs `atlas` et liens d’ouverture nécessitent le plugin actif.

## Développement et vérification

Depuis la racine du dépôt :

```bash
pnpm install --frozen-lockfile
pnpm obsidian:typecheck
pnpm obsidian:test
pnpm obsidian:package
pnpm exec playwright test --config obsidian/playwright.config.ts
```

La sortie compilée est dans `obsidian/dist/atlas-biblique`. Le ZIP est créé dans `obsidian/artifacts`. Le paquet comprend les dépendances et les polices ; seule l’API Obsidian est externe. Le code utilise les API Vault/FileManager et aucune API Node.js/Electron à l’exécution.

Les tests navigateur chargent le véritable `main.js` compilé dans un hôte Obsidian simulé. Ils vérifient les notes et leur préservation, l’édition des fiches/routes, les conflits, les calculs d’âge, les téléchargements et leur relecture sans réseau, la navigation, Canvas et l’isolation visuelle. Ils ne remplacent pas une validation dans les applications natives Windows et Android.
