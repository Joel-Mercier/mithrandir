# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/wireguard.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> WireGuard

Tunnel VPN rapide et moderne — accédez à votre homelab à distance depuis n'importe où.

| | |
| --- | --- |
| **Image** | `lscr.io/linuxserver/wireguard:latest` |
| **Port** | 51820/UDP |
| **Chemin de configuration** | `{BASE_DIR}/wireguard/config` |
| **Site web** | [wireguard.com](https://www.wireguard.com/) |
| **Code source** | [GitHub](https://github.com/WireGuard/WireGuard) |
| **Application Android** | [Play Store](https://play.google.com/store/apps/details?id=com.wireguard.android) |
| **Application iOS** | [App Store](https://apps.apple.com/us/app/wireguard/id1441195209) |

## Installation

```sh
mithrandir install wireguard
```

## Secrets requis

| Variable | Description |
| --- | --- |
| `WG_SERVERURL` | Votre adresse IP publique ou domaine DuckDNS |
| `WG_PEERS` | Nombre de configurations de pairs VPN à générer |

## Configuration des pairs

Après l'installation, les fichiers de configuration des pairs sont générés dans :

```
{BASE_DIR}/wireguard/config/peer1/peer1.conf
{BASE_DIR}/wireguard/config/peer2/peer2.conf
...
```

Scannez le QR code ou copiez le fichier `.conf` vers votre client WireGuard (disponible sur iOS, Android, Windows, macOS, Linux).

Pour afficher le QR code dans le terminal, exécutez

```sh
sudo docker exec wireguard /app/show-peer 1
```

Remplacez `1` par le numéro du pair que vous souhaitez afficher (par ex., `2` pour peer2).

## Notes

WireGuard nécessite les capabilities Linux `NET_ADMIN` et `SYS_MODULE` et monte `/lib/modules` depuis l'hôte.

## Configuration

- Ajoutez votre domaine DuckDNS à la variable d'environnement WG_SERVERURL dans votre fichier `.env`.
- Vous devez ajouter une redirection de port sur votre routeur pour que WireGuard fonctionne. Le port interne est `51820` et le port externe est également `51820` en utilisant le protocole UDP, et assignez-le à l'adresse IP de votre homelab.
- Téléchargez l'application client WireGuard pour votre plateforme et scannez le QR code pour vous connecter à votre serveur WireGuard. Ensuite, lorsque vous souhaitez accéder à votre homelab depuis un autre réseau, ouvrez l'application WireGuard et appuyez sur le bouton "connect".

## Clients

Utilisez les clients officiels [Android](https://play.google.com/store/apps/details?id=com.wireguard.android) ou [iOS](https://apps.apple.com/us/app/wireguard/id1441195209).
