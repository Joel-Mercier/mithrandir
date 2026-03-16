import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import Breadcrumbs from "#/components/Breadcrumbs";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { mockApps } from "#/lib/mock-data";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_app/apps/graph")({
	component: DependencyGraphPage,
});

const installedNames = new Set(
	mockApps.filter((a) => a.status !== "available").map((a) => a.name),
);

function AppNode({ name, label }: { name: string; label: string }) {
	const installed = installedNames.has(name);
	return (
		<Link
			to="/apps/$appName"
			params={{ appName: name }}
			className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono-data text-xs transition-colors hover:bg-accent ${
				installed
					? "border-status-healthy/40 bg-status-healthy/10 text-status-healthy"
					: "border-border bg-muted/50 text-muted-foreground"
			}`}
		>
			{label}
		</Link>
	);
}

function Arrow() {
	return (
		<span className="mx-1 text-muted-foreground" aria-hidden="true">
			<ArrowRight className="h-3.5 w-3.5" />
		</span>
	);
}

function PathNode({ path }: { path: string }) {
	return (
		<span className="inline-flex items-center rounded-md border border-dashed border-border bg-muted/30 px-2 py-0.5 font-mono-data text-xs text-muted-foreground">
			{path}
		</span>
	);
}

function DependencyGraphPage() {
	return (
		<div className="mx-auto max-w-7xl px-4 py-8">
			<Breadcrumbs />
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-display text-2xl font-bold tracking-tight">
						Dependency Graph
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						How services connect to each other
					</p>
				</div>
				<Button variant="outline" size="sm" className="gap-1.5" asChild>
					<Link to="/apps">
						<ArrowLeft className="h-3.5 w-3.5" />
						Back to Apps
					</Link>
				</Button>
			</div>

			<div className="mb-4 flex items-center gap-4 text-xs text-muted-foreground">
				<div className="flex items-center gap-1.5">
					<span className="inline-block h-2 w-2 rounded-full bg-status-healthy" />
					Installed
				</div>
				<div className="flex items-center gap-1.5">
					<span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40" />
					Not installed
				</div>
			</div>

			<div className="grid gap-4">
				{/* Media Pipeline */}
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium ">
							Media Pipeline
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<p className="text-xs font-medium text-muted-foreground">
								Core flow
							</p>
							<div className="flex flex-wrap items-center gap-y-2">
								<AppNode name="prowlarr" label="Prowlarr" />
								<Arrow />
								<AppNode name="radarr" label="Radarr" />
								<Arrow />
								<AppNode name="qbittorrent" label="qBittorrent" />
								<Arrow />
								<PathNode path="/data/media/movies" />
								<Arrow />
								<AppNode name="jellyfin" label="Jellyfin" />
							</div>
							<div className="flex flex-wrap items-center gap-y-2 pl-4 border-l-2 border-border ml-2">
								<AppNode name="prowlarr" label="Prowlarr" />
								<Arrow />
								<AppNode name="sonarr" label="Sonarr" />
								<Arrow />
								<AppNode name="qbittorrent" label="qBittorrent" />
								<Arrow />
								<PathNode path="/data/media/tv" />
								<Arrow />
								<AppNode name="jellyfin" label="Jellyfin" />
							</div>
							<div className="flex flex-wrap items-center gap-y-2 pl-4 border-l-2 border-border ml-2">
								<AppNode name="prowlarr" label="Prowlarr" />
								<Arrow />
								<AppNode name="lidarr" label="Lidarr" />
								<Arrow />
								<AppNode name="qbittorrent" label="qBittorrent" />
								<Arrow />
								<PathNode path="/data/media/music" />
								<Arrow />
								<AppNode name="navidrome" label="Navidrome" />
							</div>
						</div>

						<div className="space-y-2 border-t border-border/50 pt-4">
							<p className="text-xs font-medium text-muted-foreground">
								Supporting services
							</p>
							<div className="space-y-1.5">
								<div className="flex flex-wrap items-center gap-y-2">
									<AppNode
										name="flaresolverr"
										label="FlareSolverr"
									/>
									<Arrow />
									<AppNode name="prowlarr" label="Prowlarr" />
									<Badge
										variant="outline"
										className="ml-2 text-[10px]"
									>
										CAPTCHA solving
									</Badge>
								</div>
								<div className="flex flex-wrap items-center gap-y-2">
									<AppNode name="bazarr" label="Bazarr" />
									<Arrow />
									<AppNode name="radarr" label="Radarr" />
									<span className="mx-1 text-muted-foreground">
										,
									</span>
									<AppNode name="sonarr" label="Sonarr" />
									<Badge
										variant="outline"
										className="ml-2 text-[10px]"
									>
										subtitles
									</Badge>
								</div>
								<div className="flex flex-wrap items-center gap-y-2">
									<AppNode
										name="jellyseerr"
										label="Seerr"
									/>
									<Arrow />
									<AppNode name="radarr" label="Radarr" />
									<span className="mx-1 text-muted-foreground">
										,
									</span>
									<AppNode name="sonarr" label="Sonarr" />
									<span className="mx-1 text-muted-foreground">
										,
									</span>
									<AppNode name="jellyfin" label="Jellyfin" />
									<Badge
										variant="outline"
										className="ml-2 text-[10px]"
									>
										requests & discovery
									</Badge>
								</div>
								<div className="flex flex-wrap items-center gap-y-2">
									<AppNode
										name="profilarr"
										label="Profilarr"
									/>
									<Arrow />
									<AppNode name="radarr" label="Radarr" />
									<span className="mx-1 text-muted-foreground">
										,
									</span>
									<AppNode name="sonarr" label="Sonarr" />
									<Badge
										variant="outline"
										className="ml-2 text-[10px]"
									>
										quality profiles
									</Badge>
								</div>
							</div>
						</div>

						<div className="space-y-1.5 border-t border-border/50 pt-4">
							<p className="text-xs font-medium text-muted-foreground">
								Recommended installation order
							</p>
							<ol className="space-y-0.5 text-sm">
								<li className="flex items-baseline gap-2">
									<span className="font-mono-data text-xs text-muted-foreground w-4 shrink-0 text-right">
										1.
									</span>
									<span>qBittorrent</span>
									<span className="text-xs text-muted-foreground">
										— download client, no dependencies
									</span>
								</li>
								<li className="flex items-baseline gap-2">
									<span className="font-mono-data text-xs text-muted-foreground w-4 shrink-0 text-right">
										2.
									</span>
									<span>Prowlarr</span>
									<span className="text-xs text-muted-foreground">
										— indexer manager, auto-installs FlareSolverr
									</span>
								</li>
								<li className="flex items-baseline gap-2">
									<span className="font-mono-data text-xs text-muted-foreground w-4 shrink-0 text-right">
										3.
									</span>
									<span>Radarr</span>
									<span className="text-xs text-muted-foreground">
										— movies, connects to qBittorrent + Prowlarr
									</span>
								</li>
								<li className="flex items-baseline gap-2">
									<span className="font-mono-data text-xs text-muted-foreground w-4 shrink-0 text-right">
										4.
									</span>
									<span>Sonarr</span>
									<span className="text-xs text-muted-foreground">
										— TV, connects to qBittorrent + Prowlarr
									</span>
								</li>
								<li className="flex items-baseline gap-2">
									<span className="font-mono-data text-xs text-muted-foreground w-4 shrink-0 text-right">
										5.
									</span>
									<span>Lidarr</span>
									<span className="text-xs text-muted-foreground">
										— music, connects to qBittorrent + Prowlarr
									</span>
								</li>
								<li className="flex items-baseline gap-2">
									<span className="font-mono-data text-xs text-muted-foreground w-4 shrink-0 text-right">
										6.
									</span>
									<span>Bazarr</span>
									<span className="text-xs text-muted-foreground">
										— subtitles, connects to Radarr + Sonarr
									</span>
								</li>
								<li className="flex items-baseline gap-2">
									<span className="font-mono-data text-xs text-muted-foreground w-4 shrink-0 text-right">
										7.
									</span>
									<span>Jellyfin</span>
									<span className="text-xs text-muted-foreground">
										— media server, reads from /data/media
									</span>
								</li>
								<li className="flex items-baseline gap-2">
									<span className="font-mono-data text-xs text-muted-foreground w-4 shrink-0 text-right">
										8.
									</span>
									<span>Navidrome</span>
									<span className="text-xs text-muted-foreground">
										— music server, reads from /data/media/music
									</span>
								</li>
								<li className="flex items-baseline gap-2">
									<span className="font-mono-data text-xs text-muted-foreground w-4 shrink-0 text-right">
										9.
									</span>
									<span>Seerr</span>
									<span className="text-xs text-muted-foreground">
										— requests, connects to Radarr, Sonarr, Jellyfin
									</span>
								</li>
								<li className="flex items-baseline gap-2">
									<span className="font-mono-data text-xs text-muted-foreground w-4 shrink-0 text-right">
										10.
									</span>
									<span>Profilarr</span>
									<span className="text-xs text-muted-foreground">
										— quality profiles, connects to Radarr, Sonarr
									</span>
								</li>
							</ol>
						</div>
					</CardContent>
				</Card>

				{/* Network & Security */}
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium ">
							Network & Security
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-1.5">
						<div className="flex flex-wrap items-center gap-y-2">
							<AppNode name="duckdns" label="DuckDNS" />
							<Arrow />
							<AppNode name="caddy" label="Caddy" />
							<Arrow />
							<span className="text-sm">all apps with ports</span>
							<Badge variant="outline" className="ml-2 text-[10px]">
								wildcard HTTPS reverse proxy
							</Badge>
						</div>
						<div className="flex flex-wrap items-center gap-y-2">
							<AppNode name="caddy" label="Caddy" />
							<Arrow />
							<AppNode name="vaultwarden" label="Vaultwarden" />
							<Badge variant="outline" className="ml-2 text-[10px]">
								HTTPS required
							</Badge>
						</div>
						<div className="flex flex-wrap items-center gap-y-2">
							<AppNode name="pihole" label="Pi-hole" />
							<Badge variant="outline" className="ml-2 text-[10px]">
								standalone DNS, optional wildcard DNS for Caddy
							</Badge>
						</div>
					</CardContent>
				</Card>

				{/* Standalone */}
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium ">
							Standalone
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="mb-3 text-xs text-muted-foreground">
							No dependencies — can be installed independently
						</p>
						<div className="flex flex-wrap gap-1.5">
							<AppNode
								name="homeassistant"
								label="Home Assistant"
							/>
							<AppNode name="immich" label="Immich" />
							<AppNode name="gatus" label="Gatus" />
							<AppNode name="homarr" label="Homarr" />
							<AppNode name="wireguard" label="WireGuard" />
							<AppNode name="excalidraw" label="Excalidraw" />
							<AppNode name="omnitools" label="OmniTools" />
							<AppNode name="openwebui" label="Open WebUI" />
							<AppNode
								name="actualbudget"
								label="Actual Budget"
							/>
							<AppNode name="sure" label="Sure" />
							<AppNode name="affine" label="AFFiNE" />
							<AppNode name="n8n" label="n8n" />
							<AppNode name="penpot" label="Penpot" />
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
