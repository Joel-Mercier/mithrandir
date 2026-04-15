import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "#/components/backup/BackupTable";
import { Row } from "#/components/Row";
import { AppMultiSelect } from "#/components/AppMultiSelect";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "#/components/ui/alert-dialog";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";
import {
	useBackupApps,
	useBackupHistory,
	useConfig,
	useRecoverFromRemote,
	useRestoreBackup,
} from "#/hooks/homelab";
import type { BackupEntry } from "#/lib/types";
import { m } from "#/paraglide/messages.js";

export function RestorePanel({
	initialBackup,
	onInitialBackupConsumed,
}: {
	initialBackup?: BackupEntry | null;
	onInitialBackupConsumed?: () => void;
}) {
	const historyQuery = useBackupHistory();
	const configQuery = useConfig();
	const restoreMutation = useRestoreBackup();
	const recoverMutation = useRecoverFromRemote();

	const [selectedBackupIdx, setSelectedBackupIdx] = useState<string>("");
	const [restoreMode, setRestoreMode] = useState<"full" | "select">("full");
	const [selectedApps, setSelectedApps] = useState<string[]>([]);
	const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
	const [recoverDialogOpen, setRecoverDialogOpen] = useState(false);
	const [selectedRemote, setSelectedRemote] = useState<string>("");

	const isLoading = historyQuery.isPending || configQuery.isPending;

	// Pre-select the backup when navigating from the backup table
	useEffect(() => {
		if (!initialBackup || isLoading) return;
		const history = historyQuery.data ?? [];
		const idx = history.findIndex(
			(b) =>
				b.date === initialBackup.date &&
				b.location === initialBackup.location &&
				b.remote === initialBackup.remote,
		);
		if (idx !== -1) {
			setSelectedBackupIdx(String(idx));
			setSelectedApps([]);
			onInitialBackupConsumed?.();
		}
	}, [initialBackup, isLoading, historyQuery.data, onInitialBackupConsumed]);

	if (isLoading) {
		return (
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<Card>
					<CardHeader className="pb-2">
						<Skeleton className="h-4 w-36" />
					</CardHeader>
					<CardContent className="space-y-4">
						<Skeleton className="h-3 w-full" />
						<Skeleton className="h-3 w-3/4" />
						<Skeleton className="h-8 w-full" />
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<Skeleton className="h-4 w-36" />
					</CardHeader>
					<CardContent className="space-y-4">
						<Skeleton className="h-3 w-full" />
						<Skeleton className="h-3 w-3/4" />
						<Skeleton className="h-8 w-full" />
					</CardContent>
				</Card>
			</div>
		);
	}

	const history = historyQuery.data ?? [];
	const config = configQuery.data;
	const remoteBackups = history.filter((b) => b.location === "remote");
	const selectedBackup: BackupEntry | undefined =
		selectedBackupIdx !== "" ? history[Number(selectedBackupIdx)] : undefined;

	const activeRemote =
		selectedRemote || (config?.remotes[0] ?? "");

	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
			<RestoreCard
				history={history}
				selectedBackupIdx={selectedBackupIdx}
				setSelectedBackupIdx={(idx) => {
					setSelectedBackupIdx(idx);
					setSelectedApps([]);
				}}
				selectedBackup={selectedBackup}
				restoreMode={restoreMode}
				setRestoreMode={setRestoreMode}
				selectedApps={selectedApps}
				setSelectedApps={setSelectedApps}
				restoreMutation={restoreMutation}
				dialogOpen={restoreDialogOpen}
				setDialogOpen={setRestoreDialogOpen}
			/>

			<RecoverCard
				config={config}
				remoteBackups={remoteBackups}
				activeRemote={activeRemote}
				setSelectedRemote={setSelectedRemote}
				recoverMutation={recoverMutation}
				dialogOpen={recoverDialogOpen}
				setDialogOpen={setRecoverDialogOpen}
			/>
		</div>
	);
}

