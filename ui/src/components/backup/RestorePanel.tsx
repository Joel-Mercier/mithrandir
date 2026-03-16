import { Download } from "lucide-react";
import { Row } from "#/components/Row";
import { formatDate } from "#/components/backup/BackupTable";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import { mockApps, mockBackupHistory, mockConfig } from "#/lib/mock-data";

export function RestorePanel() {
	const runningApps = mockApps.filter((a) => a.status === "running");

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
					<div className="space-y-3">
						<div className="space-y-1">
							<p className="text-sm font-medium">Backup</p>
							<p className="font-mono-data text-xs text-muted-foreground">
								{formatDate(mockBackupHistory[0].date)} &middot;{" "}
								{mockBackupHistory[0].size} &middot; {mockBackupHistory[0].apps}{" "}
								apps
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
					<Button className="w-full gap-2">
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
					<div className="space-y-2">
						<Row label="Source remote">{mockConfig.remotes[0]}</Row>
						<Row label="Available backups">
							{mockBackupHistory.filter((b) => b.location === "remote").length}
						</Row>
						<Row label="Latest">
							{formatDate(
								mockBackupHistory.find((b) => b.location === "remote")?.date ??
									"—",
							)}
						</Row>
					</div>
					<Button variant="outline" className="w-full gap-2">
						<Download className="h-4 w-4" />
						Start Recovery
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
