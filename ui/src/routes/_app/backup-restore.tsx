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
	useBackupHistory,
	useBackupStatus,
	useConfig,
	useTriggerBackup,
} from "#/hooks/homelab";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/_app/backup-restore")({
	component: BackupRestorePage,
});

const tabs = [
	{ id: "local", label: m.backup_tabLocal(), icon: HardDrive },
	{ id: "remote", label: m.backup_tabRemote(), icon: Cloud },
	{ id: "restore", label: m.backup_tabRestore(), icon: Download },
];

type TabId = "local" | "remote" | "restore";

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
	const [activeTab, setActiveTab] = useState<TabId>("local");
	const backupStatusQuery = useBackupStatus();
	const backupHistoryQuery = useBackupHistory();
	const configQuery = useConfig();
	const triggerBackupMutation = useTriggerBackup();

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
									onClick={() => toast.success(m.backup_latestVerified())}
								>
									<CheckCircle2 className="h-4 w-4" />
									{m.backup_verifyLatest()}
								</Button>
								<Button
									className="w-full justify-start gap-2"
									variant="outline"
									onClick={() => toast.info(m.backup_syncingRemote())}
								>
									<Upload className="h-4 w-4" />
									{m.backup_syncRemote()}
								</Button>
							</CardContent>
						</Card>
					</>
				)}
			</div>

			{/* Backup history tabs */}
			<div className="flex flex-col gap-6 md:flex-row">
				{/* Sidebar nav */}
				<nav className="flex shrink-0 flex-row gap-1 md:w-48 md:flex-col">
					{tabs.map((tab) => {
						const Icon = tab.icon;
						const isActive = activeTab === tab.id;
						return (
							<button
								key={tab.id}
								type="button"
								onClick={() => setActiveTab(tab.id as TabId)}
								className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
									isActive
										? "bg-accent text-accent-foreground shadow-sm"
										: "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
								}`}
							>
								<Icon
									className={`h-4 w-4 transition-colors ${
										isActive
											? "text-foreground"
											: "text-muted-foreground/70 group-hover:text-foreground"
									}`}
								/>
								<span className="hidden md:inline">{tab.label}</span>
							</button>
						);
					})}
				</nav>

				{/* Content */}
				<div className="flex-1">
					{backupHistoryQuery.isPending ? (
						<div className="space-y-3">
							{Array.from({ length: 4 }).map((_, i) => (
								<Skeleton key={i} className="h-12 w-full" />
							))}
						</div>
					) : (
						<>
							{activeTab === "local" && <BackupTable backups={localBackups} />}
							{activeTab === "remote" && (
								<BackupTable backups={remoteBackups} />
							)}
							{activeTab === "restore" && <RestorePanel />}
						</>
					)}
				</div>
			</div>
		</div>
	);
}
