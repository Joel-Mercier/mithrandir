# Planification de capacité

Mithrandir inclut un système de planification de capacité intégré pour vous aider à comprendre les besoins en ressources de votre homelab et anticiper quand vous pourriez avoir besoin de mettre à niveau votre matériel.

## Fonctionnement

Chaque application du registre se voit attribuer deux scores :

- **Performance** (Faible / Moyen / Élevé) — Combien de CPU et de RAM l'application consomme typiquement
- **Stockage** (Faible / Moyen / Élevé) — Combien d'espace disque l'application utilise et à quelle vitesse il croît

Lorsque vous exécutez `mithrandir capacity`, le CLI recueille les spécifications matérielles de votre système (CPU, RAM, disque), vérifie quelles applications sont installées et calcule des scores agrégés pour vous donner un aperçu rapide de la capacité de votre système.

## Référence des scores

| Application | Performance | Stockage | Notes |
| --- | --- | --- | --- |
| Home Assistant | Moyen | Faible | Moteur d'automatisation avec intégrations et base de données d'historique |
| qBittorrent | Faible | Élevé | Client de téléchargement, stocke les torrents et fichiers média |
| Prowlarr | Faible | Faible | Proxy d'indexeur, ressources minimales |
| Radarr | Faible | Moyen | Base de données de films et surveillance |
| Sonarr | Faible | Moyen | Base de données de séries TV et surveillance |
| Bazarr | Faible | Faible | Récupération de sous-titres, ressources minimales |
| Lidarr | Faible | Moyen | Base de données de musique et surveillance |
| Seerr | Faible | Faible | Interface de gestion de demandes |
| Homarr | Faible | Faible | Tableau de bord, contenu principalement statique |
| Jellyfin | Élevé | Élevé | Transcodage multimédia et grandes bibliothèques |
| Navidrome | Faible | Faible | Streaming musical, lit les fichiers existants |
| DuckDNS | Faible | Faible | Mise à jour DNS, service en arrière-plan |
| WireGuard | Faible | Faible | Tunnel VPN, module noyau |
| Gatus | Faible | Faible | Surveillance de santé, empreinte minimale |
| Immich | Élevé | Élevé | Traitement ML pour détection faciale et recherche, stocke toutes les photos et vidéos |
| Excalidraw | Faible | Faible | Tableau blanc client, ressources serveur minimales |
| Open WebUI | Élevé | Moyen | Interface de chat IA, inférence de modèle |
| FlareSolverr | Moyen | Faible | Navigateur headless pour résolution de CAPTCHA |
| Omni Tools | Faible | Faible | Collection d'outils statiques |
| Vaultwarden | Faible | Faible | Coffre-fort de mots de passe, stockage minimal |
| Actual Budget | Faible | Faible | Finances personnelles, petite base de données |
| Sure | Moyen | Faible | Rails + workers Sidekiq |
| AFFiNE | Moyen | Moyen | Base de connaissances avec PostgreSQL |
| n8n | Moyen | Faible | Moteur d'automatisation de workflows |
| Penpot | Moyen | Moyen | Plateforme de design avec plusieurs services |
| Stirling PDF | Moyen | Faible | Traitement PDF à la demande |
| Profilarr | Faible | Faible | Utilitaire de synchronisation de profils |
| TRIP | Faible | Faible | Journal de voyage, petite base de données |
| AdventureLog | Moyen | Moyen | Backend Django avec base de données PostGIS |
| Pi-hole | Faible | Faible | Serveur DNS, ressources minimales |

## Verdicts

### Verdict de performance

Basé sur votre score de performance agrégé vs. les cœurs CPU et la RAM disponibles :

- **Confortable** — Beaucoup de marge, le système peut gérer plus d'applications
- **Adéquat** — Le système gère bien la charge
- **Serré** — Les ressources sont sollicitées, envisagez une mise à niveau avant d'ajouter d'autres applications lourdes
- **Surchargé** — Le système peut avoir des difficultés sous charge, mise à niveau recommandée

### Verdict de stockage

Basé sur le point de montage le plus contraint :

- **Sain** — Moins de 60% utilisé
- **Modéré** — 60-80% utilisé
- **Attention** — 80-95% utilisé
- **Critique** — Plus de 95% utilisé

## Utilisation

```sh
mithrandir capacity
```

La commande affiche :
1. Informations matérielles (CPU, cœurs, RAM)
2. Utilisation du stockage par point de montage avec barres de progression
3. Tableau des scores de ressources par application
4. Scores de capacité agrégés avec verdicts
