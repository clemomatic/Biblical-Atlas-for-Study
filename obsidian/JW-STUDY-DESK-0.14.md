# JW Study Desk 0.14.0 — Références, idées et lecture

## Installer

Remplacez `main.js`, `manifest.json` et `styles.css` dans le dossier existant `.obsidian/plugins/atlas-biblique/`, puis relancez le plugin. Conservez `data.json` et vos publications téléchargées. L’identifiant du plugin reste identique.

## Retrouver un verset dans vos notes

Dans **Lecture**, ouvrez **Correspondances dans mes notes**. Saisissez un verset, une plage ou des mots de votre idée, puis **Chercher**. Le bouton **Dans mes notes** part de la référence en cours. Deux nouvelles commandes Obsidian donnent accès à cette recherche, avec ou sans sélection.

La recherche parcourt tous les fichiers Markdown du coffre, même sans métadonnées Atlas. Elle reconnaît les abréviations, les liens Markdown, les listes et les chevauchements entre plages bibliques. Chaque occurrence reste distincte et présente le titre, la section, la phrase voisine et la ligne d’origine. Cliquez sur le titre pour retrouver l’emplacement, ou sur la référence pour la lire. Code, commentaires HTML et en-têtes YAML sont exclus. L’index reste local et réutilise les notes inchangées.

La phrase présentée est votre texte autour de la citation, avec une règle de proximité. Elle n’est pas une interprétation automatique du verset. Un clic sur une référence de la note transmet le contexte de ce clic au panneau, y compris lorsque le même verset sert plusieurs idées.

## Lire et suivre la note

Le champ **Une référence…** ouvre le passage avec **Lire** ou Entrée. L’option **Lire automatiquement après la saisie** ouvre une référence biblique reconnue après une pause de 0,9 seconde. Une référence incomplète ne déclenche pas cette ouverture.

Les références s’affichent en aperçus repliables ou dépliées. Leurs actions sont regroupées sous **Options de la référence**. Avec le suivi activé, le panneau présente les références visibles dans la partie affichée de la note, en mode Lecture ou Aperçu direct. Le suivi ne déplace jamais la note. L’ouverture volontaire d’un passage suspend ce suivi ; **Suivre la note** le reprend. La dernière note reste associée au panneau lorsqu’il reçoit le focus.

Dans les options de JW Study Desk, choisissez **Fenêtre popup**, **Panneau latéral** ou **Lien vers WOL**. La popup peut rester ouverte après un clic extérieur ; Fermer et Échap restent disponibles. Ces réglages sont conservés.

## Bible locale et revues

Dans la bibliothèque, les chapitres des Bibles françaises réutilisent désormais les versets propres du lecteur Bible, y compris pour les téléchargements précédents. Les lettres de renvoi ne se collent plus aux mots. Les nouveaux imports qui conservent ces repères en Markdown les mettent en exposant. Le JWPUB original est conservé.

Les séries de revues proposent un sélecteur d’année. Le catalogue conserve les dates à huit chiffres, distingue les numéros d’un même mois et normalise les dates mensuelles terminées par `00`. Les codes annuels réels, comme `w15` ou `g26`, correspondent aux familles `w` ou `g` utilisées par le service de téléchargement. Cela corrige aussi la validation qui rejetait ces JWPUB.

Le cache du catalogue est remis à jour une fois pour récupérer les numéros précédemment fusionnés. La collection présentée dépend des métadonnées françaises du catalogue officiel ; un format réellement absent du service reste signalé indisponible. La présence dans le catalogue ne garantit pas à elle seule un fichier téléchargeable.

## Notes d’étude anglaises

Activez **Comparer les notes d’étude françaises et anglaises** pour interroger les deux éditions officielles au moment de lire un passage, dans la popup ou le panneau. Cette option est désactivée initialement pour conserver une lecture locale sans requête supplémentaire.

Le lecteur peut établir qu’une note anglaise existe pour un verset qui n’a aucune note d’étude française dans les données reçues. Si le verset possède déjà des notes françaises, les notes anglaises restent accessibles sous **correspondance à vérifier** : des identifiants différents selon la langue ne prouvent pas qu’une note manque. Cette version ne revendique pas une comparaison sémantique exhaustive de toutes les notes de la Bible.

L’option de traduction utilise MyMemory sans clé payante. Elle traduit automatiquement les notes dont l’absence française est établie ; les autres peuvent être traduites à la demande. Le rendu indique **Traduction automatique non officielle · original anglais · MyMemory**, conserve l’original et donne le lien vers la source officielle. Seul le texte public de cette note est transmis au service de traduction. Les notes personnelles ne lui sont pas envoyées.

Le service gratuit peut atteindre son quota ou devenir indisponible. Dans ce cas, l’original anglais reste lisible. Les réponses sont réutilisées pendant la session ; la comparaison et la première traduction nécessitent Internet. Aucune note anglaise ni traduction n’est distribuée avec le plugin.

Sources techniques : [Bible d’étude officielle](https://www.jw.org/en/online-help/using-jw-org/nwt-study-bible/) ; [MyMemory : API](https://mymemory.translated.net/doc/spec.php) ; [limites du service](https://mymemory.translated.net/doc/usagelimits.php).

## Vérifications

Contrôle TypeScript, tests unitaires, compilation autonome et parcours du paquet compilé dans un hôte simulant les API Obsidian. Les nouveaux scénarios couvrent recherche dans les notes, contexte, saisie, persistance, popup/panneau, suivi de défilement, notes anglaises, traduction et quota, dates des revues et lecture locale propre. Des essais supplémentaires utilisent des JWPUB officiels réels, conservés uniquement comme données de test locales. Ces contrôles ne remplacent pas un essai dans votre installation Obsidian.
