import { useNavigate } from "@tanstack/react-router";
import {
	AlertTriangle,
	ArrowRight,
	Check,
	Plus,
	Save,
	Shield,
	Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Row } from "#/components/Row";
import { PathInput } from "#/components/settings/PathInput";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "#/components/ui/alert-dialog";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";
import { Spinner } from "#/components/ui/spinner";
import { Switch } from "#/components/ui/switch";
import { TimezoneSelect } from "#/components/settings/TimezoneSelect";
import {
	useAddBackupRemote,
	useCheckForUpdates,
	useConfig,
	useDisableFirewall,
	useDisableHttps,
	useDisableSso,
	useEnableFirewall,
	useEnableHttps,
	useEnableSso,
	useFirewallPrerequisites,
	useFirewallRules,
	useHttpsPrerequisites,
	useSsoClients,
	useRcloneInstalled,
	useRemoveBackupRemote,
	useUpdateConfig,
	useVersion,
} from "#/hooks/homelab";
import type { SystemConfig } from "#/lib/types";
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
	const [timezone, setTimezone] = useState("");
	const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
	const navigate = useNavigate();

	useEffect(() => {
		if (config?.timezone) setTimezone(config.timezone);
	}, [config?.timezone]);

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
		<>
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
							<Label>{m.settings_timezone()}</Label>
							<TimezoneSelect
								value={timezone}
								onValueChange={setTimezone}
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
									{ timezone, puid, pgid },
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

			{/* Danger Zone */}
			<Card className="mt-4 border-destructive/30">
				<CardHeader>
					<CardTitle className="text-sm font-medium text-destructive">
						{m.remove_dangerZone()}
					</CardTitle>
					<CardDescription>{m.remove_dangerZoneDesc()}</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-between gap-4">
						<div className="min-w-0">
							<p className="text-sm font-medium">{m.remove_dangerZoneButton()}</p>
							<p className="mt-0.5 text-xs text-muted-foreground">
								{m.remove_dangerZoneDescription()}
							</p>
						</div>
						<AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
							<AlertDialogTrigger asChild>
								<Button variant="destructive" size="sm" className="shrink-0 gap-1.5">
									<Trash2 className="h-3.5 w-3.5" />
									{m.remove_dangerZoneButton()}
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent className="bg-background/95 backdrop-blur">
								<AlertDialogHeader>
									<AlertDialogTitle>{m.remove_confirmTitle()}</AlertDialogTitle>
									<AlertDialogDescription>
										{m.remove_confirmDescription()}
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>{m.common_cancel()}</AlertDialogCancel>
									<AlertDialogAction
										className="bg-status-critical text-white hover:bg-status-critical/90"
										onClick={() => {
											navigate({ to: "/remove" });
										}}
									>
										{m.remove_confirmAction()}
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				</CardContent>
			</Card>
		</>
	);
}

