import type { AppDefinition } from "./apps";

export const PIHOLE_HTTPS_PORT: number;

export function generateCompose(
	app: AppDefinition,
	envConfig: Record<string, string | undefined>,
): string;

export function generateGatusExtraHosts(
	installedApps: AppDefinition[],
	localIp: string,
	envConfig: Record<string, string | undefined>,
): string[];
