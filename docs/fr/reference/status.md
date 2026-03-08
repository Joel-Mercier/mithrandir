# status

Afficher les applications installées et l'état du système.

## Utilisation

```sh
mithrandir status
```

## Description

Affiche une vue d'ensemble du système homelab :

- État du daemon Docker
- État du timer de sauvegarde et prochaine exécution programmée
- État du site de documentation
- Tableau des applications installées indiquant :
  - État du conteneur (en cours d'exécution/arrêté)
  - Date de la dernière sauvegarde
  - Utilisation disque
  - URL d'accès

## Mode non-TTY

Lorsqu'elle est exécutée dans un shell non interactif, produit un tableau en texte brut au lieu de l'affichage formaté interactif.

## Remarques

- Nécessite les privilèges root (pour les vérifications d'état Docker)
