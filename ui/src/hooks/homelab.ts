import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchActivity } from "#/lib/server/activity";
import {
	fetchAppDetail,
	fetchApps,
	installApp,
	restartApp,
	startApp,
	stopApp,
	uninstallApp,
} from "#/lib/server/apps";
import {
	deleteBackup,
	fetchBackupHistory,
	fetchBackupStatus,
	triggerBackup,
	verifyBackup,
} from "#/lib/server/backup";
import { fetchCapacity } from "#/lib/server/capacity";
import { fetchMediaCategory, fetchMediaLibrary } from "#/lib/server/media";
import {
	autoSetupApp,
	checkSystemRequirements,
	completeSetup,
	fetchAppRegistry,
	fetchServiceUrls,
	fetchSetupStatus,
	generateSecret,
	installSetupApp,
	installSystemDep,
	resolveAppDependencies,
	resumeSetup,
	saveSetupSecrets,
	setupBackupTimer,
	setupBaseDir,
	setupFirewall,
	setupHttps,
	skipSetup,
} from "#/lib/server/setup";
import {
	addBackupRemote,
	checkFirewallPrerequisites,
	checkHttpsPrerequisites,
	checkRcloneInstalled,
	disableFirewall,
	disableHttps,
	enableFirewall,
	enableHttps,
	fetchConfig,
	fetchFirewallRules,
	fetchHealthChecks,
	fetchRemoteDetails,
	fetchResources,
	fetchSystemStatus,
	fetchVersion,
	removeBackupRemote,
	runDoctor,
	updateConfig,
} from "#/lib/server/system";
import {
	buildCli,
	buildUi,
	checkForUpdates,
	finalizeUpdate,
	installDeps,
	pingHealth,
	pullLatestChanges,
} from "#/lib/server/update";

export type { SetupStatus } from "#/lib/server/setup";

import type { SystemConfig } from "#/lib/types";

const keys = {
	apps: ["homelab", "apps"],
	appDetail: (name: string) => ["homelab", "apps", name],
	systemStatus: ["homelab", "system-status"],
	health: ["homelab", "health"],
	config: ["homelab", "config"],
	resources: ["homelab", "resources"],
	backupStatus: ["homelab", "backup", "status"],
	backupHistory: ["homelab", "backup", "history"],
	version: ["homelab", "version"],
	capacity: ["homelab", "capacity"],
	activity: ["homelab", "activity"],
	mediaLibrary: ["homelab", "media-library"],
	mediaCategory: (category: string, search?: string, sortBy?: string, sortDirection?: string) =>
		["homelab", "media-category", category, search ?? "", sortBy ?? "", sortDirection ?? ""],
	setupStatus: ["homelab", "setup-status"],
	systemRequirements: ["homelab", "setup", "system-requirements"],
	appRegistry: ["homelab", "setup", "app-registry"],
};

// ─── Query hooks ─────────────────────────────────────────────────────────────

export function useApps() {
	return useQuery({
		queryKey: keys.apps,
		queryFn: () => fetchApps(),
		refetchInterval: 30_000,
	});
}

export function useAppDetail(appName: string) {
	return useQuery({
		queryKey: keys.appDetail(appName),
		queryFn: () => fetchAppDetail({ data: { appName } }),
		refetchInterval: 10_000,
	});
}

export function useSystemStatus() {
	return useQuery({
		queryKey: keys.systemStatus,
		queryFn: () => fetchSystemStatus(),
		refetchInterval: 30_000,
	});
}

export function useHealthChecks() {
	return useQuery({
		queryKey: keys.health,
		queryFn: () => fetchHealthChecks(),
	});
}

export function useConfig() {
	return useQuery({
		queryKey: keys.config,
		queryFn: () => fetchConfig(),
	});
}

export function useResources() {
	return useQuery({
		queryKey: keys.resources,
		queryFn: () => fetchResources(),
		refetchInterval: 10_000,
	});
}