export function NetworkTab() {
	const configQuery = useConfig();
	const config = configQuery.data;
	const updateConfigMutation = useUpdateConfig();
	const prereqsQuery = useHttpsPrerequisites();
	const enableHttpsMutation = useEnableHttps();
	const disableHttpsMutation = useDisableHttps();

	const [acmeEmail, setAcmeEmail] = useState("");
	const [emailSaved, setEmailSaved] = useState(false);

	// Sync form state when config loads
	useEffect(() => {
		if (config) {
			setAcmeEmail(config.acmeEmail);
			setEmailSaved(!!config.acmeEmail);
		}
	}, [config]);

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

	const prereqs = prereqsQuery.data;
	const isHttpsBusy =
		enableHttpsMutation.isPending || disableHttpsMutation.isPending;
	const emailValid = acmeEmail.trim().includes("@");
	const canToggleHttps =
		prereqs?.ready && emailSaved && emailValid && !isHttpsBusy;

	const handleSaveEmail = () => {
		updateConfigMutation.mutate(
			{ acmeEmail: acmeEmail.trim() },
			{
				onSuccess: () => {
					toast.success(m.settings_saved());
					setEmailSaved(true);
				},
				onError: (err) => toast.error(`Failed to save: ${err.message}`),
			},
		);
	};

	const handleHttpsToggle = async (checked: boolean) => {
		if (checked) {
			enableHttpsMutation.mutate(acmeEmail.trim(), {
				onSuccess: () => toast.success("HTTPS enabled with Caddy"),
				onError: (err) => toast.error(`Failed to enable HTTPS: ${err.message}`),
			});
		} else {
			disableHttpsMutation.mutate(undefined, {
				onSuccess: () => toast.success("HTTPS disabled"),
				onError: (err) =>
					toast.error(`Failed to disable HTTPS: ${err.message}`),
			});
		}
	};

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
					{/* Prerequisites warning */}
					{prereqs && !prereqs.ready && (
						<Alert className="border-status-warning/30 bg-status-warning/5 text-status-warning">
							<AlertTriangle className="h-4 w-4" />
							<AlertDescription className="space-y-1">
								{!prereqs.duckdnsConfigured && (
									<p>DuckDNS secrets are not configured in .env</p>
								)}
								{prereqs.duckdnsConfigured && !prereqs.duckdnsInstalled && (
									<p>DuckDNS app is not installed</p>
								)}
								{prereqs.duckdnsInstalled && !prereqs.duckdnsRunning && (
									<p>DuckDNS container is not running</p>
								)}
								{!prereqs.domain && prereqs.duckdnsConfigured && (
									<p>Could not derive domain from DuckDNS config</p>
								)}
							</AlertDescription>
						</Alert>
					)}

					{/* HTTPS toggle */}
					<div className="flex items-center justify-between rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50">
						<div className="space-y-0.5">
							<Label>{m.settings_enableHttps()}</Label>
							<p className="text-xs text-muted-foreground">
								{m.settings_httpsNote()}
							</p>
						</div>
						<div className="flex items-center gap-2">
							{isHttpsBusy && <Spinner size="sm" />}
							<Switch
								checked={config.httpsEnabled}
								disabled={config.httpsEnabled ? isHttpsBusy : !canToggleHttps}
								onCheckedChange={handleHttpsToggle}
							/>
						</div>
					</div>
					<Separator />
					<div className="space-y-2">
						<Label htmlFor="acmeEmail">{m.settings_acmeEmail()}</Label>
						<Input
							id="acmeEmail"
							value={acmeEmail}
							onChange={(e) => {
								setAcmeEmail(e.target.value);
								setEmailSaved(false);
							}}
							className="font-mono-data"
							placeholder="you@example.com"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="domain">{m.settings_duckdnsDomain()}</Label>
						<Input
							id="domain"
							value={prereqs?.domain ?? config.duckdnsDomain}
							className="font-mono-data"
							readOnly
						/>
						<p className="text-xs text-muted-foreground">
							{m.settings_duckdnsDomainDesc()}
						</p>
					</div>
					<Button
						className="gap-2"
						disabled={
							updateConfigMutation.isPending || !emailValid || emailSaved
						}
						onClick={handleSaveEmail}
					>
						{emailSaved ? (
							<Check className="h-4 w-4" />
						) : (
							<Save className="h-4 w-4" />
						)}
						{emailSaved ? "Saved" : m.common_save()}
					</Button>
				</CardContent>
			</Card>

			<FirewallCard config={config} />
			<SsoCard config={config} />
		</div>
	);
}

