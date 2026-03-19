import { useState } from "react";
import {
	ChevronDown,
	Cloud,
	Cog,
	Film,
	Heart,
	LineChart,
	Lock,
	MonitorSmartphone,
	Plane,
	Search,
	Sparkles,
	Wallet,
	Wrench,
} from "lucide-react";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Card, CardContent } from "#/components/ui/card";
import { Checkbox } from "#/components/ui/checkbox";
import { Input } from "#/components/ui/input";
import { cn } from "#/lib/utils";
import { StepNavigation } from "../StepNavigation";
import type { SetupState } from "../SetupWizard";

interface AppSelectStepProps {
	state: SetupState;
	updateState: (updates: Partial<SetupState>) => void;
	onComplete: () => void;
	onBack: () => void;
}

const CATEGORIES = [
	{
		id: "media",
		label: "Media",
		icon: Film,
		description: "Movies, TV, music, photos",
		apps: ["jellyfin", "sonarr", "radarr", "lidarr", "prowlarr", "qbittorrent", "jellyseerr"],
	},
	{
		id: "automation",
		label: "Automation",
		icon: Cog,
		description: "Home automation & IoT",
		apps: ["homeassistant", "nodered"],
	},
	{
		id: "monitoring",
		label: "Monitoring",
		icon: MonitorSmartphone,
		description: "Uptime & system monitoring",
		apps: ["uptimekuma", "glances"],
	},
	{
		id: "productivity",
		label: "Productivity",
		icon: Sparkles,
		description: "Notes, docs, collaboration",
		apps: ["affine", "paperlessngx", "stirlingpdf"],
	},
	{
		id: "finance",
		label: "Finance",
		icon: Wallet,
		description: "Budget & expense tracking",
		apps: ["actualbudget"],
	},
	{
		id: "security",
		label: "Security",
		icon: Lock,
		description: "VPN, passwords, DNS",
		apps: ["wireguard", "vaultwarden", "pihole"],
	},
	{
		id: "travel",
		label: "Travel",
		icon: Plane,
		description: "Trip planning & logs",
		apps: ["adventurelog"],
	},
	{
		id: "statistics",
		label: "Statistics",
		icon: LineChart,
		description: "Usage stats & analytics",
		apps: ["yourspotify", "tautulli"],
	},
	{
		id: "household",
		label: "Household",
		icon: Heart,
		description: "Recipes, groceries, chores",
		apps: ["mealie", "homebox"],
	},
	{
		id: "utilities",
		label: "Utilities",
		icon: Wrench,
		description: "Dashboard, DNS, tools",
		apps: ["homarr", "duckdns"],
	},
];

// Placeholder app data for the customize section
const ALL_APPS: Record<string, { displayName: string; description: string }> = {
	jellyfin: { displayName: "Jellyfin", description: "Media server" },
	sonarr: { displayName: "Sonarr", description: "TV series manager" },
	radarr: { displayName: "Radarr", description: "Movie manager" },
	lidarr: { displayName: "Lidarr", description: "Music manager" },
	prowlarr: { displayName: "Prowlarr", description: "Indexer manager" },
	qbittorrent: { displayName: "qBittorrent", description: "Torrent client" },
	jellyseerr: { displayName: "Jellyseerr", description: "Media requests" },
	homeassistant: { displayName: "Home Assistant", description: "Home automation" },
	nodered: { displayName: "Node-RED", description: "Flow automation" },
	uptimekuma: { displayName: "Uptime Kuma", description: "Uptime monitoring" },
	glances: { displayName: "Glances", description: "System monitor" },
	affine: { displayName: "AFFiNE", description: "Knowledge base" },
	paperlessngx: { displayName: "Paperless-ngx", description: "Document management" },
	stirlingpdf: { displayName: "Stirling PDF", description: "PDF toolkit" },
	actualbudget: { displayName: "Actual Budget", description: "Budget manager" },
	wireguard: { displayName: "WireGuard", description: "VPN server" },
	vaultwarden: { displayName: "Vaultwarden", description: "Password manager" },
	pihole: { displayName: "Pi-hole", description: "DNS ad blocker" },
	adventurelog: { displayName: "AdventureLog", description: "Travel journal" },
	yourspotify: { displayName: "Your Spotify", description: "Spotify stats" },
	tautulli: { displayName: "Tautulli", description: "Plex monitoring" },
	mealie: { displayName: "Mealie", description: "Recipe manager" },
	homebox: { displayName: "Homebox", description: "Home inventory" },
	homarr: { displayName: "Homarr", description: "Dashboard" },
	duckdns: { displayName: "DuckDNS", description: "Dynamic DNS" },
};

