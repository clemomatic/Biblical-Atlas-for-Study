# Validation de la version 0.2.0

31 octobre 2026.

Parcours vérifié : ouvrir le paquet Obsidian compilé → modifier les fiches et les tracés → enregistrer dans le coffre → réindexer → retrouver les données et les calculs après redémarrage. Préparer une zone cartographique → conserver ses tuiles → redémarrer sans réseau → afficher les tuiles locales.

## Résultats

| Contrôle | Résultat |
| --- | --- |
| `pnpm typecheck` et `pnpm obsidian:typecheck` | Réussis |
| `pnpm test` | 107 tests historiques réussis ; frise focalisée : 129 modèles, 490 repères, 80 relations et 384 lignes datées concordantes |
| `pnpm obsidian:test` | 16 tests réussis : métadonnées, édition, années sans zéro, anniversaires, inconnues, fourchettes, décès, calendriers et limites des téléchargements |
| Compatibilité des fiches existantes avec la validation d’édition | 1 236 fiches validées, aucune erreur |
| `pnpm build` | Application web et PWA construites |
| `pnpm obsidian:package` | ZIP 0.2.0 construit ; dépendances incluses, seule l’API publique `obsidian` reste externe |
| Parcours navigateur du plugin | 26 réussis : 13 scénarios en format ordinateur, 13 en format Pixel 7 |
| Parcours web existants | 8 réussis dans `e2e/study-navigation.spec.ts` et `e2e/mobile.spec.ts` |
| Source OpenFreeMap | TileJSON, une tuile vectorielle et le relief PNG reçus ; décodage de la tuile vectorielle réelle confirmé |

## Parcours contrôlés

Les tests chargent le véritable `main.js` dans `obsidian/dev/harness.js`, un hôte simulant les API publiques d’Obsidian. Ils vérifient les effets réels sur les fichiers simulés, la préservation du corps des notes et des autres propriétés YAML, les renommages, les identifiants en double, Canvas, les liens de protocole, l’isolation CSS, le thème sombre et les panneaux étroits.

Les nouveaux scénarios couvrent le texte et les coordonnées d’un lieu du corpus, le corps Markdown édité depuis Obsidian, le refus d’un enregistrement concurrent, la création et l’ordre des étapes, leur déplacement par geste sur la carte, l’ajout/retrait d’étapes, le masquage et la restauration d’une fiche, les événements hors des anciennes bornes de la frise, les personnalisations dupliquées et la conservation après redémarrage.

Les âges sont vérifiés avant/après un anniversaire, à travers le passage de 1 avant notre ère à 1 de notre ère, avec une naissance approximative ou inconnue et après le décès. La saisie d’une date précise, les étiquettes des rubans, la vue focalisée mobile et le déplacement au clavier sont exercés.

Les téléchargements utilisent des réponses HTTP contrôlées contenant une tuile MVT valide et une image PNG déterministes. Les tests vérifient le stockage binaire, le plafond de quatre requêtes, l’identification du plugin, le résultat complet/partiel, le refus des zones excessives, la lecture après redémarrage sans requête réseau et la suppression du cache sans toucher aux notes. Un contrôle séparé a récupéré et décodé des données réelles OpenFreeMap ; les tests automatisés ne dépendent pas de la disponibilité du fournisseur.

## Limites

L’environnement local utilise Node.js 24 et Chromium 138. Les applications natives Obsidian sous Windows et Android n’ont pas été exécutées ici. Les gestes navigateur mobile et les API simulées ne remplacent pas un essai sur appareil, notamment pour le système de fichiers, la synchronisation des tuiles, les liens JW Library et la coexistence avec d’autres plugins. La version 0.1 a été confirmée fonctionnelle dans Obsidian par l’utilisateur ; cette confirmation ne vaut pas validation native de la version 0.2.

Le paquet s’installe manuellement. Il n’a pas été publié dans le catalogue communautaire. Les fonds géographiques décrivent la géographie actuelle ; ils ne reconstituent ni côtes, ni relief, ni frontières antiques. Les données documentaires du projet ne sont pas modifiées par les personnalisations du coffre.
