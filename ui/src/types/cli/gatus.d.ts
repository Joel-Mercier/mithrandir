import type { AppDefinition } from "./apps";

export function generateGatusConfig(
	installedApps: AppDefinition[],
	localIp: string,
	options: {
		username?: string;
		passwordBcryptBase64?: string;
		discordWebhook?: string;
		envConfig?: Record<string, string | undefined>;
	},
): string;

export function regenerateGatusConfig(
	envConfig: Record<string, string | undefined>,
): Promise<void>;
