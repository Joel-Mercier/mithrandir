export interface JellyfinLoginInput {
	username: string;
	password: string;
	hostname?: string;
	port?: number;
	useSsl?: boolean;
	urlBase?: string;
	email?: string;
	serverType?: number;
}

export interface UserDto {
	id: number;
	email: string;
	username?: string | null;
	userType: number;
	permissions: number;
	createdAt: string;
	updatedAt: string;
}

export interface JellyfinLibrary {
	id: string;
	name: string;
	enabled: boolean;
}

export interface JellyfinSettings {
	name?: string | null;
	hostname?: string | null;
	adminUser?: string | null;
	adminPass?: string | null;
	libraries?: JellyfinLibrary[];
	serverID?: string | null;
}

export interface JellyfinUserRecord {
	username: string;
	id: string;
	thumb?: string;
	email?: string;
}

export interface RadarrSettings {
	id?: number;
	name: string;
	hostname: string;
	port: number;
	apiKey: string;
	useSsl: boolean;
	activeProfileId: number;
	activeProfileName: string;
	activeDirectory: string;
	is4k: boolean;
	minimumAvailability: string;
	isDefault: boolean;
	[key: string]: unknown;
}

export interface SonarrSettings {
	id?: number;
	name: string;
	hostname: string;
	port: number;
	apiKey: string;
	useSsl: boolean;
	activeProfileId: number;
	activeProfileName: string;
	activeDirectory: string;
	is4k: boolean;
	enableSeasonFolders: boolean;
	isDefault: boolean;
	[key: string]: unknown;
}

export interface SeerrClientOptions {
	baseUrl?: string;
	apiKey: string;
}

export function getSeerrApiKey(baseDir: string): Promise<string | null>;

export function createSeerrClient(options: SeerrClientOptions): {
	auth: {
		loginJellyfin(input: JellyfinLoginInput): Promise<UserDto>;
		me(): Promise<UserDto>;
	};
	jellyfinSettings: {
		get(): Promise<JellyfinSettings>;
		update(settings: JellyfinSettings): Promise<JellyfinSettings>;
		getLibraries(params?: { sync?: boolean; enable?: string }): Promise<JellyfinLibrary[]>;
		getJellyfinUsers(): Promise<JellyfinUserRecord[]>;
	};
	radarr: {
		getAll(): Promise<RadarrSettings[]>;
		create(settings: Omit<RadarrSettings, "id">): Promise<RadarrSettings>;
	};
	sonarr: {
		getAll(): Promise<SonarrSettings[]>;
		create(settings: Omit<SonarrSettings, "id">): Promise<SonarrSettings>;
	};
	users: {
		importFromJellyfin(jellyfinUserIds?: string[]): Promise<UserDto[]>;
	};
};

export type SeerrClient = ReturnType<typeof createSeerrClient>;
