import { join } from "path";
import { existsSync } from "fs";
import { getProjectRoot, loadEnvConfig } from "@/lib/config.js";
import { isContainerRunning, composeUp, composeDown } from "@/lib/docker.js";
import { getDuckDnsDomain, regenerateCaddyfile } from "@/lib/caddy.js";
import { getLocalIp } from "@/lib/distro.js";
import { shell } from "@/lib/shell.js";

function getDocsComposePath(): string {
  return join(getProjectRoot(), "docs", "docker-compose.yml");
}

function getDocsUrl(envConfig: { ENABLE_HTTPS?: string; DUCKDNS_SUBDOMAINS?: string }, localIp: string): string {
  if (envConfig.ENABLE_HTTPS === "true") {
    const domain = getDuckDnsDomain(envConfig as any);
    if (domain) return `https://mithrandir-docs.${domain}`;
  }
  return `http://${localIp}:4173`;
}

export async function runDocs(): Promise<void> {
  const composePath = getDocsComposePath();
  if (!existsSync(composePath)) {
    console.error("Error: docs/docker-compose.yml not found. Is the repo intact?");
    process.exit(1);
  }

  const running = await isContainerRunning("mithrandir-docs");
  const envConfig = await loadEnvConfig();
  const localIp = await getLocalIp();

  if (running) {
    console.log(`Docs site is already running at ${getDocsUrl(envConfig, localIp)}`);
    return;
  }

  console.log("Building docs site...");
  const build = await shell("docker", ["compose", "build"], {
    sudo: true,
    cwd: join(getProjectRoot(), "docs"),
    ignoreError: true,
  });
  if ((build.exitCode ?? 0) !== 0) {
    console.error(`Build failed: ${build.stderr?.trim() || "unknown error"}`);
    process.exit(1);
  }

  await composeUp(composePath);
  await regenerateCaddyfile(envConfig);

  console.log(`Docs site is running at ${getDocsUrl(envConfig, localIp)}`);
}

export async function runDocsStop(): Promise<void> {
  const composePath = getDocsComposePath();
  if (!existsSync(composePath)) {
    console.error("Error: docs/docker-compose.yml not found.");
    process.exit(1);
  }

  const running = await isContainerRunning("mithrandir-docs");
  if (!running) {
    console.log("Docs site is not running.");
    return;
  }

  await composeDown(composePath);

  const envConfig = await loadEnvConfig();
  await regenerateCaddyfile(envConfig);

  console.log("Docs site stopped.");
}
