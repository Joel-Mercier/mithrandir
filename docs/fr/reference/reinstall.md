# reinstall

Réinstaller une application de zéro.

## Utilisation

```sh
mithrandir reinstall <app>
```

## Arguments

| Argument | Description |
| --- | --- |
| `app` | **Requis.** Nom de l'application à réinstaller |

## Options

| Option | Description |
| --- | --- |
| `--yes`, `-y` | Ignorer la confirmation de suppression des données |

## Description

Effectue une réinstallation complète en :

1. Arrêtant le conteneur
2. Supprimant le conteneur et l'image
3. Supprimant optionnellement le répertoire de données de l'application
4. Recréant et démarrant l'application à neuf

## Remarques

- Nécessite les privilèges root
- Demandera une confirmation avant de supprimer les données, sauf si `--yes` est passé
