# update

Mettre à jour les images de conteneurs pour une ou toutes les applications.

## Utilisation

```sh
mithrandir update [app]
```

## Arguments

| Argument | Description |
| --- | --- |
| `app` | Optionnel. Nom de l'application à mettre à jour. Si omis, met à jour toutes les applications installées |

## Options

| Option | Description |
| --- | --- |
| `--yes`, `-y` | Ignorer l'invite de confirmation de sauvegarde |

## Description

Pour chaque application mise à jour :

1. Sauvegarde optionnellement l'application avant la mise à jour (demande confirmation sauf si `--yes`)
2. Télécharge la dernière image Docker
3. Compare les identifiants d'image pour détecter si une mise à jour est disponible
4. Recrée le conteneur si l'image a changé

## Remarques

- Nécessite les privilèges root
- Ignore les applications qui sont déjà à jour
