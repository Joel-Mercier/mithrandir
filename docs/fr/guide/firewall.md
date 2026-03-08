# Pare-feu

Mithrandir peut optionnellement configurer [UFW](https://wiki.ubuntu.com/UncomplicatedFirewall) avec [ufw-docker](https://github.com/chaifeng/ufw-docker) pour contrôler l'accès réseau à vos services.

## Pourquoi ufw-docker ?

Docker manipule directement `iptables`, ce qui signifie que les règles UFW standard **ne s'appliquent pas** aux ports publiés par Docker. L'utilitaire `ufw-docker` résout ce problème en gérant les règles dans la chaîne iptables `DOCKER-USER`, que Docker respecte.

## Installation

```sh
mithrandir install firewall
```

Cela va :

1. Installer UFW (s'il n'est pas déjà installé)
2. Installer l'utilitaire [ufw-docker](https://github.com/chaifeng/ufw-docker)
3. Activer UFW avec une politique par défaut de **refus des connexions entrantes**
4. **Toujours autoriser SSH** (port 22) pour éviter les verrouillages
5. Ajouter des règles de pare-feu pour toutes les applications actuellement installées

## Comment ça fonctionne

Une fois le pare-feu activé (`ENABLE_FIREWALL=true` dans `.env`), mithrandir gère automatiquement les règles UFW :

- **`mithrandir install <app>`** — ajoute les règles UFW pour les ports de l'application
- **`mithrandir uninstall <app>`** — supprime les règles UFW pour les ports de l'application
- **`mithrandir install <stack>`** — ajoute les règles pour toutes les applications de la stack

### Applications en réseau hôte vs réseau bridge

- **Applications en réseau bridge** (la plupart des applications) : Les règles sont gérées via `ufw-docker allow <container> <port>`, qui fonctionne avec la chaîne iptables `DOCKER-USER`.
- **Applications en réseau hôte** (Home Assistant, DuckDNS) : Les règles sont gérées via le standard `ufw allow <port>`, car Docker ne gère pas leurs entrées iptables.

## Assistant de configuration

L'assistant de configuration inclut une étape pare-feu après l'installation des applications. Vous pouvez choisir de l'activer ou de l'ignorer. En mode `--yes`, le pare-feu est installé automatiquement.

## Vérifier l'état

Affichez les règles de pare-feu actuelles :

```sh
sudo ufw status
```

La commande `mithrandir doctor` vérifie également l'état du pare-feu et signale tout problème.

## Configuration

| Variable | Par défaut | Description |
| --- | --- | --- |
| `ENABLE_FIREWALL` | *(non défini)* | Définir à `true` pour activer la gestion automatique des règles UFW |

::: warning
Le pare-feu nécessite l'utilitaire tiers `ufw-docker`, qui est téléchargé depuis GitHub. Il modifie `/etc/ufw/after.rules` pour s'intégrer aux chaînes iptables de Docker. Si vous avez des règles UFW personnalisées, vérifiez les modifications après l'installation.
:::

::: danger
Assurez-vous toujours que l'accès SSH fonctionne avant d'activer le pare-feu sur un serveur distant. L'installateur autorise toujours le port 22, mais vérifiez que vous pouvez vous connecter avant de fermer votre session actuelle.
:::
