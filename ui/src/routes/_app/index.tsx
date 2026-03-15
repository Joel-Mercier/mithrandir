import { createFileRoute } from "@tanstack/react-router";
import AppsGrid from "#/components/dashboard/AppsGrid";
import BackupStatusCard from "#/components/dashboard/BackupStatusCard";
import ConfigCard from "#/components/dashboard/ConfigCard";
import ResourcesCard from "#/components/dashboard/ResourcesCard";
import SystemStatusCard from "#/components/dashboard/SystemStatusCard";
import VersionCard from "#/components/dashboard/VersionCard";
import {
	mockApps,
	mockBackup,
	mockConfig,
	mockHealth,
	mockResources,
	mockVersion,
} from "#/lib/mock-data";

export const Route = createFileRoute("/_app/")({ component: Dashboard });

function Dashboard() {
	return (
		<div className="mx-auto max-w-7xl px-4 py-8">
			<div className="mb-6">
				<h1 className="font-display text-2xl font-bold tracking-tight">
					Dashboard
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">System overview</p>
			</div>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				<SystemStatusCard data={mockHealth} />
				<ResourcesCard data={mockResources} />
				<BackupStatusCard data={mockBackup} />
				<AppsGrid apps={mockApps.filter((a) => a.status !== "available")} />
				<ConfigCard data={mockConfig} />
				<VersionCard data={mockVersion} />
			</div>
		</div>
	);
}
