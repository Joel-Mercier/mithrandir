import { Link } from "@tanstack/react-router";
import {
	ArrowRight,
	CheckCircle2,
	ExternalLink,
	Info,
	Shield,
} from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent } from "#/components/ui/card";
import type { SetupState } from "../SetupWizard";

interface SummaryStepProps {
	state: SetupState;
}

// Placeholder port mapping
const APP_PORTS: Record<string, number> = {
	jellyfin: 8096,
	sonarr: 8989,
	radarr: 7878,
	lidarr: 8686,
	prowlarr: 9696,
	qbittorrent: 8080,
	jellyseerr: 5055,
	homeassistant: 8123,
	uptimekuma: 3001,
	pihole: 80,
	wireguard: 51820,
	vaultwarden: 3012,
	homarr: 7575,
	affine: 3010,
	paperlessngx: 8000,
	stirlingpdf: 8080,
	actualbudget: 5006,
	adventurelog: 3000,
	yourspotify: 3000,
	tautulli: 8181,
	mealie: 9925,
	homebox: 7745,
	nodered: 1880,
	glances: 61208,
};

const APP_NAMES: Record<string, string> = {
	jellyfin: "Jellyfin",
	sonarr: "Sonarr",
	radarr: "Radarr",
	lidarr: "Lidarr",
	prowlarr: "Prowlarr",
	qbittorrent: "qBittorrent",
	jellyseerr: "Jellyseerr",
	homeassistant: "Home Assistant",
	uptimekuma: "Uptime Kuma",
	pihole: "Pi-hole",
	wireguard: "WireGuard",
	vaultwarden: "Vaultwarden",
	homarr: "Homarr",
	duckdns: "DuckDNS",
	affine: "AFFiNE",
	paperlessngx: "Paperless-ngx",
	stirlingpdf: "Stirling PDF",
	actualbudget: "Actual Budget",
	adventurelog: "AdventureLog",
	yourspotify: "Your Spotify",
	tautulli: "Tautulli",
	mealie: "Mealie",
	homebox: "Homebox",
	nodered: "Node-RED",
	glances: "Glances",
};

export function SummaryStep({ state }: SummaryStepProps) {
	const domain = state.secrets.DUCKDNS_SUBDOMAINS
		? `${state.secrets.DUCKDNS_SUBDOMAINS}.duckdns.org`
		: null;

	const serviceApps = state.selectedApps.filter(
		(a) => a !== "duckdns" && APP_PORTS[a],
	);

	return (
		<div>
			{/* Success hero */}
			<div className="text-center">
				<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-status-healthy/10 ring-4 ring-status-healthy/20">
					<CheckCircle2 className="h-8 w-8 text-status-healthy" />
				</div>
				<h1 className="font-display text-3xl font-bold tracking-tight text-status-healthy">
					Setup Complete
				</h1>
				<p className="mt-2 text-muted-foreground">
					Your homelab is up and running with {state.selectedApps.length}{" "}
					apps installed.
				</p>
			</div>

			{/* Service URLs */}
			{serviceApps.length > 0 && (
				<div className="mt-8">
					<h3 className="mb-3 text-sm font-medium text-muted-foreground">
						Your Services
					</h3>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{serviceApps.map((app) => {
							const port = APP_PORTS[app];
							const url =
								state.httpsEnabled && domain
									? `https://${app}.${domain}`
									: `http://localhost:${port}`;

							return (
								<Card key={app}>
									<CardContent className="flex items-center justify-between p-4">
										<div className="flex items-center gap-3">
											<div className="h-2 w-2 rounded-full bg-status-healthy" />
											<div>
												<Link
													to="/apps/$appName"
													params={{ appName: app }}
													className="text-sm font-medium hover:underline"
												>
													{APP_NAMES[app] ?? app}
												</Link>
												<p className="font-mono-data text-xs text-muted-foreground">
													{url}
												</p>
											</div>
										</div>
										<a
											href={url}
											target="_blank"
											rel="noopener noreferrer"
											className="text-muted-foreground hover:text-foreground"
										>
											<ExternalLink className="h-3.5 w-3.5" />
										</a>
									</CardContent>
								</Card>
							);
						})}
					</div>
				</div>
			)}

			{/* Config summary */}
			<div className="mt-8 space-y-3">
				<h3 className="text-sm font-medium text-muted-foreground">
					Configuration
				</h3>
				<div className="flex flex-wrap gap-2">
					<Badge variant="outline" className="gap-1">
						Base: {state.baseDir}
					</Badge>
					{state.httpsEnabled && (
						<Badge variant="outline" className="gap-1">
							<Shield className="h-3 w-3" />
							HTTPS enabled
						</Badge>
					)}
					{state.firewallEnabled && (
						<Badge variant="outline" className="gap-1">
							<Shield className="h-3 w-3" />
							Firewall enabled
						</Badge>
					)}
					<Badge variant="outline">
						Backup at {state.backupHour}:00
					</Badge>
				</div>
			</div>

			{/* Tips */}
			<Card className="mt-8">
				<CardContent className="space-y-2 p-4">
					<div className="flex items-center gap-2 text-sm font-medium">
						<Info className="h-4 w-4 text-muted-foreground" />
						Tips
					</div>
					<ul className="space-y-1 text-xs text-muted-foreground">
						{state.selectedApps.includes("wireguard") && (
							<li>
								WireGuard peer configs are in{" "}
								<code className="font-mono-data">
									{state.baseDir}/configs/wireguard
								</code>
							</li>
						)}
						{state.selectedApps.includes("jellyfin") && (
							<li>
								Add media libraries in Jellyfin's dashboard after first
								login.
							</li>
						)}
						<li>
							Run{" "}
							<code className="font-mono-data">mithrandir status</code> to
							check all services.
						</li>
						<li>
							Backups run automatically — check with{" "}
							<code className="font-mono-data">
								mithrandir backup list
							</code>
							.
						</li>
					</ul>
				</CardContent>
			</Card>

			{/* Go to dashboard */}
			<div className="mt-8 text-center">
				<Button asChild size="lg" className="gap-2">
					<Link to="/">
						Go to Dashboard
						<ArrowRight className="h-4 w-4" />
					</Link>
				</Button>
			</div>
		</div>
	);
}
