# Bible Lab — Bibliothèque visuelle (prévisualisation)

## Objectif

Retrouver dans un **onglet Obsidian** les JWPUB déjà importés, avec une interface de bibliothèque simple à parcourir. Les contenus restent dans le coffre Obsidian. Le panneau latéral Bible Lab conserve sa navigation minimaliste.

## Ouvrir

- Palette de commandes : **Ouvrir ma bibliothèque personnelle dans un onglet**.
- Bible Lab → menu **⋯** → **Studio** → **Ouvrir ma bibliothèque**.
- Le bouton **Importer un JWPUB** ouvre directement le sélecteur de fichier personnel.
- Le bouton **Télécharger une publication** ouvre la bibliothèque JWPUB existante pour vérifier un programme ou un identifiant officiel avant téléchargement.

## Catalogue

Chaque publication importée et indexée affiche :
- Une carte avec sa couverture, **si le fichier JWPUB comportait une image locale identifiée comme couverture** ; sinon une couverture typographique sans image réseau.
- Son titre, sa catégorie estimée d'après le code et le titre (Bible, livres, revues, brochures, assemblées, écoles, autres).
- Le nombre de documents et l'origine : import personnel ou téléchargement public.
- Les rubriques **Tout** et **Mes imports** permettent de retrouver les documents locaux sans les mélanger au catalogue des téléchargements.

Les catégories ne sont pas des métadonnées officielles ; certains JWPUB spécialisés peuvent nécessiter une classification manuelle ultérieure.

## Lecture et recherche

1. Cliquer sur la couverture d'une publication pour consulter son sommaire.
2. Choisir un document ou un chapitre ; Bible Lab affiche une mise en forme de lecture dans le même onglet.
3. Naviguer vers **Précédent** ou **Suivant**, ouvrir la **note modifiable** dans Obsidian, ou copier un lien wikilink vers celle-ci.
4. Lancer une recherche dans les titres et les contenus **déjà présents sur l'appareil**. La recherche n'emploie aucun service externe.
5. Les références WOL directes disponibles dans un article sont dirigées vers la lecture Bible Lab. Les références internes `jwpub://p/...` peuvent ouvrir un autre document lorsqu'il existe dans les JWPUB importés. Les identifiants de publications privées ne sont jamais envoyés à un service web.

La recherche s'effectue sur une partie limitée du texte de chaque document, avec un nombre limité de résultats, afin de ménager les ressources du coffre. Elle n'effectue pas encore de recherche linguistique avancée.

## Limites de cette étape

- La page ne télécharge **aucune couverture automatiquement**. Une couverture n'apparaît que si le JWPUB a fourni un asset local reconnaissable.
- Tous les JWPUB ne contiennent pas un identifiant direct WOL ; les documents privés restent consultables comme notes Markdown.
- Les renvois bibliques `jwpub://b/...` ne sont pas encore garantis dans le lecteur local ; aucun numéro de paragraphe WOL n'est inventé.
- La navigation et les résultats dépendent du format Markdown produit par le convertisseur JWPUB. Un fichier spécialisé peut encore demander des ajustements.
- Il ne s'agit pas d'une reproduction intégrale de JW Library (audio, vidéo, annotations natives, synchronisation des téléchargements, etc.).

## Confidentialité et sécurité

Tous les fichiers sont lus depuis le coffre local. Aucun fichier confidentiel d'école ou d'instruction n'est inclus dans le plugin ou envoyé vers GitHub. Si le coffre Obsidian utilise un outil de **synchronisation**, ces fichiers risquent d'être synchronisés par cet outil : préférer un coffre privé et local pour les documents réservés.

Le plugin crée des notes supplémentaires lors de l'import, sans modifier les notes existantes ; aucune suppression de documents n'est proposée depuis la bibliothèque.

## Vérifications

- Compilation TypeScript et tests unitaires.
- Tests Playwright : bibliothèque vide, import JWPUB personnel, tri écoles, couverture locale, sommaire, lecture sans Internet, édition d'une note, recherche locale.
- Essais manuels indispensables dans Obsidian Desktop, thème sombre/clair et coffre étroit, avec de vrais fichiers JWPUB.

**PR en brouillon**, basée sur les changements de la bibliothèque hors ligne (#101). Ne rien fusionner avant les essais réels.
