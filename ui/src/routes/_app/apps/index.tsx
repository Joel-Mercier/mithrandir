import { Link, createFileRoute } from "@tanstack/react-router";
import { GitFork, Search } from "lucide-react";
import { useState } from "react";
import Breadcrumbs from "#/components/Breadcrumbs";
import { AppListCard, AvailableAppCard } from "#/components/apps/AppCards";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import type { AppCategory, DashboardApp } from "#/lib/mock-data";
import { mockApps } from "#/lib/mock-data";

export const Route = createFileRoute("/_app/apps/")({ component: AppsPage });

const categories: Array<AppCategory | "all"> = [
	"all",
	"media",
	"automation",
	"monitoring",
	"security",
	"utilities",
];

function AppsPage() {
	const [search, setSearch] = useState("");
	const [category, setCategory] = useState<AppCategory | "all">("all");

	const applyFilters = (app: DashboardApp) => {
		const matchesSearch =
			app.displayName.toLowerCase().includes(search.toLowerCase()) ||
			app.description.toLowerCase().includes(search.toLowerCase());
		const matchesCategory = category === "all" || app.category === category;
		return matchesSearch && matchesCategory;
	};

	const installedApps = mockApps.filter(
		(app) => app.status !== "available" && applyFilters(app),
	);
	const availableApps = mockApps.filter(
		(app) => app.status === "available" && applyFilters(app),
	);

	const running = mockApps.filter((a) => a.status === "running").length;
	const stopped = mockApps.filter((a) => a.status === "stopped").length;
	const errored = mockApps.filter((a) => a.status === "error").length;
	const available = mockApps.filter((a) => a.status === "available").length;

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

			{/* Summary bar */}
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
							onClick={() => setCategory(cat)}
							className="capitalize"
						>
							{cat}
						</Button>
					))}
				</div>
			</div>

			{/* Installed apps */}
			{installedApps.length > 0 && (
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
			{availableApps.length > 0 && (
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

			{installedApps.length === 0 && availableApps.length === 0 && (
				<div className="py-12 text-center text-sm text-muted-foreground">
					No apps match your filters.
				</div>
			)}
		</div>
	);
}
