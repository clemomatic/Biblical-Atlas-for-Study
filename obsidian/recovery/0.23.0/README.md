# JW Study Desk 0.23.0-beta.3 — Explorer WOL isolé

Cette expérimentation ne remplace aucun module livré en 0.22.9. Elle part de son ZIP d'origine exact (SHA-256 `d8fea56c79809c6f39368d89c17adab785bf7a7f2c47803e54a81b0b2bb0fb6b`). Les 7 686 193 octets de `main.js` sont préservés à l'identique comme préfixe du `main.js` bêta, puis le code Explorer est ajouté.

## Fonctionnement

- Nouvelle vue latérale **Explorer WOL**, accessible depuis le ruban et les commandes Obsidian.
- Recherche WOL, première page de résultats, plus entrées de l'Index ; aperçu d'une entrée au maximum.
- Extraction de la **phrase précédant** les références de l'Index ; regroupement par phrase et conservation des liens bibliographiques officiels `/pc/`.
- Lecture des documents directs par le lecteur de la 0.22.9 existant ; liens bibliographiques `/pc/` ouverts sur WOL.
- Recherches nommables, historique des étapes et épingles. Persistance uniquement dans `explorer-023.json`, jamais dans `data.json`.
- Miniatures carrées utilisant les images officielles effectivement disponibles dans les résultats ; sinon pictogramme.

## Limites et sécurité

**Ne pas installer cette bêta dans le coffre de production.** La compilation et les tests automatiques ne remplacent pas les tests manuels dans Obsidian Desktop/Android.

L'Explorer constitue **un panneau supplémentaire**, pas encore une modification de la barre de recherche latérale historique. Son intégration dans cette barre sera traitée après validation de non-régression.

WOL peut changer sa structure HTML ou refuser certaines lectures HTTP. En l'absence de résultats fiables, l'interface ouvre la recherche officielle plutôt que d'inventer des articles.

Les épingles expérimentales ne modifient pas le panier de trouvailles existant.

## Reproduire la construction

Sur la branche `feat/jwsd-0.23.0-explorer-overlay` :

```sh
node --test obsidian/recovery/0.23.0/overlay.test.cjs
python3 obsidian/recovery/0.23.0/build_release.py
```

Le constructeur retrouve le ZIP d'origine à partir des 30 blocs conservés sous `obsidian/recovery/0.22.9/zip-b64/`, puis **refuse** toute archive ne correspondant pas à l'empreinte vérifiée. Seuls `main.js`, `styles.css` et `manifest.json` changent dans l'archive générée.

## Vérification manuelle avant diffusion

1. Créer un coffre Obsidian de test et sauvegarder la 0.22.9 d'origine.
2. Installer la bêta uniquement dans ce coffre ; ouvrir Mes plans, cartes, Orateur, cantiques, playlists, imports JWPub/XMind et lecteur.
3. Ouvrir Explorer WOL depuis la palette de commandes ; rechercher « courage » et une rubrique telle que « comment cultiver ».
4. Tester l'accès à l'Index et à la source officielle, l'épinglage et la réouverture du panneau.
5. Vérifier qu'aucun discours et aucun `data.json` n'a été modifié, avant et après rechargement du plugin.
6. Tester les pannes réseau ; aucun faux résultat ne doit apparaître.

PR en brouillon : cette bêta n'est pas encore la version 0.23.0 stable.
## Bêta 3 — résolution des résultats manquants

La bêta 2 ne découvrait pas toujours les entrées de l'Index : le parseur
n'acceptait que certains blocs HTML de résultats, alors que WOL place aussi
les résultats dans son contenu principal. Le nouveau parseur accepte cette
variante **uniquement sur une page officielle de recherche portant un marqueur
de résultats**, et exclut la navigation ordinaire. Deux recherches officielles
sur l'Index (`p=doc` et `p=par`) sont regroupées puis dédoublonnées, avec
priorité aux titres exacts.

Explorer n'ouvre aucune entrée sans clic. Le panneau affiche une indication
de version « Explorer WOL · bêta 3 ». Si aucun résultat structuré n'est
lisible, un message clair et un lien vers la recherche officielle remplacent
les faux résultats. Une validation manuelle sous Obsidian reste nécessaire.
