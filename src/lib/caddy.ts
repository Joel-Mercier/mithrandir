import { existsSync } from "fs";
import { APP_REGISTRY, getComposePath } from "@/lib/apps.js";
import { shell } from "@/lib/shell.js";
import type { AppDefinition, EnvConfig } from "@/types.js";

/**
 * Derive the primary DuckDNS domain from DUCKDNS_SUBDOMAINS.
 * e.g. "mylab" → "mylab.duckdns.org", "mylab,other" → "mylab.duckdns.org"
 */
export function getDuckDnsDomain(envConfig: EnvConfig): string | null {
  const subs = envConfig.DUCKDNS_SUBDOMAINS;
  if (!subs) return null;
  const primary = subs.split(",")[0].trim();
  if (!primary) return null;
  return `${primary}.duckdns.org`;
}

/**
 * Generate a Caddyfile for wildcard HTTPS reverse proxy via DuckDNS DNS-01 challenge.
 * Only apps that have a port and are currently installed get a reverse_proxy block.
 */
export function generateCaddyfile(
  installedApps: AppDefinition[],
  envConfig: EnvConfig,
): string {
  const domain = getDuckDnsDomain(envConfig);
  if (!domain) throw new Error("DUCKDNS_SUBDOMAINS is not set — cannot generate Caddyfile");

  const lines: string[] = [];

  // Global options
  lines.push("{");
  if (envConfig.ACME_EMAIL) {
    lines.push(`    email {env.ACME_EMAIL}`);
  }
  lines.push("    acme_dns duckdns {env.DUCKDNS_TOKEN}");
  lines.push("}");
  lines.push("");

  // Wildcard block
  lines.push(`*.${domain} {`);
  lines.push("    tls {");
  lines.push("        dns duckdns {env.DUCKDNS_TOKEN}");
  lines.push("    }");

  // One matcher + handle block per app that has a port
  const proxyApps = installedApps.filter(
    (app) => app.port !== null && app.name !== "caddy",
  );
  for (const app of proxyApps) {
    lines.push("");
    lines.push(`    @${app.name} host ${app.name}.${domain}`);
    lines.push(`    handle @${app.name} {`);
    lines.push(`        reverse_proxy localhost:${app.port}`);
    lines.push("    }");
  }

  // Fallback
  lines.push("");
  lines.push("    handle {");
  lines.push('        respond "Not Found" 404');
  lines.push("    }");
  lines.push("}");
  lines.push("");

  return lines.join("\n");
}

/**
 * Generate a Dockerfile that builds Caddy with the DuckDNS DNS module
 * and includes dnsmasq for local wildcard DNS resolution.
 */
export function generateCaddyDockerfile(): string {
  return [
    "FROM caddy:builder AS builder",
    "RUN xcaddy build --with github.com/caddy-dns/duckdns",
    "",
    "FROM caddy:latest",
    "COPY --from=builder /usr/bin/caddy /usr/bin/caddy",
    "RUN apk add --no-cache dnsmasq",
    "",
  ].join("\n");
}

/**
 * Generate dnsmasq config that resolves *.domain to the server's LAN IP
 * and forwards everything else to upstream DNS.
 */
export function generateDnsmasqConfig(domain: string, lanIp: string): string {
  return [
    `# Wildcard DNS for Caddy HTTPS reverse proxy`,
    `# Resolves *.${domain} to this server's LAN IP`,
    `address=/${domain}/${lanIp}`,
    ``,
    `# Forward all other queries to upstream DNS`,
    `server=1.1.1.1`,
    `server=1.0.0.1`,
    ``,
  ].join("\n");
}

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
 * Regenerate the Caddyfile from currently installed apps and reload Caddy.
 * Called after app install/uninstall when HTTPS is enabled.
 */
export async function regenerateCaddyfile(
  envConfig: EnvConfig,
): Promise<void> {
  if (envConfig.ENABLE_HTTPS !== "true" || !getDuckDnsDomain(envConfig)) return;

  const baseDir = envConfig.BASE_DIR;
  const installedApps = detectInstalledApps(baseDir);
  const caddyfile = generateCaddyfile(installedApps, envConfig);

  const caddyDir = `${baseDir}/caddy`;
  await Bun.write(`${caddyDir}/Caddyfile`, caddyfile);

  // Reload Caddy (graceful config reload via docker exec)
  await shell("docker", ["exec", "caddy", "caddy", "reload", "--config", "/etc/caddy/Caddyfile"], {
    sudo: true,
    ignoreError: true,
  });
}
