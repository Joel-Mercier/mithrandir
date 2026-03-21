import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	fetchApps,
	fetchAppDetail,
	startApp,
	stopApp,
	restartApp,
	installApp,
	uninstallApp,
} from "#/lib/server/apps";
import {
	fetchSystemStatus,
	fetchHealthChecks,
	fetchConfig,
	fetchResources,
	fetchVersion,
	updateConfig,
} from "#/lib/server/system";
import {
	fetchBackupStatus,
	fetchBackupHistory,
	triggerBackup,
	verifyBackup,
	deleteBackup,
} from "#/lib/server/backup";
import { fetchCapacity } from "#/lib/server/capacity";
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

// ─── Mutation hooks ──────────────────────────────────────────────────────────

export function useStartApp() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (appName: string) => startApp({ data: { appName } }),
		onSuccess: (_data, appName) => {
			queryClient.invalidateQueries({ queryKey: keys.apps });
			queryClient.invalidateQueries({ queryKey: keys.appDetail(appName) });
			queryClient.invalidateQueries({ queryKey: keys.systemStatus });
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
		},
	});
}