export function useBackupStatus() {
	return useQuery({
		queryKey: keys.backupStatus,
		queryFn: () => fetchBackupStatus(),
		refetchInterval: 60_000,
	});
}

export function useBackupHistory() {
	return useQuery({
		queryKey: keys.backupHistory,
		queryFn: () => fetchBackupHistory(),
	});
}

export function useVersion() {
	return useQuery({
		queryKey: keys.version,
		queryFn: () => fetchVersion(),
	});
}

export function useCapacity() {
	return useQuery({
		queryKey: keys.capacity,
		queryFn: () => fetchCapacity(),
		staleTime: 60_000,
	});
}

export function useActivity() {
	return useQuery({
		queryKey: keys.activity,
		queryFn: () => fetchActivity(),
	});
}

export function useMediaLibrary() {
	return useQuery({
		queryKey: keys.mediaLibrary,
		queryFn: () => fetchMediaLibrary(),
		staleTime: 60_000,
	});
}

export function useMediaCategory(
	category: string | null,
	options?: { search?: string; sortBy?: "name" | "size"; sortDirection?: "asc" | "desc" },
) {
	return useQuery({
		queryKey: keys.mediaCategory(
			category ?? "",
			options?.search,
			options?.sortBy,
			options?.sortDirection,
		),
		queryFn: () =>
			fetchMediaCategory({
				data: {
					category: category as string,
					search: options?.search,
					sortBy: options?.sortBy,
					sortDirection: options?.sortDirection,
				},
			}),
		enabled: !!category,
		staleTime: 60_000,
	});
}

// ─── Mutation hooks ──────────────────────────────────────────────────────────

export function useStartApp() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (appName: string) => startApp({ data: { appName } }),
		onSuccess: (_data, appName) => {
			queryClient.invalidateQueries({ queryKey: keys.apps });
			queryClient.invalidateQueries({ queryKey: keys.appDetail(appName) });
			queryClient.invalidateQueries({ queryKey: keys.systemStatus });
			queryClient.invalidateQueries({ queryKey: keys.activity });
		},
	});
}

export function useStopApp() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (appName: string) => stopApp({ data: { appName } }),
		onSuccess: (_data, appName) => {
			queryClient.invalidateQueries({ queryKey: keys.apps });
			queryClient.invalidateQueries({ queryKey: keys.appDetail(appName) });
			queryClient.invalidateQueries({ queryKey: keys.systemStatus });
			queryClient.invalidateQueries({ queryKey: keys.activity });
		},
	});
}

export function useRestartApp() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (appName: string) => restartApp({ data: { appName } }),
		onSuccess: (_data, appName) => {
			queryClient.invalidateQueries({ queryKey: keys.apps });
			queryClient.invalidateQueries({ queryKey: keys.appDetail(appName) });
			queryClient.invalidateQueries({ queryKey: keys.systemStatus });
			queryClient.invalidateQueries({ queryKey: keys.activity });
		},
	});
}

export function useInstallApp() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (appName: string) => installApp({ data: { appName } }),
		onSuccess: (_data, appName) => {
			queryClient.invalidateQueries({ queryKey: keys.apps });
			queryClient.invalidateQueries({ queryKey: keys.appDetail(appName) });
			queryClient.invalidateQueries({ queryKey: keys.systemStatus });
			queryClient.invalidateQueries({ queryKey: keys.activity });
		},
	});
}

export function useUninstallApp() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (params: { appName: string; eraseData?: boolean }) =>
			uninstallApp({ data: params }),
		onSuccess: (_data, params) => {
			queryClient.invalidateQueries({ queryKey: keys.apps });
			queryClient.invalidateQueries({
				queryKey: keys.appDetail(params.appName),
			});
			queryClient.invalidateQueries({ queryKey: keys.systemStatus });
			queryClient.invalidateQueries({ queryKey: keys.activity });
		},
	});
}

export function useTriggerBackup() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => triggerBackup(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: keys.backupStatus });
			queryClient.invalidateQueries({ queryKey: keys.backupHistory });
			queryClient.invalidateQueries({ queryKey: keys.activity });
		},
	});
}

