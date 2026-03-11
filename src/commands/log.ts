import { execa } from "execa";
import { getApp, getContainerName, getAllContainerNames, getAppNames } from "@/lib/apps.js";
import { isContainerRunning } from "@/lib/docker.js";
import { dockerNeedsSudo } from "@/lib/shell.js";

/** Map container name → friendly service name (e.g. "adventurelog_backend" → "backend") */
function getServiceNames(appName: string, containers: string[]): Map<string, string> {
  const prefix = `${appName}_`;
  const map = new Map<string, string>();
  for (const c of containers) {
    const service = c.startsWith(prefix)
      ? c.slice(prefix.length).replace(/_/g, "-")
      : c;
    map.set(service, c);
  }
  return map;
}

export async function runLog(
  args: string[],
  flags: { follow?: boolean; tail?: string; since?: string },
): Promise<void> {
  const appName = args[0];

  if (!appName) {
    console.error(
      `Usage: mithrandir log <app> [service] [--follow] [--tail N] [--since TIME]\nAvailable apps: ${getAppNames().join(", ")}`,
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
  const serviceName = args[1];
  let targetContainer: string;

  if (containers.length > 1 && serviceName) {
    // Resolve service name to container name
    const serviceMap = getServiceNames(app.name, containers);
    const resolved = serviceMap.get(serviceName);
    if (!resolved) {
      const available = [...serviceMap.keys()].join(", ");
      console.error(
        `Unknown service "${serviceName}" for ${app.displayName}\nAvailable services: ${available}`,
      );
      process.exit(1);
    }
    targetContainer = resolved;
  } else if (containers.length > 1 && !serviceName) {
    // No service specified for multi-container app — show available services
    const serviceMap = getServiceNames(app.name, containers);
    const services = [...serviceMap.keys()];
    console.error(
      `${app.displayName} has multiple containers. Specify a service:\n\n` +
      services.map((s) => `  mithrandir log ${appName} ${s}`).join("\n") +
      "\n",
    );
    process.exit(1);
  } else {
    targetContainer = getContainerName(app);
  }

  if (!(await isContainerRunning(targetContainer))) {
    console.error(
      `Container '${targetContainer}' is not running.\nIs ${app.displayName} installed? Try: mithrandir install ${appName}`,
    );
    process.exit(1);
  }

  const useSudo = await dockerNeedsSudo();
  const dockerArgs = useSudo ? ["docker", "logs"] : ["logs"];

  if (flags.follow) dockerArgs.push("--follow");
  if (flags.tail) dockerArgs.push("--tail", flags.tail);
  if (flags.since) dockerArgs.push("--since", flags.since);

  dockerArgs.push(targetContainer);

  try {
    await execa(useSudo ? "sudo" : "docker", dockerArgs, { stdio: "inherit" });
  } catch (error: any) {
    if (error.exitCode === 130 || error.signal === "SIGINT") {
      process.exit(0);
    }
    console.error(`Failed to read logs for ${appName}: ${error.message}`);
    process.exit(1);
  }
}
