import type { AppDefinition } from "./apps";

export function getDuckDnsDomain(
	envConfig: Record<string, string | undefined>,
): string | null;
export function generateCaddyfile(
	installedApps: AppDefinition[],
	envConfig: Record<string, string | undefined>,
	options?: { includeDocs?: boolean; includeUi?: boolean },
): string;
export function generateCaddyDockerfile(): string;
export function generate404Page(
	installedApps: AppDefinition[],
	envConfig: Record<string, string | undefined>,
	options?: { includeDocs?: boolean; includeUi?: boolean },
): string;
export function regenerateCaddyfile(
	envConfig: Record<string, string | undefined>,
): Promise<void>;
