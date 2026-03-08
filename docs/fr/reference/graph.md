# graph

Afficher l'arbre de dépendances inter-applications.

## Utilisation

```sh
mithrandir graph
```

Ne nécessite pas les privilèges root.

## Sortie

Affiche un graphe de dépendances coloré organisé en trois sections :

### Pipeline multimédia

Montre le flux de données à travers le stack Arr :

```
Prowlarr ───► Radarr  ───► qBittorrent ───► /data/media/movies ───► Jellyfin
    │         Sonarr  ───► qBittorrent ───► /data/media/tv     ───► Jellyfin
    └──────►  Lidarr  ───► qBittorrent ───► /data/media/music  ───► Navidrome

FlareSolverr ───► Prowlarr  (résolution de CAPTCHA, installé automatiquement avec Prowlarr)
Bazarr       ───► Radarr, Sonarr  (gestion des sous-titres)
Seerr        ───► Radarr, Sonarr, Jellyfin  (demandes et découverte de médias)
Profilarr    ───► Radarr, Sonarr  (gestion des profils de qualité)
```

#### Ordre d'installation recommandé

L'ordre suggéré pour installer le stack multimédia complet, basé sur les dépendances :

1. qBittorrent (client de téléchargement)
2. Prowlarr (gestionnaire d'indexeurs)
3. Radarr (films)
4. Sonarr (séries TV)
5. Lidarr (musique)
6. Bazarr (sous-titres, optionnel)
7. Jellyfin (serveur multimédia)
8. Navidrome (serveur musical)
9. Seerr (demandes de médias, optionnel)
10. Profilarr (profils de qualité, optionnel)

### Réseau et sécurité

```
DuckDNS ───► Caddy ───► toutes les apps avec ports  (reverse proxy HTTPS wildcard)
Caddy   ───► Vaultwarden  (HTTPS requis)
Pi-hole  (DNS autonome, DNS wildcard optionnel pour Caddy)
```

### Autonomes

Applications sans dépendances pouvant être installées indépendamment :

Home Assistant, Immich, Gatus, Homarr, WireGuard, Excalidraw, Omni Tools, Open WebUI, Actual Budget, Sure, AFFiNE, n8n, Penpot

## Remarques

- Les applications installées sont affichées en vert, les applications non installées sont atténuées
- Le graphe lit `.env` pour déterminer quelles applications sont installées
- Utilisez `mithrandir install media` pour installer l'ensemble du stack multimédia d'un coup
