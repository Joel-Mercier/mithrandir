export interface Field {
	order: number;
	name: string | null;
	label: string | null;
	value?: unknown;
	[key: string]: unknown;
}

export interface DownloadClientResource {
	id?: number;
	name?: string | null;
	fields?: Field[] | null;
	implementation?: string | null;
	configContract?: string | null;
	protocol?: "unknown" | "usenet" | "torrent";
	enable?: boolean;
	priority?: number;
	removeCompletedDownloads?: boolean;
	removeFailedDownloads?: boolean;
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

export interface RootFolderResource {
	id?: number;
	path?: string | null;
	[key: string]: unknown;
}

export interface RadarrClientOptions {
	baseUrl?: string;
	apiKey: string;
}

export function getRadarrApiKey(baseDir: string): Promise<string | null>;

export function createRadarrClient(options: RadarrClientOptions): {
	hostConfig: {
		get(): Promise<HostConfigResource>;
		update(
			id: number,
			resource: HostConfigResource,
		): Promise<HostConfigResource>;
	};
	downloadClient: {
		create(resource: DownloadClientResource): Promise<DownloadClientResource>;
	};
	rootFolder: {
		getAll(): Promise<RootFolderResource[]>;
		create(resource: Partial<RootFolderResource>): Promise<RootFolderResource>;
	};
};

export type RadarrClient = ReturnType<typeof createRadarrClient>;
