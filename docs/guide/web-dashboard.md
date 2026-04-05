# Web Dashboard

Mithrandir includes a web-based dashboard for managing your homelab from a browser. It provides the same capabilities as the CLI in a visual interface, with authentication, dark mode, and internationalization.

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| [TanStack Start](https://tanstack.com/start) | Full-stack SSR framework |
| [React 19](https://react.dev/) | UI library |
| [Vite](https://vite.dev/) | Build tool and dev server |
| [Tailwind CSS v4](https://tailwindcss.com/) | Utility-first styling |
| [shadcn/ui](https://ui.shadcn.com/) | Component library (New York style, zinc base) |
| [TanStack Router](https://tanstack.com/router) | File-based routing with SSR |
| [TanStack Query](https://tanstack.com/query) | Server state management and data fetching |
| [TanStack Form](https://tanstack.com/form) | Form handling with Zod validation |
| [Better-Auth](https://www.better-auth.com/) | Authentication (email/password + TOTP 2FA + optional OIDC SSO) |
| [Drizzle ORM](https://orm.drizzle.team/) | SQLite database access |
| [Paraglide](https://inlang.com/m/gerre34r/library-inlang-paraglideJs) | Internationalization (English, French) |
| [Biome](https://biomejs.dev/) | Linting and formatting |

## Features

### Dashboard

The home page provides an at-a-glance overview of your homelab:

- **System status** — Docker daemon, uptime, OS info
- **Installed apps** — Grid of running apps with status indicators
- **Backup status** — Last backup date, next scheduled run, encryption status
- **Resources** — CPU, RAM, and disk usage
- **Configuration** — Current `.env` settings summary
- **Version** — CLI version and update availability
- **Doctor** — Run diagnostics directly from the dashboard

### App Management

Browse, search, and manage all 30+ available apps:

- **Category filtering** — Filter by media, automation, monitoring, productivity, etc.
- **Search** — Fuzzy search across app names and descriptions
- **App details** — View ports, config paths, capacity scores, and external links for each app
- **Lifecycle controls** — Install, uninstall, start, stop, and restart apps with one click
- **Live logs** — Stream container logs in real time directly in the browser

### Dependency Graph

Visual representation of inter-app dependencies. Each node shows installation status, helping you understand which apps depend on each other before installing.

### Capacity Planning

System resource overview with visual indicators:

- **Hardware specs** — CPU, RAM, disk detected automatically
- **Score rings** — Aggregate performance and storage scores
- **Storage meter** — Disk usage with warning thresholds
- **Per-app scores** — Performance and storage impact for each installed app

### Backup & Restore

Manage backups without touching the terminal:

- **Backup list** — View local and remote backups with dates and sizes
- **Trigger backup** — Start a backup and monitor progress
- **Restore** — Restore individual apps or full system from any backup

### Setup Wizard

Step-by-step guided setup with the same workflow as the CLI wizard, presented as a visual stepper form.

### Media Library

Browse media files stored on the server with an interactive file tree viewer.

### File Upload

Upload files to the server using resumable uploads via the [tus protocol](https://tus.io/), powered by [Uppy](https://uppy.io/). Large files are uploaded in chunks, so interrupted uploads can resume where they left off.

### Settings

Configure your homelab from tabbed settings panels:

- **General** — Base directory, timezone, user/group IDs
- **Backup** — Backup directory, retention, rclone remotes, encryption, schedule
- **Network** — HTTPS, DuckDNS, firewall settings
- **About** — System information and version details

### User Profile

- Manage your account details
- View and revoke active sessions
- Enable or disable two-factor authentication (TOTP)

### Self-Update

Update Mithrandir from git directly in the browser. The update page shows a step-by-step progress view as it pulls the latest code, installs dependencies, and rebuilds.

### Themes

Light, dark, and auto (system) themes with a toggle in the header. The preference is persisted to localStorage.

## Deployment

### Systemd Services

In production, the UI runs as two systemd services:

| Service | Port | Description |
|---------|------|-------------|
| `mithrandir-ui.service` | 4180 | TanStack Start SSR app. Runs database migrations on startup (`scripts/migrate.ts`), loads env vars from both `.env` and `ui/.env.local`. |
| `mithrandir-tusd.service` | 1080 | [tusd](https://tus.io/) resumable upload server. Handles chunked file uploads and forwards lifecycle hooks (`pre-create`, `post-finish`) to the UI at `http://localhost:4180/api/media/upload/hooks` for authentication and processing. |

Both services are installed automatically by `mithrandir ui` and managed via systemd. The tusd service starts before the UI service (`Before=mithrandir-ui.service`) to ensure upload handling is ready.

When Caddy HTTPS is enabled, the Caddyfile is automatically regenerated to reverse-proxy both services under `https://mithrandir.yourdomain.duckdns.org`.

### Blue-Green Deployments

Builds use a blue-green deployment strategy to enable zero-downtime updates:

1. `bun run ui:build` produces output in `ui/.output/`
2. The build is copied into the inactive slot (`ui/.deployments/blue` or `ui/.deployments/green`)
3. An atomic symlink swap points `ui/.deployments/current` to the new slot
4. The old slot and staging directory are cleaned up

The systemd service runs from `.deployments/current/server/index.mjs`, so the switch is instant.

### Update Log

Self-updates triggered from the web UI (or `mithrandir self-update`) log each step to:

```
/var/log/mithrandir-ui-update.log
```

The log includes timestamped entries for git pull, dependency install, CLI build, UI build, deployment, and service restart. This is useful for diagnosing update failures on headless servers.

### Start and Stop

```bash
mithrandir ui               # Build, deploy, and start both services
mithrandir ui stop          # Stop both services
```

If the UI is already running, `mithrandir ui` detects it and skips the build. It also ensures tusd is set up (handles upgrades from older versions without tusd).

### Environment Variables

The UI requires a `ui/.env.local` file with the following:

```env
BETTER_AUTH_URL=http://localhost:4180
BETTER_AUTH_SECRET=  # Generate with: openssl rand -base64 32
```

- `BETTER_AUTH_URL` — The URL where the UI is accessible
- `BETTER_AUTH_SECRET` — A 32-character secret used to sign authentication tokens. Generate one with `openssl rand -base64 32`.

When started via `mithrandir ui`, this file is auto-generated if missing (with a random secret and default values).

#### OIDC Single Sign-On (Optional)

The dashboard supports logging in via an external OpenID Connect provider (Authentik, Keycloak, Authelia, etc.). To enable OIDC SSO, add these variables to `ui/.env.local`:

```env
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
OIDC_ISSUER_URL=https://auth.example.com
```

- `OIDC_CLIENT_ID` — The OAuth client ID registered in your identity provider
- `OIDC_CLIENT_SECRET` — The OAuth client secret from your identity provider
- `OIDC_ISSUER_URL` — The base URL of your OIDC provider (must expose a `/.well-known/openid-configuration` endpoint)

All three variables must be set for SSO to appear on the sign-in page. When configured, a "Sign in with SSO" button is shown above the email/password form. Email/password login remains available as a fallback.

**Setting up your identity provider:**

1. Create a new OAuth/OIDC application in your IdP (Authentik, Keycloak, Authelia, etc.)
2. Set the redirect URI to: `{BETTER_AUTH_URL}/api/auth/oauth2/callback/oidc`
3. Ensure the application requests the `openid`, `profile`, and `email` scopes
4. Copy the client ID, client secret, and issuer URL into `ui/.env.local`
5. Restart the UI service: `sudo systemctl restart mithrandir-ui`

::: tip Development
For local development setup, dev server, and testing commands, see the [Local Development](/guide/development#ui-dashboard) page.
:::
