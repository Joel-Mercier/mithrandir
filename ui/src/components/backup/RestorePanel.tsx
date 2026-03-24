import { Download } from "lucide-react";
import { formatDate } from "#/components/backup/BackupTable";
import { Row } from "#/components/Row";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";
import { useApps, useBackupHistory, useConfig } from "#/hooks/homelab";
import { m } from "#/paraglide/messages.js";

export function RestorePanel() {
	const appsQuery = useApps();
	const historyQuery = useBackupHistory();
	const configQuery = useConfig();

	const isLoading =
		appsQuery.isPending || historyQuery.isPending || configQuery.isPending;

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

	const apps = appsQuery.data ?? [];
	const history = historyQuery.data ?? [];
	const config = configQuery.data;
	const runningApps = apps.filter((a) => a.status === "running");
	const latestBackup = history[0];
	const remoteBackups = history.filter((b) => b.location === "remote");
	const latestRemote = remoteBackups[0];

	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
			{/* Restore from backup */}
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
					{latestBackup ? (
						<div className="space-y-3">
							<div className="space-y-1">
								<p className="text-sm font-medium">{m.restorePanel_backup()}</p>
								<p className="font-mono-data text-xs text-muted-foreground">
									{formatDate(latestBackup.date)} &middot; {latestBackup.size}{" "}
									&middot; {latestBackup.apps} apps
								</p>
							</div>
							<div className="space-y-1">
								<p className="text-sm font-medium">{m.restorePanel_target()}</p>
								<div className="flex flex-wrap gap-1.5">
									<Badge variant="outline" className="cursor-pointer">
										{m.restorePanel_fullRestore()}
									</Badge>
									{runningApps.slice(0, 5).map((app) => (
										<Badge
											key={app.name}
											variant="secondary"
											className="cursor-pointer"
										>
											{app.displayName}
										</Badge>
									))}
								</div>
							</div>
						</div>
					) : (
						<p className="text-sm text-muted-foreground">
							{m.restorePanel_noBackups()}
						</p>
					)}
					<Button className="w-full gap-2" disabled={!latestBackup}>
						<Download className="h-4 w-4" />
						{m.restorePanel_startRestore()}
					</Button>
				</CardContent>
			</Card>

			{/* Disaster Recovery */}
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
							<Row label={m.restorePanel_sourceRemote()}>
								{config.remotes[0]}
							</Row>
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
					<Button
						variant="outline"
						className="w-full gap-2"
						disabled={!latestRemote}
					>
						<Download className="h-4 w-4" />
						{m.restorePanel_startRecovery()}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
