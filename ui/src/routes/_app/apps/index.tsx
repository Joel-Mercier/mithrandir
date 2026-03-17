import { Link, createFileRoute } from "@tanstack/react-router";
import { AlertCircle, GitFork, Search } from "lucide-react";
import { useState } from "react";
import Breadcrumbs from "#/components/Breadcrumbs";
import { AppListCard, AvailableAppCard } from "#/components/apps/AppCards";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Skeleton } from "#/components/ui/skeleton";
import type { AppCategory, DashboardApp } from "#/lib/types";
import { useApps } from "#/hooks/homelab";

export const Route = createFileRoute("/_app/apps/")({ component: AppsPage });

const categories: Array<AppCategory | "all"> = [
	"all",
	"media",
	"automation",
	"monitoring",
	"productivity",
	"ai",
	"finance",
	"security",
	"travel",
	"statistics",
	"household",
	"utilities",
];

function AppCardSkeleton() {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<div className="flex items-center gap-2">
					<Skeleton className="h-2 w-2 rounded-full" />
					<Skeleton className="h-4 w-24" />
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				<Skeleton className="h-3 w-full" />
				<div className="flex items-center justify-between">
					<Skeleton className="h-3 w-10" />
					<Skeleton className="h-5 w-14 rounded-full" />
				</div>
				<div className="flex items-baseline justify-between">
					<Skeleton className="h-3 w-12" />
					<Skeleton className="h-3 w-16" />
				</div>
			</CardContent>
		</Card>
	);
}

function AppsPage() {
	const [search, setSearch] = useState("");
	const [category, setCategory] = useState<AppCategory | "all">("all");
	const appsQuery = useApps();

	const applyFilters = (app: DashboardApp) => {
		const matchesSearch =
			app.displayName.toLowerCase().includes(search.toLowerCase()) ||
			app.description.toLowerCase().includes(search.toLowerCase());
		const matchesCategory = category === "all" || app.category === category;
		return matchesSearch && matchesCategory;
	};

	const allApps = (appsQuery.data ?? []).filter((a) => !a.hidden);
	const installedApps = allApps.filter(
		(app) => app.status !== "available" && applyFilters(app),
	);
	const availableApps = allApps.filter(
		(app) => app.status === "available" && applyFilters(app),
	);

	const running = allApps.filter((a) => a.status === "running").length;
	const stopped = allApps.filter((a) => a.status === "stopped").length;
	const errored = allApps.filter((a) => a.status === "error").length;
	const available = allApps.filter((a) => a.status === "available").length;

	return (
		<div className="mx-auto max-w-7xl px-4 py-8">
			<Breadcrumbs />
			<div className="mb-6">
				<h1 className="font-display text-2xl font-bold tracking-tight">
					Applications
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Manage and install services
				</p>
			</div>

			{appsQuery.isError && (
				<Alert variant="destructive" className="mb-6">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>
						Failed to load apps. Make sure the CLI is reachable.
					</AlertDescription>
				</Alert>
			)}

			{/* Summary bar */}
			{appsQuery.isPending ? (
				<div className="mb-6 flex flex-wrap items-center gap-3">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-4 w-32" />
				</div>
			) : (
				<div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
					<div className="flex items-center gap-1.5">
						<span className="inline-block h-2 w-2 rounded-full bg-status-healthy" />
						<span className="font-mono-data">{running}</span>
						<span className="text-muted-foreground">running</span>
					</div>
					<div className="flex items-center gap-1.5">
						<span className="inline-block h-2 w-2 rounded-full bg-muted-foreground" />
						<span className="font-mono-data">{stopped}</span>
						<span className="text-muted-foreground">stopped</span>
					</div>
					{errored > 0 && (
						<div className="flex items-center gap-1.5">
							<span className="inline-block h-2 w-2 rounded-full bg-status-critical" />
							<span className="font-mono-data">{errored}</span>
							<span className="text-muted-foreground">error</span>
						</div>
					)}
					<div className="flex items-center gap-1.5 border-l pl-3">
						<span className="inline-block h-2 w-2 rounded-full border border-dashed border-muted-foreground" />
						<span className="font-mono-data">{available}</span>
						<span className="text-muted-foreground">available</span>
					</div>
				</div>
			)}

			{/* Actions */}
			<div className="mb-6">
				<Button variant="outline" size="sm" className="gap-1.5" asChild>
					<Link to="/apps/graph">
						<GitFork className="h-3.5 w-3.5" />
						Dependency Graph
					</Link>
				</Button>
			</div>

			{/* Filters */}
			<div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
				<div className="relative flex-1 sm:max-w-xs">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search apps..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>
				<div className="flex flex-wrap gap-1">
					{categories.map((cat) => (
						<Button
							key={cat}
							variant={category === cat ? "default" : "outline"}
							size="sm"
							onClick={() => setCategory(category === cat ? "all" : cat)}
							className="capitalize"
						>
							{cat}
						</Button>
					))}
				</div>
			</div>

			{/* Loading state */}
			{appsQuery.isPending && (
				<>
					<Skeleton className="mb-3 h-4 w-20" />
					<div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{Array.from({ length: 8 }).map((_, i) => (
							<AppCardSkeleton key={i} />
						))}
					</div>
				</>
			)}

			{/* Installed apps */}
			{!appsQuery.isPending && installedApps.length > 0 && (
				<>
					<h2 className="mb-3 text-sm font-medium text-muted-foreground">
						Installed
					</h2>
					<div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{installedApps.map((app) => (
							<AppListCard key={app.name} app={app} />
						))}
					</div>
				</>
			)}

			{/* Available apps */}
			{!appsQuery.isPending && availableApps.length > 0 && (
				<>
					<h2 className="mb-3 text-sm font-medium text-muted-foreground">
						Available to install
					</h2>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{availableApps.map((app) => (
							<AvailableAppCard key={app.name} app={app} />
						))}
					</div>
				</>
			)}

			{!appsQuery.isPending &&
				installedApps.length === 0 &&
				availableApps.length === 0 &&
				!appsQuery.isError && (
					<div className="py-12 text-center text-sm text-muted-foreground">
						No apps match your filters.
					</div>
				)}
		</div>
	);
}
