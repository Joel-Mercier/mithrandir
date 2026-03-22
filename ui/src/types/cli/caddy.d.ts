export function getDuckDnsDomain(
	envConfig: Record<string, string | undefined>,
): string | null;
export function generateCaddyfile(
	envConfig: Record<string, string | undefined>,
): string;
export function generateCaddyDockerfile(): string;
export function generate404Page(): string;
export function regenerateCaddyfile(
	envConfig: Record<string, string | undefined>,
): Promise<void>;
