import { defineConfig, type DefaultTheme } from "vitepress";

function guideSidebar(prefix = ""): DefaultTheme.SidebarItem[] {
  return [
    {
      text: prefix ? "Guide" : "Guide",
      items: [
        { text: prefix ? "Pour commencer" : "Getting Started", link: `${prefix}/guide/` },
        { text: "Installation", link: `${prefix}/guide/installation` },
        { text: prefix ? "Assistant de configuration" : "Setup Wizard", link: `${prefix}/guide/setup` },
        { text: prefix ? "Sauvegarde & Restauration" : "Backup & Restore", link: `${prefix}/guide/backup` },
        { text: prefix ? "Configuration HTTPS" : "HTTPS Setup", link: `${prefix}/guide/https` },
        { text: prefix ? "Pare-feu" : "Firewall", link: `${prefix}/guide/firewall` },
        { text: prefix ? "Planification de capacité" : "Capacity Planning", link: `${prefix}/guide/capacity` },
        { text: prefix ? "Développement local" : "Local Development", link: `${prefix}/guide/development` },
        {
          text: prefix ? "Applications" : "Apps",
          collapsed: false,
          items: [
            { text: prefix ? "Vue d'ensemble" : "Overview", link: `${prefix}/guide/apps/` },
            {
              text: prefix ? "Multimédia : Films & Séries" : "Media: Movies & TV",
              collapsed: true,
              items: [
                { text: "Jellyfin", link: `${prefix}/guide/apps/jellyfin` },
                { text: "Seerr", link: `${prefix}/guide/apps/seerr` },
                { text: "Sonarr", link: `${prefix}/guide/apps/sonarr` },
                { text: "Radarr", link: `${prefix}/guide/apps/radarr` },
                { text: "Bazarr", link: `${prefix}/guide/apps/bazarr` },
                { text: "Prowlarr", link: `${prefix}/guide/apps/prowlarr` },
                { text: "qBittorrent", link: `${prefix}/guide/apps/qbittorrent` },
                { text: "Profilarr", link: `${prefix}/guide/apps/profilarr` },
                { text: "FlareSolverr", link: `${prefix}/guide/apps/flaresolverr` },
              ],
            },
            {
              text: prefix ? "Multimédia : Musique" : "Media: Music",
              collapsed: true,
              items: [
                { text: "Navidrome", link: `${prefix}/guide/apps/navidrome` },
                { text: "Lidarr", link: `${prefix}/guide/apps/lidarr` },
              ],
            },
            {
              text: prefix ? "Multimédia : Photos" : "Media: Pictures",
              collapsed: true,
              items: [
                { text: "Immich", link: `${prefix}/guide/apps/immich` },
              ],
            },
            {
              text: "Automation",
              collapsed: true,
              items: [
                { text: "Home Assistant", link: `${prefix}/guide/apps/home-assistant` },
                { text: "n8n", link: `${prefix}/guide/apps/n8n` },
              ],
            },
            {
              text: prefix ? "Surveillance" : "Monitoring",
              collapsed: true,
              items: [
                { text: "Gatus", link: `${prefix}/guide/apps/gatus` },
              ],
            },
            {
              text: prefix ? "Productivité" : "Productivity",
              collapsed: true,
              items: [
                { text: "AFFiNE", link: `${prefix}/guide/apps/affine` },
                { text: "Excalidraw", link: `${prefix}/guide/apps/excalidraw` },
                { text: "Omni Tools", link: `${prefix}/guide/apps/omni-tools` },
                { text: "Open WebUI", link: `${prefix}/guide/apps/open-webui` },
                { text: "Paperless-ngx", link: `${prefix}/guide/apps/paperless-ngx` },
                { text: "Penpot", link: `${prefix}/guide/apps/penpot` },
                { text: "Stirling PDF", link: `${prefix}/guide/apps/stirling-pdf` },
              ],
            },
            {
              text: "Finance",
              collapsed: true,
              items: [
                { text: "Actual Budget", link: `${prefix}/guide/apps/actualbudget` },
                { text: "Sure", link: `${prefix}/guide/apps/sure` },
              ],
            },
            {
              text: prefix ? "Réseau & Sécurité" : "Network & Security",
              collapsed: true,
              items: [
                { text: "Pi-hole", link: `${prefix}/guide/apps/pihole` },
                { text: "WireGuard", link: `${prefix}/guide/apps/wireguard` },
                { text: "DuckDNS", link: `${prefix}/guide/apps/duckdns` },
                { text: "Vaultwarden", link: `${prefix}/guide/apps/vaultwarden` },
              ],
            },
            {
              text: prefix ? "Voyage" : "Travel",
              collapsed: true,
              items: [
                { text: "AdventureLog", link: `${prefix}/guide/apps/adventurelog` },
                { text: "TRIP", link: `${prefix}/guide/apps/trip` },
              ],
            },
            {
              text: prefix ? "Statistiques" : "Statistics",
              collapsed: true,
              items: [
                { text: "Your Spotify", link: `${prefix}/guide/apps/your-spotify` },
              ],
            },
            {
              text: prefix ? "Cuisine" : "Cooking",
              collapsed: true,
              items: [
                { text: "CookCLI", link: `${prefix}/guide/apps/cookcli` },
              ],
            },
            {
              text: prefix ? "Utilitaires" : "Utilities",
              collapsed: true,
              items: [
                { text: "Homarr", link: `${prefix}/guide/apps/homarr` },
              ],
            },
          ],
        },
      ],
    },
  ];
}

