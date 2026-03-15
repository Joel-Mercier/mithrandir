import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Search } from "lucide-react";
import { useState } from "react";
import Breadcrumbs from "#/components/Breadcrumbs";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Progress } from "#/components/ui/progress";
import type { AppCategory, AppStatus, DashboardApp } from "#/lib/mock-data";
import { mockAppDetails, mockApps } from "#/lib/mock-data";

export const Route = createFileRoute("/_app/apps/")({ component: AppsPage });

const statusDot: Record<AppStatus, string> = {
	running: "bg-status-healthy",
	stopped: "bg-muted-foreground",
	error: "bg-status-critical",
};

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

	const filtered = mockApps.filter((app) => {
		const matchesSearch =
			app.displayName.toLowerCase().includes(search.toLowerCase()) ||
			app.description.toLowerCase().includes(search.toLowerCase());
		const matchesCategory = category === "all" || app.category === category;
		return matchesSearch && matchesCategory;
	});

	const running = mockApps.filter((a) => a.status === "running").length;
	const stopped = mockApps.filter((a) => a.status === "stopped").length;
	const errored = mockApps.filter((a) => a.status === "error").length;

	return (
		<div className="mx-auto max-w-7xl px-4 py-8">
			<Breadcrumbs />
			<div className="mb-6">
				<h1 className="font-display text-2xl font-bold tracking-tight">
					Applications
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Manage your installed services
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

			{/* App grid */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{filtered.map((app) => (
					<AppListCard key={app.name} app={app} />
				))}
			</div>

			{filtered.length === 0 && (
				<div className="py-12 text-center text-sm text-muted-foreground">
					No apps match your filters.
				</div>
			)}
		</div>
	);
}

function AppListCard({ app }: { app: DashboardApp }) {
	const detail = mockAppDetails[app.name];

	return (
		<Link to="/apps/$appName" params={{ appName: app.name }}>
			<Card className="group">
				<CardHeader className="flex flex-row items-center justify-between pb-2">
					<div className="flex items-center gap-2">
						<span
							className={`inline-block h-2 w-2 rounded-full ${statusDot[app.status]}`}
						/>
						<CardTitle className="text-sm font-medium">
							{app.displayName}
						</CardTitle>
					</div>
					<ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
				</CardHeader>
				<CardContent className="space-y-3">
					<p className="text-xs text-muted-foreground">{app.description}</p>

					<div className="flex items-center justify-between">
						<span className="font-mono-data text-xs text-muted-foreground">
							:{app.port}
						</span>
						<Badge variant="outline" className="text-xs capitalize">
							{app.category}
						</Badge>
					</div>

					{app.status === "running" && detail && (
						<div className="space-y-1.5">
							<div className="flex justify-between text-xs text-muted-foreground">
								<span>CPU {detail.cpuUsage}%</span>
								<span>{detail.ramUsageMB} MB</span>
							</div>
							<Progress
								value={detail.cpuUsage}
								className="h-1 [&>[data-slot=indicator]]:bg-foreground/30"
							/>
						</div>
					)}

					<div className="flex items-baseline justify-between text-xs text-muted-foreground">
						<span>Uptime</span>
						<span className="font-mono-data">{app.uptime}</span>
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}
