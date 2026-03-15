import { createFileRoute } from "@tanstack/react-router";
import {
	Archive,
	Globe,
	Plus,
	Save,
	Server,
	Settings,
	Shield,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Breadcrumbs from "#/components/Breadcrumbs";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Separator } from "#/components/ui/separator";
import { Switch } from "#/components/ui/switch";
import { mockConfig, mockVersion } from "#/lib/mock-data";

export const Route = createFileRoute("/_app/settings")({
	component: SettingsPage,
});

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
	);
}

const tabs = [
	{ id: "general", label: "General", icon: Settings },
	{ id: "network", label: "Network", icon: Globe },
	{ id: "backup", label: "Backup", icon: Archive },
	{ id: "about", label: "About", icon: Server },
] as const;

type TabId = (typeof tabs)[number]["id"];

function SettingsPage() {
	const [activeTab, setActiveTab] = useState<TabId>("general");

	return (
		<div className="mx-auto max-w-7xl px-4 py-8">
			<Breadcrumbs />
			<div className="mb-6">
				<h1 className="font-display text-2xl font-bold tracking-tight">
					Settings
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					System configuration and preferences
				</p>
			</div>

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
					{activeTab === "general" && <GeneralTab />}
					{activeTab === "network" && <NetworkTab />}
					{activeTab === "backup" && <BackupTab />}
					{activeTab === "about" && <AboutTab />}
				</div>
			</div>
		</div>
	);
}

function GeneralTab() {
	return (
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-medium">
						System Configuration
					</CardTitle>
					<CardDescription>
						Core settings for your homelab instance
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="baseDir">Base directory</Label>
						<Input
							id="baseDir"
							defaultValue={mockConfig.baseDir}
							className="font-mono-data"
							readOnly
						/>
						<p className="text-xs text-muted-foreground">
							Root directory for all app configurations
						</p>
					</div>
					<div className="space-y-2">
						<Label htmlFor="timezone">Timezone</Label>
						<Input
							id="timezone"
							defaultValue={mockConfig.timezone}
							className="font-mono-data"
						/>
					</div>
					<Separator />
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="puid">PUID</Label>
							<Input
								id="puid"
								defaultValue={String(mockConfig.puid)}
								className="font-mono-data"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="pgid">PGID</Label>
							<Input
								id="pgid"
								defaultValue={String(mockConfig.pgid)}
								className="font-mono-data"
							/>
						</div>
					</div>
					<Button
						className="gap-2"
						onClick={() => toast.success("Settings saved.")}
					>
						<Save className="h-4 w-4" />
						Save Changes
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-medium">Docker Engine</CardTitle>
					<CardDescription>Docker daemon status and management</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex items-center justify-between">
						<span className="text-sm text-muted-foreground">Status</span>
						<div className="flex items-center gap-2">
							<span className="inline-block h-2 w-2 rounded-full bg-status-healthy" />
							<span className="font-mono-data text-xs">running</span>
						</div>
					</div>
					<Row label="Version">27.5.1</Row>
					<Row label="Storage driver">overlay2</Row>
					<Row label="Containers">8 (7 running)</Row>
					<Row label="Images">12</Row>
				</CardContent>
			</Card>
		</div>
	);
}

