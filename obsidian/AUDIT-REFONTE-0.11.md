# Bible Lab 0.11 — audit fonctionnel et refonte de l’usage

6 novembre 2026. Base examinée : branche des annotations dans les popups et de l’accès NWT/NWTSTY, commit `54b5293`. Cette refonte porte sur le plugin Obsidian ; le site Atlas présent dans le même dépôt reste un produit distinct.

## Diagnostic

Le problème principal est l’accumulation de parcours pour les mêmes besoins, plus que l’absence de fonctions. Le plugin expose des étapes internes qui obligent à comprendre sa construction avant de pouvoir lire ou étudier.

### Les problèmes concrets relevés

| Problème dans la version examinée | Conséquence | Traitement dans cette version |
| --- | --- | --- |
| Bibliothèque visuelle, catalogue JW.org, sélection de téléchargements en modale et ressources du panneau portent des noms voisins | On cherche plusieurs fois le même ouvrage à des endroits différents | Une bibliothèque canonique ; les anciennes commandes d’ouverture y aboutissent aussi |
| Sept boutons dans l’en-tête de la bibliothèque | La gestion des fichiers prend plus de place que les publications | « Ajouter un fichier » et ⋯ ; deux sections, Publications et Mes annotations |
| Catalogue étendu à charger manuellement | La bibliothèque paraît presque vide et l’utilisateur doit choisir un moteur | Chargement automatique à l’ouverture ; sélection utilisable pendant le chargement |
| Catalogue rechargé et perdu à la fermeture de la vue | Attente et transfert répétés | Métadonnées publiques mises en cache, partagées entre les ouvertures ; contrôle de fraîcheur quotidien ; base retéléchargée seulement si sa version change |
| Cartes avec plusieurs actions, codes et messages sur les formats | On lit des informations techniques au lieu de choisir un ouvrage | Une action principale : Télécharger, Lire ou Voir les numéros ; commandes secondaires dans ⋯ sur la couverture |
| Téléchargement précédé de plusieurs choix de stockage | Le geste demandé implique de comprendre les formats | Le bouton Télécharger vérifie, récupère, prépare et ajoute l’ouvrage ; aucun choix de moteur dans le parcours courant |
| Liste des numéros de revues mélangée à tous les livres | Les revues occupent la bibliothèque entière | Regroupement par revue ; numéros séparés à l’intérieur ; la recherche retrouve directement les éditions |
| Vue catalogue ne fusionnant que les imports en langue française | Une publication personnelle dans une autre langue peut disparaître | Tous les imports locaux restent visibles ; rapprochement français exact seulement |
| Tout ouvrage virtuel déclaré « personnel », même après téléchargement | Filtre Mes imports trompeur et origine perdue | Origine du téléchargement enregistrée dans le manifeste ; compatibilité avec les anciens imports |
| Événement de création du manifeste avant la fin d’un import | Une publication peut apparaître avant d’être lisible | Les manifestes sont publiés après les fichiers nécessaires |
| Commandes nombreuses sur chaque trouvaille ou source | Les actions annexes dominent le contenu | Lecture principale, menu ⋯ et association à une idée sur demande |
| « Index » personnel, Index WOL et « bibliothèque d’étude » concurrents | Le même mot désigne des outils différents | Sources personnelles, recherche WOL, outils documentaires et bibliothèque ont des destinations distinctes |
| Paramètres titrés uniquement « Atlas » | Bibliothèque et importations difficiles à découvrir | Entrées Bible Lab, bibliothèque et fichiers ; cartes rangées dans une section repliée |
| Vocabulaire interne : virtuel, SQLite, MEPS, schéma, tokens | Impression d’utiliser un prototype technique | Parcours courant rédigé en actions utiles ; limites de précision expliquées en langage courant, détails à la demande |

## Inventaire de l’existant et emplacement retenu