export function useVerifyBackup() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (params: { date: string; remote?: string }) =>
			verifyBackup({ data: params }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: keys.backupHistory });
		},
	});
}

export function useDeleteBackup() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (params: { date: string; location: "local" | "remote" }) =>
			deleteBackup({ data: params }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: keys.backupStatus });
			queryClient.invalidateQueries({ queryKey: keys.backupHistory });
			queryClient.invalidateQueries({ queryKey: keys.activity });
		},
	});
}

export function useUpdateConfig() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (changes: Partial<SystemConfig>) =>
			updateConfig({ data: { changes } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: keys.config });
			queryClient.invalidateQueries({ queryKey: keys.activity });
		},
	});
}

export function useHttpsPrerequisites() {
	return useQuery({
		queryKey: ["homelab", "https-prereqs"],
		queryFn: () => checkHttpsPrerequisites(),
	});
}

export function useEnableHttps() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (acmeEmail: string) => enableHttps({ data: { acmeEmail } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: keys.config });
			queryClient.invalidateQueries({ queryKey: keys.apps });
			queryClient.invalidateQueries({ queryKey: keys.activity });
		},
	});
}

export function useDisableHttps() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => disableHttps(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: keys.config });
			queryClient.invalidateQueries({ queryKey: keys.apps });
			queryClient.invalidateQueries({ queryKey: keys.activity });
		},
	});
}

// ─── Firewall hooks ──────────────────────────────────────────────────────────

export function useFirewallPrerequisites() {
	return useQuery({
		queryKey: ["homelab", "firewall-prereqs"],
		queryFn: () => checkFirewallPrerequisites(),
	});
}

export function useFirewallRules() {
	return useQuery({
		queryKey: ["homelab", "firewall-rules"],
		queryFn: () => fetchFirewallRules(),
	});
}

export function useEnableFirewall() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => enableFirewall(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: keys.config });
			queryClient.invalidateQueries({
				queryKey: ["homelab", "firewall-prereqs"],
			});
			queryClient.invalidateQueries({
				queryKey: ["homelab", "firewall-rules"],
			});
			queryClient.invalidateQueries({ queryKey: keys.activity });
		},
	});
}

export function useDisableFirewall() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => disableFirewall(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: keys.config });
			queryClient.invalidateQueries({
				queryKey: ["homelab", "firewall-prereqs"],
			});
			queryClient.invalidateQueries({
				queryKey: ["homelab", "firewall-rules"],
			});
			queryClient.invalidateQueries({ queryKey: keys.activity });
		},
	});
}

// ─── Backup remote hooks ─────────────────────────────────────────────────────

export function useRcloneInstalled() {
	return useQuery({
		queryKey: ["homelab", "rclone-installed"],
		queryFn: () => checkRcloneInstalled(),
	});
}

export function useRemoteDetails() {
	return useQuery({
		queryKey: ["homelab", "remote-details"],
		queryFn: () => fetchRemoteDetails(),
	});
}

export function useAddBackupRemote() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (params: {
			name: string;
			providerType: string;
			params: Record<string, string>;
		}) => addBackupRemote({ data: params }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: keys.config });
			queryClient.invalidateQueries({
				queryKey: ["homelab", "remote-details"],
			});
			queryClient.invalidateQueries({ queryKey: keys.activity });
		},
	});
}

export function useRemoveBackupRemote() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (params: { name: string; deleteFromRclone: boolean }) =>
			removeBackupRemote({ data: params }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: keys.config });
			queryClient.invalidateQueries({
				queryKey: ["homelab", "remote-details"],
			});
			queryClient.invalidateQueries({ queryKey: keys.activity });
		},
	});
}

// ─── Doctor hooks ─────────────────────────────────────────────────────────────

export function useDoctor() {
	return useMutation({
		mutationFn: () => runDoctor(),
	});
}

// ─── Setup hooks ──────────────────────────────────────────────────────────────