function RestoreCard({
	history,
	selectedBackupIdx,
	setSelectedBackupIdx,
	selectedBackup,
	restoreMode,
	setRestoreMode,
	selectedApps,
	setSelectedApps,
	restoreMutation,
	dialogOpen,
	setDialogOpen,
}: {
	history: BackupEntry[];
	selectedBackupIdx: string;
	setSelectedBackupIdx: (idx: string) => void;
	selectedBackup: BackupEntry | undefined;
	restoreMode: "full" | "select";
	setRestoreMode: (mode: "full" | "select") => void;
	selectedApps: string[];
	setSelectedApps: (apps: string[]) => void;
	restoreMutation: ReturnType<typeof useRestoreBackup>;
	dialogOpen: boolean;
	setDialogOpen: (open: boolean) => void;
}) {
	const backupAppsQuery = useBackupApps(
		selectedBackup?.date ?? "",
		selectedBackup?.location ?? "local",
		selectedBackup?.remote,
	);

	const apps = (backupAppsQuery.data ?? []).filter((a) => a !== "secrets");

	const canRestore =
		selectedBackup &&
		(restoreMode === "full" || selectedApps.length > 0) &&
		!restoreMutation.isPending;

	function handleRestore() {
		if (!selectedBackup) return;
		restoreMutation.mutate(
			{
				date: selectedBackup.date,
				appNames: restoreMode === "select" ? selectedApps : undefined,
			},
			{
				onSuccess: (result) => {
					setDialogOpen(false);
					if (result.success) {
						toast.success(m.restorePanel_restoreSuccess());
					} else {
						toast.error(m.restorePanel_restoreFailed(), {
							description: result.output.slice(0, 300),
						});
					}
				},
				onError: (err) => {
					setDialogOpen(false);
					toast.error(m.restorePanel_restoreError({ error: err.message }));
				},
			},
		);
	}

	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-medium">
					{m.restorePanel_restoreFromBackup()}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-xs text-muted-foreground">
					{m.restorePanel_restoreDescription()}
				</p>
				<Separator />

				{history.length > 0 ? (
					<div className="space-y-3">
						{/* Backup selector */}
						<div className="space-y-1.5">
							<Select
								value={selectedBackupIdx}
								onValueChange={setSelectedBackupIdx}
							>
								<SelectTrigger className="w-full">
									<SelectValue
										placeholder={m.restorePanel_selectBackup()}
									/>
								</SelectTrigger>
								<SelectContent>
									{history.map((backup, idx) => (
										<SelectItem key={`${backup.date}-${backup.location}-${backup.remote ?? ""}`} value={String(idx)}>
											{formatDate(backup.date)} — {backup.location}
											{backup.remote ? ` (${backup.remote})` : ""}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Restore mode toggle */}
						{selectedBackup && (
							<div className="space-y-1.5">
								<div className="flex gap-1.5">
									<Badge
										variant={
											restoreMode === "full" ? "default" : "secondary"
										}
										className="cursor-pointer"
										onClick={() => setRestoreMode("full")}
									>
										{m.restorePanel_fullRestore()}
									</Badge>
									<Badge
										variant={
											restoreMode === "select" ? "default" : "secondary"
										}
										className="cursor-pointer"
										onClick={() => setRestoreMode("select")}
									>
										{m.restorePanel_selectApps()}
									</Badge>
								</div>
							</div>
						)}

						{/* App multi-select combobox */}
						{selectedBackup && restoreMode === "select" && (
							<AppMultiSelect
								apps={apps}
								selectedApps={selectedApps}
								setSelectedApps={setSelectedApps}
								loading={backupAppsQuery.isPending}
								placeholder={m.restorePanel_selectApps()}
							/>
						)}
					</div>
				) : (
					<p className="text-sm text-muted-foreground">
						{m.restorePanel_noBackups()}
					</p>
				)}

				<AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
					<AlertDialogTrigger asChild>
						<Button
							className="w-full gap-2"
							disabled={!canRestore}
						>
							{restoreMutation.isPending ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Download className="h-4 w-4" />
							)}
							{restoreMutation.isPending
								? m.restorePanel_restoring()
								: m.restorePanel_startRestore()}
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent className="bg-background/95 backdrop-blur">
						<AlertDialogHeader>
							<AlertDialogTitle>
								{m.restorePanel_confirmRestoreTitle()}
							</AlertDialogTitle>
							<AlertDialogDescription>
								{restoreMode === "full"
									? m.restorePanel_confirmRestoreFullDescription()
									: m.restorePanel_confirmRestoreSingleDescription({
											appName: selectedApps.join(", "),
										})}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>{m.common_cancel()}</AlertDialogCancel>
							<AlertDialogAction
								onClick={handleRestore}
								disabled={restoreMutation.isPending}
							>
								{restoreMutation.isPending
									? m.restorePanel_restoring()
									: m.restorePanel_startRestore()}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</CardContent>
		</Card>
	);
}

