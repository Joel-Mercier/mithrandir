import { existsSync, readFileSync } from "fs";
import { APP_REGISTRY, getComposePath } from "@/lib/apps.js";
import { PIHOLE_HTTPS_PORT } from "@/lib/compose.js";
import { getDuckDnsDomain } from "@/lib/caddy.js";
import { isContainerRunning, composeDown, composeUp } from "@/lib/docker.js";
import { shell } from "@/lib/shell.js";
import { getLocalIp } from "@/lib/distro.js";
import type { AppDefinition, EnvConfig } from "@/types.js";

/**
 * Detect which apps from the registry are currently installed
 * (have a docker-compose.yml in their app directory).
 */
function detectInstalledApps(baseDir: string): AppDefinition[] {
  return APP_REGISTRY.filter((app) => {
    const composePath = getComposePath(app, baseDir);
    return existsSync(composePath);
  });
}

/**
 * Build the healthcheck URL for an app.
 * When HTTPS is enabled, apps behind Caddy are checked via their subdomain.
 * Pi-hole's port is remapped to PIHOLE_HTTPS_PORT when Caddy owns port 80.
 */
function getAppUrl(
  app: AppDefinition,
  localIp: string,
  domain: string | null,
  httpsEnabled: boolean,
): string {
  if (httpsEnabled && domain) {
    return `https://${app.name}.${domain}`;
  }
  // When HTTPS is enabled but we somehow don't have a domain, use remapped port for Pi-hole
  const port = app.name === "pihole" && httpsEnabled ? PIHOLE_HTTPS_PORT : app.port;
  return `http://${localIp}:${port}`;
}

/**
 * Generate Gatus endpoint entries for a single app.
 * Returns an array of endpoint objects that will be serialized to YAML.
 *
 * When HTTPS is enabled, endpoints use the Caddy subdomain URL instead of
 * direct IP:port, which also validates that the reverse proxy is working.
 *
 * For multi-container apps with caddyExtraSubdomains (e.g. AdventureLog),
 * additional endpoints are created for each extra subdomain.
 */
function generateAppEndpoints(
  app: AppDefinition,
  localIp: string,
  discordWebhook: string | undefined,
  domain: string | null,
  httpsEnabled: boolean,
): string[] {
  if (!app.port || app.name === "gatus") return [];

  const lines: string[] = [];
  const url = getAppUrl(app, localIp, domain, httpsEnabled);

  // Main endpoint
  lines.push(`  - name: ${app.displayName}`);
  lines.push(`    group: ${app.additionalContainers ? "multi-container" : "single-container"}`);
  lines.push(`    url: ${url}`);
  lines.push(`    interval: 1m`);
  lines.push(`    conditions:`);
  lines.push(`      - "[STATUS] == 200"`);
  if (discordWebhook) {
    lines.push(`    alerts:`);
    lines.push(`      - type: discord`);
    lines.push(`        description: "healthcheck failed"`);
    lines.push(`        send-on-resolved: true`);
  }

  // Extra subdomains (e.g. adventurelog-api backend)
  if (app.caddyExtraSubdomains) {
    for (const extra of app.caddyExtraSubdomains) {
      const extraUrl = httpsEnabled && domain
        ? `https://${extra.subdomain}.${domain}`
        : `http://${localIp}:${extra.port}`;
      lines.push(`  - name: "${app.displayName} (${extra.subdomain})"`);
      lines.push(`    group: multi-container`);
      lines.push(`    url: ${extraUrl}`);
      lines.push(`    interval: 1m`);
      lines.push(`    conditions:`);
      lines.push(`      - "[STATUS] == 200"`);
      if (discordWebhook) {
        lines.push(`    alerts:`);
        lines.push(`      - type: discord`);
        lines.push(`        description: "healthcheck failed"`);
        lines.push(`        send-on-resolved: true`);
      }
    }
  }

  return lines;
}

/**
 * Generate the full Gatus config.yaml content from installed apps.
 *
 * When envConfig is provided and HTTPS is enabled, endpoints use Caddy
 * subdomain URLs (e.g. https://pihole.mylab.duckdns.org) instead of
 * direct IP:port, which also validates that the reverse proxy is working.
 */
