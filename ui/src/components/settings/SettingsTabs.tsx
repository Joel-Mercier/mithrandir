import { Plus, Save, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Row } from "#/components/Row";
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
import { Skeleton } from "#/components/ui/skeleton";
import { Switch } from "#/components/ui/switch";
import { useConfig, useVersion, useUpdateConfig } from "#/hooks/homelab";

function SettingsCardSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-4 w-40" />
				<Skeleton className="h-3 w-56" />
			</CardHeader>
			<CardContent className="space-y-4">
				<Skeleton className="h-9 w-full" />
				<Skeleton className="h-9 w-full" />
				<Skeleton className="h-9 w-full" />
			</CardContent>
		</Card>
	);
}

export function GeneralTab() {
	const configQuery = useConfig();
	const config = configQuery.data;
	const updateConfigMutation = useUpdateConfig();

	if (configQuery.isPending) {
		return (
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<SettingsCardSkeleton />
				<SettingsCardSkeleton />
			</div>
		);
	}

	if (!config) {
		return (
			<div className="py-8 text-center text-sm text-muted-foreground">
				Failed to load configuration.
			</div>
		);
	}

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
							defaultValue={config.baseDir}
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
							defaultValue={config.timezone}
							className="font-mono-data"
						/>
					</div>
					<Separator />
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="puid">PUID</Label>
							<Input
								id="puid"
								defaultValue={String(config.puid)}
								className="font-mono-data"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="pgid">PGID</Label>
							<Input
								id="pgid"
								defaultValue={String(config.pgid)}
								className="font-mono-data"
							/>
						</div>
					</div>
					<Button
						className="gap-2"
						disabled={updateConfigMutation.isPending}
						onClick={() => {
							const tz = (
								document.getElementById("timezone") as HTMLInputElement
							)?.value;
							const puid = parseInt(
								(document.getElementById("puid") as HTMLInputElement)?.value ??
									"1000",
								10,
							);
							const pgid = parseInt(
								(document.getElementById("pgid") as HTMLInputElement)?.value ??
									"1000",
								10,
							);
							updateConfigMutation.mutate(
								{ timezone: tz, puid, pgid },
								{
									onSuccess: () => toast.success("Settings saved."),
									onError: (err) =>
										toast.error(`Failed to save: ${err.message}`),
								},
							);
						}}
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

export function NetworkTab() {
	const configQuery = useConfig();
	const config = configQuery.data;
	const updateConfigMutation = useUpdateConfig();

	if (configQuery.isPending) {
		return (
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<SettingsCardSkeleton />
				<SettingsCardSkeleton />
			</div>
		);
	}

	if (!config) {
		return (
			<div className="py-8 text-center text-sm text-muted-foreground">
				Failed to load configuration.
			</div>
		);
	}

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
						<Switch defaultChecked={config.httpsEnabled} />
					</div>
					<Separator />
					<div className="space-y-2">
						<Label htmlFor="acmeEmail">ACME Email</Label>
						<Input
							id="acmeEmail"
							defaultValue={config.acmeEmail}
							className="font-mono-data"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="domain">DuckDNS Domain</Label>
						<Input
							id="domain"
							defaultValue={config.duckdnsDomain}
							className="font-mono-data"
							readOnly
						/>
						<p className="text-xs text-muted-foreground">
							Derived from DuckDNS subdomains configuration
						</p>
					</div>
					<Button
						className="gap-2"
						disabled={updateConfigMutation.isPending}
						onClick={() => {
							const acmeEmail = (
								document.getElementById("acmeEmail") as HTMLInputElement
							)?.value;
							updateConfigMutation.mutate(
								{ acmeEmail },
								{
									onSuccess: () => toast.success("Settings saved."),
									onError: (err) =>
										toast.error(`Failed to save: ${err.message}`),
								},
							);
						}}
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
						<Switch defaultChecked={config.firewallEnabled} />
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

export function BackupTab() {
	const configQuery = useConfig();
	const config = configQuery.data;
	const updateConfigMutation = useUpdateConfig();

	if (configQuery.isPending) {
		return (
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<SettingsCardSkeleton />
				<SettingsCardSkeleton />
			</div>
		);
	}

	if (!config) {
		return (
			<div className="py-8 text-center text-sm text-muted-foreground">
				Failed to load configuration.
			</div>
		);
	}

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
							defaultValue={config.backupDir}
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
							defaultValue={String(config.backupHour)}
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
								defaultValue={String(config.localRetention)}
								className="font-mono-data"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="remoteRetention">Remote retention</Label>
							<Input
								id="remoteRetention"
								type="number"
								defaultValue={String(config.remoteRetention)}
								className="font-mono-data"
							/>
						</div>
					</div>
					<Button
						className="gap-2"
						disabled={updateConfigMutation.isPending}
						onClick={() => {
							const backupDir = (
								document.getElementById("backupDir") as HTMLInputElement
							)?.value;
							const backupHour = parseInt(
								(document.getElementById("backupHour") as HTMLInputElement)
									?.value ?? "2",
								10,
							);
							const localRetention = parseInt(
								(
									document.getElementById(
										"localRetention",
									) as HTMLInputElement
								)?.value ?? "5",
								10,
							);
							const remoteRetention = parseInt(
								(
									document.getElementById(
										"remoteRetention",
									) as HTMLInputElement
								)?.value ?? "10",
								10,
							);
							updateConfigMutation.mutate(
								{ backupDir, backupHour, localRetention, remoteRetention },
								{
									onSuccess: () => toast.success("Settings saved."),
									onError: (err) =>
										toast.error(`Failed to save: ${err.message}`),
								},
							);
						}}
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
								config.backupPassword
									? "border-status-healthy/30 bg-status-healthy/15 text-status-healthy"
									: ""
							}
						>
							<Shield className="mr-1 h-3 w-3" />
							{config.backupPassword ? "Enabled" : "Disabled"}
						</Badge>
					</div>
					<Separator />
					<div className="space-y-3">
						<p className="text-sm font-medium">Configured remotes</p>
						{config.remotes.length > 0 ? (
							<div className="space-y-2">
								{config.remotes.map((remote) => (
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
						) : (
							<p className="text-sm text-muted-foreground">
								No remotes configured.
							</p>
						)}
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

export function AboutTab() {
	const versionQuery = useVersion();

	if (versionQuery.isPending) {
		return (
			<Card className="max-w-lg">
				<CardHeader>
					<Skeleton className="h-4 w-36" />
					<Skeleton className="h-3 w-56" />
				</CardHeader>
				<CardContent className="space-y-3">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-3/4" />
					<Skeleton className="h-4 w-1/2" />
				</CardContent>
			</Card>
		);
	}

	const version = versionQuery.data;

	if (!version) {
		return (
			<Card className="max-w-lg">
				<CardHeader>
					<CardTitle className="text-sm font-medium">
						About Mithrandir
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						Version information not available.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="max-w-lg">
			<CardHeader>
				<CardTitle className="text-sm font-medium">About Mithrandir</CardTitle>
				<CardDescription>
					Automated Docker-based homelab management
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				<Row label="Version">v{version.version}</Row>
				<Row label="Commit">{version.gitCommit.slice(0, 7)}</Row>
				<Row label="Build date">{version.buildDate}</Row>
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
