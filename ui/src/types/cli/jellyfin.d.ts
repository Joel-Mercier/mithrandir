export interface StartupConfigurationDto {
	ServerName?: string | null;
	UICulture?: string | null;
	MetadataCountryCode?: string | null;
	PreferredMetadataLanguage?: string | null;
}

export interface StartupUserDto {
	Name?: string | null;
	Password?: string | null;
}

export interface StartupRemoteAccessDto {
	EnableRemoteAccess: boolean;
	EnableAutomaticPortMapping: boolean;
}

export interface AuthenticationResult {
	User?: UserDto | null;
	AccessToken?: string | null;
	ServerId?: string | null;
}

export interface UserDto {
	Name?: string | null;
	Id: string;
	HasPassword?: boolean;
}

export interface PublicSystemInfo {
	LocalAddress?: string | null;
	ServerName?: string | null;
	Version?: string | null;
	Id?: string | null;
	StartupWizardCompleted?: boolean | null;
}

export type CollectionTypeOptions = "movies" | "tvshows" | "music" | "musicvideos" | "homevideos" | "boxsets" | "books" | "mixed";

export interface VirtualFolderDto {
	name: string;
	collectionType: CollectionTypeOptions;
	paths: string[];
	refreshLibrary?: boolean;
}

export interface JellyfinClientOptions {
	baseUrl?: string;
	apiKey?: string;
}

export function getJellyfinApiKey(
	baseUrl: string,
	username: string,
	password: string,
	appName?: string,
): Promise<string | null>;

export function createJellyfinClient(options?: JellyfinClientOptions): {
	system: {
		getPublicInfo(): Promise<PublicSystemInfo>;
	};
	startup: {
		getConfiguration(): Promise<StartupConfigurationDto>;
		updateConfiguration(dto: StartupConfigurationDto): Promise<void>;
		getFirstUser(): Promise<StartupUserDto>;
		updateUser(dto: StartupUserDto): Promise<void>;
		setRemoteAccess(dto: StartupRemoteAccessDto): Promise<void>;
		complete(): Promise<void>;
	};
	users: {
		authenticateByName(username: string, password: string): Promise<AuthenticationResult>;
		getAll(): Promise<UserDto[]>;
	};
	library: {
		addVirtualFolder(resource: VirtualFolderDto): Promise<void>;
	};
};

export type JellyfinClient = ReturnType<typeof createJellyfinClient>;
