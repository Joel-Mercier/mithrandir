# Accès à distance (Tailscale)

Mithrandir peut optionnellement connecter votre serveur à [Tailscale](https://tailscale.com). Vous pouvez alors accéder à votre homelab depuis n'importe où : votre téléphone en 4G, votre portable sur le Wi-Fi d'un hôtel, chez un ami.

Tailscale place vos appareils sur un réseau privé et chiffré appelé **tailnet**. Chaque appareil exécute le client Tailscale et se connecte au même compte. Ensuite, ils peuvent se joindre directement.

- **Aucune redirection de port.** Rien n'est ouvert sur votre box et aucune de vos applications n'est exposée sur internet.
- **Fonctionne derrière un CGNAT** et sur les réseaux où la redirection de port est impossible (box 4G/5G, certains FAI).
- **Chiffré de bout en bout** avec WireGuard. Seuls les appareils que vous avez connectés peuvent se joindre.
- **Gratuit pour un usage personnel.** Un compte est créé lors de la première connexion, avec Google, Microsoft, GitHub, Apple ou une adresse e-mail.

::: tip Tailscale ou WireGuard ?
L'application [WireGuard](./apps/wireguard) permet aussi l'accès à distance. Elle nécessite un port UDP redirigé et une IP publique, et vous gérez les configurations des pairs à la main. Tailscale ne demande rien de tout cela et se configure plus facilement sur les téléphones. Vous pouvez utiliser les deux.
:::

## Installation

```sh
mithrandir install tailscale
```

La commande vous pose quelques questions, puis connecte le serveur :

1. **Nom de l'appareil.** Le nom du serveur dans votre tailnet (par défaut `mithrandir`). Avec MagicDNS, vos applications deviennent accessibles via `http://mithrandir:<port>`.
2. **Partager votre réseau local.** Fait du serveur un [routeur de sous-réseau](https://tailscale.com/kb/1019/subnets) pour votre réseau local détecté (par ex. `192.168.1.0/24`). Vos URLs locales habituelles fonctionnent alors à distance, tout comme les autres appareils de votre réseau (NAS, imprimante, interface de la box). Cette option est activée par défaut.
3. **Nœud de sortie** (optionnel). Permet de faire passer *tout* le trafic internet d'un appareil par votre connexion à la maison. Pratique sur un Wi-Fi public.
4. **Tailscale SSH** (optionnel). Se connecter en SSH au serveur depuis les appareils du tailnet, authentifié par votre identité Tailscale plutôt que par des clés SSH.
5. **Méthode de connexion.**
   - **Connexion par navigateur** (par défaut). Un lien de connexion et un QR code sont affichés. Ouvrez le lien ou scannez le code avec votre téléphone, puis connectez-vous.
   - **Clé d'authentification.** Collez une clé générée sur [login.tailscale.com/admin/settings/keys](https://login.tailscale.com/admin/settings/keys). C'est utile pour les installations sans intervention.

En coulisses, mithrandir :

- installe Tailscale depuis le dépôt apt officiel (`pkgs.tailscale.com`), ou à défaut avec le script d'installation officiel
- active et démarre le service `tailscaled`
- active le routage IP (`/etc/sysctl.d/99-tailscale.conf`) lorsque le routage de sous-réseau ou le nœud de sortie est activé
- exécute `tailscale up` avec vos paramètres. Les réglages MagicDNS du tailnet ne sont pas appliqués au serveur (`--accept-dns=false`), afin que les conteneurs Docker continuent à résoudre les noms normalement.
- définit votre utilisateur comme opérateur Tailscale, pour que `tailscale status` fonctionne sans `sudo`
- ajoute les règles de pare-feu Tailscale si le [pare-feu](./firewall) est activé
- enregistre vos choix dans `.env` (`ENABLE_TAILSCALE=true` et les paramètres `TAILSCALE_*`)

Relancer la commande sur un serveur déjà connecté permet de modifier les paramètres sans vous reconnecter.

### Installation sans intervention

Passez une clé d'authentification avec `--auth-key`, ou définissez `TAILSCALE_AUTH_KEY` dans `.env`, et ajoutez `--yes` pour accepter les valeurs par défaut :

```sh
mithrandir install tailscale --auth-key tskey-auth-xxxxx --yes
```

La clé est transmise à `tailscale up` via un fichier temporaire (mode `0600`) supprimé juste après. Elle n'apparaît jamais dans la liste des processus. Mithrandir n'écrit jamais lui-même la clé dans `.env`.

::: tip
Pour un serveur, créez une clé **réutilisable**. Laissez l'option **Ephemeral** désactivée, sinon le serveur disparaît de votre tailnet dès qu'il est hors ligne.
:::

## Approuver les routes et le nœud de sortie

Par sécurité, Tailscale exige que vous approuviez les routes de sous-réseau et les nœuds de sortie dans la console d'administration avant qu'ils ne prennent effet :

1. Ouvrez [login.tailscale.com/admin/machines](https://login.tailscale.com/admin/machines)
2. Cliquez sur le menu **…** à côté de votre serveur → **Edit route settings**
3. Cochez le sous-réseau (et **Use as exit node** si activé), puis **Save**

L'installateur attend l'approbation et continue tout seul une fois qu'elle est faite. Appuyez sur <kbd>Entrée</kbd> pour ne pas attendre et approuver plus tard. Tant que les routes ne sont pas approuvées, le serveur lui-même reste accessible via son nom et son IP tailnet, mais pas le reste de votre réseau local.

::: tip Approbation automatique
Pour éviter cette étape sur vos prochains serveurs, vous pouvez définir des [auto approvers](https://tailscale.com/kb/1337/acl-syntax#autoapprovers) dans le fichier de politique de votre tailnet.
:::

## Connecter vos appareils

Installez l'application Tailscale sur chaque appareil que vous souhaitez utiliser à distance ([tailscale.com/download](https://tailscale.com/download)) et connectez-vous avec le **même compte**. Ouvrez ensuite vos applications avec l'une de ces URLs :

| URL | Fonctionne quand |
| --- | --- |
| `http://mithrandir:8096` | MagicDNS est activé (par défaut sur les nouveaux tailnets) |
| `http://mithrandir.<tailnet>.ts.net:8096` | Toujours, avec le nom MagicDNS complet |
| `http://100.x.y.z:8096` | Toujours, avec l'IP tailnet du serveur |
| `http://192.168.1.10:8096` | Le routage de sous-réseau est activé et approuvé |

Le résumé de la configuration, `mithrandir install tailscale` et le tableau de bord web affichent tous le nom et l'IP exacts de votre serveur.

::: info HTTPS
Si vous utilisez [HTTPS avec Caddy](./https), votre domaine `*.duckdns.org` pointe vers votre IP **locale**. Il fonctionne donc à distance une fois le routage de sous-réseau approuvé.
:::

## Assistant de configuration

L'assistant de configuration du CLI (`mithrandir setup`) propose une étape **Tailscale** optionnelle juste après l'étape du pare-feu. L'assistant du tableau de bord web propose une étape **Accès à distance** juste avant l'étape *Pare-feu & Sauvegarde*. Les deux sont désactivées par défaut : répondez *oui* (CLI) ou activez l'interrupteur (web) pour la configurer. En mode `--yes`, l'étape n'est exécutée que si une clé d'authentification est disponible (`--auth-key` ou `TAILSCALE_AUTH_KEY`). Sinon, elle est ignorée.

## Tableau de bord web

**Paramètres → Réseau → Accès à distance (Tailscale)** affiche l'état de la connexion, le nom et l'IP tailnet, les routes en attente d'approbation et l'expiration de la clé de l'appareil. De là, vous pouvez vous connecter (avec un QR code), modifier les paramètres ou déconnecter le serveur.

## Pare-feu

Lorsque le pare-feu est activé, mithrandir ajoute deux règles UFW pour Tailscale :

```sh
sudo ufw allow in on tailscale0   # trafic provenant de votre tailnet
sudo ufw allow 41641/udp          # connexions directes entre appareils
```

Elles sont ajoutées par `mithrandir install tailscale`, ainsi que par `mithrandir install firewall` lorsque Tailscale est déjà activé. Les applications restent soumises à leurs propres règles de pare-feu.

## Expiration de la clé

Par défaut, les clés des appareils Tailscale expirent au bout de **180 jours**, et le serveur doit alors se reconnecter. Pour qu'un serveur reste connecté en permanence, ouvrez la console d'administration, cliquez sur **…** à côté de votre serveur, puis choisissez **Disable key expiry**. `mithrandir doctor` vous avertit 14 jours avant l'expiration de la clé.

## Diagnostic

```sh
mithrandir doctor        # connexion Tailscale, approbations en attente, expiration de la clé
tailscale status         # appareils de votre tailnet
tailscale ip             # IPs tailnet de ce serveur
```

## Configuration

| Variable | Défaut | Description |
| --- | --- | --- |
| `ENABLE_TAILSCALE` | `false` | Passé à `true` par `mithrandir install tailscale` |
| `TAILSCALE_HOSTNAME` | `mithrandir` | Nom de l'appareil dans votre tailnet |
| `TAILSCALE_ADVERTISE_ROUTES` | `auto` | `auto` (réseau local détecté), `none`, ou CIDR séparés par des virgules |
| `TAILSCALE_EXIT_NODE` | `false` | Proposer ce serveur comme nœud de sortie |
| `TAILSCALE_SSH` | `false` | Activer Tailscale SSH |
| `TAILSCALE_AUTH_KEY` | *(vide)* | Clé d'authentification optionnelle pour une connexion sans intervention. Laissez vide pour vous connecter via le navigateur |

## Désinstallation

`mithrandir uninstall` (suppression complète du système) comprend une étape optionnelle qui déconnecte le serveur de votre tailnet et supprime Tailscale. Elle demande d'abord une confirmation.

::: warning
Si vous êtes connecté au serveur **via Tailscale** (SSH à travers le tailnet), supprimer Tailscale interrompra votre session. Lancez plutôt la désinstallation depuis le réseau local ou une console locale.
:::

Pour vous déconnecter sans désinstaller, utilisez **Déconnecter** dans le tableau de bord web, ou exécutez `sudo tailscale logout`.