export function AppSelectStep({
	state,
	updateState,
	onComplete,
	onBack,
}: AppSelectStepProps) {
	const [showCustomize, setShowCustomize] = useState(false);
	const [search, setSearch] = useState("");

	const toggleCategory = (categoryId: string) => {
		const category = CATEGORIES.find((c) => c.id === categoryId);
		if (!category) return;

		const isSelected = state.selectedCategories.includes(categoryId);
		const newCategories = isSelected
			? state.selectedCategories.filter((c) => c !== categoryId)
			: [...state.selectedCategories, categoryId];

		// Update apps based on categories
		let newApps = [...state.selectedApps];
		if (isSelected) {
			newApps = newApps.filter((a) => !category.apps.includes(a));
		} else {
			for (const app of category.apps) {
				if (!newApps.includes(app)) newApps.push(app);
			}
		}

		updateState({
			selectedCategories: newCategories,
			selectedApps: newApps,
		});
	};

	const toggleApp = (appName: string) => {
		const newApps = state.selectedApps.includes(appName)
			? state.selectedApps.filter((a) => a !== appName)
			: [...state.selectedApps, appName];
		updateState({ selectedApps: newApps });
	};

	const filteredApps = Object.entries(ALL_APPS).filter(
		([, app]) =>
			!search ||
			app.displayName.toLowerCase().includes(search.toLowerCase()) ||
			app.description.toLowerCase().includes(search.toLowerCase()),
	);

	return (
		<div>
			<h2 className="font-display text-2xl font-bold tracking-tight">
				Choose Applications
			</h2>
			<p className="mt-2 text-muted-foreground">
				Select categories to get started, then customize individual apps.
			</p>

			{/* Category grid */}
			<div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-3">
				{CATEGORIES.map((category) => {
					const Icon = category.icon;
					const isSelected = state.selectedCategories.includes(category.id);

					return (
						<Card
							key={category.id}
							className={cn(
								"cursor-pointer transition-colors",
								isSelected && "border-primary bg-primary/5",
							)}
							onClick={() => toggleCategory(category.id)}
						>
							<CardContent className="flex items-start gap-3 p-4">
								<Checkbox
									checked={isSelected}
									className="mt-0.5"
									onClick={(e) => e.stopPropagation()}
									onCheckedChange={() => toggleCategory(category.id)}
								/>
								<div className="min-w-0">
									<div className="flex items-center gap-2">
										<Icon className="h-4 w-4 text-muted-foreground" />
										<span className="text-sm font-medium">
											{category.label}
										</span>
									</div>
									<p className="mt-1 text-xs text-muted-foreground">
										{category.description}
									</p>
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>

			{/* Customize section */}
			<div className="mt-6">
				<button
					type="button"
					onClick={() => setShowCustomize(!showCustomize)}
					className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
				>
					<ChevronDown
						className={cn(
							"h-4 w-4 transition-transform",
							showCustomize && "rotate-180",
						)}
					/>
					Customize selection ({state.selectedApps.length} apps)
				</button>

				{showCustomize && (
					<div className="mt-4 space-y-4">
						<div className="relative max-w-xs">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder="Search apps..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="pl-9"
							/>
						</div>

						<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
							{filteredApps.map(([name, app]) => {
								const isSelected = state.selectedApps.includes(name);
								return (
									<button
										type="button"
										key={name}
										className={cn(
											"flex w-full cursor-pointer items-center gap-2 rounded-lg border p-3 text-left transition-colors",
											isSelected
												? "border-primary bg-primary/5"
												: "border-border hover:border-border/80",
										)}
										onClick={() => toggleApp(name)}
									>
										<Checkbox
											checked={isSelected}
											onClick={(e) => e.stopPropagation()}
											onCheckedChange={() => toggleApp(name)}
										/>
										<div className="min-w-0">
											<p className="text-sm font-medium leading-tight">
												{app.displayName}
											</p>
											<p className="text-xs text-muted-foreground">
												{app.description}
											</p>
										</div>
									</button>
								);
							})}
						</div>
					</div>
				)}
			</div>

			{/* Auto-added dependencies alert */}
			{state.autoAddedDeps.length > 0 && (
				<Alert className="mt-6">
					<Cloud className="h-4 w-4" />
					<AlertDescription>
						Automatically added dependencies:{" "}
						{state.autoAddedDeps.join(", ")}
					</AlertDescription>
				</Alert>
			)}

			<StepNavigation
				onBack={onBack}
				onNext={onComplete}
				nextDisabled={state.selectedApps.length === 0}
			/>
		</div>
	);
}