| Fonction | État observé et limite utile | Destination |
| --- | --- | --- |
| Plan, sujets et pistes de recherche | Gestion et persistance existantes, tests unitaires ; indépendants des notes | Étude ; modification du plan repliée |
| Recherche officielle WOL | Ouvre la vraie recherche dans la visionneuse web, pas une imitation des résultats | Recherche ; portée et options secondaires repliées |
| Index, Guide et Perspicace | Filtres ou requêtes vers les outils officiels ; leur classification reste gérée par WOL | Recherche |
| Détection des références dans les notes | Moteur et grammaire déjà largement couverts par les tests | Automatique ; logique de résolution préservée |
| Popups de lecture, liens bibliques et articles | Extraction, navigation, copie et ouverture WOL préservées | Dans les notes et le lecteur existants |
| Captures de citations WOL avec lien précis | Collecte depuis la sélection et le contexte web | Garder / Trouvailles |
| Presse-papiers et saisie manuelle d’une trouvaille | Capture possible sans phrase, classement ni plan obligatoire | Trouvailles ; formulaire manuel replié |
| Fiches d’idées | Phrase, références ordonnées, copie/insertion ; format phrase puis références entre parenthèses | Étude et Trouvailles ; fiches repliables |
| Favoris, classement, étiquettes et historique | Persistance existante ; historique replié | Sources ; options par source |
| Sauvegarde/restauration des recherches Bible Lab | Sauvegarde de sécurité avant restauration, format inchangé | Sources ; section repliée |
| Catalogue public JW Library | Extraction française avec validation du schéma et bornes de taille ; ne garantit pas qu’un JWPUB existe pour chaque référence | Automatique dans Publications ; actualisation manuelle dans ⋯ |
| Téléchargement officiel JWPUB | Hôtes, format, taille et réponse contrôlés ; indisponibilité expliquée sans effacer la bibliothèque | Télécharger sur la carte |
| Import local JWPUB | Lecture et recherche sans un fichier Markdown par article | Ajouter un fichier |
| Anciens imports Markdown | Conservés, lisibles et recherchables ; aucune migration destructrice | Même bibliothèque ; conversion accessible en options avancées |
| Lecture de publication et sommaire | Ouverture des documents, navigation précédent/suivant et liens locaux existants | Lire ; onglet bibliothèque |
| Recherche dans les publications téléchargées | Titres et textes locaux ; recherche en mémoire, pas une base FTS globale ; résultats bornés | Même barre de recherche que le catalogue |
| Import des annotations JW Library | Archive locale compacte de notes, surlignages et signets ; source inchangée | ⋯ → Importer une sauvegarde JW Library |
| Consultation et recherche des annotations | Notes consultables et recherche par texte/étiquettes ; navigation biblique existante | Mes annotations |
| Annotations dans les popups | Correspondances bibliques/documentaires existantes préservées | Dans les popups lorsque la référence est reconnue |
| Surlignage au mot près | Alignement des plages à vérifier ; cette refonte ne le présente pas comme acquis | Explication de précision accessible dans le lecteur d’annotations |
| Export JW Library des notes Markdown éditées | Comparaison et création d’une copie ; distinct de l’import compact des annotations | Options avancées ; aucune synchronisation automatique |
| Texte du jour et préparation de réunion | Chargement à la demande et carnet hebdomadaire existants | Étude ; bloc replié |
| Plans de discours et enquêtes Canvas | Création de supports dans le coffre | ⋯ → Autres outils |
| Atlas, cartes, lieux et fiches | Corpus et moteur cartographique existants | Autres outils ; réglages des cartes repliés |
| Inspection d’archives et ZIP Markdown | Outils de maintenance conservés | Import, export et diagnostic |

## Parcours de référence

### Trouver et lire un ouvrage

1. Ouvrir Ma bibliothèque depuis l’icône du panneau.
2. Parcourir les catégories ou saisir un titre/sujet.
3. Pour une revue, choisir son numéro si nécessaire.
4. Cliquer Télécharger. La publication est préparée puis le bouton devient Lire.
5. Choisir un article dans le sommaire.

La même bibliothèque affiche les téléchargements et les publications personnelles. Le filtre Téléchargées permet de retrouver uniquement le contenu déjà disponible hors connexion. Aucun contenu de publication n’est téléchargé simplement parce que le catalogue s’affiche.

### Ajouter une publication personnelle

Ajouter un fichier → choisir le JWPUB → vérifier le résumé → Ajouter à ma bibliothèque. La conversion en notes individuelles reste facultative, rangée dans les options avancées.

### Reprendre ses annotations

⋯ de la bibliothèque → Importer une sauvegarde JW Library → choisir sa sauvegarde → enregistrer ses annotations. La section Mes annotations permet ensuite de les retrouver. Cette opération ne change pas le fichier d’origine et n’écrit pas dans JW Library.

### Construire une idée

Étude → chercher → garder une trouvaille → formuler une idée → ordonner les références → insérer dans la note. Une trouvaille peut rester non classée aussi longtemps que nécessaire. Le format de rédaction reste une phrase suivie immédiatement de ses références entre parenthèses.

## Choix techniques invisibles pendant l’usage

