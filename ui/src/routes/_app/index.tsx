import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, ArrowRight, Wand2 } from "lucide-react";
import AppsGrid from "#/components/dashboard/AppsGrid";
import BackupStatusCard from "#/components/dashboard/BackupStatusCard";
import ConfigCard from "#/components/dashboard/ConfigCard";
import ResourcesCard from "#/components/dashboard/ResourcesCard";
import SystemStatusCard from "#/components/dashboard/SystemStatusCard";
import VersionCard from "#/components/dashboard/VersionCard";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader } from "#/components/ui/card";
import { Skeleton } from "#/components/ui/skeleton";
import {
	useApps,
	useBackupStatus,
	useConfig,
	useResources,
	useSetupStatus,
	useSystemStatus,
	useVersion,
} from "#/hooks/homelab";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/_app/")({ component: Dashboard });

function CardSkeleton() {
	return (
		<Card>
			<CardHeader className="pb-2">
				<Skeleton className="h-4 w-28" />
			</CardHeader>
			<CardContent className="space-y-3">
				<Skeleton className="h-3 w-full" />
				<Skeleton className="h-3 w-3/4" />
				<Skeleton className="h-3 w-1/2" />
			</CardContent>
		</Card>
	);
}

function AppsGridSkeleton() {
	return (
		<div className="col-span-full space-y-3">
			<Skeleton className="h-4 w-24" />
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<Card key={i}>
						<CardContent className="flex items-start gap-3 p-4">
							<Skeleton className="mt-1.5 h-2 w-2 rounded-full" />
							<div className="min-w-0 flex-1 space-y-2">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-3 w-full" />
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}

function Dashboard() {
	const appsQuery = useApps();
	const healthQuery = useSystemStatus();
	const resourcesQuery = useResources();
	const backupQuery = useBackupStatus();
	const configQuery = useConfig();
	const versionQuery = useVersion();
	const setupStatusQuery = useSetupStatus();

	const hasError =
		appsQuery.isError ||
		healthQuery.isError ||
		resourcesQuery.isError ||
		backupQuery.isError ||
		configQuery.isError ||
		versionQuery.isError;

	return (
		<div className="mx-auto max-w-7xl px-4 py-8">
			<div className="mb-6">
				<h1 className="font-display text-2xl font-bold tracking-tight">
					{m.dashboard_title()}
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					{m.dashboard_subtitle()}
				</p>
			</div>

			{hasError && (
				<Alert variant="destructive" className="mb-6">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>{m.dashboard_errorLoading()}</AlertDescription>
				</Alert>
			)}

			{setupStatusQuery.data?.status === "skipped" && (
				<Alert className="mb-6 items-center">
					<Wand2 className="h-4 w-4" />
					<AlertDescription className="flex items-center justify-between">
						<span>{m.dashboard_setupSkipped()}</span>
						<Button asChild size="sm" variant="outline" className="ml-4 gap-2">
							<Link to="/setup">
								{m.dashboard_resumeSetup()}
								<ArrowRight className="h-3.5 w-3.5" />
							</Link>
						</Button>
					</AlertDescription>
				</Alert>
			)}

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{healthQuery.isPending ? (
					<CardSkeleton />
				) : healthQuery.data ? (
					<SystemStatusCard data={healthQuery.data} />
				) : null}

				{resourcesQuery.isPending ? (
					<CardSkeleton />
				) : resourcesQuery.data ? (
					<ResourcesCard data={resourcesQuery.data} />
				) : null}

				{backupQuery.isPending ? (
					<CardSkeleton />
				) : backupQuery.data ? (
					<BackupStatusCard data={backupQuery.data} />
				) : null}

				{appsQuery.isPending ? (
					<AppsGridSkeleton />
				) : appsQuery.data &&
					appsQuery.data.filter((a) => a.status !== "available" && !a.hidden)
						.length > 0 ? (
					<AppsGrid
						apps={appsQuery.data.filter(
							(a) => a.status !== "available" && !a.hidden,
						)}
					/>
				) : !appsQuery.isError ? (
					<div className="col-span-full py-8 text-center text-sm text-muted-foreground">
						{m.dashboard_noApps()}
					</div>
				) : null}

				{configQuery.isPending ? (
					<CardSkeleton />
				) : configQuery.data ? (
					<ConfigCard data={configQuery.data} />
				) : null}

				{versionQuery.isPending ? (
					<CardSkeleton />
				) : versionQuery.data ? (
					<VersionCard data={versionQuery.data} />
				) : null}
			</div>
		</div>
	);
}
