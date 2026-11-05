# Bible Lab — Catalogue de publications JW Library (prototype facultatif)

Cette version se base sur la **PR #105** (catalogue JW.org et téléchargements JWPUB) et conserve la bibliothèque visuelle de la PR #103.

## Ce qui change

Dans **Ma bibliothèque → Explorer JW.org**, le bouton **Charger le catalogue JW Library** déclenche, **sur clic explicite**, la récupération d'un index public de métadonnées de publications :

1. Le plugin demande \`https://app.jw-cdn.org/catalogs/publications/v4/manifest.json\`.
2. Il vérifie le champ \`current\` comme UUID et construit l'URL d'une archive \`catalog.db.gz\` sur ce même domaine.
3. Il valide et décompresse en mémoire le fichier GZIP (32 Mio compressé, 180 Mio SQLite décompressé au maximum), vérifie la signature SQLite, puis ouvre la base dans le moteur SQLite intégré.
4. Il vérifie la présence de la table \`Publication\` et du champ \`MepsLanguageId\`, et retient les fiches de langue française (MEPS 3), sans entrée marquée réservée. Les éditions de magazines portant une date identifiable restent distinctes.
5. Il conserve les mêmes commandes **Vérifier le JWPUB** et **Lire** que la bibliothèque existante. **Aucun JWPUB n'est téléchargé par le chargement du catalogue.**

La liste peut dépasser quelques milliers d'entrées : seules 48 cartes sont dessinées à la fois, avec un bouton **Afficher 48 publications supplémentaires**. La recherche et les filtres travaillent sur toute la liste découverte.

## Limitations et précautions

- L'index JW Library est un **point d'intégration observé dans des projets tiers**, non une API de catalogue officiellement documentée pour les extensions Obsidian. Son schéma, son URL ou son accessibilité peuvent changer.
- Cette version n'a pas été validée avec un téléchargement réel du catalogue depuis Obsidian Desktop. Un simulateur SQLite couvre le parsing et l'interface ; le test sur le serveur actuel reste indispensable.
- La présence dans le catalogue de JW Library **ne prouve pas** la disponibilité d'un fichier JWPUB public sur JW.org. Seul le clic **Vérifier le JWPUB** interroge les formats téléchargeables, et seul un consentement séparé lance l'import.
- Les fichiers du catalogue ne sont pas archivés dans le coffre ; seules les données nécessaires à l'affichage sont conservées en mémoire pendant la session. Les JWPUB déjà importés et les notes ne sont jamais modifiés.
- Certaines publications cataloguées n'ont pas de couverture connue : elles reçoivent une jaquette typographique, jamais une URL d'image devinée.
- Le chargement d'une grande base SQLite peut consommer beaucoup de mémoire ; éviter sur un appareil à faible RAM. L'opération n'est ni automatique, ni récurrente.
- **Pas encore inclus :** génération automatique des carnets d'assemblée, détection avancée des paragraphes bibliques et contrôle automatisé des mises à jour des JWPUB.

## Vérifications

\`\`\`sh
pnpm obsidian:typecheck
pnpm obsidian:test
pnpm obsidian:package
pnpm exec playwright test --config obsidian/playwright.config.ts \
  obsidian/tests/bible-lab-jw-library-full-catalog.spec.ts \
  --project=desktop --workers=1
\`\`\`

Avant fusion, faire un essai sur un coffre de test Obsidian Desktop avec accès au catalogue réel et vérifier le volume du fichier récupéré, puis un vrai **JWPUB français** de publication publique. En cas d'échec, le catalogue manuel de la PR #105 reste accessible.
