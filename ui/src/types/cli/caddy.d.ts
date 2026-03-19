export function getDuckDnsDomain(
	envConfig: Record<string, string | undefined>,
): string | null;
export function regenerateCaddyfile(
	envConfig: Record<string, string | undefined>,
): Promise<void>;
