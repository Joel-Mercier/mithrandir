import { createFileRoute } from "@tanstack/react-router";
import {
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
import { Row } from "#/components/Row";
import { BackupTable, formatDate } from "#/components/backup/BackupTable";
import { RestorePanel } from "#/components/backup/RestorePanel";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { mockBackup, mockBackupHistory, mockConfig } from "#/lib/mock-data";

export const Route = createFileRoute("/_app/backup-restore")({ component: BackupRestorePage });

const tabs = [
	{ id: "local", label: "Local", icon: HardDrive },
	{ id: "remote", label: "Remote", icon: Cloud },
	{ id: "restore", label: "Restore", icon: Download },
] as const;

type TabId = (typeof tabs)[number]["id"];

function BackupRestorePage() {
	const [activeTab, setActiveTab] = useState<TabId>("local");
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
								onClick={() => setActiveTab(tab.id)}
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
					{activeTab === "local" && <BackupTable backups={localBackups} />}
					{activeTab === "remote" && <BackupTable backups={remoteBackups} />}
					{activeTab === "restore" && <RestorePanel />}
				</div>
			</div>
		</div>
	)
}