function RecoverCard({
	config,
	remoteBackups,
	activeRemote,
	setSelectedRemote,
	recoverMutation,
	dialogOpen,
	setDialogOpen,
}: {
	config: { remotes: string[] } | undefined;
	remoteBackups: BackupEntry[];
	activeRemote: string;
	setSelectedRemote: (remote: string) => void;
	recoverMutation: ReturnType<typeof useRecoverFromRemote>;
	dialogOpen: boolean;
	setDialogOpen: (open: boolean) => void;
}) {
	const latestRemote = remoteBackups[0];

	function handleRecover() {
		recoverMutation.mutate(undefined, {
			onSuccess: (result) => {
				setDialogOpen(false);
				if (result.success) {
					toast.success(m.restorePanel_recoverSuccess());
				} else {
					toast.error(m.restorePanel_recoverFailed(), {
						description: result.output.slice(0, 300),
					});
				}
			},
			onError: (err) => {
				setDialogOpen(false);
				toast.error(m.restorePanel_recoverError({ error: err.message }));
			},
		});
	}

	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-medium">
					{m.restorePanel_disasterRecovery()}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-xs text-muted-foreground">
					{m.restorePanel_disasterDescription()}
				</p>
				<Separator />

				{config && latestRemote ? (
					<div className="space-y-2">
						{config.remotes.length > 1 ? (
							<Row label={m.restorePanel_sourceRemote()}>
								<Select
									value={activeRemote}
									onValueChange={setSelectedRemote}
								>
									<SelectTrigger className="h-7 w-auto">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{config.remotes.map((r) => (
											<SelectItem key={r} value={r}>
												{r}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Row>
						) : (
							<Row label={m.restorePanel_sourceRemote()}>
								{config.remotes[0]}
							</Row>
						)}
						<Row label={m.restorePanel_availableBackups()}>
							{remoteBackups.length}
						</Row>
						<Row label={m.restorePanel_latest()}>
							{formatDate(latestRemote.date)}
						</Row>
					</div>
				) : (
					<p className="text-sm text-muted-foreground">
						{!config
							? m.backup_configNotAvailable()
							: m.restorePanel_noRemoteBackups()}
					</p>
				)}

				<AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
					<AlertDialogTrigger asChild>
						<Button
							variant="outline"
							className="w-full gap-2"
							disabled={!latestRemote || recoverMutation.isPending}
						>
							{recoverMutation.isPending ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Download className="h-4 w-4" />
							)}
							{recoverMutation.isPending
								? m.restorePanel_recovering()
								: m.restorePanel_startRecovery()}
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent className="bg-background/95 backdrop-blur">
						<AlertDialogHeader>
							<AlertDialogTitle>
								{m.restorePanel_confirmRecoverTitle()}
							</AlertDialogTitle>
							<AlertDialogDescription>
								{m.restorePanel_confirmRecoverDescription()}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>{m.common_cancel()}</AlertDialogCancel>
							<AlertDialogAction
								className="bg-status-critical text-white hover:bg-status-critical/90"
								onClick={handleRecover}
								disabled={recoverMutation.isPending}
							>
								{recoverMutation.isPending
									? m.restorePanel_recovering()
									: m.restorePanel_startRecovery()}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</CardContent>
		</Card>
	);
}
