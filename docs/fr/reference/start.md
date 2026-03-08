# start

Démarrer une application arrêtée.

## Utilisation

```sh
mithrandir start <app>
```

## Arguments

| Argument | Description |
| --- | --- |
| `app` | **Requis.** Nom de l'application à démarrer |

## Description

Démarre le conteneur Docker de l'application avec `docker compose up -d`. Si le conteneur est déjà en cours d'exécution, il affiche l'état actuel.

## Remarques

- Nécessite les privilèges root
