# Configuration HTTPS

Mithrandir peut configurer un HTTPS wildcard pour tous vos services en utilisant Caddy et DuckDNS. Une fois activé, chaque application est accessible via `https://appname.yourdomain.duckdns.org`.

## Prérequis

- Un compte [DuckDNS](https://www.duckdns.org) avec un sous-domaine et un jeton
- L'application DuckDNS installée et en cours d'exécution (`mithrandir install duckdns`)
- Le DNS wildcard configuré sur votre routeur (voir ci-dessous)

## Installation

```sh
mithrandir install https
```

Cela va :

1. Compiler une image Docker Caddy personnalisée avec le module DNS DuckDNS
2. Générer un Caddyfile avec des entrées de reverse proxy pour toutes les applications installées
3. Démarrer Caddy avec la fourniture automatique de certificats Let's Encrypt

## Configuration du routeur

Pour que le HTTPS fonctionne sur votre réseau local, configurez le DNS de votre routeur pour résoudre tous les sous-domaines vers l'IP LAN de votre serveur :

```
*.yourdomain.duckdns.org → 192.168.1.x
```

La procédure dépend de votre routeur. Si vous utilisez Pi-hole comme serveur DNS, vous pouvez ajouter ceci comme enregistrement DNS local.

## Comment ça fonctionne

Caddy agit comme un reverse proxy situé devant tous vos services. Il :

1. Obtient un certificat TLS wildcard auprès de Let's Encrypt en utilisant le challenge DNS-01 via DuckDNS
2. Renouvelle automatiquement les certificats avant leur expiration
3. Redirige `https://appname.yourdomain.duckdns.org` vers le port de conteneur correspondant

Le Caddyfile est régénéré automatiquement chaque fois que vous installez ou désinstallez une application, de sorte que les nouveaux services soient immédiatement disponibles en HTTPS. Cela déclenche un rechargement gracieux de Caddy — pas un redémarrage du conteneur — il n'y a donc aucune interruption pour les services existants.

## Configuration

Ajoutez ces variables à votre `.env` :

| Variable | Description |
| --- | --- |
| `ENABLE_HTTPS` | Définir à `true` pour activer le HTTPS |
| `ACME_EMAIL` | Email pour les notifications Let's Encrypt (optionnel mais recommandé) |
| `DUCKDNS_SUBDOMAINS` | Votre (vos) sous-domaine(s) DuckDNS |
| `DUCKDNS_TOKEN` | Votre jeton API DuckDNS |

## Applications nécessitant le HTTPS

Certaines applications nécessitent le HTTPS pour fonctionner correctement :

- **Vaultwarden** — Gestionnaire de mots de passe qui nécessite une connexion sécurisée. Ne s'installera pas sauf si `ENABLE_HTTPS=true`.
- **Pi-hole** — Nécessite une connexion sécurisée.
