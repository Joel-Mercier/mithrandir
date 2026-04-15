import { createFileRoute } from "@tanstack/react-router";
import {
	AlertCircle,
	Archive,
	CheckCircle2,
	Cloud,
	Download,
	HardDrive,
	Shield,
	Upload,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Breadcrumbs from "#/components/Breadcrumbs";
import { BackupTable, formatDate } from "#/components/backup/BackupTable";
import { RestorePanel } from "#/components/backup/RestorePanel";
import { Row } from "#/components/Row";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Skeleton } from "#/components/ui/skeleton";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "#/components/ui/tabs";
import { useMediaQuery } from "#/hooks/use-media-query";
import {
	useBackupHistory,
	useBackupStatus,
	useConfig,
	useSyncToRemote,
	useTriggerBackup,
	useVerifyBackup,
} from "#/hooks/homelab";
import type { BackupEntry } from "#/lib/types";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/_app/backup-restore")({
	component: BackupRestorePage,
});

const tabs = [
	{ id: "local", label: m.backup_tabLocal(), icon: HardDrive },
	{ id: "remote", label: m.backup_tabRemote(), icon: Cloud },
	{ id: "restore", label: m.backup_tabRestore(), icon: Download },
];

function StatusCardSkeleton() {
	return (
		<Card>
			<CardHeader className="pb-2">
				<Skeleton className="h-4 w-20" />
			</CardHeader>
			<CardContent className="space-y-3">
				<Skeleton className="h-3 w-full" />
				<Skeleton className="h-3 w-3/4" />
				<Skeleton className="h-3 w-1/2" />
				<Skeleton className="h-3 w-2/3" />
			</CardContent>
		</Card>
	);
}

