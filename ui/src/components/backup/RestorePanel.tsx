import { Download } from "lucide-react";
import { Row } from "#/components/Row";
import { formatDate } from "#/components/backup/BackupTable";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";
import { useApps, useBackupHistory, useConfig } from "#/hooks/homelab";

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
						Restore from Backup
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-xs text-muted-foreground">
						Restore a single app or all apps from a specific backup snapshot.
						Running apps will be stopped during restore.
					</p>
					<Separator />
					{latestBackup ? (
						<div className="space-y-3">
							<div className="space-y-1">
								<p className="text-sm font-medium">Backup</p>
								<p className="font-mono-data text-xs text-muted-foreground">
									{formatDate(latestBackup.date)} &middot;{" "}
									{latestBackup.size} &middot; {latestBackup.apps} apps
								</p>
							</div>
							<div className="space-y-1">
								<p className="text-sm font-medium">Target</p>
								<div className="flex flex-wrap gap-1.5">
									<Badge variant="outline" className="cursor-pointer">
										Full restore
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
							No backups available to restore from.
						</p>
					)}
					<Button className="w-full gap-2" disabled={!latestBackup}>
						<Download className="h-4 w-4" />
						Start Restore
					</Button>
				</CardContent>
			</Card>

			{/* Disaster Recovery */}
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-medium">
						Disaster Recovery
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-xs text-muted-foreground">
						Full system recovery from a remote backup. Use this when setting up
						a new server or recovering from a catastrophic failure.
					</p>
					<Separator />
					{config && latestRemote ? (
						<div className="space-y-2">
							<Row label="Source remote">{config.remotes[0]}</Row>
							<Row label="Available backups">{remoteBackups.length}</Row>
							<Row label="Latest">{formatDate(latestRemote.date)}</Row>
						</div>
					) : (
						<p className="text-sm text-muted-foreground">
							{!config
								? "Configuration not available."
								: "No remote backups found."}
						</p>
					)}
					<Button
						variant="outline"
						className="w-full gap-2"
						disabled={!latestRemote}
					>
						<Download className="h-4 w-4" />
						Start Recovery
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
