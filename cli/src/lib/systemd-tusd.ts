import { writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { shell } from "@/lib/shell.js";

const SERVICE_NAME = "mithrandir-tusd";
const TUSD_PORT = 1080;

export { TUSD_PORT };

function getServicePath(): string {
  return `/etc/systemd/system/${SERVICE_NAME}.service`;
}

/** Generate the systemd service unit content for tusd */
export function generateTusdServiceUnit(repoRoot: string, uploadDir: string): string {
  return `[Unit]
Description=Mithrandir tusd Upload Server
After=network.target
Before=mithrandir-ui.service

[Service]
Type=simple
ExecStart=${repoRoot}/ui/.tusd/tusd \\
  -upload-dir ${uploadDir} \\
  -port ${TUSD_PORT} \\
  -base-path /api/media/upload/tus \\
  -hooks-http http://localhost:4180/api/media/upload/hooks \\
  -hooks-http-forward-headers Cookie,Authorization \\
  -hooks-enabled-events pre-create,post-finish \\
  -behind-proxy \\
  -network-timeout 0s
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
`;
}

/** Install and start the tusd systemd service */
export async function installTusdService(repoRoot: string, uploadDir: string): Promise<void> {
  const servicePath = getServicePath();
  const content = generateTusdServiceUnit(repoRoot, uploadDir);

  const tmpFile = join(tmpdir(), `${SERVICE_NAME}.service.tmp`);
  writeFileSync(tmpFile, content);

  await shell("mv", [tmpFile, servicePath], { sudo: true });
  await shell("chmod", ["644", servicePath], { sudo: true });

  await shell("systemctl", ["daemon-reload"], { sudo: true });
  await shell("systemctl", ["enable", "--now", SERVICE_NAME], { sudo: true });
}

/** Stop and remove the tusd systemd service */
export async function removeTusdService(): Promise<void> {
  const servicePath = getServicePath();

  await shell("systemctl", ["disable", "--now", SERVICE_NAME], {
    sudo: true,
    ignoreError: true,
  });
  await shell("rm", ["-f", servicePath], { sudo: true });
  await shell("systemctl", ["daemon-reload"], { sudo: true });
}

/** Check if the tusd service is currently running */
export async function isTusdServiceActive(): Promise<boolean> {
  const result = await shell(
    "systemctl",
    ["is-active", SERVICE_NAME],
    { sudo: true, ignoreError: true },
  );
  return result.stdout.trim() === "active";
}