function SsoCard({ config }: { config: SystemConfig }) {
	const enableSsoMutation = useEnableSso();
	const disableSsoMutation = useDisableSso();
	const ssoClientsQuery = useSsoClients();

	const isSsoBusy =
		enableSsoMutation.isPending || disableSsoMutation.isPending;

	const handleSsoToggle = async (checked: boolean) => {
		if (checked) {
			enableSsoMutation.mutate(undefined, {
				onSuccess: () => toast.success("SSO enabled"),
				onError: (err) =>
					toast.error(`Failed to enable SSO: ${err.message}`),
			});
		} else {
			disableSsoMutation.mutate(undefined, {
				onSuccess: () => toast.success("SSO disabled"),
				onError: (err) =>
					toast.error(`Failed to disable SSO: ${err.message}`),
			});
		}
	};

	const clients = ssoClientsQuery.data ?? [];

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-medium">
					Single Sign-On (SSO)
				</CardTitle>
				<CardDescription>
					Use Mithrandir as an OAuth/OIDC provider for your homelab apps
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<Alert className="border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400">
					<AlertDescription>
						When enabled, apps like Immich and Paperless-ngx can use
						Mithrandir for login. Requires a UI restart after toggling.
					</AlertDescription>
				</Alert>

				<div className="flex items-center justify-between rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50">
					<div className="space-y-0.5">
						<Label>Enable SSO Provider</Label>
						<p className="text-xs text-muted-foreground">
							Expose OAuth 2.1 / OIDC endpoints for homelab apps
						</p>
					</div>
					<div className="flex items-center gap-2">
						{isSsoBusy && <Spinner size="sm" />}
						<Switch
							checked={config.ssoEnabled}
							disabled={isSsoBusy}
							onCheckedChange={handleSsoToggle}
						/>
					</div>
				</div>

				{config.ssoEnabled && clients.length > 0 && (
					<>
						<Separator />
						<div className="space-y-2 text-sm">
							<p className="font-medium">Registered Clients</p>
							<div className="space-y-0 overflow-hidden rounded-lg border border-border/50">
								{clients.map((client, i) => (
									<div
										key={client.clientId}
										className={`flex items-center justify-between px-3 py-2 font-mono-data text-xs transition-colors hover:bg-muted/50 ${i > 0 ? "border-t border-border/50" : ""}`}
									>
										<span>{client.name ?? client.clientId}</span>
										<Badge
											variant={client.disabled ? "outline" : "secondary"}
										>
											{client.disabled ? "disabled" : "active"}
										</Badge>
									</div>
								))}
							</div>
						</div>
					</>
				)}

				{config.ssoEnabled && clients.length === 0 && (
					<p className="text-xs text-muted-foreground">
						No OAuth clients registered yet. Install an SSO-compatible app to
						get started.
					</p>
				)}
			</CardContent>
		</Card>
	);
}

