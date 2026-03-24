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
import { useConfig, useUpdateConfig, useVersion } from "#/hooks/homelab";
import { m } from "#/paraglide/messages.js";

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
				{m.settings_failedToLoad()}
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-medium">
						{m.settings_systemConfig()}
					</CardTitle>
					<CardDescription>{m.settings_systemConfigDesc()}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="baseDir">{m.settings_baseDir()}</Label>
						<Input
							id="baseDir"
							defaultValue={config.baseDir}
							className="font-mono-data"
							readOnly
						/>
						<p className="text-xs text-muted-foreground">
							{m.settings_baseDirDesc()}
						</p>
					</div>
					<div className="space-y-2">
						<Label htmlFor="timezone">{m.settings_timezone()}</Label>
						<Input
							id="timezone"
							defaultValue={config.timezone}
							className="font-mono-data"
						/>
					</div>
					<Separator />
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="puid">{m.settings_puid()}</Label>
							<Input
								id="puid"
								defaultValue={String(config.puid)}
								className="font-mono-data"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="pgid">{m.settings_pgid()}</Label>
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
									onSuccess: () => toast.success(m.settings_saved()),
									onError: (err) =>
										toast.error(`Failed to save: ${err.message}`),
								},
							);
						}}
					>
						<Save className="h-4 w-4" />
						{m.common_save()}
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-medium">
						{m.settings_dockerEngine()}
					</CardTitle>
					<CardDescription>{m.settings_dockerDesc()}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex items-center justify-between">
						<span className="text-sm text-muted-foreground">
							{m.settings_dockerStatus()}
						</span>
						<div className="flex items-center gap-2">
							<span className="inline-block h-2 w-2 rounded-full bg-status-healthy" />
							<span className="font-mono-data text-xs">running</span>
						</div>
					</div>
					<Row label={m.settings_dockerVersion()}>27.5.1</Row>
					<Row label={m.settings_dockerStorageDriver()}>overlay2</Row>
					<Row label={m.settings_dockerContainers()}>8 (7 running)</Row>
					<Row label={m.settings_dockerImages()}>12</Row>
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
				{m.settings_failedToLoad()}
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-medium">
						{m.settings_https()}
					</CardTitle>
					<CardDescription>{m.settings_httpsDesc()}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50">
						<div className="space-y-0.5">
							<Label>{m.settings_enableHttps()}</Label>
							<p className="text-xs text-muted-foreground">
								{m.settings_httpsNote()}
							</p>
						</div>
						<Switch defaultChecked={config.httpsEnabled} />
					</div>
					<Separator />
					<div className="space-y-2">
						<Label htmlFor="acmeEmail">{m.settings_acmeEmail()}</Label>
						<Input
							id="acmeEmail"
							defaultValue={config.acmeEmail}
							className="font-mono-data"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="domain">{m.settings_duckdnsDomain()}</Label>
						<Input
							id="domain"
							defaultValue={config.duckdnsDomain}
							className="font-mono-data"
							readOnly
						/>
						<p className="text-xs text-muted-foreground">
							{m.settings_duckdnsDomainDesc()}
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
									onSuccess: () => toast.success(m.settings_saved()),
									onError: (err) =>
										toast.error(`Failed to save: ${err.message}`),
								},
							);
						}}
					>
						<Save className="h-4 w-4" />
						{m.common_save()}
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-medium">
						{m.settings_firewall()}
					</CardTitle>
					<CardDescription>{m.settings_firewallDesc()}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50">
						<div className="space-y-0.5">
							<Label>{m.settings_enableFirewall()}</Label>
							<p className="text-xs text-muted-foreground">
								{m.settings_firewallNote()}
							</p>
						</div>
						<Switch defaultChecked={config.firewallEnabled} />
					</div>
					<Separator />
					<div className="space-y-2 text-sm">
						<p className="font-medium">{m.settings_activeRules()}</p>
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
				{m.settings_failedToLoad()}
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-medium">
						{m.settings_backupConfig()}
					</CardTitle>
					<CardDescription>{m.settings_backupConfigDesc()}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="backupDir">{m.settings_backupDir()}</Label>
						<Input
							id="backupDir"
							defaultValue={config.backupDir}
							className="font-mono-data"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="backupHour">{m.settings_backupHour()}</Label>
						<Input
							id="backupHour"
							type="number"
							min={0}
							max={23}
							defaultValue={String(config.backupHour)}
							className="font-mono-data"
						/>
						<p className="text-xs text-muted-foreground">
							{m.settings_backupHourDesc()}
						</p>
					</div>
					<Separator />
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="localRetention">
								{m.settings_localRetention()}
							</Label>
							<Input
								id="localRetention"
								type="number"
								defaultValue={String(config.localRetention)}
								className="font-mono-data"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="remoteRetention">
								{m.settings_remoteRetention()}
							</Label>
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
								(document.getElementById("localRetention") as HTMLInputElement)
									?.value ?? "5",
								10,
							);
							const remoteRetention = parseInt(
								(document.getElementById("remoteRetention") as HTMLInputElement)
									?.value ?? "10",
								10,
							);
							updateConfigMutation.mutate(
								{ backupDir, backupHour, localRetention, remoteRetention },
								{
									onSuccess: () => toast.success(m.settings_saved()),
									onError: (err) =>
										toast.error(`Failed to save: ${err.message}`),
								},
							);
						}}
					>
						<Save className="h-4 w-4" />
						{m.common_save()}
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-medium">
						{m.settings_encryptionRemotes()}
					</CardTitle>
					<CardDescription>
						{m.settings_encryptionRemotesDesc()}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50">
						<div className="space-y-0.5">
							<Label>{m.settings_encryption()}</Label>
							<p className="text-xs text-muted-foreground">
								{m.settings_encryptionDesc()}
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
							{config.backupPassword ? m.common_enabled() : m.common_disabled()}
						</Badge>
					</div>
					<Separator />
					<div className="space-y-3">
						<p className="text-sm font-medium">
							{m.settings_configuredRemotes()}
						</p>
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
								{m.settings_noRemotes()}
							</p>
						)}
						<Button variant="outline" size="sm" className="w-full gap-1.5">
							<Plus className="h-3.5 w-3.5" />
							{m.settings_addRemote()}
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
						{m.settings_aboutMithrandir()}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						{m.settings_versionNotAvailable()}
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="max-w-lg">
			<CardHeader>
				<CardTitle className="text-sm font-medium">
					{m.settings_aboutMithrandir()}
				</CardTitle>
				<CardDescription>{m.settings_aboutDesc()}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				<Row label={m.settings_version()}>v{version.version}</Row>
				<Row label={m.settings_commit()}>{version.gitCommit.slice(0, 7)}</Row>
				<Row label={m.settings_buildDate()}>{version.buildDate}</Row>
				<Separator />
				<div className="flex gap-2">
					<Button variant="outline" size="sm" className="gap-1.5">
						{m.settings_checkUpdates()}
					</Button>
					<Button variant="outline" size="sm" className="gap-1.5">
						{m.settings_viewChangelog()}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