function NetworkTab() {
	return (
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-medium">HTTPS</CardTitle>
					<CardDescription>
						Caddy reverse proxy with automatic TLS
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50">
						<div className="space-y-0.5">
							<Label>Enable HTTPS</Label>
							<p className="text-xs text-muted-foreground">
								Wildcard TLS via DuckDNS DNS-01 challenge
							</p>
						</div>
						<Switch defaultChecked={mockConfig.httpsEnabled} />
					</div>
					<Separator />
					<div className="space-y-2">
						<Label htmlFor="acmeEmail">ACME Email</Label>
						<Input
							id="acmeEmail"
							defaultValue={mockConfig.acmeEmail}
							className="font-mono-data"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="domain">DuckDNS Domain</Label>
						<Input
							id="domain"
							defaultValue={mockConfig.duckdnsDomain}
							className="font-mono-data"
							readOnly
						/>
						<p className="text-xs text-muted-foreground">
							Derived from DuckDNS subdomains configuration
						</p>
					</div>
					<Button
						className="gap-2"
						onClick={() => toast.success("Settings saved.")}
					>
						<Save className="h-4 w-4" />
						Save Changes
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-medium">Firewall</CardTitle>
					<CardDescription>UFW + ufw-docker integration</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50">
						<div className="space-y-0.5">
							<Label>Enable Firewall</Label>
							<p className="text-xs text-muted-foreground">
								Automatically manage UFW rules for Docker containers
							</p>
						</div>
						<Switch defaultChecked={mockConfig.firewallEnabled} />
					</div>
					<Separator />
					<div className="space-y-2 text-sm">
						<p className="font-medium">Active rules</p>
						<div className="space-y-0 overflow-hidden rounded-lg border border-border/50">
							{[
								"22/tcp — SSH (allow)",
								"8096/tcp — Jellyfin (ufw-docker)",
								"7878/tcp — Radarr (ufw-docker)",
								"8989/tcp — Sonarr (ufw-docker)",
								"8123/tcp — Home Assistant (allow)",
								"53/tcp,udp — Pi-hole (ufw-docker)",
							].map((rule, i) => (
								<div
									key={rule}
									className={`flex items-center px-3 py-2 font-mono-data text-xs transition-colors hover:bg-muted/50 ${i > 0 ? "border-t border-border/50" : ""}`}
								>
									{rule}
								</div>
							))}
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

function BackupTab() {
	return (
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-medium">
						Backup Configuration
					</CardTitle>
					<CardDescription>Schedule and retention settings</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="backupDir">Backup directory</Label>
						<Input
							id="backupDir"
							defaultValue={mockConfig.backupDir}
							className="font-mono-data"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="backupHour">Backup hour (0-23)</Label>
						<Input
							id="backupHour"
							type="number"
							min={0}
							max={23}
							defaultValue={String(mockConfig.backupHour)}
							className="font-mono-data"
						/>
						<p className="text-xs text-muted-foreground">
							Hour when the daily systemd timer runs
						</p>
					</div>
					<Separator />
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="localRetention">Local retention</Label>
							<Input
								id="localRetention"
								type="number"
								defaultValue={String(mockConfig.localRetention)}
								className="font-mono-data"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="remoteRetention">Remote retention</Label>
							<Input
								id="remoteRetention"
								type="number"
								defaultValue={String(mockConfig.remoteRetention)}
								className="font-mono-data"
							/>
						</div>
					</div>
					<Button
						className="gap-2"
						onClick={() => toast.success("Settings saved.")}
					>
						<Save className="h-4 w-4" />
						Save Changes
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-medium">
						Encryption & Remotes
					</CardTitle>
					<CardDescription>Backup security and remote storage</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50">
						<div className="space-y-0.5">
							<Label>Encryption</Label>
							<p className="text-xs text-muted-foreground">
								AES-256-CBC via OpenSSL
							</p>
						</div>
						<Badge
							variant="outline"
							className={
								mockConfig.backupPassword
									? "border-status-healthy/30 bg-status-healthy/15 text-status-healthy"
									: ""
							}
						>
							<Shield className="mr-1 h-3 w-3" />
							{mockConfig.backupPassword ? "Enabled" : "Disabled"}
						</Badge>
					</div>
					<Separator />
					<div className="space-y-3">
						<p className="text-sm font-medium">Configured remotes</p>
						<div className="space-y-2">
							{mockConfig.remotes.map((remote) => (
								<div
									key={remote}
									className="group flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5 transition-colors hover:bg-muted/50"
								>
									<div className="flex items-center gap-2">
										<span className="font-mono-data text-sm">{remote}</span>
										<Badge variant="outline" className="text-xs">
											rclone
										</Badge>
									</div>
									<Button
										variant="ghost"
										size="icon-xs"
										className="opacity-0 transition-opacity group-hover:opacity-100"
									>
										<Trash2 className="h-3 w-3 text-muted-foreground" />
									</Button>
								</div>
							))}
						</div>
						<Button variant="outline" size="sm" className="w-full gap-1.5">
							<Plus className="h-3.5 w-3.5" />
							Add Remote
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

function AboutTab() {
	return (
		<Card className="max-w-lg">
			<CardHeader>
				<CardTitle className="text-sm font-medium">About Mithrandir</CardTitle>
				<CardDescription>
					Automated Docker-based homelab management
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				<Row label="Version">v{mockVersion.version}</Row>
				<Row label="Commit">{mockVersion.gitCommit.slice(0, 7)}</Row>
				<Row label="Build date">{mockVersion.buildDate}</Row>
				<Separator />
				<div className="flex gap-2">
					<Button variant="outline" size="sm" className="gap-1.5">
						Check for Updates
					</Button>
					<Button variant="outline" size="sm" className="gap-1.5">
						View Changelog
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
