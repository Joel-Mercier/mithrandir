# install

Installer un composant système, une application ou un groupe d'applications prédéfini.

## Utilisation

```sh
mithrandir install <cible>
```

## Arguments

| Argument | Description |
| --- | --- |
| `cible` | **Requis.** Ce qu'il faut installer — voir les cibles ci-dessous |

## Cibles

### Composants système

| Cible | Description |
| --- | --- |
| `docker` | Installer le moteur Docker sur l'hôte (inclut la configuration du swap) |
| `backup` | Installer rclone et le timer systemd de sauvegarde pour les sauvegardes programmées |
| `https` | Installer Caddy comme reverse proxy HTTPS wildcard utilisant le challenge DNS-01 de DuckDNS |
| `firewall` | Installer le pare-feu UFW avec ufw-docker pour le contrôle des ports compatible Docker |

### Stacks

Installer un groupe prédéfini d'applications en une seule commande. Les applications déjà installées sont automatiquement ignorées.

| Stack | Applications |
| --- | --- |
| `media` | qBittorrent, Prowlarr, Radarr, Sonarr, Bazarr, Seerr, Jellyfin, Navidrome, Lidarr, Audiobookshelf, Immich, Profilarr, Youtarr |
| `media-movies-tv` | qBittorrent, Prowlarr, Radarr, Sonarr, Bazarr, Seerr, Jellyfin, Profilarr, Youtarr |
| `media-audio` | Navidrome, Lidarr, Audiobookshelf, qBittorrent |
| `media-pictures` | Immich |
| `media-games` | RetroAssembly |
| `security` | Caddy (reverse proxy HTTPS), Pi-hole (DNS) |

Exemples :
```sh
mithrandir install media-movies-tv    # Installer le stack complet films & séries
mithrandir install security           # Installer Caddy et Pi-hole
```

### Applications

Tout nom d'application du registre peut être utilisé comme cible. Applications disponibles :

`actualbudget`, `adventurelog`, `affine`, `audiobookshelf`, `bazarr`, `cookcli`, `duckdns`, `excalidraw`, `flaresolverr`, `gatus`, `glance`, `homarr`, `homeassistant`, `immich`, `jellyfin`, `jellyseerr`, `lidarr`, `mealie`, `memos`, `n8n`, `navidrome`, `omni-tools`, `openwebui`, `paperlessngx`, `penpot`, `pihole`, `profilarr`, `prowlarr`, `qbittorrent`, `radarr`, `retroassembly`, `seerr`, `sonarr`, `stirlingpdf`, `sure`, `tandoor`, `trip`, `vaultwarden`, `wireguard`, `yourspotify`, `youtarr`

## Remarques

- Nécessite les privilèges root
- `install https` nécessite que DuckDNS soit installé et en cours d'exécution au préalable, et construit une image Docker Caddy personnalisée avec le module `caddy-dns/duckdns`
- Vaultwarden nécessite `ENABLE_HTTPS=true` dans `.env`
- Certaines applications installent automatiquement des applications compagnons (par ex. `jellyseerr` installe `jellyfin`)
- L'installation par stack ignore les applications déjà installées et inclut automatiquement les applications compagnons
- Le stack `security` n'inclut pas Caddy — installez-le séparément avec `mithrandir install https`
