# JW Study Desk 0.13.0 — Bible locale et recherche de versets

## Utilisation

1. Conservez la Bible française déjà téléchargée dans la bibliothèque. Les éditions `nwt` et `nwtsty` sont prises en charge.
2. Cliquez sur **Bible** dans la navigation, sur **Ouvrir la Bible** à l’accueil, ou lancez la commande **Ouvrir la Bible**.
3. Choisissez le livre puis le chapitre. Sur un écran étroit, ouvrez **Livre et chapitre** pour changer de passage. Les flèches passent au chapitre précédent ou suivant, y compris entre deux livres.
4. Dans **Rechercher**, saisissez un ou plusieurs mots. Tous doivent apparaître dans le même verset ; accents et majuscules sont ignorés. Le filtre permet de limiter la recherche à un livre. Un résultat ouvre le chapitre et met le verset en évidence.

La dernière édition, le livre, le chapitre et la recherche sont enregistrés avec l’espace de travail Obsidian. Le texte se sélectionne et se copie ; **Copier ce chapitre** copie une lecture numérotée. Les résultats sont affichés par groupes de 50 pour garder une interface fluide.

## Aperçus dans les notes

Les références reconnues passent d’abord par les Bibles locales françaises. Le passage doit être disponible en entier : un verset voisin n’est jamais substitué au verset demandé. Les listes de versets et les plages entre chapitres conservent leurs positions exactes.

L’aperçu indique **Lecture locale** et le nom de l’édition réellement utilisée. Un lien WOL demandant explicitement une édition privilégie cette édition si elle est installée. Le numéro d’un verset dans l’espace Bible ouvre un aperçu de l’édition en cours. Les boutons WOL et JW Library restent accessibles, ainsi que les notes et surlignages personnels déjà importés. Le texte local supplante un aperçu web précédemment mis en cache ; une Bible supprimée n’est plus utilisée.

Si aucune Bible utilisable ne contient le passage complet, le lecteur web existant prend le relais. Les notes d’étude éditoriales, les notes de bas de page et les renvois de l’éditeur restent à consulter sur WOL/JW Library : cette première lecture locale extrait le texte biblique, pas l’ensemble de l’appareil d’étude. Les annotations personnelles restent présentées dans leur volet existant ; leur précision est celle de l’import précédent.

## Fichiers existants et mise à jour

Le fichier JWPUB d’origine est conservé. Un fichier de lecture compressé, rangé à côté de la publication, permet d’ouvrir les passages et de les rechercher sans générer des milliers de notes Markdown. Les identifiants officiels des versets servent à l’extraction ; les titres de psaumes et les fragments poétiques sont conservés.

Pour une Bible téléchargée avant cette version, la préparation se fait automatiquement à la première ouverture locale, avec une progression. Elle réutilise le JWPUB présent et ne nécessite aucun nouveau téléchargement. Un cache endommagé est reconstruit depuis ce fichier. Une erreur d’écriture du cache n’empêche pas la lecture en mémoire.

Installez le dossier `atlas-biblique` du ZIP dans `.obsidian/plugins/` en conservant `data.json`, le catalogue et les dossiers de votre coffre. L’identifiant du plugin ne change pas. Aucun texte biblique ni fichier JWPUB n’est distribué avec le plugin.

## Vérifications

- Vérification TypeScript, tests unitaires et compilation du paquet autonome.
- Parcours automatisés sur le paquet compilé : bibliothèque vide, lecture locale, poèmes, listes de versets, retour web, remplacement du cache web, migration d’un ancien téléchargement, reconstruction d’un cache endommagé, annotations personnelles, choix d’édition, reprise de lecture, recherche et ouverture d’un résultat.
- Vérifications de mise en page en modes clair et sombre, sur écran étroit et sous les styles de boutons natifs d’Obsidian.
- Fichiers réels français : Bible d’étude 2026, Traduction du monde nouveau 2018 et Perspicace 2025. Les deux Bibles ont 1 189 chapitres. Une lecture indépendante de la table `BibleVerse` contrôle le texte extrait de chaque identifiant biblique, plutôt que comparer le lecteur à lui-même.

Ces essais exécutent le véritable paquet JavaScript dans un hôte qui simule les API Obsidian. Ils ne remplacent pas un essai dans Obsidian installé sur l’appareil de l’utilisateur.
