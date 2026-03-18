import { writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { shell } from "@/lib/shell.js";

const SERVICE_NAME = "mithrandir-ui";

function getServicePath(): string {
  return `/etc/systemd/system/${SERVICE_NAME}.service`;
}

/** Generate the systemd service unit content for the UI dashboard */
export function generateUiServiceUnit(repoRoot: string): string {
  return `[Unit]
Description=Mithrandir UI Dashboard
After=network.target docker.service
Wants=docker.service

[Service]
Type=simple
WorkingDirectory=${repoRoot}/ui
ExecStartPre=/usr/local/bin/bun run scripts/migrate.ts
ExecStart=/usr/local/bin/bun run .output/server/index.mjs
Environment="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin"
Environment="NODE_ENV=production"
Environment="NODE_PATH=${repoRoot}/node_modules"
Environment="PORT=4180"
EnvironmentFile=${repoRoot}/.env
EnvironmentFile=${repoRoot}/ui/.env.local
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
`;
}

/** Install and start the UI systemd service */
export async function installUiService(repoRoot: string): Promise<void> {
  const servicePath = getServicePath();
  const content = generateUiServiceUnit(repoRoot);

  const tmpFile = join(tmpdir(), `${SERVICE_NAME}.service.tmp`);
  writeFileSync(tmpFile, content);

  await shell("mv", [tmpFile, servicePath], { sudo: true });
  await shell("chmod", ["644", servicePath], { sudo: true });

  await shell("systemctl", ["daemon-reload"], { sudo: true });
  await shell("systemctl", ["enable", "--now", SERVICE_NAME], { sudo: true });
}

/** Stop and remove the UI systemd service */
export async function removeUiService(): Promise<void> {
  const servicePath = getServicePath();

  await shell("systemctl", ["disable", "--now", SERVICE_NAME], {
    sudo: true,
    ignoreError: true,
  });
  await shell("rm", ["-f", servicePath], { sudo: true });
  await shell("systemctl", ["daemon-reload"], { sudo: true });
}

/** Check if the UI service is currently running */
export async function isUiServiceActive(): Promise<boolean> {
  const result = await shell(
    "systemctl",
    ["is-active", SERVICE_NAME],
    { sudo: true, ignoreError: true },
  );
  return result.stdout.trim() === "active";
}

/** Restart the UI service */
export async function restartUiService(): Promise<void> {
  await shell("systemctl", ["restart", SERVICE_NAME], { sudo: true });
}