function FirewallCard({ config }: { config: SystemConfig }) {
	const firewallPrereqsQuery = useFirewallPrerequisites();
	const firewallRulesQuery = useFirewallRules();
	const enableFirewallMutation = useEnableFirewall();
	const disableFirewallMutation = useDisableFirewall();

	const prereqs = firewallPrereqsQuery.data;
	const rules = firewallRulesQuery.data;
	const isFirewallBusy =
		enableFirewallMutation.isPending || disableFirewallMutation.isPending;

	const handleFirewallToggle = async (checked: boolean) => {
		if (checked) {
			enableFirewallMutation.mutate(undefined, {
				onSuccess: () => toast.success(m.settings_saved()),
				onError: (err) =>
					toast.error(`Failed to enable firewall: ${err.message}`),
			});
		} else {
			disableFirewallMutation.mutate(undefined, {
				onSuccess: () => toast.success(m.settings_saved()),
				onError: (err) =>
					toast.error(`Failed to disable firewall: ${err.message}`),
			});
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-medium">
					{m.settings_firewall()}
				</CardTitle>
				<CardDescription>{m.settings_firewallDesc()}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Prerequisites warning when enabling */}
				{!config.firewallEnabled && prereqs && !prereqs.ufwInstalled && (
					<Alert className="border-status-warning/30 bg-status-warning/5 text-status-warning">
						<AlertTriangle className="h-4 w-4" />
						<AlertDescription>
							UFW is not installed. Enabling the firewall will install UFW and
							ufw-docker automatically.
						</AlertDescription>
					</Alert>
				)}

				<div className="flex items-center justify-between rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50">
					<div className="space-y-0.5">
						<Label>{m.settings_enableFirewall()}</Label>
						<p className="text-xs text-muted-foreground">
							{m.settings_firewallNote()}
						</p>
					</div>
					<div className="flex items-center gap-2">
						{isFirewallBusy && <Spinner size="sm" />}
						<Switch
							checked={config.firewallEnabled}
							disabled={isFirewallBusy}
							onCheckedChange={handleFirewallToggle}
						/>
					</div>
				</div>
				<Separator />
				<div className="space-y-2 text-sm">
					<p className="font-medium">{m.settings_activeRules()}</p>
					{rules && rules.length > 0 ? (
						<div className="space-y-0 overflow-hidden rounded-lg border border-border/50">
							{rules.map((rule, i) => (
								<div
									key={`${rule.port}-${rule.protocol}-${rule.app}`}
									className={`flex items-center px-3 py-2 font-mono-data text-xs transition-colors hover:bg-muted/50 ${i > 0 ? "border-t border-border/50" : ""}`}
								>
									{rule.port}/{rule.protocol} — {rule.app} (
									{rule.type === "ufw" ? "allow" : "ufw-docker"})
								</div>
							))}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">
							No firewall rules configured yet.
						</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

// ─── Provider definitions (mirrors CLI backup-remote.tsx) ─────────────────────

interface ProviderField {
	key: string;
	label: string;
	sensitive?: boolean;
	defaultValue?: string;
	required?: boolean;
}

interface Provider {
	name: string;
	rcloneType: string;
	defaultRemoteName: string;
	fields: ProviderField[];
	oauth?: boolean;
	notes?: string[];
}

const PROVIDERS: Provider[] = [
	{
		name: "Google Drive",
		rcloneType: "drive",
		defaultRemoteName: "gdrive",
		oauth: true,
		fields: [
			{ key: "client_id", label: "Client ID", required: true },
			{ key: "client_secret", label: "Client secret", sensitive: true, required: true },
			{ key: "token", label: "OAuth token (JSON)", sensitive: true, required: true },
		],
		notes: [
			"Get a client ID: https://rclone.org/drive/#making-your-own-client-id",
			"Run on a machine with a browser: rclone authorize \"drive\" \"<client_id>\" \"<client_secret>\"",
		],
	},
	{
		name: "SFTP",
		rcloneType: "sftp",
		defaultRemoteName: "my-sftp",
		fields: [
			{ key: "host", label: "Hostname or IP", required: true },
			{ key: "user", label: "SSH username", required: true },
			{ key: "port", label: "SSH port", defaultValue: "22" },
			{ key: "key_file", label: "SSH private key path" },
			{ key: "pass", label: "SSH password", sensitive: true },
		],
	},
	{
		name: "S3",
		rcloneType: "s3",
		defaultRemoteName: "my-s3",
		fields: [
			{ key: "provider", label: "S3 provider", required: true, defaultValue: "AWS" },
			{ key: "access_key_id", label: "Access key ID", required: true },
			{ key: "secret_access_key", label: "Secret access key", sensitive: true, required: true },
			{ key: "region", label: "Region", defaultValue: "us-east-1" },
			{ key: "endpoint", label: "Endpoint URL (non-AWS)" },
		],
	},
	{
		name: "Dropbox",
		rcloneType: "dropbox",
		defaultRemoteName: "my-dropbox",
		oauth: true,
		fields: [
			{ key: "client_id", label: "App key", required: true },
			{ key: "client_secret", label: "App secret", sensitive: true, required: true },
			{ key: "token", label: "OAuth token (JSON)", sensitive: true, required: true },
		],
		notes: [
			"Create an app at: https://www.dropbox.com/developers/apps",
			"Run on a machine with a browser: rclone authorize \"dropbox\" \"<client_id>\" \"<client_secret>\"",
		],
	},
	{
		name: "OneDrive",
		rcloneType: "onedrive",
		defaultRemoteName: "my-onedrive",
		oauth: true,
		fields: [
			{ key: "client_id", label: "Application (client) ID", required: true },
			{ key: "client_secret", label: "Client secret", sensitive: true, required: true },
			{ key: "token", label: "OAuth token (JSON)", sensitive: true, required: true },
		],
		notes: [
			"Register an app at: https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps",
			"Run on a machine with a browser: rclone authorize \"onedrive\" \"<client_id>\" \"<client_secret>\"",
		],
	},
	{
		name: "iCloud Drive",
		rcloneType: "iclouddrive",
		defaultRemoteName: "my-icloud",
		fields: [
			{ key: "apple_id", label: "Apple ID (email)", required: true },
			{ key: "password", label: "App-specific password", sensitive: true, required: true },
		],
		notes: [
			"Experimental: iCloud Drive support is experimental in rclone.",
			"Generate an app-specific password at: https://appleid.apple.com",
		],
	},
];

// ─── Add Remote Dialog ────────────────────────────────────────────────────────

function AddRemoteDialog({ onSuccess }: { onSuccess?: () => void }) {
	const [open, setOpen] = useState(false);
	const [selectedProvider, setSelectedProvider] = useState<string>("");
	const [remoteName, setRemoteName] = useState("");
	const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
	const addRemoteMutation = useAddBackupRemote();

	const provider = PROVIDERS.find((p) => p.rcloneType === selectedProvider);

	const handleProviderChange = (value: string) => {
		setSelectedProvider(value);
		const p = PROVIDERS.find((pv) => pv.rcloneType === value);
		if (p) {
			setRemoteName(p.defaultRemoteName);
			const defaults: Record<string, string> = {};
			for (const f of p.fields) {
				if (f.defaultValue) defaults[f.key] = f.defaultValue;
			}
			setFieldValues(defaults);
		}
	};

	const handleFieldChange = (key: string, value: string) => {
		setFieldValues((prev) => ({ ...prev, [key]: value }));
	};

	const handleReset = () => {
		setSelectedProvider("");
		setRemoteName("");
		setFieldValues({});
	};

	const nameValid = /^[a-zA-Z0-9_-]+$/.test(remoteName);
	const requiredFieldsFilled =
		provider?.fields
			.filter((f) => f.required)
			.every((f) => fieldValues[f.key]?.trim()) ?? false;
	const canSubmit =
		!!provider && nameValid && requiredFieldsFilled && !addRemoteMutation.isPending;

	const handleSubmit = () => {
		if (!provider || !canSubmit) return;
		addRemoteMutation.mutate(
			{ name: remoteName, providerType: provider.rcloneType, params: fieldValues },
			{
				onSuccess: (result) => {
					if (result.reachable) {
						toast.success(m.settings_remoteCreated());
					} else {
						toast.warning(m.settings_remoteCreatedUnreachable());
					}
					setOpen(false);
					handleReset();
					onSuccess?.();
				},
				onError: (err) => toast.error(`Failed to add remote: ${err.message}`),
			},
		);
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(v) => {
				setOpen(v);
				if (!v) handleReset();
			}}
		>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className="w-full gap-1.5">
					<Plus className="h-3.5 w-3.5" />
					{m.settings_addRemote()}
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg bg-background/95 backdrop-blur">
				<DialogHeader>
					<DialogTitle>{m.settings_addRemoteTitle()}</DialogTitle>
					<DialogDescription>{m.settings_addRemoteDesc()}</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					{/* Provider select */}
					<div className="space-y-2">
						<Label>{m.settings_remoteProvider()}</Label>
						<Select value={selectedProvider} onValueChange={handleProviderChange}>
							<SelectTrigger>
								<SelectValue placeholder="Select a provider..." />
							</SelectTrigger>
							<SelectContent>
								{PROVIDERS.map((p) => (
									<SelectItem key={p.rcloneType} value={p.rcloneType}>
										{p.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{provider && (
						<>
							{/* Provider notes */}
							{provider.notes && (
								<div className="space-y-1 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
									{provider.notes.map((note) => (
										<p key={note}>{note}</p>
									))}
								</div>
							)}

							{/* Remote name */}
							<div className="space-y-2">
								<Label>{m.settings_remoteName()}</Label>
								<Input
									value={remoteName}
									onChange={(e) => setRemoteName(e.target.value)}
									className="font-mono-data"
								/>
								<p className="text-xs text-muted-foreground">
									{m.settings_remoteNameDesc()}
								</p>
							</div>

							{/* Dynamic fields */}
							{provider.fields.map((field) => (
								<div key={field.key} className="space-y-2">
									<Label>
										{field.label}
										{field.required && (
											<span className="ml-1 text-status-critical">*</span>
										)}
									</Label>
									<Input
										type={field.sensitive ? "password" : "text"}
										value={fieldValues[field.key] ?? ""}
										onChange={(e) => handleFieldChange(field.key, e.target.value)}
										placeholder={field.defaultValue}
										className="font-mono-data"
									/>
								</div>
							))}
						</>
					)}
				</div>
				<DialogFooter>
					<Button
						disabled={!canSubmit}
						onClick={handleSubmit}
						className="gap-2"
					>
						{addRemoteMutation.isPending && <Spinner size="sm" />}
						{addRemoteMutation.isPending
							? m.settings_remoteCreating()
							: m.settings_addRemote()}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ─── Encryption & Remotes Card ────────────────────────────────────────────────

function EncryptionRemotesCard({ config }: { config: SystemConfig }) {
	const rcloneQuery = useRcloneInstalled();
	const removeRemoteMutation = useRemoveBackupRemote();
	const rcloneInstalled = rcloneQuery.data ?? true; // default to true while loading
	const [removeTarget, setRemoveTarget] = useState<string | null>(null);

	const handleConfirmRemove = () => {
		if (!removeTarget) return;
		removeRemoteMutation.mutate(
			{ name: removeTarget, deleteFromRclone: true },
			{
				onSuccess: () => {
					toast.success(m.settings_remoteRemoved());
					setRemoveTarget(null);
				},
				onError: (err) => toast.error(`Failed to remove: ${err.message}`),
			},
		);
	};

	return (
		<>
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
				{/* rclone not installed warning */}
				{rcloneQuery.isSuccess && !rcloneInstalled && (
					<Alert className="border-status-warning/30 bg-status-warning/5 text-status-warning">
						<AlertTriangle className="h-4 w-4" />
						<AlertDescription>{m.settings_rcloneNotInstalled()}</AlertDescription>
					</Alert>
				)}

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
										disabled={removeRemoteMutation.isPending}
										onClick={() => setRemoveTarget(remote)}
									>
										{removeRemoteMutation.isPending ? (
											<Spinner size="sm" />
										) : (
											<Trash2 className="h-3 w-3 text-muted-foreground" />
										)}
									</Button>
								</div>
							))}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">
							{m.settings_noRemotes()}
						</p>
					)}
					{rcloneInstalled ? (
						<AddRemoteDialog />
					) : (
						<Button
							variant="outline"
							size="sm"
							className="w-full gap-1.5"
							disabled
						>
							<Plus className="h-3.5 w-3.5" />
							{m.settings_addRemote()}
						</Button>
					)}
				</div>
			</CardContent>
		</Card>

		<AlertDialog
			open={!!removeTarget}
			onOpenChange={(open) => {
				if (!open) setRemoveTarget(null);
			}}
		>
			<AlertDialogContent className="bg-background/95 backdrop-blur">
				<AlertDialogHeader>
					<AlertDialogTitle>{m.common_delete()}</AlertDialogTitle>
					<AlertDialogDescription>
						{removeTarget
							? m.settings_removeRemoteConfirm({ name: removeTarget })
							: ""}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{m.common_cancel()}</AlertDialogCancel>
					<AlertDialogAction
						className="bg-status-critical text-white hover:bg-status-critical/90"
						onClick={handleConfirmRemove}
					>
						{m.common_delete()}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
		</>
	);
}

export function BackupTab() {
	const configQuery = useConfig();
	const config = configQuery.data;
	const updateConfigMutation = useUpdateConfig();
	const [backupDir, setBackupDir] = useState("");

	useEffect(() => {
		if (config?.backupDir) setBackupDir(config.backupDir);
	}, [config?.backupDir]);

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
						<PathInput
							id="backupDir"
							value={backupDir}
							onChange={setBackupDir}
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

			<EncryptionRemotesCard config={config} />
		</div>
	);
}

export function AboutTab() {
	const versionQuery = useVersion();
	const navigate = useNavigate();
	const checkUpdatesMutation = useCheckForUpdates();
	const [updateStatus, setUpdateStatus] = useState<
		| { checked: false }
		| { checked: true; available: false; commit: string }
		| {
				checked: true;
				available: true;
				current: string;
				remote: string;
		  }
	>({ checked: false });

	const handleChangelogClick = () => {
		window.open("https://joel-mercier.github.io/mithrandir/changelog.html");
	};

	const handleCheckUpdates = async () => {
		try {
			const result = await checkUpdatesMutation.mutateAsync(undefined);
			if (result.updateAvailable) {
				setUpdateStatus({
					checked: true,
					available: true,
					current: result.currentCommit,
					remote: result.remoteCommit,
				});
			} else {
				setUpdateStatus({
					checked: true,
					available: false,
					commit: result.currentCommit,
				});
			}
		} catch (err) {
			toast.error(
				`Failed to check: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	};

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

				{/* Update check result */}
				{updateStatus.checked && (
					<div
						className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
							updateStatus.available
								? "border-status-warning/30 bg-status-warning/5 text-status-warning"
								: "border-status-healthy/30 bg-status-healthy/5 text-status-healthy"
						}`}
					>
						{updateStatus.available ? (
							<>
								<ArrowRight className="h-3.5 w-3.5" />
								<span className="font-mono-data text-xs">
									{m.settings_updateAvailable({
										current: updateStatus.current,
										remote: updateStatus.remote,
									})}
								</span>
							</>
						) : (
							<>
								<Check className="h-3.5 w-3.5" />
								<span className="font-mono-data text-xs">
									{m.settings_upToDate({
										commit: updateStatus.commit,
									})}
								</span>
							</>
						)}
					</div>
				)}

				<div className="flex gap-2">
					{updateStatus.checked && updateStatus.available ? (
						<Button
							size="sm"
							className="gap-1.5"
							onClick={() => navigate({ to: "/self-update" })}
						>
							<ArrowRight className="h-3.5 w-3.5" />
							{m.settings_updateNow()}
						</Button>
					) : (
						<Button
							variant="outline"
							size="sm"
							className="gap-1.5"
							disabled={checkUpdatesMutation.isPending}
							onClick={handleCheckUpdates}
						>
							{checkUpdatesMutation.isPending && <Spinner size="sm" />}
							{checkUpdatesMutation.isPending
								? m.settings_checking()
								: m.settings_checkUpdates()}
						</Button>
					)}
					<Button
						variant="outline"
						size="sm"
						className="gap-1.5"
						onClick={handleChangelogClick}
					>
						{m.settings_viewChangelog()}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
