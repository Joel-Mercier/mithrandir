import { writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { shell } from "@/lib/shell.js";

const SERVICE_NAME = "homelab-backup";

interface SystemdPaths {
  service: string;
  timer: string;
}

function getPaths(): SystemdPaths {
  return {
    service: `/etc/systemd/system/${SERVICE_NAME}.service`,
    timer: `/etc/systemd/system/${SERVICE_NAME}.timer`,
  };
}

/** Generate the systemd service unit content */
export function generateServiceUnit(): string {
  return `[Unit]
Description=Mithrandir Backup Service
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/mithrandir backup
Environment="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin"
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
`;
}

/** Generate the systemd timer unit content */
export function generateTimerUnit(): string {
  return `[Unit]
Description=Mithrandir Backup Timer

[Timer]
OnCalendar=*-*-* 02:00:00
RandomizedDelaySec=1800
Persistent=true

[Install]
WantedBy=timers.target
`;
}

/** Install the systemd service and timer */
export async function installSystemdUnits(): Promise<void> {
  const paths = getPaths();

  const serviceContent = generateServiceUnit();
  const timerContent = generateTimerUnit();

  // Write unit files via temp files + sudo mv
  const tmpService = join(tmpdir(), `${SERVICE_NAME}.service.tmp`);
  const tmpTimer = join(tmpdir(), `${SERVICE_NAME}.timer.tmp`);
  writeFileSync(tmpService, serviceContent);
  writeFileSync(tmpTimer, timerContent);

  await shell("mv", [tmpService, paths.service], { sudo: true });
  await shell("mv", [tmpTimer, paths.timer], { sudo: true });
  await shell("chmod", ["644", paths.service, paths.timer], { sudo: true });

  // Reload and enable
  await shell("systemctl", ["daemon-reload"], { sudo: true });
  await shell("systemctl", ["enable", "--now", `${SERVICE_NAME}.timer`], {
    sudo: true,
  });
}

/** Remove the systemd service and timer */
export async function removeSystemdUnits(): Promise<void> {
  const paths = getPaths();

  await shell("systemctl", ["disable", "--now", `${SERVICE_NAME}.timer`], {
    sudo: true,
    ignoreError: true,
  });
  await shell("systemctl", ["disable", `${SERVICE_NAME}.service`], {
    sudo: true,
    ignoreError: true,
  });
  await shell("rm", ["-f", paths.service, paths.timer], { sudo: true });
  await shell("systemctl", ["daemon-reload"], { sudo: true });
}

/** Check if the timer is active */
export async function isTimerActive(): Promise<boolean> {
  const result = await shell(
    "systemctl",
    ["is-active", `${SERVICE_NAME}.timer`],
    { sudo: true, ignoreError: true },
  );
  return result.stdout.trim() === "active";
}

/** Check if systemd is available */
export async function hasSystemd(): Promise<boolean> {
  const result = await shell("test", ["-d", "/run/systemd/system"], {
    ignoreError: true,
  });
  if (result.exitCode !== 0) return false;

  const systemctl = await shell("which", ["systemctl"], { ignoreError: true });
  return systemctl.exitCode === 0;
}

/** Check if running in WSL */
export async function isWsl(): Promise<boolean> {
  const result = await shell("grep", ["-qi", "microsoft", "/proc/version"], {
    ignoreError: true,
  });
  return result.exitCode === 0;
}
