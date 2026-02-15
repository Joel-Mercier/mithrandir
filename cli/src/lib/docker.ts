import { dirname } from "path";
import { shell, commandExists } from "./shell.js";
import { hasSystemd } from "./systemd.js";
import type { AppDefinition } from "../types.js";
import { getContainerName, getComposePath } from "./apps.js";

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
