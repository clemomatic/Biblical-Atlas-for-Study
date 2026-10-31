# Atlas biblique interactif pour Obsidian — 0.1.0

Une carte, une frise et des fiches documentaires, reliées à vos notes d’étude. Le corpus historique est inclus dans le plugin. Vos notes et tableaux d’enquête restent des fichiers ordinaires du coffre.

## Installer sur Windows ou Android

1. Décompressez `atlas-biblique-0.1.0.zip`.
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

Les fonds géographiques en ligne sont désactivés par défaut. Un fond Natural Earth simplifié est inclus dans le plugin : il situe les terres, les mers et les grands lacs sans téléchargement. Il représente la géographie actuelle à petite échelle, sans relief ni frontières historiques. À fort zoom, ses contours restent peu détaillés. Activez **Charger les fonds de carte en ligne** dans les réglages du plugin pour télécharger les fonds CARTO/Stadia Maps. Leur disponibilité dépend de leurs fournisseurs ; aucun téléchargement permanent de régions n’est fourni dans cette version. Les liens JW/WOL nécessitent leurs applications ou une connexion pour ouvrir leur contenu.

La synchronisation entre appareils dépend de la synchronisation de votre coffre Obsidian ; le plugin ne fournit pas son propre service de synchronisation.

## Données et mises à jour

- Les mises à jour du corpus passent par les versions du plugin ; les fichiers de votre coffre ne sont jamais remplacés automatiquement.
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

Les tests navigateur chargent le véritable `main.js` compilé dans un hôte Obsidian simulé. Ils vérifient les notes, leur préservation, les changements de métadonnées, la navigation, Canvas, l’isolation visuelle et le mode hors connexion. Ils ne remplacent pas une validation dans les applications natives Windows et Android.
