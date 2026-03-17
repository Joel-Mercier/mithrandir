import { useState, useEffect } from "react";
import { Box, render, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import { APP_REGISTRY, getComposePath } from "@/lib/apps.js";
import { loadEnvConfig } from "@/lib/config.js";
import { existsSync } from "fs";
import { Header } from "@/components/Header.js";
import { Divider } from "@/components/Divider.js";

function AppName({ name, installedApps }: { name: string; installedApps: Set<string> }) {
  const app = APP_REGISTRY.find((a) => a.name === name);
  const display = app?.displayName ?? name;
  return installedApps.has(name)
    ? <Text color="green">{display}</Text>
    : <Text dimColor>{display}</Text>;
}

function Arrow() {
  return <Text dimColor>───►</Text>;
}

function GraphDisplay() {
  const { exit } = useApp();
  const [installedApps, setInstalledApps] = useState<Set<string> | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const env = await loadEnvConfig();
    const installed = new Set<string>();
    for (const app of APP_REGISTRY) {
      if (existsSync(getComposePath(app, env.BASE_DIR))) {
        installed.add(app.name);
      }
    }
    setInstalledApps(installed);
    const t = setTimeout(() => exit(), 100);
    t.unref();
  }

  if (!installedApps) {
    return (
      <Box flexDirection="column">
        <Header title="Dependency Graph" />
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}Loading...
        </Text>
      </Box>
    );
  }

  const i = installedApps;

  return (
    <Box flexDirection="column">
      <Header title="Dependency Graph" />
      <Text dimColor>Green = installed, dim = not installed</Text>

      <Box marginTop={1}>
        <Divider title="Media Pipeline" width={50} titleColor="cyan" />
      </Box>
      <Box marginTop={1} flexDirection="column" marginLeft={2}>
        <Text>
          <AppName name="prowlarr" installedApps={i} /> <Arrow /> <AppName name="radarr" installedApps={i} />  <Arrow /> <AppName name="qbittorrent" installedApps={i} /> <Arrow /> <Text dimColor>/data/media/movies</Text> <Arrow /> <AppName name="jellyfin" installedApps={i} />
        </Text>
        <Text>
          <Text dimColor>    │</Text>       <Arrow /> <AppName name="sonarr" installedApps={i} />  <Arrow /> <AppName name="qbittorrent" installedApps={i} /> <Arrow /> <Text dimColor>/data/media/tv</Text>     <Arrow /> <AppName name="jellyfin" installedApps={i} />
        </Text>
        <Text>
          <Text dimColor>    └──────►</Text> <AppName name="lidarr" installedApps={i} />  <Arrow /> <AppName name="qbittorrent" installedApps={i} /> <Arrow /> <Text dimColor>/data/media/music</Text>  <Arrow /> <AppName name="navidrome" installedApps={i} />
        </Text>
      </Box>

      <Box marginTop={1} marginLeft={2} flexDirection="column">
        <Text>
          <AppName name="flaresolverr" installedApps={i} /> <Arrow /> <AppName name="prowlarr" installedApps={i} />  <Text dimColor>(CAPTCHA solving, auto-installed with Prowlarr)</Text>
        </Text>
        <Text>
          <AppName name="bazarr" installedApps={i} />       <Arrow /> <AppName name="radarr" installedApps={i} />, <AppName name="sonarr" installedApps={i} />  <Text dimColor>(subtitle management)</Text>
        </Text>
        <Text>
          <AppName name="seerr" installedApps={i} />        <Arrow /> <AppName name="radarr" installedApps={i} />, <AppName name="sonarr" installedApps={i} />, <AppName name="jellyfin" installedApps={i} />  <Text dimColor>(media requests & discovery)</Text>
        </Text>
        <Text>
          <AppName name="profilarr" installedApps={i} />   <Arrow /> <AppName name="radarr" installedApps={i} />, <AppName name="sonarr" installedApps={i} />  <Text dimColor>(quality profile management)</Text>
        </Text>
      </Box>

      <Box marginTop={1} marginLeft={2} flexDirection="column">
        <Text bold>Recommended Installation Order</Text>
        <Text>{""}</Text>
        <Text><Text dimColor>1.</Text> qBittorrent  <Text dimColor>(download client — no dependencies)</Text></Text>
        <Text><Text dimColor>2.</Text> Prowlarr     <Text dimColor>(indexer manager, auto-installs FlareSolverr)</Text></Text>
        <Text><Text dimColor>3.</Text> Radarr       <Text dimColor>(movies — connects to qBittorrent + Prowlarr)</Text></Text>
        <Text><Text dimColor>4.</Text> Sonarr       <Text dimColor>(TV — connects to qBittorrent + Prowlarr)</Text></Text>
        <Text><Text dimColor>5.</Text> Lidarr       <Text dimColor>(music — connects to qBittorrent + Prowlarr)</Text></Text>
        <Text><Text dimColor>6.</Text> Bazarr       <Text dimColor>(subtitles — connects to Radarr + Sonarr, optional)</Text></Text>
        <Text><Text dimColor>7.</Text> Jellyfin     <Text dimColor>(media server — reads from /data/media)</Text></Text>
        <Text><Text dimColor>8.</Text> Navidrome    <Text dimColor>(music server — reads from /data/media/music)</Text></Text>
        <Text><Text dimColor>9.</Text> Seerr        <Text dimColor>(requests — connects to Radarr, Sonarr, Jellyfin, optional)</Text></Text>
        <Text><Text dimColor>10.</Text> Profilarr   <Text dimColor>(quality profiles — connects to Radarr, Sonarr, optional)</Text></Text>
        <Text>{""}</Text>
        <Text><Text dimColor>Or install everything at once:</Text> <Text color="yellow">sudo mithrandir install media</Text></Text>
      </Box>

      <Box marginTop={1}>
        <Divider title="Network & Security" width={50} titleColor="cyan" />
      </Box>
      <Box marginTop={1} marginLeft={2} flexDirection="column">
        <Text>
          <AppName name="duckdns" installedApps={i} /> <Arrow /> <AppName name="caddy" installedApps={i} /> <Arrow /> <Text>all apps with ports</Text>  <Text dimColor>(wildcard HTTPS reverse proxy)</Text>
        </Text>
        <Text>
          <AppName name="caddy" installedApps={i} />  <Arrow /> <AppName name="vaultwarden" installedApps={i} />  <Text dimColor>(HTTPS required)</Text>
        </Text>
        <Text>
          <AppName name="pihole" installedApps={i} />  <Text dimColor>(standalone DNS, optional wildcard DNS for Caddy)</Text>
        </Text>
      </Box>

      <Box marginTop={1}>
        <Divider title="Standalone" width={50} titleColor="cyan" />
      </Box>
      <Box marginTop={1} marginLeft={2} flexDirection="column">
        <Text dimColor>No dependencies — can be installed independently</Text>
        <Text>{""}</Text>
        <Text>
          <AppName name="homeassistant" installedApps={i} />   <AppName name="immich" installedApps={i} />   <AppName name="gatus" installedApps={i} />   <AppName name="homarr" installedApps={i} />
        </Text>
        <Text>
          <AppName name="wireguard" installedApps={i} />       <AppName name="excalidraw" installedApps={i} />   <AppName name="omnitools" installedApps={i} />   <AppName name="openwebui" installedApps={i} />
        </Text>
        <Text>
          <AppName name="actualbudget" installedApps={i} />    <AppName name="sure" installedApps={i} />   <AppName name="affine" installedApps={i} />   <AppName name="n8n" installedApps={i} />   <AppName name="penpot" installedApps={i} />
        </Text>
        <Text>
          <AppName name="audiobookshelf" installedApps={i} />
        </Text>
      </Box>
      <Text>{""}</Text>
    </Box>
  );
}

export async function runGraph(): Promise<void> {
  const { waitUntilExit } = render(<GraphDisplay />);
  await waitUntilExit();
}