export function useSetupStatus() {
	return useQuery({
		queryKey: keys.setupStatus,
		queryFn: () => fetchSetupStatus(),
	});
}

export function useSystemRequirements() {
	return useQuery({
		queryKey: keys.systemRequirements,
		queryFn: () => checkSystemRequirements(),
	});
}

export function useAppRegistry() {
	return useQuery({
		queryKey: keys.appRegistry,
		queryFn: () => fetchAppRegistry(),
		staleTime: 300_000,
	});
}

export function useInstallSystemDep() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (dep: "docker" | "swap" | "rclone") =>
			installSystemDep({ data: { dep } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: keys.systemRequirements });
		},
	});
}

export function useSetupBaseDir() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (baseDir: string) => setupBaseDir({ data: { baseDir } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: keys.config });
		},
	});
}

export function useResolveAppDependencies() {
	return useMutation({
		mutationFn: (params: { selectedApps: string[]; httpsEnabled: boolean }) =>
			resolveAppDependencies({ data: params }),
	});
}

export function useSaveSecrets() {
	return useMutation({
		mutationFn: (secrets: Record<string, string>) =>
			saveSetupSecrets({ data: { secrets } }),
	});
}

export function useGenerateSecret() {
	return useMutation({
		mutationFn: (command: string) => generateSecret({ data: { command } }),
	});
}

export function useInstallSetupApp() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (appName: string) => installSetupApp({ data: { appName } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: keys.apps });
			queryClient.invalidateQueries({ queryKey: keys.systemStatus });
		},
	});
}

export function useSetupHttps() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (acmeEmail: string) => setupHttps({ data: { acmeEmail } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: keys.config });
			queryClient.invalidateQueries({ queryKey: keys.activity });
		},
	});
}

export function useAutoSetupApp() {
	return useMutation({
		mutationFn: (params: {
			appName: string;
			credentials: { username: string; password: string };
			selectedApps: string[];
			settings?: Record<string, string>;
		}) => autoSetupApp({ data: params }),
	});
}

export function useSetupFirewall() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (appNames: string[]) => setupFirewall({ data: { appNames } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: keys.config });
			queryClient.invalidateQueries({ queryKey: keys.activity });
		},
	});
}

export function useSetupBackupTimer() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (hour: number) => setupBackupTimer({ data: { hour } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: keys.config });
			queryClient.invalidateQueries({ queryKey: keys.activity });
		},
	});
}

export function useCompleteSetup() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => completeSetup(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: keys.setupStatus });
			queryClient.invalidateQueries({ queryKey: keys.activity });
		},
	});
}

export function useSkipSetup() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => skipSetup(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: keys.setupStatus });
			queryClient.invalidateQueries({ queryKey: keys.activity });
		},
	});
}

export function useResumeSetup() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => resumeSetup(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: keys.setupStatus });
			queryClient.invalidateQueries({ queryKey: keys.activity });
		},
	});
}

export function useFetchServiceUrls() {
	return useMutation({
		mutationFn: (params: {
			appNames: string[];
			httpsEnabled: boolean;
			localIp: string;
		}) => fetchServiceUrls({ data: params }),
	});
}

// ─── Self-update hooks ───────────────────────────────────────────────────────

export function useCheckForUpdates() {
	return useMutation({
		mutationFn: () => checkForUpdates(),
	});
}

export function usePullLatestChanges() {
	return useMutation({
		mutationFn: () => pullLatestChanges(),
	});
}

export function useInstallDeps() {
	return useMutation({
		mutationFn: () => installDeps(),
	});
}

export function useBuildCli() {
	return useMutation({
		mutationFn: () => buildCli(),
	});
}

export function useBuildUi() {
	return useMutation({
		mutationFn: () => buildUi(),
	});
}

export function useFinalizeUpdate() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => finalizeUpdate(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: keys.version });
			queryClient.invalidateQueries({ queryKey: keys.activity });
		},
	});
}

export function usePingHealth() {
	return useMutation({
		mutationFn: () => pingHealth(),
	});
}
