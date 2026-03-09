import { execa } from "execa";
import { getApp, getAllContainerNames, getAppNames } from "@/lib/apps.js";
import { dockerNeedsSudo } from "@/lib/shell.js";

export async function runLog(
  args: string[],
  flags: { follow?: boolean; tail?: string; since?: string },
): Promise<void> {
  const appName = args[0];

  if (!appName) {
    console.error(
      `Usage: mithrandir log <app> [--follow] [--tail N] [--since TIME]\nAvailable apps: ${getAppNames().join(", ")}`,
    );
    process.exit(1);
  }

  const app = getApp(appName);
  if (!app) {
    console.error(
      `Unknown app: ${appName}\nAvailable apps: ${getAppNames().join(", ")}`,
    );
    process.exit(1);
  }

  const containers = getAllContainerNames(app);
  const useSudo = await dockerNeedsSudo();

  const dockerArgs = useSudo ? ["docker", "logs"] : ["logs"];

  if (flags.follow) dockerArgs.push("--follow");
  if (flags.tail) dockerArgs.push("--tail", flags.tail);
  if (flags.since) dockerArgs.push("--since", flags.since);

  // Single-container app: show logs directly
  if (containers.length === 1) {
    try {
      await execa(useSudo ? "sudo" : "docker", [...dockerArgs, containers[0]], { stdio: "inherit" });
    } catch (error: any) {
      if (error.exitCode === 130 || error.signal === "SIGINT") {
        process.exit(0);
      }
      throw error;
    }
    return;
  }

  // Multi-container app: show logs for each container sequentially
  for (const container of containers) {
    const separator = `\n${"─".repeat(60)}\n  ${container}\n${"─".repeat(60)}\n`;
    process.stdout.write(separator);
    try {
      await execa(useSudo ? "sudo" : "docker", [...dockerArgs, container], { stdio: "inherit" });
    } catch (error: any) {
      if (error.exitCode === 130 || error.signal === "SIGINT") {
        process.exit(0);
      }
      // Container might not be running — show error and continue to next
      if (error.exitCode === 1) {
        console.error(`  (no logs available)`);
        continue;
      }
      throw error;
    }
  }
}
