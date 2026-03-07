import { APP_REGISTRY, getComposePath } from "@/lib/apps.js";
import { loadEnvConfig } from "@/lib/config.js";
import { existsSync } from "fs";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const GRAY = "\x1b[90m";
const WHITE = "\x1b[37m";

function installed(name: string, installedApps: Set<string>): string {
  const app = APP_REGISTRY.find((a) => a.name === name);
  const display = app?.displayName ?? name;
  return installedApps.has(name)
    ? `${GREEN}${display}${RESET}`
    : `${DIM}${display}${RESET}`;
}

function arrow(): string {
  return `${GRAY}───►${RESET}`;
}

function sectionTitle(title: string): string {
  return `${BOLD}${CYAN}${title}${RESET}`;
}

export async function runGraph(): Promise<void> {
  const env = await loadEnvConfig();
  const installedApps = new Set<string>();
  for (const app of APP_REGISTRY) {
    if (existsSync(getComposePath(app, env.BASE_DIR))) {
      installedApps.add(app.name);
    }
  }

  const i = (name: string) => installed(name, installedApps);
  const a = arrow();

  const lines = [
    ``,
    `${BOLD}${WHITE}Mithrandir Dependency Graph${RESET}`,
    `${DIM}Green = installed, dim = not installed${RESET}`,
    ``,
    sectionTitle("Media Pipeline"),
    ``,
    `  ${i("prowlarr")} ${a} ${i("radarr")}  ${a} ${i("qbittorrent")} ${a} /data/media/movies ${a} ${i("jellyfin")}`,
    `  ${GRAY}    │${RESET}       ${a} ${i("sonarr")}  ${a} ${i("qbittorrent")} ${a} /data/media/tv     ${a} ${i("jellyfin")}`,
    `  ${GRAY}    └──────►${RESET} ${i("lidarr")}  ${a} ${i("qbittorrent")} ${a} /data/media/music  ${a} ${i("navidrome")}`,
    ``,
    `  ${i("flaresolverr")} ${a} ${i("prowlarr")}  ${DIM}(CAPTCHA solving, auto-installed with Prowlarr)${RESET}`,
    `  ${i("bazarr")}       ${a} ${i("radarr")}, ${i("sonarr")}  ${DIM}(subtitle management)${RESET}`,
    `  ${i("seerr")}        ${a} ${i("radarr")}, ${i("sonarr")}, ${i("jellyfin")}  ${DIM}(media requests & discovery)${RESET}`,
    `  ${i("profilarr")}   ${a} ${i("radarr")}, ${i("sonarr")}  ${DIM}(quality profile management)${RESET}`,
    ``,
    sectionTitle("Network & Security"),
    ``,
    `  ${i("duckdns")} ${a} ${i("caddy")} ${a} all apps with ports  ${DIM}(wildcard HTTPS reverse proxy)${RESET}`,
    `  ${i("caddy")}  ${a} ${i("vaultwarden")}  ${DIM}(HTTPS required)${RESET}`,
    `  ${i("pihole")}  ${DIM}(standalone DNS, optional wildcard DNS for Caddy)${RESET}`,
    ``,
    sectionTitle("Standalone"),
    `${DIM}  No dependencies — can be installed independently${RESET}`,
    ``,
    `  ${i("homeassistant")}   ${i("immich")}   ${i("gatus")}   ${i("homarr")}`,
    `  ${i("wireguard")}       ${i("excalidraw")}   ${i("omnitools")}   ${i("openwebui")}   ${i("actualbudget")}   ${i("sure")}`,
    ``,
    sectionTitle("Recommended Installation Order"),
    ``,
    `  ${DIM}1.${RESET} qBittorrent  ${DIM}(download client — no dependencies)${RESET}`,
    `  ${DIM}2.${RESET} Prowlarr     ${DIM}(indexer manager, auto-installs FlareSolverr)${RESET}`,
    `  ${DIM}3.${RESET} Radarr       ${DIM}(movies — connects to qBittorrent + Prowlarr)${RESET}`,
    `  ${DIM}4.${RESET} Sonarr       ${DIM}(TV — connects to qBittorrent + Prowlarr)${RESET}`,
    `  ${DIM}5.${RESET} Lidarr       ${DIM}(music — connects to qBittorrent + Prowlarr)${RESET}`,
    `  ${DIM}6.${RESET} Bazarr       ${DIM}(subtitles — connects to Radarr + Sonarr)${RESET}`,
    `  ${DIM}7.${RESET} Jellyfin     ${DIM}(media server — reads from /data/media)${RESET}`,
    `  ${DIM}8.${RESET} Navidrome    ${DIM}(music server — reads from /data/media/music)${RESET}`,
    `  ${DIM}9.${RESET} Seerr        ${DIM}(requests — connects to Radarr, Sonarr, Jellyfin)${RESET}`,
    `  ${DIM}10.${RESET} Profilarr   ${DIM}(quality profiles — connects to Radarr, Sonarr)${RESET}`,
    ``,
    `  ${DIM}Or install everything at once:${RESET} ${YELLOW}sudo mithrandir install media${RESET}`,
    ``,
  ];

  console.log(lines.join("\n"));
}
