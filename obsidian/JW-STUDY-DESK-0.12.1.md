# JW Study Desk 0.12.1 — bibliothèque et téléchargements

## Corrections

**Perspicace** : le téléchargement public français contient les deux volumes imprimés dans un seul fichier `it_F.jwpub`. Les anciens identifiants `it-1` et `it-2` sont reconnus pour le téléchargement et le catalogue public est regroupé en une seule fiche. Les imports personnels existants restent accessibles. La limite de 150 Mo rejetait le fichier public de 353 748 857 octets ; le plafond de 400 Mo s’applique désormais à cet ouvrage, comme aux Bibles.

**Bible d’étude** : les entrées de navigation sans contenu ne sont plus envoyées au déchiffrement. Les chapitres stockés séparément sont effectivement lus et indexés avec leur livre et numéro de chapitre. La bibliothèque propose le choix du livre puis du chapitre, avec précédent/suivant. Les annotations importées peuvent être retrouvées au niveau du chapitre ; le surlignage mot à mot reste une limite distincte, indiquée dans le lecteur.

**Affichage** : les couvertures annulent explicitement la hauteur fixe des boutons d’Obsidian. Le titre et le bouton d’action restent sous l’image ; les petits panneaux passent à une colonne. Les images de couverture locales `*_cvr.jpg` sont reconnues. Les contrôles utilisent leur propre apparence claire/sombre et les longues références reviennent à la ligne.

## Parcours

- **Télécharger → préparation sur la carte → Lire**, sans ouvrir une fenêtre bloquante.
- Les copies du gros fichier en mémoire sont réduites, et les demandes sont traitées une par une pour éviter de préparer plusieurs gros ouvrages en mémoire simultanément. Les clics répétés et les alias de Perspicace ne créent pas de deuxième téléchargement.
- Le téléchargement continue si l’onglet bibliothèque est fermé pendant que le plugin reste chargé. Il ne rouvre pas cet onglet et ne déplace pas la lecture en cours.
- Une erreur apparaît sur la fiche avec **Réessayer**. Une installation incomplète est retirée de son nouveau dossier, sans toucher aux notes ou ouvrages déjà présents.
- Le sommaire recherche dans les titres et affiche les longues listes progressivement. Le retour à la bibliothèque conserve la recherche et la position de consultation.
- Les fichiers d’origine et le cache de lecture restent locaux ; aucun fichier Markdown individuel n’est créé par les téléchargements de la bibliothèque.

## Vérification avec les vrais fichiers

Fichiers obtenus depuis le service public officiel `https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS` avec `langwritten=F`, `fileformat=JWPUB`, et `booknum=0` pour la Bible. Les sources sont téléchargées seulement à la demande ; elles ne sont pas incluses dans le ZIP du plugin.

| Fichier public vérifié | Taille | Résultat de l’installation et de la lecture |
| --- | ---: | --- |
| `nwtsty_F.jwpub` | 118 078 557 octets | 1 822 documents dont les 1 189 chapitres bibliques ; lecture locale de Jean 7 vérifiée. |
| `it_F.jwpub` | 353 748 857 octets | 4 967 articles ; recherche et lecture locale de l’article Aaron vérifiées. |
| `nwt_F.jwpub` | 38 248 758 octets | 1 318 documents dont les 1 189 chapitres bibliques ; édition standard également installée et lue. |

Le contrôle utilise le paquet réellement compilé et les fichiers complets, dans l’hôte de vérification qui simule l’API d’Obsidian. Cela valide le traitement des sources réelles, sans constituer un essai dans chaque installation native ou sur chaque téléphone.

159 tests unitaires et 98 scénarios d’interface ciblés ont réussi. Les trois fichiers publics ont également été installés et lus sur les profils ordinateur et téléphone simulés.

Les tests automatiques couvrent aussi les erreurs de réseau, les nouvelles tentatives, l’installation interrompue, la fermeture de l’onglet, les métadonnées bibliques, les téléchargements sérialisés et l’absence de chevauchement des couvertures sous une hauteur de bouton native. Les mises en page sont contrôlées en clair/sombre à 260, 390, 820 et 1 280 px.

Pour reproduire le contrôle des fichiers complets : placer `it.jwpub`, `nwtsty.jwpub`, `nwt.jwpub` et les réponses correspondantes `it.json`, `nwtsty.json`, `nwt.json` dans un dossier local, puis lancer `ATLAS_REAL_JWPUB_DIR=/chemin/du/dossier pnpm exec playwright test --config obsidian/playwright.config.ts jw-study-desk-real-publications.spec.ts --project=desktop --workers=1`.

## Mise à jour

Fermer Obsidian, remplacer les fichiers du dossier **`atlas-biblique`** par ceux du ZIP **JW-Study-Desk-0.12.1.zip**, conserver **`data.json`** et les dossiers du coffre, puis rouvrir Obsidian. Il n’est pas nécessaire de renommer le dossier ou de réimporter les sauvegardes personnelles.
