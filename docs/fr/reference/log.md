# log

Consulter les journaux de conteneur d'une application.

## Utilisation

```sh
mithrandir log [options] <app> [service]
```

## Arguments

| Argument | Description |
| --- | --- |
| `app` | **Requis.** Nom de l'application dont consulter les journaux |
| `service` | Nom du service pour les applications multi-conteneurs (par ex. `backend`, `db`) |

## Options

| Option | Description |
| --- | --- |
| `--follow`, `-f` | Suivre la sortie des journaux en temps réel |
| `--tail`, `-n` | Nombre de lignes à afficher depuis la fin (par ex. `--tail 100`) |
| `--since`, `-s` | Afficher les journaux depuis un horodatage ou un temps relatif (par ex. `--since 1h`, `--since 2024-01-01`) |

## Exemples

```sh
# Afficher les 50 dernières lignes des journaux de Sonarr
mithrandir log --tail 50 sonarr

# Suivre les journaux de Pi-hole en temps réel
mithrandir log --follow pihole

# Afficher les journaux de Jellyfin des 2 dernières heures
mithrandir log --since 2h jellyfin

# Afficher les journaux du backend AdventureLog
mithrandir log adventurelog backend

# Suivre les journaux postgres d'Immich
mithrandir log --follow immich postgres
```

## Applications multi-conteneurs

Pour les applications avec plusieurs conteneurs, vous devez spécifier un nom de service. Exécuter `mithrandir log <app>` sans service affichera la liste des services disponibles :

| Application | Services |
| --- | --- |
| AdventureLog | `frontend`, `backend`, `db` |
| Immich | `server`, `machine-learning`, `redis`, `postgres` |
| Sure | `web`, `worker`, `redis`, `postgres` |
| AFFiNE | `server`, `migration-job`, `redis`, `postgres` |
| Penpot | `frontend`, `backend`, `exporter`, `postgres`, `valkey`, `mailcatch` |

## Remarques

- Nécessite les privilèges root
- Appuyez sur `Ctrl+C` pour arrêter le suivi des journaux