export function generateGatusConfig(
  installedApps: AppDefinition[],
  localIp: string,
  options: {
    username?: string;
    passwordBcryptBase64?: string;
    discordWebhook?: string;
    envConfig?: EnvConfig;
  },
): string {
  const httpsEnabled = options.envConfig?.ENABLE_HTTPS === "true";
  const domain = options.envConfig ? getDuckDnsDomain(options.envConfig) : null;

  const lines: string[] = [];

  lines.push(`web:`);
  lines.push(`  port: 3001`);
  lines.push(``);
  lines.push(`storage:`);
  lines.push(`  type: sqlite`);
  lines.push(`  path: /data/data.db`);

  if (options.username && options.passwordBcryptBase64) {
    lines.push(``);
    lines.push(`security:`);
    lines.push(`  basic:`);
    lines.push(`    username: ${options.username}`);
    lines.push(`    password-bcrypt-base64: ${options.passwordBcryptBase64}`);
  }

  if (options.discordWebhook) {
    lines.push(``);
    lines.push(`alerting:`);
    lines.push(`  discord:`);
    lines.push(`    webhook-url: ${options.discordWebhook}`);
  }

  // Build endpoints for all installed apps
  const endpoints: string[] = [];
  for (const app of installedApps) {
    endpoints.push(...generateAppEndpoints(app, localIp, options.discordWebhook, domain, httpsEnabled));
  }

  if (endpoints.length > 0) {
    lines.push(``);
    lines.push(`endpoints:`);
    lines.push(...endpoints);
  }

  return lines.join("\n") + "\n";
}

/**
 * Parse the existing Gatus config.yaml to extract settings we need to preserve
 * (username, password hash, discord webhook) when regenerating.
 */
function parseExistingGatusConfig(configPath: string): {
  username?: string;
  passwordBcryptBase64?: string;
  discordWebhook?: string;
} {
  try {
    const content = readFileSync(configPath, "utf-8");
    const result: {
      username?: string;
      passwordBcryptBase64?: string;
      discordWebhook?: string;
    } = {};

    // Extract username
    const usernameMatch = content.match(/^\s+username:\s*(.+)$/m);
    if (usernameMatch) result.username = usernameMatch[1].trim();

    // Extract password hash
    const passwordMatch = content.match(/^\s+password-bcrypt-base64:\s*(.+)$/m);
    if (passwordMatch) result.passwordBcryptBase64 = passwordMatch[1].trim();

    // Extract discord webhook
    const webhookMatch = content.match(/^\s+webhook-url:\s*(.+)$/m);
    if (webhookMatch) result.discordWebhook = webhookMatch[1].trim();

    return result;
  } catch {
    return {};
  }
}

/**
 * Regenerate Gatus config.yaml from currently installed apps and restart Gatus.
 * Called after app install/uninstall when Gatus is installed.
 *
 * Preserves existing security and alerting settings from the current config.
 */
export async function regenerateGatusConfig(
  envConfig: EnvConfig,
): Promise<void> {
  const baseDir = envConfig.BASE_DIR;
  const gatusConfigDir = `${baseDir}/gatus/config`;
  const gatusConfigPath = `${gatusConfigDir}/config.yaml`;
  const gatusComposePath = getComposePath({ name: "gatus" } as AppDefinition, baseDir);

  // Only regenerate if Gatus is installed
  if (!existsSync(gatusComposePath)) return;

  // Parse existing config to preserve security and alerting settings
  const existing = parseExistingGatusConfig(gatusConfigPath);

  // Also check .env for discord webhook (may have been set after initial setup)
  const discordWebhook = existing.discordWebhook || envConfig.GATUS_DISCORD_WEBHOOK_URL;

  const installedApps = detectInstalledApps(baseDir);
  const localIp = await getLocalIp();

  const config = generateGatusConfig(installedApps, localIp, {
    username: existing.username,
    passwordBcryptBase64: existing.passwordBcryptBase64,
    discordWebhook,
    envConfig,
  });

  // Write config
  await shell("mkdir", ["-p", gatusConfigDir], { sudo: true });
  await shell("bash", [
    "-c",
    `cat > "${gatusConfigPath}" << 'GATUS_EOF'\n${config}GATUS_EOF`,
  ], { sudo: true });

  // Restart Gatus to pick up the new config
  const running = await isContainerRunning("gatus");
  if (running) {
    await composeDown(gatusComposePath).catch(() => {});
    await composeUp(gatusComposePath);
  }
}
