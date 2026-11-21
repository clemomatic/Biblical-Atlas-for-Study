# Prototype Explorer — recherches WOL et contexte de l’Index

> Prototype isolé pour le code Obsidian **0.9.2** actuellement présent sur `main`.
> Ne pas publier comme mise à jour de JW Study Desk 0.22.9 sans réintégrer les sources de cette version.

## But

Faire apparaître dans la barre latérale les phrases de l’Index **avant** les références bibliographiques qu’elles introduisent. Ce n’est pas un résumé généré : les phrases sont extraites du HTML officiel WOL. Le lecteur et la recherche simple restent disponibles.

## Implémentation

- `wolIndexExplorer.ts` : validation stricte des URL WOL ; extraction des paragraphes de l’Index ; regroupement et déduplication par (section, phrase).
- `BibleLabPanel.ts` : une fois la recherche WOL obtenue, récupérer **au maximum une entrée de l’Index** identifiée dans les résultats et la présenter en tête de liste.
- `bibleLab.css` : cartes compactes avec étiquette contextuelle, références, emplacements 1:1 de 48 px, navigation dans le lecteur existant et lien officiel.
- `wolIndexExplorer.test.ts` : tests sur liens, regroupement, déduplication et limites.

Aucune image distante n’est téléchargée en masse. Les carrés affichent pour l’instant une icône de secours ; l’enrichissement du titre et de la couverture est reporté. Aucune donnée issue des notes privées n’est envoyée à WOL.

## À contrôler avant intégration de production

1. Tester les requêtes « courage », « jugement » et « miséricorde » dans Obsidian Desktop.
2. Inspecter le HTML réellement renvoyé par WOL ; les classes et structures de l’Index varient potentiellement suivant les éditions.
3. Vérifier les liens de paragraphe (le lecteur actuel élimine certains fragments `#h=`).
4. Simuler une réponse vide, une page chargée dynamiquement, et un refus HTTP 403/429 : les résultats classiques doivent rester utilisables.
5. Tester avec des panneaux de 260, 320, 400 px, thèmes clair/sombre, et Obsidian Android.
6. Réintégrer ce prototype sur **les véritables sources 0.22.9**, puis seulement lancer les tests complets du plugin récent.

## Non inclus

- Historique contextualisé persistant et sessions d’exploration.
- Épingles permanentes et synchronisation avec le panier d’idées.
- Recherche incrémentale avant Entrée.
- Résolution systématique de chaque renvoi en titre + couverture officielle.
- Pagination complète WOL et capture des clics à l’intérieur de la visionneuse web native.

Ce prototype n’est pas une preuve de compatibilité avec toutes les pages WOL.
