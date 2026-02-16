import { execa } from "execa";
import { getApp, getContainerName, getAppNames } from "../lib/apps.js";

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

  const containerName = getContainerName(app);
  const dockerArgs = ["docker", "logs"];

  if (flags.follow) dockerArgs.push("--follow");
  if (flags.tail) dockerArgs.push("--tail", flags.tail);
  if (flags.since) dockerArgs.push("--since", flags.since);

  dockerArgs.push(containerName);

  try {
    await execa("sudo", dockerArgs, { stdio: "inherit" });
  } catch (error: any) {
    // Exit code 130 = SIGINT (Ctrl+C) — exit cleanly
    if (error.exitCode === 130 || error.signal === "SIGINT") {
      process.exit(0);
    }
    throw error;
  }
}