function BackupRestorePage() {
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const orientation = isDesktop ? "vertical" : "horizontal";
	const backupStatusQuery = useBackupStatus();
	const backupHistoryQuery = useBackupHistory();
	const configQuery = useConfig();
	const triggerBackupMutation = useTriggerBackup();
	const verifyBackupMutation = useVerifyBackup();
	const syncToRemoteMutation = useSyncToRemote();

	const [activeTab, setActiveTab] = useState("local");
	const [pendingRestore, setPendingRestore] = useState<BackupEntry | null>(null);

	const backup = backupStatusQuery.data;
	const history = backupHistoryQuery.data ?? [];
	const config = configQuery.data;

	const localBackups = history.filter((b) => b.location === "local");
	const remoteBackups = history.filter((b) => b.location === "remote");

	const isLoading =
		backupStatusQuery.isPending ||
		backupHistoryQuery.isPending ||
		configQuery.isPending;
	const hasError =
		backupStatusQuery.isError ||
		backupHistoryQuery.isError ||
		configQuery.isError;

	return (
		<div className="mx-auto max-w-7xl px-4 py-8">
			<Breadcrumbs />
			<div className="mb-6">
				<h1 className="font-display text-2xl font-bold tracking-tight">
					{m.backup_title()}
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					{m.backup_subtitle()}
				</p>
			</div>

			{hasError && (
				<Alert variant="destructive" className="mb-6">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>{m.backup_errorLoading()}</AlertDescription>
				</Alert>
			)}

			{/* Status cards */}
			<div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
				{isLoading ? (
					<>
						<StatusCardSkeleton />
						<StatusCardSkeleton />
						<StatusCardSkeleton />
					</>
				) : (
					<>
						{/* Overview card */}
						<Card>
							<CardHeader className="flex flex-row items-center justify-between pb-2">
								<CardTitle className="text-sm font-medium">
									{m.backup_status()}
								</CardTitle>
								{backup?.encrypted && (
									<Badge
										variant="outline"
										className="border-status-healthy/30 bg-status-healthy/15 text-status-healthy"
									>
										<Shield className="mr-1 h-3 w-3" />
										{m.common_encrypted()}
									</Badge>
								)}
							</CardHeader>
							<CardContent className="space-y-2">
								{backup ? (
									<>
										<Row label={m.backup_lastBackup()}>
											{backup.lastBackupDate
												? formatDate(backup.lastBackupDate)
												: m.common_never()}
										</Row>
										<Row label={m.backup_nextScheduled()}>
											{String(backup.nextScheduledHour).padStart(2, "0")}:00
										</Row>
										<Row label={m.backup_localBackups()}>
											{localBackups.length}
										</Row>
										<Row label={m.backup_remoteBackups()}>
											{remoteBackups.length}
										</Row>
									</>
								) : (
									<p className="text-sm text-muted-foreground">
										{m.backup_noStatus()}
									</p>
								)}
							</CardContent>
						</Card>

						{/* Retention card */}
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium">
									{m.backup_retention()}
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2">
								{config ? (
									<>
										<Row label={m.backup_localRetention()}>
											{config.localRetention} {m.backup_backups()}
										</Row>
										<Row label={m.backup_remoteRetention()}>
											{config.remoteRetention} {m.backup_backups()}
										</Row>
										<Row label={m.backup_remotes()}>
											{config.remotes.join(", ")}
										</Row>
										<Row label={m.backup_backupDirectory()}>
											{config.backupDir}
										</Row>
									</>
								) : (
									<p className="text-sm text-muted-foreground">
										{m.backup_configNotAvailable()}
									</p>
								)}
							</CardContent>
						</Card>

						{/* Actions card */}
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium">
									{m.backup_actions()}
								</CardTitle>
							</CardHeader>
							<CardContent className="flex flex-col gap-2">
								<Button
									className="w-full justify-start gap-2"
									variant="outline"
									disabled={triggerBackupMutation.isPending}
									onClick={() => {
										triggerBackupMutation.mutate(undefined, {
											onSuccess: () => toast.info(m.backup_started()),
											onError: (err) =>
												toast.error(`Failed to start backup: ${err.message}`),
										});
									}}
								>
									<Archive className="h-4 w-4" />
									{m.backup_runNow()}
								</Button>
								<Button
									className="w-full justify-start gap-2"
									variant="outline"
									disabled={
										verifyBackupMutation.isPending ||
										!backup?.lastBackupDate
									}
									onClick={() => {
										if (!backup?.lastBackupDate) return;
										verifyBackupMutation.mutate(
											{ date: backup.lastBackupDate },
											{
												onSuccess: (result) => {
													if (result.success) {
														toast.success(m.backup_latestVerified());
													} else {
														toast.error(m.backup_verifyFailed(), {
															description: result.output,
														});
													}
												},
												onError: (err) =>
													toast.error(
														`${m.backup_verifyFailed()}: ${err.message}`,
													),
											},
										);
									}}
								>
									<CheckCircle2 className="h-4 w-4" />
									{verifyBackupMutation.isPending
										? m.backup_verifying()
										: m.backup_verifyLatest()}
								</Button>
								<Button
									className="w-full justify-start gap-2"
									variant="outline"
									disabled={
										syncToRemoteMutation.isPending ||
										localBackups.length === 0
									}
									onClick={() => {
										toast.info(m.backup_syncingRemote());
										syncToRemoteMutation.mutate(undefined, {
											onSuccess: (result) => {
												if (result.success) {
													toast.success(m.backup_syncComplete(), {
														description: result.output,
													});
												} else {
													toast.error(m.backup_syncFailed(), {
														description: result.output,
													});
												}
											},
											onError: (err) =>
												toast.error(
													`${m.backup_syncFailed()}: ${err.message}`,
												),
										});
									}}
								>
									<Upload className="h-4 w-4" />
									{syncToRemoteMutation.isPending
										? m.backup_syncingRemote()
										: m.backup_syncRemote()}
								</Button>
							</CardContent>
						</Card>
					</>
				)}
			</div>

			{/* Backup history tabs */}
			<Tabs value={activeTab} onValueChange={setActiveTab} orientation={orientation}>
				<TabsList variant="line" className="w-full overflow-x-auto scrollbar-none md:w-48 md:shrink-0">
					{tabs.map((tab) => {
						const Icon = tab.icon;
						return (
							<TabsTrigger key={tab.id} value={tab.id}>
								<Icon />
								{tab.label}
							</TabsTrigger>
						);
					})}
				</TabsList>

				<TabsContent value="local">
					{backupHistoryQuery.isPending ? (
						<div className="space-y-3">
							{Array.from({ length: 4 }).map((_, i) => (
								<Skeleton key={i} className="h-12 w-full" />
							))}
						</div>
					) : (
						<BackupTable
							backups={localBackups}
							onRestore={(entry) => {
								setPendingRestore(entry);
								setActiveTab("restore");
							}}
						/>
					)}
				</TabsContent>
				<TabsContent value="remote">
					{backupHistoryQuery.isPending ? (
						<div className="space-y-3">
							{Array.from({ length: 4 }).map((_, i) => (
								<Skeleton key={i} className="h-12 w-full" />
							))}
						</div>
					) : (
						<BackupTable
							backups={remoteBackups}
							onRestore={(entry) => {
								setPendingRestore(entry);
								setActiveTab("restore");
							}}
						/>
					)}
				</TabsContent>
				<TabsContent value="restore">
					<RestorePanel
						initialBackup={pendingRestore}
						onInitialBackupConsumed={() => setPendingRestore(null)}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}
