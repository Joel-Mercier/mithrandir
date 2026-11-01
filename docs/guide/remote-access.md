# Remote Access (Tailscale)

Mithrandir can optionally connect your server to [Tailscale](https://tailscale.com), so you can reach your homelab from anywhere: your phone on mobile data, your laptop on hotel Wi-Fi, a friend's place.

Tailscale puts your devices on a private, encrypted network called a **tailnet**. Each device runs the Tailscale client and signs in to the same account. After that, they can reach each other directly.

- **No port forwarding.** Nothing on your router is opened, and none of your apps are exposed to the internet.
- **Works behind CGNAT** and other networks where port forwarding isn't possible (4G/5G home internet, some ISPs).
- **End-to-end encrypted** with WireGuard. Only devices you have signed in to can connect.
- **Free for personal use.** An account is created the first time you sign in, using Google, Microsoft, GitHub, Apple or an email address.

::: tip Tailscale or WireGuard?
The [WireGuard](./apps/wireguard) app also gives you remote access. It needs a forwarded UDP port and a public IP, and you manage peer configs by hand. Tailscale does none of that and is easier to set up on phones. You can run both.
:::

## Install

```sh
mithrandir install tailscale
```

The command walks you through a few questions, then connects the server:

1. **Device name.** The server's name on your tailnet (default `mithrandir`). With MagicDNS your apps become reachable at `http://mithrandir:<port>`.
2. **Share your home network.** Turns the server into a [subnet router](https://tailscale.com/kb/1019/subnets) for your detected LAN (e.g. `192.168.1.0/24`). Your usual LAN URLs then work remotely, and so do other devices on your home network (NAS, printer, router admin page). This is on by default.
3. **Exit node** (optional). Lets you route *all* of a device's internet traffic through your home connection. Useful on public Wi-Fi.
4. **Tailscale SSH** (optional). SSH into the server from tailnet devices, authenticated by your Tailscale identity instead of SSH keys.
5. **Sign-in method.**
   - **Browser sign-in** (default). A login link and a QR code are shown. Open the link or scan the code with your phone, then sign in.
   - **Auth key.** Paste a key generated at [login.tailscale.com/admin/settings/keys](https://login.tailscale.com/admin/settings/keys). This is useful for unattended installs.

Behind the scenes, mithrandir:

- installs Tailscale from the official apt repository (`pkgs.tailscale.com`), falling back to the official install script
- enables and starts the `tailscaled` service
- enables IP forwarding (`/etc/sysctl.d/99-tailscale.conf`) when subnet routing or exit node is enabled
- runs `tailscale up` with your settings. MagicDNS settings from the tailnet are not applied to the server (`--accept-dns=false`), so Docker containers keep resolving names normally.
- sets your user as the Tailscale operator, so `tailscale status` works without `sudo`
- adds the Tailscale firewall rules if the [firewall](./firewall) is enabled
- saves your choices in `.env` (`ENABLE_TAILSCALE=true` and the `TAILSCALE_*` settings)

Running the command again on a connected server lets you change the settings without signing in again.

### Unattended install

Pass an auth key with `--auth-key`, or set `TAILSCALE_AUTH_KEY` in `.env`, and add `--yes` to accept the defaults:

```sh
mithrandir install tailscale --auth-key tskey-auth-xxxxx --yes
```

The key is passed to `tailscale up` through a temporary file (mode `0600`) that is deleted right after. It never appears in the process list. Mithrandir never writes the key to `.env` itself.

::: tip
For a server, create a **reusable** key. Leave **Ephemeral** off, otherwise the server disappears from your tailnet when it goes offline.
:::

## Approve routes and exit node

For security, Tailscale requires you to approve subnet routes and exit nodes in the admin console before they take effect:

1. Open [login.tailscale.com/admin/machines](https://login.tailscale.com/admin/machines)
2. Click the **…** menu next to your server → **Edit route settings**
3. Tick the subnet (and **Use as exit node** if enabled), then **Save**

The installer waits for the approval and continues on its own once it's done. Press <kbd>Enter</kbd> to skip waiting and approve later. Until the routes are approved, the server itself is still reachable through its tailnet name and IP, but the rest of your LAN isn't.

::: tip Auto-approve
To skip this step for future servers, you can define [auto approvers](https://tailscale.com/kb/1337/acl-syntax#autoapprovers) in your tailnet policy file.
:::

## Connect your devices

Install the Tailscale app on each device you want to use remotely ([tailscale.com/download](https://tailscale.com/download)) and sign in with the **same account**. Then open your apps with any of these URLs:

| URL | Works when |
| --- | --- |
| `http://mithrandir:8096` | MagicDNS is enabled (default for new tailnets) |
| `http://mithrandir.<tailnet>.ts.net:8096` | Always, using the full MagicDNS name |
| `http://100.x.y.z:8096` | Always, using the server's tailnet IP |
| `http://192.168.1.10:8096` | Subnet routing is enabled and approved |

The setup summary, `mithrandir install tailscale` and the web dashboard all show the exact name and IP of your server.

::: info HTTPS
If you use [HTTPS with Caddy](./https), your `*.duckdns.org` domain resolves to your **LAN** IP. It therefore works remotely once subnet routing is approved.
:::

## Setup Wizard

The CLI setup wizard (`mithrandir setup`) has an optional **Tailscale** step right after the firewall step. The web dashboard setup has a **Remote Access** step right before the *Firewall & Backup* step. Both are off by default: answer *yes* (CLI) or turn on the switch (web) to set it up. In `--yes` mode, the step only runs if an auth key is available (`--auth-key` or `TAILSCALE_AUTH_KEY`). Otherwise it is skipped.

## Web Dashboard

**Settings → Network → Remote Access (Tailscale)** shows the connection status, tailnet name and IP, routes waiting for approval, and the device key expiry. From there you can sign in (with a QR code), change the settings, or disconnect the server.

## Firewall

When the firewall is enabled, mithrandir adds two UFW rules for Tailscale:

```sh
sudo ufw allow in on tailscale0   # traffic from your tailnet
sudo ufw allow 41641/udp          # direct peer-to-peer connections
```

These are added by `mithrandir install tailscale`, and also by `mithrandir install firewall` when Tailscale is already enabled. Apps stay subject to their own firewall rules.

## Key expiry

By default, Tailscale device keys expire after **180 days**, and the server then has to sign in again. To keep a server connected permanently, open the admin console, click **…** next to your server, and choose **Disable key expiry**. `mithrandir doctor` warns you 14 days before the key expires.

## Diagnostics

```sh
mithrandir doctor        # Tailscale connection, pending approvals, key expiry
tailscale status         # peers on your tailnet
tailscale ip             # this server's tailnet IPs
```

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `ENABLE_TAILSCALE` | `false` | Set to `true` by `mithrandir install tailscale` |
| `TAILSCALE_HOSTNAME` | `mithrandir` | Device name on your tailnet |
| `TAILSCALE_ADVERTISE_ROUTES` | `auto` | `auto` (detected LAN), `none`, or comma-separated CIDRs |
| `TAILSCALE_EXIT_NODE` | `false` | Offer this server as an exit node |
| `TAILSCALE_SSH` | `false` | Enable Tailscale SSH |
| `TAILSCALE_AUTH_KEY` | *(empty)* | Optional auth key for unattended login. Leave empty to sign in through the browser |

## Uninstall

`mithrandir uninstall` (full system removal) includes an optional step that logs the server out of your tailnet and removes Tailscale. It asks for confirmation first.

::: warning
If you are connected to the server **through Tailscale** (SSH over the tailnet), removing Tailscale will drop your session. Run the uninstall from the LAN or a local console instead.
:::

To disconnect without uninstalling, use **Disconnect** in the web dashboard, or run `sudo tailscale logout`.
