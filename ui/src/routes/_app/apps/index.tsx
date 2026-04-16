import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, Gauge, GitFork, Search } from "lucide-react";
import { useState } from "react";
import { AppListCard, AvailableAppCard } from "#/components/apps/AppCards";
import Breadcrumbs from "#/components/Breadcrumbs";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Skeleton } from "#/components/ui/skeleton";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "#/components/ui/toggle-group";
import { useApps } from "#/hooks/homelab";
import type { AppCategory, DashboardApp } from "#/lib/types";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/_app/apps/")({ component: AppsPage });

const categories: Array<{ value: AppCategory | "all"; label: string }> = [
	{ value: "all", label: "All" },
	{ value: "media-movies-tv", label: "Movies & TV" },
	{ value: "media-audio", label: "Audio" },
	{ value: "media-pictures", label: "Pictures" },
	{ value: "media-games", label: "Games" },
	{ value: "automation", label: "Automation" },
	{ value: "monitoring", label: "Monitoring" },
	{ value: "productivity", label: "Productivity" },
	{ value: "ai", label: "AI" },
	{ value: "finance", label: "Finance" },
	{ value: "security", label: "Security" },
	{ value: "travel", label: "Travel" },
	{ value: "statistics", label: "Statistics" },
	{ value: "household", label: "Household" },
	{ value: "utilities", label: "Utilities" },
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
	const starting = allApps.filter((a) => a.status === "starting").length;
	const stopped = allApps.filter((a) => a.status === "stopped").length;
	const errored = allApps.filter((a) => a.status === "error").length;
	const available = allApps.filter((a) => a.status === "available").length;

	return (
		<div className="mx-auto max-w-7xl px-4 py-8">
			<Breadcrumbs />
			<div className="mb-6">
				<h1 className="font-display text-2xl font-bold tracking-tight">
					{m.apps_title()}
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					{m.apps_subtitle()}
				</p>
			</div>

			{appsQuery.isError && (
				<Alert variant="destructive" className="mb-6">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>{m.apps_errorLoading()}</AlertDescription>
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
						<span className="text-muted-foreground">{m.common_running()}</span>
					</div>
					{starting > 0 && (
						<div className="flex items-center gap-1.5">
							<span className="inline-block h-2 w-2 animate-pulse rounded-full bg-status-warning" />
							<span className="font-mono-data">{starting}</span>
							<span className="text-muted-foreground">
								{m.common_starting()}
							</span>
						</div>
					)}
					<div className="flex items-center gap-1.5">
						<span className="inline-block h-2 w-2 rounded-full bg-muted-foreground" />
						<span className="font-mono-data">{stopped}</span>
						<span className="text-muted-foreground">{m.common_stopped()}</span>
					</div>
					{errored > 0 && (
						<div className="flex items-center gap-1.5">
							<span className="inline-block h-2 w-2 rounded-full bg-status-critical" />
							<span className="font-mono-data">{errored}</span>
							<span className="text-muted-foreground">{m.common_error()}</span>
						</div>
					)}
					<div className="flex items-center gap-1.5 border-l pl-3">
						<span className="inline-block h-2 w-2 rounded-full border border-dashed border-muted-foreground" />
						<span className="font-mono-data">{available}</span>
						<span className="text-muted-foreground">
							{m.common_available()}
						</span>
					</div>
				</div>
			)}

			{/* Actions */}
			<div className="mb-6 flex gap-2">
				<Button variant="outline" size="sm" className="gap-1.5" asChild>
					<Link to="/apps/graph">
						<GitFork className="h-3.5 w-3.5" />
						{m.apps_dependencyGraph()}
					</Link>
				</Button>
				<Button variant="outline" size="sm" className="gap-1.5" asChild>
					<Link to="/apps/capacity">
						<Gauge className="h-3.5 w-3.5" />
						{m.apps_capacity()}
					</Link>
				</Button>
			</div>

			{/* Filters */}
			<div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
				<div className="relative min-w-60 flex-1 sm:max-w-xs">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder={m.apps_searchPlaceholder()}
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>
				<ToggleGroup
					type="single"
					value={category}
					onValueChange={(value) =>
						setCategory((value as AppCategory | "all") || "all")
					}
					variant="outline"
					size="sm"
					spacing={1}
					className="flex-wrap"
				>
					{categories.map((cat) => (
						<ToggleGroupItem
							key={cat.value}
							value={cat.value}
						>
							{cat.label}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
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
						{m.apps_installed()}
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
						{m.apps_availableToInstall()}
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
						{m.apps_noMatch()}
					</div>
				)}
		</div>
	);
}
