import { defineConfig } from "vitepress";

export default defineConfig({
  base: process.env.VITEPRESS_BASE ?? "/mithrandir",
  title: "Mithrandir",
  description: "Automated Docker-based homelab setup, backup, and restore",
  lastUpdated: true,
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
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Getting Started", link: "/guide/" },
          { text: "Installation", link: "/guide/installation" },
          { text: "Setup Wizard", link: "/guide/setup" },
          { text: "Backup & Restore", link: "/guide/backup" },
          { text: "HTTPS Setup", link: "/guide/https" },
          { text: "Firewall", link: "/guide/firewall" },
          {
            text: "Apps",
            collapsed: false,
            items: [
              { text: "Overview", link: "/guide/apps/" },
              {
                text: "Media: Movies & TV",
                collapsed: true,
                items: [
                  { text: "Jellyfin", link: "/guide/apps/jellyfin" },
                  { text: "Seerr", link: "/guide/apps/seerr" },
                  { text: "Sonarr", link: "/guide/apps/sonarr" },
                  { text: "Radarr", link: "/guide/apps/radarr" },
                  { text: "Bazarr", link: "/guide/apps/bazarr" },
                  { text: "Prowlarr", link: "/guide/apps/prowlarr" },
                  { text: "qBittorrent", link: "/guide/apps/qbittorrent" },
                  { text: "Profilarr", link: "/guide/apps/profilarr" },
                  { text: "FlareSolverr", link: "/guide/apps/flaresolverr" },
                ],
              },
              {
                text: "Media: Music",
                collapsed: true,
                items: [
                  { text: "Navidrome", link: "/guide/apps/navidrome" },
                  { text: "Lidarr", link: "/guide/apps/lidarr" },
                ],
              },
              {
                text: "Media: Pictures",
                collapsed: true,
                items: [
                  { text: "Immich", link: "/guide/apps/immich" },
                ],
              },
              {
                text: "Automation",
                collapsed: true,
                items: [
                  { text: "Home Assistant", link: "/guide/apps/home-assistant" },
                  { text: "n8n", link: "/guide/apps/n8n" },
                ],
              },
              {
                text: "Monitoring",
                collapsed: true,
                items: [
                  { text: "Gatus", link: "/guide/apps/gatus" },
                ],
              },
              {
                text: "Productivity",
                collapsed: true,
                items: [
                  { text: "AFFiNE", link: "/guide/apps/affine" },
                  { text: "Excalidraw", link: "/guide/apps/excalidraw" },
                  { text: "Omni Tools", link: "/guide/apps/omni-tools" },
                  { text: "Open WebUI", link: "/guide/apps/open-webui" },
                  { text: "Penpot", link: "/guide/apps/penpot" },
                ],
              },
              {
                text: "Finance",
                collapsed: true,
                items: [
                  { text: "Actual Budget", link: "/guide/apps/actualbudget" },
                  { text: "Sure", link: "/guide/apps/sure" },
                ],
              },
              {
                text: "Network & Security",
                collapsed: true,
                items: [
                  { text: "Pi-hole", link: "/guide/apps/pihole" },
                  { text: "WireGuard", link: "/guide/apps/wireguard" },
                  { text: "DuckDNS", link: "/guide/apps/duckdns" },
                  { text: "Vaultwarden", link: "/guide/apps/vaultwarden" },
                ],
              },
              {
                text: "Utilities",
                collapsed: true,
                items: [
                  { text: "Homarr", link: "/guide/apps/homarr" },
                ],
              },
            ],
          },
        ],
      },
      {
        text: "Reference",
        items: [
          { text: "CLI Reference", link: "/reference/" },
          {
            text: "Setup & Configuration",
            collapsed: false,
            items: [
              { text: "setup", link: "/reference/setup" },
              { text: "config", link: "/reference/config" },
              { text: "doctor", link: "/reference/doctor" },
            ],
          },
          {
            text: "App Management",
            collapsed: false,
            items: [
              { text: "install", link: "/reference/install" },
              { text: "uninstall", link: "/reference/uninstall" },
              { text: "reinstall", link: "/reference/reinstall" },
              { text: "start", link: "/reference/start" },
              { text: "stop", link: "/reference/stop" },
              { text: "restart", link: "/reference/restart" },
              { text: "update", link: "/reference/update" },
            ],
          },
          {
            text: "Backup & Restore",
            collapsed: false,
            items: [
              { text: "backup", link: "/reference/backup" },
              { text: "restore", link: "/reference/restore" },
              { text: "recover", link: "/reference/recover" },
            ],
          },
          {
            text: "Monitoring",
            collapsed: false,
            items: [
              { text: "status", link: "/reference/status" },
              { text: "health", link: "/reference/health" },
              { text: "log", link: "/reference/log" },
              { text: "graph", link: "/reference/graph" },
            ],
          },
          {
            text: "Maintenance",
            collapsed: false,
            items: [
              { text: "self-update", link: "/reference/self-update" },
              { text: "version", link: "/reference/version" },
              { text: "docs", link: "/reference/docs" },
              { text: "completions", link: "/reference/completions" },
            ],
          },
        ],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/Joel-Mercier/mithrandir" },
    ],
  },
});
