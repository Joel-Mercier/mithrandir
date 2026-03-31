import { existsSync } from "fs";
import { APP_REGISTRY, getComposePath } from "@/lib/apps.js";
import { PIHOLE_HTTPS_PORT } from "@/lib/compose.js";
import { isContainerRunning } from "@/lib/docker.js";
import { isUiServiceActive } from "@/lib/systemd-ui.js";
import { TUSD_PORT } from "@/lib/systemd-tusd.js";
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
  options?: { includeDocs?: boolean; includeUi?: boolean },
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
  lines.push("        key_type rsa2048");
  lines.push("    }");

  // One matcher + handle block per app that has a port
  const proxyApps = installedApps.filter(
    (app) => app.port !== null && app.name !== "caddy",
  );
  for (const app of proxyApps) {
    lines.push("");
    // Pi-hole's host port is remapped when Caddy owns port 80
    const proxyPort = app.name === "pihole" ? PIHOLE_HTTPS_PORT : app.port;
    lines.push(`    @${app.name} host ${app.name}.${domain}`);
    lines.push(`    handle @${app.name} {`);
    lines.push(`        reverse_proxy localhost:${proxyPort}`);
    lines.push("    }");

    // Extra subdomains (e.g. adventurelog-api for the backend)
    if (app.caddyExtraSubdomains) {
      for (const extra of app.caddyExtraSubdomains) {
        lines.push("");
        lines.push(`    @${extra.subdomain} host ${extra.subdomain}.${domain}`);
        lines.push(`    handle @${extra.subdomain} {`);
        lines.push(`        reverse_proxy localhost:${extra.port}`);
        lines.push("    }");
      }
    }
  }

  // Docs site (not in app registry, managed separately)
  if (options?.includeDocs) {
    lines.push("");
    lines.push(`    @mithrandir-docs host mithrandir-docs.${domain}`);
    lines.push("    handle @mithrandir-docs {");
    lines.push("        reverse_proxy localhost:4173");
    lines.push("    }");
  }

  // UI dashboard (not in app registry, managed separately)
  if (options?.includeUi) {
    lines.push("");
    lines.push(`    @mithrandir host mithrandir.${domain}`);
    lines.push("    handle @mithrandir {");
    // Route tus uploads directly to tusd for performance
    lines.push("        handle /api/media/upload/tus/* {");
    lines.push(`            reverse_proxy localhost:${TUSD_PORT}`);
    lines.push("        }");
    lines.push("        reverse_proxy localhost:4180");
    lines.push("    }");
  }

  // Fallback — serve custom 404 page
  lines.push("");
  lines.push("    handle {");
  lines.push("        root * /srv");
  lines.push("        rewrite * /404.html");
  lines.push("        file_server");
  lines.push("    }");
  lines.push("}");
  lines.push("");

  return lines.join("\n");
}

/**
 * Generate a styled 404 HTML page with links to all installed apps.
 */
export function generate404Page(
  installedApps: AppDefinition[],
  envConfig: EnvConfig,
  options?: { includeDocs?: boolean; includeUi?: boolean },
): string {
  const domain = getDuckDnsDomain(envConfig);
  if (!domain) throw new Error("DUCKDNS_SUBDOMAINS is not set");

  const proxyApps = installedApps.filter(
    (app) => app.port !== null && !app.hidden,
  );

  const appLinks = proxyApps
    .map((app) => {
      const label = app.displayName ?? app.name.charAt(0).toUpperCase() + app.name.slice(1);
      return `      <a href="https://${app.name}.${domain}">${label}</a>`;
    })
    .join("\n");

  const uiLink = options?.includeUi
    ? `\n      <a href="https://mithrandir.${domain}">Dashboard</a>`
    : "";
  const docsLink = options?.includeDocs
    ? `\n      <a href="https://mithrandir-docs.${domain}">Docs</a>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>404 - Not Found</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container { text-align: center; max-width: 480px; padding: 2rem; }
    .code {
      font-size: 6rem;
      font-weight: 800;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1;
    }
    .message { font-size: 1.25rem; color: #94a3b8; margin: 0.75rem 0 2rem; }
    h2 { font-size: 0.875rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem; }
    .apps { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; }
    .apps a {
      display: inline-block;
      padding: 0.5rem 1rem;
      background: #1e293b;
      color: #93c5fd;
      text-decoration: none;
      border-radius: 0.5rem;
      border: 1px solid #334155;
      font-size: 0.875rem;
      transition: background 0.15s, border-color 0.15s;
    }
    .apps a:hover { background: #334155; border-color: #3b82f6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="code">404</div>
    <p class="message">This subdomain doesn't exist.</p>
    <h2>Available Services</h2>
    <div class="apps">
${appLinks}${uiLink}${docsLink}
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Generate a Dockerfile that builds Caddy with the DuckDNS DNS module.
 */
export function generateCaddyDockerfile(): string {
  return [
    "FROM caddy:builder AS builder",
    "RUN xcaddy build --with github.com/caddy-dns/duckdns",
    "",
    "FROM caddy:latest",
    "COPY --from=builder /usr/bin/caddy /usr/bin/caddy",
    "",
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
  const includeDocs = await isContainerRunning("mithrandir-docs");
  const includeUi = await isUiServiceActive();
  const caddyfile = generateCaddyfile(installedApps, envConfig, { includeDocs, includeUi });

  const caddyDir = `${baseDir}/caddy`;
  const caddyfilePath = `${caddyDir}/Caddyfile`;
  await shell("bash", ["-c", `cat > "${caddyfilePath}" << 'CADDYFILE_EOF'\n${caddyfile}CADDYFILE_EOF`], {
    sudo: true,
  });

  // Write the 404 page
  const notFoundHtml = generate404Page(installedApps, envConfig, { includeDocs, includeUi });
  const srvDir = `${caddyDir}/srv`;
  await shell("mkdir", ["-p", srvDir], { sudo: true });
  await shell("bash", ["-c", `cat > "${srvDir}/404.html" << 'HTML_EOF'\n${notFoundHtml}HTML_EOF`], {
    sudo: true,
  });

  // Reload Caddy (graceful config reload via docker exec)
  const reload = await shell("docker", ["exec", "caddy", "caddy", "reload", "--config", "/etc/caddy/Caddyfile"], {
    sudo: true,
    ignoreError: true,
  });
  if ((reload.exitCode ?? 0) !== 0) {
    console.warn(`Warning: Caddy reload failed: ${reload.stderr?.trim() || "unknown error"}`);
  }
}
