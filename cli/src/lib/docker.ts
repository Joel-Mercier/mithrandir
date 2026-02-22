import { dirname } from "path";
import { shell, commandExists } from "@/lib/shell.js";
import { hasSystemd } from "@/lib/systemd.js";
import type { AppDefinition } from "@/types.js";
import { getContainerName, getComposePath } from "@/lib/apps.js";

/** Check if Docker is installed */
export async function isDockerInstalled(): Promise<boolean> {
  return commandExists("docker");
}

/** Check if Docker daemon is running, with retries */
export async function waitForDocker(
  maxRetries = 30,
  intervalMs = 1000,
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    const result = await shell("docker", ["info"], {
      sudo: true,
      ignoreError: true,
    });
    if (result.exitCode === 0) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

/** Install Docker via apt */
export async function installDocker(): Promise<void> {
  // Remove old packages
  await shell(
    "apt-get",
    [
      "remove",
      "-y",
      "docker.io",
      "docker-doc",
      "docker-compose",
      "podman-docker",
      "containerd",
      "runc",
    ],
    { sudo: true, ignoreError: true },
  );

  // Install prerequisites
  await shell(
    "apt-get",
    ["install", "-y", "ca-certificates", "curl"],
    { sudo: true },
  );

  // Add Docker GPG key and repo
  await shell("install", ["-m", "0755", "-d", "/etc/apt/keyrings"], {
    sudo: true,
  });

  // Detect distro for the correct repo URL
  const { stdout: distroId } = await shell("bash", [
    "-c",
    '. /etc/os-release && echo "$ID"',
  ]);
  const { stdout: versionCodename } = await shell("bash", [
    "-c",
    '. /etc/os-release && echo "$VERSION_CODENAME"',
  ]);
  const distro = distroId.trim();
  const codename = versionCodename.trim();

  await shell("bash", [
    "-c",
    `curl -fsSL https://download.docker.com/linux/${distro}/gpg -o /etc/apt/keyrings/docker.asc`,
  ], { sudo: true });
  await shell("chmod", ["a+r", "/etc/apt/keyrings/docker.asc"], {
    sudo: true,
  });

  const arch = (
    await shell("dpkg", ["--print-architecture"])
  ).stdout.trim();
  const repoLine = `deb [arch=${arch} signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/${distro} ${codename} stable`;
  await shell("bash", [
    "-c",
    `echo "${repoLine}" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null`,
  ]);

  await shell("apt-get", ["update", "-qq"], { sudo: true });
  await shell(
    "apt-get",
    ["install", "-y", "docker-ce", "docker-ce-cli", "containerd.io", "docker-buildx-plugin", "docker-compose-plugin"],
    { sudo: true },
  );

  // Configure Docker to use /24 subnets instead of /16 to avoid
  // "all predefined address pools have been fully subnetted" with many apps
  await shell("bash", [
    "-c",
    `mkdir -p /etc/docker && cat > /etc/docker/daemon.json << 'ENDJSON'
{
  "default-address-pools": [
    { "base": "172.17.0.0/12", "size": 24 }
  ]
}
ENDJSON`,
  ], { sudo: true });

  // Start Docker daemon
  if (await hasSystemd()) {
    await shell("systemctl", ["enable", "docker"], { sudo: true });
    await shell("systemctl", ["enable", "containerd"], { sudo: true });
    await shell("systemctl", ["start", "containerd"], { sudo: true });
    await shell("systemctl", ["start", "docker"], { sudo: true });
  } else {
    // WSL or non-systemd: start dockerd manually if not already running
    const pgrep = await shell("bash", ["-c", "pgrep -x dockerd"], {
      ignoreError: true,
    });
    if (pgrep.exitCode !== 0) {
      await shell("bash", ["-c", "dockerd > /var/log/dockerd.log 2>&1 &"], {
        sudo: true,
      });
    }
  }
}

/** Check if a container is running */
export async function isContainerRunning(
  containerName: string,
): Promise<boolean> {
  const result = await shell(
    "docker",
    ["ps", "-q", "-f", `name=^${containerName}$`],
    { sudo: true, ignoreError: true },
  );
  return result.stdout.trim().length > 0;
}

/** Check if a container exists (running or stopped) */
export async function containerExists(
  containerName: string,
): Promise<boolean> {
  const result = await shell(
    "docker",
    ["ps", "-aq", "-f", `name=^${containerName}$`],
    { sudo: true, ignoreError: true },
  );
  return result.stdout.trim().length > 0;
}

/** Get the image ID of a running container */
export async function getRunningImageId(
  containerName: string,
): Promise<string> {
  const result = await shell(
    "docker",
    ["inspect", "--format", "{{.Image}}", containerName],
    { sudo: true, ignoreError: true },
  );
  return result.stdout.trim();
}

/** Pull an image and return its ID */
export async function pullImage(image: string): Promise<string> {
  await shell("docker", ["pull", image], { sudo: true });
  const result = await shell(
    "docker",
    ["inspect", "--format", "{{.Id}}", image],
    { sudo: true },
  );
  return result.stdout.trim();
}

/**
 * Pull an image with progress tracking.
 * Calls onProgress(percent) as layers download/extract.
 * Returns the image ID when done.
 */
export async function pullImageWithProgress(
  image: string,
  onProgress: (percent: number) => void,
): Promise<string> {
  const { execa } = await import("execa");

  const proc = execa("sudo", ["docker", "pull", image], {
    stdout: "pipe",
    stderr: "pipe",
    reject: false,
  });

  // Track per-layer progress
  const layers = new Map<string, { current: number; total: number }>();
  let buffer = "";

  // Docker pull writes progress to stderr using \r for in-place line updates
  proc.stderr?.on("data", (chunk: Buffer) => {
    buffer += chunk.toString();
    // Split on both \r and \n since Docker uses \r for progress updates
    const lines = buffer.split(/\r?\n|\r/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      // Match: "<id>: Downloading [====>    ]  1.23MB/4.56MB"
      // Match: "<id>: Extracting [====>    ]  1.23MB/4.56MB"
      const match = line.match(
        /^([a-f0-9]+):\s+(?:Downloading|Extracting)\s+\[.*?\]\s+([0-9.]+[a-zA-Z]*B?)\/([0-9.]+[a-zA-Z]*B?)/,
      );
      if (match) {
        const [, id, currentStr, totalStr] = match;
        const current = parseSize(currentStr);
        const total = parseSize(totalStr);
        if (total > 0) {
          layers.set(id, { current, total });
        }
      }

      // Match: "<id>: Pull complete" or "<id>: Already exists"
      const completeMatch = line.match(
        /^([a-f0-9]+):\s+(?:Pull complete|Already exists)/,
      );
      if (completeMatch) {
        const id = completeMatch[1];
        const existing = layers.get(id);
        if (existing) {
          layers.set(id, { current: existing.total, total: existing.total });
        } else {
          layers.set(id, { current: 1, total: 1 });
        }
      }

      // Calculate overall progress
      if (layers.size > 0) {
        let totalBytes = 0;
        let currentBytes = 0;
        for (const { current, total } of layers.values()) {
          totalBytes += total;
          currentBytes += current;
        }
        if (totalBytes > 0) {
          onProgress(Math.min(99, Math.round((currentBytes / totalBytes) * 100)));
        }
      }
    }
  });

  const result = await proc;
  if ((result.exitCode ?? 0) !== 0) {
    throw new Error(
      `docker pull failed: ${result.stderr?.trim() || result.stdout?.trim() || "unknown error"}`,
    );
  }

  onProgress(100);

  const inspectResult = await shell(
    "docker",
    ["inspect", "--format", "{{.Id}}", image],
    { sudo: true },
  );
  return inspectResult.stdout.trim();
}

/** Parse Docker size strings like "1.23MB", "456kB", "789B" to bytes */
function parseSize(s: string): number {
  const match = s.match(/^([0-9.]+)\s*([a-zA-Z]*)/);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (unit === "GB") return num * 1024 * 1024 * 1024;
  if (unit === "MB") return num * 1024 * 1024;
  if (unit === "KB") return num * 1024;
  return num;
}

/** Start a container using docker compose (runs from app dir, matching setup.sh) */
export async function composeUp(
  composePath: string,
): Promise<void> {
  await shell(
    "docker",
    ["compose", "up", "-d"],
    { sudo: true, cwd: dirname(composePath) },
  );
}

/** Stop a container using docker compose (runs from app dir, matching setup.sh) */
export async function composeDown(
  composePath: string,
): Promise<void> {
  await shell(
    "docker",
    ["compose", "down"],
    { sudo: true, cwd: dirname(composePath) },
  );
}

/** Stop a container by name */
export async function stopContainer(containerName: string): Promise<void> {
  const running = await isContainerRunning(containerName);
  if (running) {
    await shell("docker", ["stop", containerName], { sudo: true });
  }
}

/** Start a container from an app definition */
export async function startApp(
  app: AppDefinition,
  baseDir: string,
): Promise<void> {
  const composePath = getComposePath(app, baseDir);
  await composeUp(composePath);
}

/** Stop a container from an app definition */
export async function stopApp(
  app: AppDefinition,
): Promise<void> {
  const containerName = getContainerName(app);
  await stopContainer(containerName);
}

/** Remove a container and optionally its volumes */
export async function removeContainer(
  containerName: string,
): Promise<void> {
  await shell("docker", ["rm", "-f", containerName], {
    sudo: true,
    ignoreError: true,
  });
}