function referenceSidebar(prefix = ""): DefaultTheme.SidebarItem[] {
  return [
    {
      text: prefix ? "Référence" : "Reference",
      items: [
        { text: prefix ? "Référence CLI" : "CLI Reference", link: `${prefix}/reference/` },
        {
          text: prefix ? "Installation & Configuration" : "Setup & Configuration",
          collapsed: false,
          items: [
            { text: "setup", link: `${prefix}/reference/setup` },
            { text: "config", link: `${prefix}/reference/config` },
            { text: "doctor", link: `${prefix}/reference/doctor` },
          ],
        },
        {
          text: prefix ? "Gestion des applications" : "App Management",
          collapsed: false,
          items: [
            { text: "install", link: `${prefix}/reference/install` },
            { text: "uninstall", link: `${prefix}/reference/uninstall` },
            { text: "reinstall", link: `${prefix}/reference/reinstall` },
            { text: "start", link: `${prefix}/reference/start` },
            { text: "stop", link: `${prefix}/reference/stop` },
            { text: "restart", link: `${prefix}/reference/restart` },
            { text: "update", link: `${prefix}/reference/update` },
          ],
        },
        {
          text: prefix ? "Sauvegarde & Restauration" : "Backup & Restore",
          collapsed: false,
          items: [
            { text: "backup", link: `${prefix}/reference/backup` },
            { text: "restore", link: `${prefix}/reference/restore` },
            { text: "recover", link: `${prefix}/reference/recover` },
          ],
        },
        {
          text: prefix ? "Surveillance" : "Monitoring",
          collapsed: false,
          items: [
            { text: "status", link: `${prefix}/reference/status` },
            { text: "health", link: `${prefix}/reference/health` },
            { text: "log", link: `${prefix}/reference/log` },
            { text: "graph", link: `${prefix}/reference/graph` },
            { text: "capacity", link: `${prefix}/reference/capacity` },
          ],
        },
        {
          text: "Maintenance",
          collapsed: false,
          items: [
            { text: "self-update", link: `${prefix}/reference/self-update` },
            { text: "version", link: `${prefix}/reference/version` },
            { text: "docs", link: `${prefix}/reference/docs` },
            { text: "completions", link: `${prefix}/reference/completions` },
          ],
        },
      ],
    },
  ];
}

export default defineConfig({
  base: process.env.VITEPRESS_BASE ?? "/mithrandir",
  title: "Mithrandir",
  description: "Automated Docker-based homelab setup, backup, and restore",
  lastUpdated: true,
  locales: {
    root: {
      label: "English",
      lang: "en",
    },
    fr: {
      label: "Français",
      lang: "fr",
      description: "Installation, sauvegarde et restauration automatisées d'un homelab basé sur Docker",
      themeConfig: {
        nav: [
          { text: "Accueil", link: "/fr/" },
          { text: "Guide", link: "/fr/guide/" },
          { text: "Référence", link: "/fr/reference/" },
          {
            text: "v1.0.0",
            items: [
              { text: "Changelog", link: "/changelog" },
              { text: "Signaler un problème", link: "https://github.com/Joel-Mercier/mithrandir/issues/new" },
            ],
          },
        ],
        sidebar: [...guideSidebar("/fr"), ...referenceSidebar("/fr")],
        lastUpdated: {
          text: "Dernière mise à jour",
        },
        outline: {
          label: "Sur cette page",
        },
        docFooter: {
          prev: "Page précédente",
          next: "Page suivante",
        },
        darkModeSwitchLabel: "Apparence",
        sidebarMenuLabel: "Menu",
        returnToTopLabel: "Retour en haut",
        langMenuLabel: "Changer de langue",
      },
    },
  },
  themeConfig: {
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026-present Joel Mercier'
    },
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/" },
      { text: "Reference", link: "/reference/" },
      {
        text: "v1.0.0",
        items: [
          { text: "Changelog", link: "/changelog" },
          { text: "Open an issue", link: "https://github.com/Joel-Mercier/mithrandir/issues/new" },
        ],
      },
    ],
    search: {
      provider: "local",
    },
    sidebar: [...guideSidebar(), ...referenceSidebar()],
    socialLinks: [
      { icon: "github", link: "https://github.com/Joel-Mercier/mithrandir" },
    ],
  },
});
