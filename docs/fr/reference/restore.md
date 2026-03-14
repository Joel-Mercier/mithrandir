# restore

Restaurer une ou plusieurs applications depuis une sauvegarde.

## Utilisation

```sh
mithrandir restore [--yes] <cible> [date]
```

## Arguments

| Argument | Description |
| --- | --- |
| `cible` | **Requis.** Nom de l'application ou `full` pour restaurer toutes les applications |
| `date` | Optionnel. Date au format `YYYY-MM-DD`, ou `latest`. Par défaut, la plus récente |

## Options

| Option | Description |
| --- | --- |
| `--yes`, `-y` | Ignorer les invites de confirmation |

## Description

Restaure une application (ou toutes les applications) depuis une archive de sauvegarde. Le processus de restauration :

1. Découvre les sauvegardes disponibles — vérifie d'abord le stockage local, puis le distant
2. Restaure les secrets (`.env`, configuration rclone) avant les applications s'ils sont présents dans la sauvegarde
3. Arrête l'application, extrait l'archive de sauvegarde et redémarre

## Remarques

- Nécessite les privilèges root
- Lors d'une restauration `full`, toutes les applications sauvegardées sont restaurées en séquence
