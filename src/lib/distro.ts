import { shell } from "@/lib/shell.js";

export type SupportedDistro = "debian" | "ubuntu";

export interface DistroInfo {
  id: SupportedDistro;
  versionCodename: string;
  prettyName: string;
}

/** Detect the Linux distribution. Throws if unsupported. */
export async function detectDistro(): Promise<DistroInfo> {
  const { exitCode } = await shell("test", ["-f", "/etc/os-release"], {
    ignoreError: true,
  });

  if (exitCode !== 0) {
    throw new Error("Cannot detect distro: /etc/os-release not found");
  }

  const { stdout: id } = await shell("bash", [
    "-c",
    '. /etc/os-release && echo "$ID"',
  ]);
  const { stdout: codename } = await shell("bash", [
    "-c",
    '. /etc/os-release && echo "$VERSION_CODENAME"',
  ]);
  const { stdout: prettyName } = await shell("bash", [
    "-c",
    '. /etc/os-release && echo "$PRETTY_NAME"',
  ]);

  const distroId = id.trim().toLowerCase();
  if (distroId !== "debian" && distroId !== "ubuntu") {
    throw new Error(
      `Unsupported distro: ${distroId}. Only Debian and Ubuntu are supported.`,
    );
  }

  return {
    id: distroId as SupportedDistro,
    versionCodename: codename.trim(),
    prettyName: prettyName.trim(),
  };
}

/** Get the local IP address */
export async function getLocalIp(): Promise<string> {
  const result = await shell("bash", [
    "-c",
    "ip route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}'",
  ], { ignoreError: true });

  return result.stdout.trim() || "localhost";
}
