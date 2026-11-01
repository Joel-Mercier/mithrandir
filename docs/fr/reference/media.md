# media

Vérifier et corriger la façon dont qBittorrent et Radarr/Sonarr/Lidarr partagent le dossier de téléchargements, pour que les médias supprimés libèrent vraiment leur espace disque.

## Utilisation

```sh
mithrandir media            # Vérifier les paramètres et afficher les téléchargements inutilisés (lecture seule)
mithrandir media fix        # Appliquer les paramètres recommandés (ne supprime jamais rien)
mithrandir media prune      # Examiner et supprimer les téléchargements que la bibliothèque n'utilise plus
mithrandir media prune --yes
```

Tout cela est aussi disponible dans le tableau de bord web : **Bibliothèque multimédia → Téléchargements**.

## Comment les téléchargements et la bibliothèque partagent l'espace disque

Les téléchargements arrivent dans `{BASE_DIR}/data/downloads/<movies|tv|music>`. Quand Radarr, Sonarr ou Lidarr importe un téléchargement, il crée un **lien physique** (hardlink) dans `{BASE_DIR}/data/media/...`. Les deux noms pointent vers les mêmes données sur le disque : un film n'occupe sa taille qu'une fois, pas deux, pendant que qBittorrent continue de le partager.

L'espace d'un fichier n'est libéré qu'une fois **les deux** noms supprimés. Supprimer un film dans Radarr retire le nom côté bibliothèque, il faut donc aussi retirer la copie partagée par qBittorrent. Mithrandir s'en charge avec un webhook :

1. Chaque *arr possède un webhook **Mithrandir download cleanup** qui appelle le tableau de bord web (`/api/media/arr-webhook`, port 4180) quand un élément est supprimé ou importé.
2. Environ 15 secondes après une suppression, mithrandir retire le torrent correspondant et ses fichiers de qBittorrent. Il ne le fait que si **toutes** ces conditions sont remplies :
   - le torrent est dans une catégorie importée (`movies-imported`, `tv-imported`, `music-imported`),
   - mithrandir l'a déjà vu lié à la bibliothèque,
   - son téléchargement est terminé,
   - aucun de ses fichiers multimédia n'est encore dans la bibliothèque.

Rien n'est jamais supprimé en fonction d'une durée, d'un ratio ou d'un temps de partage. Si les limites de partage de qBittorrent étaient réglées pour *supprimer* les torrents, `media fix` les règle sur *arrêter* à la place.

## Supprimer films, séries et musique

Supprimez dans **Radarr, Sonarr ou Lidarr** en cochant **Supprimer les fichiers**. La copie partagée dans qBittorrent est retirée automatiquement peu après.

Ne supprimez pas dans qBittorrent ni directement sur le disque. Un torrent retiré dans qBittorrent ne libère que son propre nom. La copie de la bibliothèque reste, et le *arr pense toujours que vous avez l'élément.

Certains cas ne sont jamais nettoyés automatiquement, car seule une partie du téléchargement est inutilisée :

- **Packs de saison partiellement supprimés.** Vous avez supprimé certains épisodes d'un pack de saison mais gardé les autres.
- **Téléchargements jamais importés.** Le *arr ne les a jamais récupérés.

Ils apparaissent dans `mithrandir media prune` et dans le panneau Téléchargements du tableau de bord, pour que vous décidiez vous-même.

::: tip Corbeille
Si une corbeille est configurée dans Radarr/Sonarr (*Settings → Media Management*), les fichiers de bibliothèque supprimés y sont déplacés au lieu d'être supprimés. L'espace n'est libéré qu'une fois la corbeille vidée.
:::

## `mithrandir media`

Lecture seule. Vérifie les points suivants et liste chaque problème trouvé :

- **qBittorrent** : la connexion fonctionne, le chemin d'enregistrement par défaut est `/data/downloads`, la gestion automatique des torrents est activée, les limites de partage ne suppriment pas les torrents, et les catégories `movies`/`tv`/`music` (ainsi que leurs variantes `-imported`) enregistrent dans le bon dossier.
- **Client de téléchargement Radarr/Sonarr/Lidarr** : catégorie et catégorie post-import, *Remove completed* désactivé, *Remove failed* activé.
- **Gestion des médias** : liens physiques activés, éléments supprimés non surveillés (pour qu'ils ne soient pas téléchargés à nouveau).
- **Webhook de nettoyage** : présent, pointant vers ce serveur, abonné aux événements de suppression et d'import.
- **Système de fichiers** : téléchargements et médias sont sur le même système de fichiers (sinon les liens physiques sont impossibles).

Il analyse ensuite le dossier de téléchargements et indique combien de téléchargements sont encore utilisés par la bibliothèque et combien d'espace peut être libéré.

## `mithrandir media fix`

Applique tous les paramètres corrigeables ci-dessus :

- Se connecte à qBittorrent avec `QBITTORRENT_USERNAME`/`QBITTORRENT_PASSWORD` du `.env`. En cas d'échec dans un terminal, il demande les identifiants et les enregistre une fois qu'ils fonctionnent.
- Crée les catégories et déplace les torrents des anciennes catégories par défaut (`radarr`, `tv-sonarr`, `lidarr`) vers les nouvelles. qBittorrent déplace leurs fichiers dans `downloads/movies|tv|music`.
- Génère `MEDIA_WEBHOOK_SECRET` et ajoute le webhook à chaque *arr. Cela nécessite le service du tableau de bord web ; lancez d'abord [`mithrandir ui install`](./ui) s'il n'est pas installé.
- Ouvre le port du webhook aux conteneurs Docker quand `ENABLE_FIREWALL=true`.

`media fix` ne supprime jamais rien. Les assistants de configuration (CLI et web) et `mithrandir ui install` appliquent automatiquement les mêmes paramètres.

## `mithrandir media prune`

Liste les restes par groupe et demande une confirmation pour chaque groupe :

| Groupe | Libère de l'espace | Inclus avec `--yes` |
| --- | --- | --- |
| Supprimés de la bibliothèque | Oui | Oui |
| Fichiers non suivis par qBittorrent | Oui | Oui |
| Non suivis mais encore dans la bibliothèque | Non (la bibliothèque garde sa copie) | Oui |
| Partiellement supprimés | Seulement la partie supprimée (arrête aussi le partage du reste) | Non |
| Jamais importés | Oui | Non |

Chaque élément est revérifié juste avant la suppression. Seuls des chemins dans `{BASE_DIR}/data/downloads` sont supprimés ; les fichiers de la bibliothèque ne sont jamais touchés. Les éléments modifiés dans les 10 dernières minutes et les fichiers incomplets de qBittorrent sont ignorés. Les anciens dossiers vides (`radarr`, `tv-sonarr`, `lidarr`) sont supprimés ensuite.

Sans terminal et sans `--yes`, rien n'est supprimé.

## Variables d'environnement

| Variable | Description |
| --- | --- |
| `QBITTORRENT_USERNAME` | Nom d'utilisateur WebUI de qBittorrent (enregistré par l'assistant de configuration ou `media fix`) |
| `QBITTORRENT_PASSWORD` | Mot de passe WebUI de qBittorrent |
| `MEDIA_WEBHOOK_SECRET` | Mot de passe utilisé par les webhooks des *arr pour s'authentifier auprès du tableau de bord (généré par `media fix`) |

## Remarques

- [`mithrandir doctor`](./doctor) signale les problèmes de ces paramètres et les téléchargements inutilisés dans sa catégorie **Media**.
- Lidarr n'a que les événements de suppression que sa version prend en charge ; les suppressions d'albums sont nettoyées de la même façon quand elles sont disponibles.
