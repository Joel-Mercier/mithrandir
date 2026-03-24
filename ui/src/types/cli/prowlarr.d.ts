export interface Field {
	order: number;
	name: string | null;
	label: string | null;
	value?: unknown;
	type?: string | null;
	[key: string]: unknown;
}

export interface ProviderMessage {
	message: string | null;
	type: "info" | "warning" | "error";
}

export type ApplicationSyncLevel = "disabled" | "addOnly" | "fullSync";

export interface ApplicationResource {
	id?: number;
	name?: string | null;
	fields?: Field[] | null;
	implementationName?: string | null;
	implementation?: string | null;
	configContract?: string | null;
	syncLevel: ApplicationSyncLevel;
	[key: string]: unknown;
}

export interface HostConfigResource {
	id?: number;
	authenticationMethod?: "none" | "basic" | "forms" | "external";
	username?: string | null;
	password?: string | null;
	passwordConfirmation?: string | null;
	[key: string]: unknown;
}

export interface ProwlarrClientOptions {
	baseUrl?: string;
	apiKey: string;
}

export function getProwlarrApiKey(baseDir: string): Promise<string | null>;

export function createProwlarrClient(options: ProwlarrClientOptions): {
	application: {
		getAll(): Promise<ApplicationResource[]>;
		create(
			resource: ApplicationResource,
			forceSave?: boolean,
		): Promise<ApplicationResource>;
	};
	hostConfig: {
		get(): Promise<HostConfigResource>;
		update(
			id: number,
			resource: HostConfigResource,
		): Promise<HostConfigResource>;
	};
};

export type ProwlarrClient = ReturnType<typeof createProwlarrClient>;