- Cache du catalogue dans le dossier de configuration du plugin, hors de la liste des notes ; uniquement des métadonnées publiques.
- Une liste commune rapproche catalogue et imports selon publication, édition et langue. Les imports privés distincts restent accessibles.
- Stockage compact des nouveaux ouvrages, sans convertir tout le fonds en notes.
- Source originale et caches nécessaires écrits avant le manifeste de disponibilité.
- Compatibilité des anciens chemins et formats ; aucune suppression ou réorganisation automatique des notes déjà présentes.
- Menus natifs Obsidian pour les options des couvertures, trouvailles et sources.
- Vue paginée par lots de 48 ; la recherche s’applique à la liste entière, pas seulement au lot affiché.
- Échec de mise à jour non destructif : cache, sélection de secours et publications personnelles restent utilisables.

## Validation et limites

### Vérifications locales

- Base avant modification : TypeScript, compilation et 141 tests unitaires réussis.
- Après refonte : TypeScript, compilation, paquet installable et 151 tests unitaires réussis.
- Nouveaux tests unitaires : fusion des éditions, priorité du contenu local, conservation des imports privés et étrangers, filtres, recherche sans accents, regroupement des revues, validité et fraîcheur du cache.
- Trois tests de passerelle Python réussis ; inventaire de 412 tests graphiques dans le dépôt.
- Nouveaux scénarios graphiques : bibliothèque sobre, téléchargement en un clic jusqu’à la lecture, origine du téléchargement, import privé étranger, revues et écran étroit sombre ; tests existants adaptés aux menus et aux nouveaux libellés.

### Distinctions nécessaires

Un test dans l’hôte de vérification charge le vrai paquet compilé avec une API Obsidian simulée. Il ne remplace pas un essai dans Obsidian Desktop ou Android. Les archives de test sont synthétiques ; aucune sauvegarde personnelle n’a été utilisée dans les nouveaux tests ni incluse dans le paquet.

La dernière CI de la branche source échouait sur un test du Guide attendant un texte visible alors que le texte était dans un bloc replié ; ce test est corrigé pour ouvrir le bloc, tout en conservant le contrôle de la véritable requête WOL.

### Échecs anciens reproduits sur la base de départ

Une comparaison a été exécutée séparément sur le commit source `54b5293`, avant cette refonte, avec les mêmes archives et réponses simulées. Sur les 13 cas sélectionnés : 9 réussissent et les 4 cas suivants échouent déjà :

| Cas | Résultat du contrôle | Suite nécessaire |
| --- | --- | --- |
| Résolution `it-1 118 § 1` depuis l’index simulé | Le texte attendu n’est pas chargé | Vérifier la couverture du scénario et la résolution sur WOL réel |
| Résolution `it-2 450` depuis l’index simulé | Même absence du texte attendu | Vérifier l’édition et le chemin de résolution |
| Références numériques d’Actes réparties dans plusieurs éléments HTML | Aucun des 7 liens contextuels attendus n’est créé | Étudier le contexte inter-éléments de la détection |
| Ouverture du popup `Mat. 4:2, 3` dans le test des renvois + | La fenêtre attendue n’apparaît pas | Distinguer le problème de déclenchement du problème des renvois |

Ces échecs préexistent à la refonte ; ils ne prouvent pas à eux seuls une panne dans Obsidian avec les pages réelles. Ils restent des anomalies de validation à traiter. Le moteur de références n’a pas été réécrit pour les masquer. La suite globale conserve ces tests.

Les 160 contrôles ciblés des parcours d’étude, bibliothèque, imports, lecture, recherche, annotations, classement, sauvegarde/restauration, popups, discours et navigation WOL passent sur les deux projets ordinateur/mobile. Les contrôles de bibliothèque et de rendu sont également rejoués après les derniers ajustements de présentation. Les changements de libellés et de menus sont vérifiés sans retirer les assertions sur les données conservées.


Les points suivants demandent encore une vérification avec les vrais fichiers et appareils : téléchargement actuel des grosses éditions NWT/NWTSTY, qualité du rendu des données spécialisées de l’édition d’étude, vitesse/mémoire du premier chargement du catalogue sur Android, fidélité du surlignage au mot près et export/restauration de sauvegardes. Le catalogue n’est pas une preuve de disponibilité de tous les formats.

Cette version ne fusionne pas les nombreuses branches antérieures dans main et ne publie pas une mise à jour automatique. Elle fournit une refonte isolée et un paquet installable, avec un audit permettant de poursuivre les validations sans confondre interface terminée et fonctions spécialisées entièrement validées.
