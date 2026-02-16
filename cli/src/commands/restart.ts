import { existsSync } from "fs";
import { getApp, getAppNames, getContainerName, getComposePath } from "../lib/apps.js";
import { isContainerRunning, composeDown, composeUp } from "../lib/docker.js";
import { loadEnvConfig } from "../lib/config.js";

export async function runRestart(args: string[]): Promise<void> {
  const appName = args[0];

  if (!appName) {
    console.error(
      `Usage: mithrandir restart <app>\nAvailable apps: ${getAppNames().join(", ")}`,
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

  const env = await loadEnvConfig();
  const composePath = getComposePath(app, env.BASE_DIR);

  if (!existsSync(composePath)) {
    console.error(`App '${appName}' is not installed (no docker-compose.yml found).`);
    process.exit(1);
  }

  const containerName = getContainerName(app);
  if (!(await isContainerRunning(containerName))) {
    console.error(`Container '${containerName}' is not running. Use 'start' instead.`);
    process.exit(1);
  }

  console.log(`Restarting ${appName}...`);
  await composeDown(composePath);
  await composeUp(composePath);
  console.log(`${appName} restarted successfully.`);
}
