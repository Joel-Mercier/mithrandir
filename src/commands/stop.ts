import { getApp, getAppNames, getContainerName, getComposePath } from "@/lib/apps.js";
import { isContainerRunning, composeDown } from "@/lib/docker.js";
import { loadEnvConfig } from "@/lib/config.js";

export async function runStop(args: string[]): Promise<void> {
  const appName = args[0];

  if (!appName) {
    console.error(
      `Usage: mithrandir stop <app>\nAvailable apps: ${getAppNames().join(", ")}`,
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
  if (!(await isContainerRunning(containerName))) {
    console.log(`Container '${containerName}' is not running.`);
    return;
  }

  const env = await loadEnvConfig();
  const composePath = getComposePath(app, env.BASE_DIR);

  console.log(`Stopping ${appName}...`);
  await composeDown(composePath);
  console.log(`${appName} stopped successfully.`);
}
