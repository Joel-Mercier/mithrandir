# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/pi-hole.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Pi-hole

Bloqueur de publicités et serveur DNS à l'échelle du réseau — bloque les publicités et les traqueurs pour tous les appareils de votre réseau.

| | |
| --- | --- |
| **Image** | `pihole/pihole:latest` |
| **Interface web** | `http://your-server/admin` |
| **Chemin de configuration** | `{BASE_DIR}/pihole/etc-pihole` |
| **Site web** | [pi-hole.net](https://pi-hole.net/) |
| **Code source** | [GitHub](https://github.com/pi-hole/pi-hole) |

## Installation

```sh
mithrandir install pihole
```

## Ports

| Port | Protocole | Description |
| --- | --- | --- |
| 80 | TCP | Interface web |
| 53 | TCP/UDP | DNS |
| 443 | TCP | HTTPS (désactivé quand Caddy est activé) |

## Secrets

| Variable | Description |
| --- | --- |
| `PIHOLE_PASSWORD` | Mot de passe pour l'interface d'administration web de Pi-hole |

## Notes

Pi-hole nécessite que HTTPS soit configuré et activé pour fonctionner. Vous devez avoir `ENABLE_HTTPS=true` dans votre `.env` et Caddy installé avant d'installer Pi-hole. La commande d'installation vérifiera cela et refusera de continuer sans HTTPS.

## Configuration

- Ajoutez votre mot de passe à la variable d'environnement PIHOLE_PASSWORD dans votre fichier `.env`.
- Connectez-vous à l'interface web de Pi-hole à l'adresse https://pi-hole.yourdomain.duckdns.org
- Allez dans **Settings → DNS** et définissez un serveur DNS primaire et secondaire (Cloudflare DNS est recommandé) car il n'enregistre aucune requête.
- Pour ajouter des listes de blocage, allez dans **Lists** et ajoutez les listes que vous souhaitez bloquer. Nous recommandons d'utiliser les listes activement maintenues (vertes) listées sur ce [site web](https://firebog.net/). Vous pouvez utiliser les premières de chaque catégorie pour commencer.
> [!IMPORTANT]
> Vous devez aller dans **Tools → Update Gravity** et cliquer sur **Update** pour mettre à jour les listes et les rendre effectives.

- Dans **Settings → DHCP**, vous pouvez également configurer Pi-hole pour gérer le DHCP au lieu d'utiliser le serveur DHCP de votre routeur si vous le souhaitez.

## Configuration des clients

Vous devez ajouter l'adresse IP de votre homelab comme serveur DNS primaire pour tous vos appareils sur votre réseau. Comme serveur DNS secondaire, vous pouvez utiliser le serveur DNS par défaut de votre routeur ou Cloudflare DNS. Cela permettra à vos appareils de router leur trafic via votre Pi-hole pour filtrer les domaines malveillants/de tracking et pour résoudre les domaines comme `<app>.homelab.duckdns.org`.
