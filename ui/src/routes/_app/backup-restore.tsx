import { createFileRoute } from "@tanstack/react-router";
import {
	Archive,
	CheckCircle2,
	Clock,
	Cloud,
	Download,
	HardDrive,
	Shield,
	Upload,
} from "lucide-react";
import { toast } from "sonner";
import Breadcrumbs from "#/components/Breadcrumbs";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import type { BackupEntry } from "#/lib/mock-data";
import {
	mockApps,
	mockBackup,
	mockBackupHistory,
	mockConfig,
} from "#/lib/mock-data";

export const Route = createFileRoute("/_app/backup-restore")({ component: BackupRestorePage });

function formatDate(iso: string) {
	return new Date(iso).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

function Row({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex items-baseline justify-between text-sm">
			<span className="text-muted-foreground">{label}</span>
			<span className="font-mono-data text-xs">{children}</span>
		</div>
	)
}

function BackupRestorePage() {
	const localBackups = mockBackupHistory.filter((b) => b.location === "local");
	const remoteBackups = mockBackupHistory.filter(
		(b) => b.location === "remote",
	)

	return (
		<div className="mx-auto max-w-7xl px-4 py-8">
			<Breadcrumbs />
			<div className="mb-6">
				<h1 className="font-display text-2xl font-bold tracking-tight">
					Backup & Restore
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Manage backups and restore from snapshots
				</p>
			</div>

			{/* Status cards */}
			<div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
				{/* Overview card */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium">Status</CardTitle>
						{mockBackup.encrypted && (
							<Badge
								variant="outline"
								className="border-status-healthy/30 bg-status-healthy/15 text-status-healthy"
							>
								<Shield className="mr-1 h-3 w-3" />
								Encrypted
							</Badge>
						)}
					</CardHeader>
					<CardContent className="space-y-2">
						<Row label="Last backup">
							{formatDate(mockBackup.lastBackupDate)}
						</Row>
						<Row label="Next scheduled">
							{String(mockBackup.nextScheduledHour).padStart(2, "0")}:00
						</Row>
						<Row label="Local backups">{localBackups.length}</Row>
						<Row label="Remote backups">{remoteBackups.length}</Row>
					</CardContent>
				</Card>

				{/* Retention card */}
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Retention</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<Row label="Local retention">
							{mockConfig.localRetention} backups
						</Row>
						<Row label="Remote retention">
							{mockConfig.remoteRetention} backups
						</Row>
						<Row label="Remotes">{mockConfig.remotes.join(", ")}</Row>
						<Row label="Backup directory">{mockConfig.backupDir}</Row>
					</CardContent>
				</Card>

				{/* Actions card */}
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Actions</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-2">
						<Button
							className="w-full justify-start gap-2"
							variant="outline"
							onClick={() => toast.info("Starting backup...")}
						>
							<Archive className="h-4 w-4" />
							Run Backup Now
						</Button>
						<Button
							className="w-full justify-start gap-2"
							variant="outline"
							onClick={() => toast.success("Latest backup verified.")}
						>
							<CheckCircle2 className="h-4 w-4" />
							Verify Latest
						</Button>
						<Button
							className="w-full justify-start gap-2"
							variant="outline"
							onClick={() => toast.info("Syncing to remote...")}
						>
							<Upload className="h-4 w-4" />
							Sync to Remote
						</Button>
					</CardContent>
				</Card>
			</div>

			{/* Backup history tabs */}
			<Tabs defaultValue="local">
				<TabsList>
					<TabsTrigger value="local" className="gap-1.5">
						<HardDrive className="h-3.5 w-3.5" />
						Local
					</TabsTrigger>
					<TabsTrigger value="remote" className="gap-1.5">
						<Cloud className="h-3.5 w-3.5" />
						Remote
					</TabsTrigger>
					<TabsTrigger value="restore" className="gap-1.5">
						<Download className="h-3.5 w-3.5" />
						Restore
					</TabsTrigger>
				</TabsList>

				<TabsContent value="local" className="mt-4">
					<BackupTable backups={localBackups} />
				</TabsContent>

				<TabsContent value="remote" className="mt-4">
					<BackupTable backups={remoteBackups} />
				</TabsContent>

				<TabsContent value="restore" className="mt-4">
					<RestorePanel />
				</TabsContent>
			</Tabs>
		</div>
	)
}

function BackupTable({ backups }: { backups: BackupEntry[] }) {
	return (
		<Card>
			<CardContent className="px-2 py-0">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Date</TableHead>
							<TableHead>Size</TableHead>
							<TableHead className="text-center">Apps</TableHead>
							<TableHead className="text-center">Encrypted</TableHead>
							<TableHead className="text-center">Verified</TableHead>
							{backups[0]?.location === "remote" && (
								<TableHead>Remote</TableHead>
							)}
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{backups.map((backup) => (
							<TableRow key={`${backup.date}-${backup.location}`}>
								<TableCell className="font-mono-data text-xs">
									{formatDate(backup.date)}
								</TableCell>
								<TableCell className="font-mono-data text-xs">
									{backup.size}
								</TableCell>
								<TableCell className="text-center font-mono-data text-xs">
									{backup.apps}
								</TableCell>
								<TableCell className="text-center">
									{backup.encrypted ? (
										<Shield className="mx-auto h-3.5 w-3.5 text-status-healthy" />
									) : (
										<span className="text-muted-foreground">—</span>
									)}
								</TableCell>
								<TableCell className="text-center">
									{backup.verified ? (
										<CheckCircle2 className="mx-auto h-3.5 w-3.5 text-status-healthy" />
									) : (
										<Clock className="mx-auto h-3.5 w-3.5 text-muted-foreground" />
									)}
								</TableCell>
								{backup.location === "remote" && (
									<TableCell className="font-mono-data text-xs">
										{backup.remote}
									</TableCell>
								)}
								<TableCell className="text-right">
									<div className="flex justify-end gap-1">
										<Button variant="ghost" size="sm" className="h-7 text-xs">
											Verify
										</Button>
										<Button variant="ghost" size="sm" className="h-7 text-xs">
											Restore
										</Button>
										<Button
											variant="ghost"
											size="sm"
											className="h-7 text-xs text-status-critical"
										>
											Delete
										</Button>
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	)
}

function RestorePanel() {
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
	)
}
