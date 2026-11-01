# Bible Lab Bridge — JWPUB et sauvegardes JW Library

Cet outil local accompagne le plugin Obsidian Bible Lab. Il n'utilise ni Internet,
ni API privée, ni synchronisation. **Ne mettez jamais vos sauvegardes personnelles
dans un dépôt GitHub.**

## Formats validés

- `.jwpub` : ZIP externe + ZIP interne, base SQLite, dérivation de clé par les
  métadonnées de la publication, AES-128-CBC, décompression zlib. Export en
  fichiers Markdown et dossier `assets`. Testé avec la publication française
  `w_F_202608.jwpub` (9 documents, 19 illustrations).
- `.jwlibrary` : sauvegardes contenant `userData.db`, `manifest.json` et
  médias. Schémas SQLite **14 et 16** réellement inspectés et convertis ;
  le schéma 15 est accepté avec prudence dans l'outil.
- Notes : GUID stables, titre, contenu, date, emplacement et étiquettes exportés.
  Le retour vers la sauvegarde ne modifie que `Note.Title`, `Note.Content`
  et `Note.LastModified`. L'ajout/suppression de notes, le déplacement
  d'étiquettes, les surlignages et les signets ne sont pas exportés.
- SHA-256 de la base vérifié à l'import, recalculé après export ;
  `PRAGMA integrity_check`, `foreign_key_check`, nombre et GUID des notes
  vérifiés avant production d'une nouvelle archive.

## Installation

Python 3.10 ou plus. Pour les sauvegardes JW Library, aucune bibliothèque
externe n'est nécessaire. Pour les JWPUB :

```sh
python -m pip install cryptography beautifulsoup4 markdownify
```

## Utilisation

```sh
python tools/bible_lab_bridge.py inspect sauvegarde.jwlibrary
python tools/bible_lab_bridge.py import-backup sauvegarde.jwlibrary ./notes-jw
python tools/bible_lab_bridge.py import-jwpub publication.jwpub ./publication-md
```

Pour utiliser les résultats dans Obsidian, compresser **le dossier** `notes-jw`
ou `publication-md` en ZIP, puis, dans **Bible Lab → Studio → Importer des
notes**, sélectionner le ZIP. Bible Lab crée un dossier d'import **nouveau** et
conserve chaque fichier. Les images, notes et manifeste JSON accompagnent
l'import.

Pour modifier puis réexporter, travailler sur les fichiers Markdown d'origine
`notes-jw` (hors ZIP) avec un éditeur préservant les fins de ligne et les
marqueurs techniques :

```sh
python tools/bible_lab_bridge.py export-backup sauvegarde.jwlibrary ./notes-jw ./sauvegarde-modifiee.jwlibrary
```

L'export est refusé si la sauvegarde initiale ne correspond pas, si les GUID
sont incomplets ou si des fichiers sont ajoutés ou supprimés. Il ne remplace
jamais le fichier source ni un fichier de sortie existant. Une modification
uniquement dans l'interface Obsidian doit être recopiée dans les fichiers
`notes-jw` utilisés par cet export (pas encore de synchronisation automatique
dans l'application).

**Attention :** la restauration de cette nouvelle archive dans JW Library
n'a **pas** été validée sur un appareil réel. Une restauration peut remplacer
les données locales. Tester avec un appareil ou profil vierge et toujours
conserver une sauvegarde indépendante à jour avant d'essayer. Ne pas importer
un export de test ayant subi des modifications synthétiques.

## Tests sur des copies privées

Les données utilisées pour les tests n'ont jamais été publiées dans le dépôt.
La sauvegarde 2025 contenait 1 911 notes en schéma 14. L'import suivi d'un
export sans changement produit zéro modification. Après un ajout de texte de
test à une note, le nouvel export conserve le nombre de fichiers de l'archive,
les médias inchangés et les 1 911 GUID, et modifie uniquement cette note.
La sauvegarde du 27 octobre 2026 contenait 2 233 notes (schéma 16),
48 000 surlignages et 375 étiquettes : son import Markdown et la
comparaison d'absence de modification ont été validés.

## Sécurité

- Fonctionnement local, aucun envoi de notes vers le service WOL ni vers GitHub.
- Les archives et les données Markdown sont considérées comme privées.
- Export des notes dans un répertoire vide uniquement.
- Vérification d'intégrité avant réexport, refus des GUID dupliqués et
  interdiction d'écraser l'archive originale.
- Les documents extraits des publications sont des copies personnelles ;
  ils ne doivent pas être redistribués par le dépôt.

## Prochaine étape

Adapter ce même moteur de conversion pour fonctionner **dans Obsidian sur
Android**, au moyen d'un SQLite WASM embarqué et de Web Crypto, puis ajouter
un écran de comparaison des changements avant le téléchargement d'une
sauvegarde. La fonction d'export interne ne sera activée qu'après test de
restauration sur un profil JW Library vierge.
