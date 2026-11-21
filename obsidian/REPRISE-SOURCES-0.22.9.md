# JW Study Desk — reprise sécurisée de la version 0.22.9

## État vérifié le 21 novembre 2026

Le dépôt `clemomatic/Biblical-Atlas-for-Study` (branche `main`) contient encore un plugin Obsidian `0.9.2`. Sa branche `feat/jwsd-wol-index-explorer-prototype` contient un nouveau parseur Index WOL et une interface d'essai. Elle **ne remplace pas** la version installée.

Trois copies du paquet `JW-Study-Desk-0.22.9.zip` se trouvent dans la bibliothèque ChatGPT ; elles contiennent les mêmes fichiers. Inventaire du ZIP vérifié : `main.js`, `styles.css`, `manifest.json`, documentation ; **aucun fichier TypeScript/TSX ni sourcemap**. Les sources complètes disponibles dans la bibliothèque s'arrêtent à `JW-Study-Desk-0.16.0-sources.zip`. Les dernières fonctions de 0.22.9 ne sont donc pas récupérables à l'identique depuis le paquet compilé.

Empreintes SHA-256 permettant de retrouver sans ambiguïté la livraison à préserver :

| Artefact | SHA-256 |
| --- | --- |
| `JW-Study-Desk-0.22.9.zip` | `d8fea56c79809c6f39368d89c17adab785bf7a7f2c47803e54a81b0b2bb0fb6b` |
| `atlas-biblique/main.js` | `370d35e4a2b46b5e6000aa39888c0bea337ac68ea908a7ec934910630a3070de` |
| `atlas-biblique/styles.css` | `1ec0092958a3907439c48c1fe42a835c02e7b2f4a73db880f5fdf86da8dd0fb8` |
| `atlas-biblique/manifest.json` | `1fd99b3231222c8c6131dc9e11161e707fe3f1bbeab033d1f1971997bb02d48e` |

**Ne pas remplacer** un `main.js` 0.22.9 par une compilation de la branche GitHub actuelle. Cela supprimerait ou ferait régresser des fonctions (Atelier discours, JWPub, notes d'étude, lecture locale, etc.).

## Voie de reprise recommandée

1. Retrouver un checkout ou un export `-sources.zip` **de 0.22.9** : autre ordinateur de développement, dossier de travail précédent ou historique Git non poussé.
2. Comparer les `manifest.json` et vérifier que `pnpm obsidian:package` reproduit un plugin fonctionnel avant de modifier la recherche.
3. Sur la branche des sources **réellement** reconstituées 0.22.9, porter uniquement le parseur `wolIndexExplorer.ts` et les tests. Adapter le rendu à `StudyDeskView.ts` plutôt qu'à l'ancien `BibleLabPanel.ts`.
4. Tester d'abord le moteur sur le HTML officiel des thèmes *courage*, *jugement*, *miséricorde*, notamment les liens WOL `/pc/` de l'Index. Aucun titre ou cible ne doit être deviné.
5. Ajouter les couvertures 1:1 depuis des métadonnées vérifiées, puis le fil contextualisé et les épingles persistantes.
6. Vérifier la non-régression : lectures, sauvegardes et `data.json`, annotations, JWpub, discours et fichiers `.jwlplaylist`.

## Si les sources 0.22.9 restent introuvables

Utiliser la version complète 0.16.0 comme **point de départ de reconstruction** et reprogrammer les changements 0.17 à 0.22.9 à partir des journaux de livraison et du paquet exécutable. C'est un projet de migration, **pas** une simple fusion ou mise à jour. Aucun ZIP 0.22.10 ne doit être annoncé avant tests end-to-end dans Obsidian.

## État de la PR

La PR de prototype (brouillon) prouve une première voie de parsing et de rendu sur le code plus ancien. Elle ne prouve ni l'accès WOL réel dans Obsidian, ni la compatibilité des sources 0.22.9. Elle ne doit pas être fusionnée en l'état.
