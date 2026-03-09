# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/duckdns.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> DuckDNS

Service DNS dynamique gratuit — garde un nom de domaine pointé vers l'adresse IP de votre domicile, même si elle change.

| | |
| --- | --- |
| **Image** | `lscr.io/linuxserver/duckdns:latest` |
| **Interface web** | Aucune (service en arrière-plan) |
| **Chemin de configuration** | `{BASE_DIR}/duckdns/config` |
| **Réseau** | Mode host |
| **Site web** | [duckdns.org](https://www.duckdns.org) |
| **Code source** | [GitHub](https://github.com/linuxserver/docker-duckdns) |

## Impact sur les ressources

| | |
| --- | --- |
| **Performance** | Low — Mise à jour DNS |
| **Stockage** | Low — Service en arrière-plan |

## Installation

```sh
mithrandir install duckdns
```

## Secrets requis

| Variable | Description |
| --- | --- |
| `DUCKDNS_SUBDOMAINS` | Votre sous-domaine DuckDNS (par ex., `myhomelab`) |
| `DUCKDNS_TOKEN` | Votre jeton API DuckDNS |

Obtenez votre sous-domaine et votre jeton sur [duckdns.org](https://www.duckdns.org).

## Notes

- DuckDNS est un service en arrière-plan sans interface web
- Il met périodiquement à jour votre domaine DuckDNS pour pointer vers votre adresse IP publique actuelle
- Requis pour la configuration HTTPS (Caddy utilise DuckDNS pour le provisionnement des certificats)
- Fonctionne en mode réseau host

## Configuration

Allez sur le site web DuckDNS, connectez-vous en utilisant l'une des méthodes proposées et ajoutez un sous-domaine. L'IP actuelle doit être votre adresse IP publique. Ensuite, assurez-vous de sauvegarder votre jeton et le sous-domaine dans votre fichier `.env`.
