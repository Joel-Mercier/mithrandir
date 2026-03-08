# restart

Redémarrer une application en cours d'exécution.

## Utilisation

```sh
mithrandir restart <app>
```

## Arguments

| Argument | Description |
| --- | --- |
| `app` | **Requis.** Nom de l'application à redémarrer |

## Description

Arrête puis démarre le conteneur Docker de l'application. Vérifie si le conteneur est en cours d'exécution avant de tenter le redémarrage.

## Remarques

- Nécessite les privilèges root
