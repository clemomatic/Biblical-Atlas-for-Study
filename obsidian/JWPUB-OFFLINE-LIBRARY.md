# Bible Lab — Ma bibliothèque JWPUB hors ligne (prévisualisation)

## Objectif

Bibliothèque **personnelle** et utilisable sans connexion à WOL pour les articles dont les identifiants peuvent être reliés exactement à une publication JWPUB importée. Les documents d'école et d'instructions que tu possèdes peuvent aussi être importés, sans être envoyés sur Internet.

### Accès

- Palette de commandes : **Ouvrir ma bibliothèque JWPUB hors ligne**.
- Panneau Bible Lab → ⋯ → Studio → **Bibliothèque hors ligne**.
- L'ancienne commande **Importer JWPUB ou sauvegarde JW Library directement** reste disponible.

### Import d'un JWPUB personnel

1. Cliquer **Importer un fichier JWPUB**.
2. Sélectionner un fichier sur son appareil (école, instructions, revue, programme, livre).
3. Contrôler l'aperçu des documents déchiffrés.
4. Cliquer sur **Importer dans Obsidian**.

Les documents sont convertis en notes Markdown dans `<dossier des recherches>/Imports/<nom du fichier>` et accompagnés d'un index local `_BIBLE_LAB_OFFLINE_INDEX.json`. L'archive JWPUB fournie reste à son emplacement d'origine et n'est ni modifiée ni téléversée.

Les JWPUB très particuliers peuvent ne pas respecter le schéma pris en charge ; dans ce cas l'importation s'arrête avec un message explicite.

### Télécharger un JWPUB public

1. Ouvrir **Bibliothèque hors ligne**.
2. Cliquer sur **Vérifier** pour un programme connu, ou entrer un identifiant de publication dans le champ libre.
3. Bible Lab demande la disponibilité du format JWPUB **français** au service de téléchargements de JW.org.
4. Si le service renvoie un lien valide, cliquer sur **Télécharger et préparer**.
5. Vérifier l'aperçu et confirmer l'importation.

Les hôtes autorisés sont `*.jw-cdn.org` et `download-[a-z].akamaihd.net` via HTTPS. Le fichier doit présenter la signature ZIP et rester sous 150 Mo ; une taille déclarée dans le catalogue doit correspondre à la taille reçue. Le contenu n'est jamais embarqué dans le plugin.

Le JWPUB téléchargé est conservé dans `<dossier des recherches>/Bibliothèque JWPUB`, les notes converties sont créées dans `Imports`. Aucune vérification automatique des mises à jour n'est effectuée.

**Important** : le catalogue des trois programmes est une sélection de codes à interroger, **pas une affirmation de disponibilité**. L'existence réelle du JWPUB français est vérifiée à la demande de l'utilisateur ; une indisponibilité ne bloque pas l'import manuel.

### Lecture d'une référence hors connexion

La lecture habituelle de Bible Lab tente désormais **en priorité** de retrouver le document local :

- Lorsque la référence est un lien direct `https://wol.jw.org/fr/wol/d/r30/lp-f/<MepsDocumentId>`, le lecteur utilise l'index d'un JWPUB français importé.
- La correspondance se fait uniquement par **identifiant exact**, jamais par ressemblance de titre.
- Le lecteur affiche le texte converti local, sans contacter WOL.
- Une référence qui ne correspond à aucun document local reprend le parcours WOL existant.

**Limites de cette version** : les liens de recherche bibliographique `/wol/l/`, les chapitres bibliques et les références vers les paragraphes `#h=N` n'ont pas encore de résolution locale garantie. Si une URL contient `#h=N`, l'article est affiché en entier, accompagné d'un avertissement clair : aucune position n'est inventée. Les JWPUB privés sans identifiant WOL public restent consultables comme notes Markdown.

Les imports antérieurs à cette version ne possèdent pas l'index nécessaire. Les réimporter dans un **nouveau dossier** si l'on veut les rendre identifiables depuis des liens WOL.

### Données privées et stockage

Le plugin ne téléverse aucun fichier privé. Le seul appel réseau lié à cette fonctionnalité concerne le **catalogue public** puis éventuellement le téléchargement public demandé par l'utilisateur.

**Attention à Obsidian Sync, Google Drive, Dropbox ou à toute synchronisation de coffre** : ces services pourraient synchroniser les fichiers JWPUB et les notes Markdown. Pour des documents confidentiels ou réservés à une école, utiliser un coffre local non synchronisé ou vérifier précisément les règles de partage et d'accès.

Un usage privé ne dispense pas automatiquement du respect des conditions d'utilisation des publications. Le plugin ne doit pas distribuer de fichiers d'éditeur ni publier des documents sensibles.

### Vérifications avant consolidation

- Compiler le plugin et exécuter les tests unitaires.
- Simuler la recherche d'un JWPUB au format français, le téléchargement et l'import de son fichier.
- Simuler un document personnel sans identifiant WOL public.
- Vérifier que le lecteur affiche un article local avec le réseau WOL bloqué.
- Vérifier la compatibilité réelle de la récupération du catalogue et d'un vrai fichier public dans Obsidian Desktop Windows.
- Conserver les PR précédentes non fusionnées jusqu'aux tests sous Obsidian réel.

Il s'agit d'une **prévisualisation technique**, pas encore d'un remplacement de JW Library.
