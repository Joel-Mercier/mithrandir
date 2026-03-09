# capacity

Afficher la capacité du système et les scores de ressources.

## Utilisation

```sh
mithrandir capacity
```

## Description

Affiche les informations matérielles et l'analyse de capacité de votre homelab :

- Modèle de CPU, nombre de cœurs et RAM
- Utilisation du stockage avec des barres de progression par point de montage
- Scores d'impact en performance et stockage par application
- Scores de capacité agrégés avec verdicts
- Nombre d'applications haute-performance et haut-stockage

Chaque application du registre possède un score de performance (impact CPU/RAM) et un score de stockage (croissance disque), évalué comme Faible, Moyen ou Élevé. La commande agrège ces scores pour les applications installées et les compare à votre matériel pour donner un verdict : Confortable, Adéquat, Serré ou Surchargé pour la performance, et Sain, Modéré, Attention ou Critique pour le stockage.

## Mode non-TTY

En mode non interactif, affiche un tableau en texte brut au lieu de l'affichage formaté.

## Notes

- Nécessite les privilèges root pour les vérifications d'utilisation disque
- Les projections de stockage sont des estimations basées sur les usages typiques
- Les scores de performance reflètent l'utilisation typique des ressources, pas des mesures en temps réel
