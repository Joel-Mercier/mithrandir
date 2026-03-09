# log

Consulter les journaux de conteneur d'une application.

## Utilisation

```sh
mithrandir log <app> [--follow] [--tail N] [--since TIME]
```

## Arguments

| Argument | Description |
| --- | --- |
| `app` | **Requis.** Nom de l'application dont consulter les journaux |

## Options

| Option | Description |
| --- | --- |
| `--follow`, `-f` | Suivre la sortie des journaux en temps réel |
| `--tail`, `-n` | Nombre de lignes à afficher depuis la fin (par ex. `--tail 100`) |
| `--since` | Afficher les journaux depuis un horodatage ou un temps relatif (par ex. `--since 1h`, `--since 2024-01-01`) |

## Exemples

```sh
# Afficher les 50 dernières lignes des journaux de Sonarr
mithrandir log sonarr --tail 50

# Suivre les journaux de Pi-hole en temps réel
mithrandir log pihole --follow

# Afficher les journaux de Jellyfin des 2 dernières heures
mithrandir log jellyfin --since 2h
```

## Applications multi-conteneurs

Pour les applications avec plusieurs conteneurs (Immich, Sure, AFFiNE, Penpot, AdventureLog), les journaux de tous les conteneurs sont affichés séquentiellement avec un séparateur entre chacun.

```sh
# Afficher les journaux de tous les conteneurs AdventureLog (frontend, backend, db)
mithrandir log adventurelog
```

## Remarques

- Nécessite les privilèges root
- Appuyez sur `Ctrl+C` pour arrêter le suivi des journaux
