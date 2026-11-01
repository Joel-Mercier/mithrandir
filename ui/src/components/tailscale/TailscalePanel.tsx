import {
	AlertTriangle,
	CheckCircle2,
	Copy,
	ExternalLink,
	KeyRound,
	Laptop,
	LogIn,
	Network,
	Settings2,
	Terminal,
	Unplug,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Spinner } from "#/components/ui/spinner";
import { Switch } from "#/components/ui/switch";
import {
	type TailscaleOverview,
	useDisconnectTailscale,
	useStartTailscaleLogin,
	useTailscale,
	useUpdateTailscaleSettings,
} from "#/hooks/homelab";
import { m } from "#/paraglide/messages.js";

export const TAILSCALE_ADMIN_URL = "https://login.tailscale.com/admin/machines";
export const TAILSCALE_KEYS_URL =
	"https://login.tailscale.com/admin/settings/keys";
export const TAILSCALE_DOWNLOAD_URL = "https://tailscale.com/download";

interface TailscalePanelProps {
	/** Activity route recorded for the login ("/setup" or "/settings") */
	route: "/setup" | "/settings";
	/** Show the disconnect button when connected */
	allowDisconnect?: boolean;
	/** Called whenever fresh status data arrives */
	onStatus?: (overview: TailscaleOverview) => void;
}

interface FormState {
	hostname: string;
	shareLan: boolean;
	customRoutes: string;
	exitNode: boolean;
	ssh: boolean;
	authMethod: "browser" | "key";
	authKey: string;
}

function formFromOverview(o: TailscaleOverview): FormState {
	const routes = o.settings.advertiseRoutes;
	const isDetected = routes.length === 1 && routes[0] === o.detectedLan;
	return {
		hostname: o.settings.hostname,
		// Sharing the LAN is the default on first setup
		shareLan: o.enabled ? routes.length > 0 : true,
		customRoutes: isDetected ? "" : routes.join(", "),
		exitNode: o.settings.exitNode,
		ssh: o.settings.ssh,
		authMethod: "browser",
		authKey: "",
	};
}

export function TailscalePanel({
	route,
	allowDisconnect = false,
	onStatus,
}: TailscalePanelProps) {
	const query = useTailscale();
	const loginMutation = useStartTailscaleLogin();
	const updateMutation = useUpdateTailscaleSettings();
	const disconnectMutation = useDisconnectTailscale();
	const [form, setForm] = useState<FormState | null>(null);
	const [editing, setEditing] = useState(false);

	const data = query.data;
	const onStatusRef = useRef(onStatus);
	onStatusRef.current = onStatus;

	useEffect(() => {
		if (data && !form) setForm(formFromOverview(data));
	}, [data, form]);

	useEffect(() => {
		if (data) onStatusRef.current?.(data);
	}, [data]);

	if (query.isPending || !data || !form) {
		return (
			<div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
				<Spinner size="sm" />
				{m.tailscale_checking()}
			</div>
		);
	}

	const update = (patch: Partial<FormState>) =>
		setForm((prev) => (prev ? { ...prev, ...patch } : prev));

	const settingsInput = {
		hostname: form.hostname,
		shareLan: form.shareLan,
		routes: form.customRoutes
			.split(",")
			.map((r) => r.trim())
			.filter(Boolean),
		exitNode: form.exitNode,
		ssh: form.ssh,
	};

	const handleConnect = () => {
		loginMutation.mutate(
			{
				...settingsInput,
				authKey: form.authMethod === "key" ? form.authKey : undefined,
				route,
			},
			{
				onError: (err) => toast.error(err.message),
			},
		);
	};

	const handleSave = () => {
		updateMutation.mutate(settingsInput, {
			onSuccess: () => {
				toast.success(m.settings_saved());
				setEditing(false);
			},
			onError: (err) => toast.error(err.message),
		});
	};

	const handleDisconnect = () => {
		disconnectMutation.mutate(undefined, {
			onSuccess: () => {
				toast.success(m.tailscale_disconnected());
				setForm(null);
			},
			onError: (err) => toast.error(err.message),
		});
	};

	const loginError = loginMutation.data?.error ?? data.login.error;
	const authUrl = data.login.authUrl ?? loginMutation.data?.authUrl ?? null;

	// ── Waiting for sign-in ──
	if (
		data.login.inProgress ||
		(loginMutation.isPending && !data.status.connected)
	) {
		return (
			<div className="space-y-4">
				{authUrl ? (
					<div className="flex flex-col items-center gap-4 rounded-lg border border-border/50 p-6 text-center sm:flex-row sm:text-left">
						<div className="rounded-xl border bg-white p-3">
							<QRCodeSVG value={authUrl} size={148} />
						</div>
						<div className="min-w-0 space-y-3">
							<p className="text-sm font-medium">{m.tailscale_signInTitle()}</p>
							<p className="text-xs text-muted-foreground">
								{m.tailscale_signInDesc()}
							</p>
							<div className="flex flex-wrap gap-2">
								<Button asChild size="sm" className="gap-2">
									<a href={authUrl} target="_blank" rel="noreferrer">
										<LogIn className="h-4 w-4" />
										{m.tailscale_signInButton()}
									</a>
								</Button>
								<Button
									size="sm"
									variant="outline"
									className="gap-2"
									onClick={() => {
										navigator.clipboard.writeText(authUrl);
										toast.success(m.tailscale_copied());
									}}
								>
									<Copy className="h-4 w-4" />
									{m.tailscale_copyLink()}
								</Button>
							</div>
							<p className="flex items-center gap-2 text-xs text-muted-foreground">
								<Spinner size="sm" />
								{m.tailscale_waitingSignIn()}
							</p>
						</div>
					</div>
				) : (
					<div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
						<Spinner size="sm" />
						{m.tailscale_installing()}
					</div>
				)}
			</div>
		);
	}

	// ── Connected ──
	if (data.status.connected && !editing) {
		const pending = data.pendingRoutes.length > 0 || data.exitNodePending;
		return (
			<div className="space-y-4">
				<div className="flex items-start gap-3 rounded-lg border border-status-healthy/30 bg-status-healthy/5 p-4">
					<CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-status-healthy" />
					<div className="min-w-0 space-y-1">
						<p className="text-sm font-medium">{m.tailscale_connected()}</p>
						<p className="font-mono-data text-xs break-all text-muted-foreground">
							{data.status.dnsName ?? data.status.hostname}
							{data.status.ipv4 ? ` · ${data.status.ipv4}` : ""}
						</p>
						{data.status.tailnet && (
							<p className="text-xs text-muted-foreground">
								{m.tailscale_tailnet({ name: data.status.tailnet })}
							</p>
						)}
						<div className="flex flex-wrap gap-1.5 pt-1">
							{data.settings.advertiseRoutes.map((r) => (
								<Badge key={r} variant="outline" className="font-mono-data">
									{r}
								</Badge>
							))}
							{data.settings.exitNode && (
								<Badge variant="outline">{m.tailscale_exitNode()}</Badge>
							)}
							{data.settings.ssh && (
								<Badge variant="outline">{m.tailscale_ssh()}</Badge>
							)}
						</div>
					</div>
				</div>

				{pending && (
					<Alert className="border-status-warning/30 bg-status-warning/5 text-status-warning">
						<AlertTriangle className="h-4 w-4" />
						<AlertDescription className="space-y-2">
							<p>
								{m.tailscale_approvalNeeded({
									items: [
										...data.pendingRoutes,
										...(data.exitNodePending ? [m.tailscale_exitNode()] : []),
									].join(", "),
								})}
							</p>
							<ol className="list-decimal space-y-0.5 pl-4 text-xs">
								<li>{m.tailscale_approvalStep1()}</li>
								<li>
									{m.tailscale_approvalStep2({
										name: data.status.hostname ?? data.settings.hostname,
									})}
								</li>
								<li>{m.tailscale_approvalStep3()}</li>
							</ol>
							<a
								href={TAILSCALE_ADMIN_URL}
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-1 text-xs font-medium underline"
							>
								{m.tailscale_openAdmin()}
								<ExternalLink className="h-3 w-3" />
							</a>
						</AlertDescription>
					</Alert>
				)}

				{data.keyExpiryDays !== null && (
					<Alert>
						<KeyRound className="h-4 w-4" />
						<AlertDescription>
							{m.tailscale_keyExpiry({ days: String(data.keyExpiryDays) })}{" "}
							<a
								href={TAILSCALE_ADMIN_URL}
								target="_blank"
								rel="noreferrer"
								className="font-medium underline"
							>
								{m.tailscale_openAdmin()}
							</a>
						</AlertDescription>
					</Alert>
				)}

				<div className="flex items-start gap-3 rounded-lg border border-border/50 p-3 text-xs text-muted-foreground">
					<Laptop className="mt-0.5 h-4 w-4 shrink-0" />
					<p>
						{m.tailscale_installClients()}{" "}
						<a
							href={TAILSCALE_DOWNLOAD_URL}
							target="_blank"
							rel="noreferrer"
							className="font-medium text-foreground underline"
						>
							tailscale.com/download
						</a>
					</p>
				</div>

				<div className="flex flex-wrap gap-2">
					<Button
						size="sm"
						variant="outline"
						className="gap-2"
						onClick={() => {
							setForm(formFromOverview(data));
							setEditing(true);
						}}
					>
						<Settings2 className="h-4 w-4" />
						{m.tailscale_changeSettings()}
					</Button>
					{allowDisconnect && (
						<Button
							size="sm"
							variant="outline"
							className="gap-2 text-destructive"
							disabled={disconnectMutation.isPending}
							onClick={handleDisconnect}
						>
							{disconnectMutation.isPending ? (
								<Spinner size="sm" />
							) : (
								<Unplug className="h-4 w-4" />
							)}
							{m.tailscale_disconnect()}
						</Button>
					)}
				</div>
			</div>
		);
	}

	// ── Settings form (connect or edit) ──
	const busy = loginMutation.isPending || updateMutation.isPending;
	const canSubmit =
		form.hostname.trim().length > 0 &&
		(editing ||
			form.authMethod === "browser" ||
			form.authKey.trim().startsWith("tskey-"));

	return (
		<div className="space-y-4">
			<div className="space-y-1.5">
				<Label htmlFor="ts-hostname">{m.tailscale_hostname()}</Label>
				<Input
					id="ts-hostname"
					value={form.hostname}
					onChange={(e) => update({ hostname: e.target.value })}
					placeholder="mithrandir"
				/>
				<p className="text-xs text-muted-foreground">
					{m.tailscale_hostnameDesc()}
				</p>
			</div>

			<ToggleRow
				icon={<Network className="h-5 w-5 text-muted-foreground" />}
				title={m.tailscale_shareLan()}
				description={
					data.detectedLan
						? m.tailscale_shareLanDesc({ subnet: data.detectedLan })
						: m.tailscale_shareLanNoDetect()
				}
				checked={form.shareLan}
				onChange={(v) => update({ shareLan: v })}
			/>
			{form.shareLan && !data.detectedLan && (
				<div className="space-y-1.5 pl-1">
					<Label htmlFor="ts-routes">{m.tailscale_customRoutes()}</Label>
					<Input
						id="ts-routes"
						value={form.customRoutes}
						onChange={(e) => update({ customRoutes: e.target.value })}
						placeholder="192.168.1.0/24"
						className="font-mono-data"
					/>
				</div>
			)}

			<ToggleRow
				icon={<ExternalLink className="h-5 w-5 text-muted-foreground" />}
				title={m.tailscale_exitNode()}
				description={m.tailscale_exitNodeDesc()}
				checked={form.exitNode}
				onChange={(v) => update({ exitNode: v })}
			/>
			<ToggleRow
				icon={<Terminal className="h-5 w-5 text-muted-foreground" />}
				title={m.tailscale_ssh()}
				description={m.tailscale_sshDesc()}
				checked={form.ssh}
				onChange={(v) => update({ ssh: v })}
			/>

			{!editing && (
				<div className="space-y-2">
					<Label>{m.tailscale_authMethod()}</Label>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
						<AuthOption
							selected={form.authMethod === "browser"}
							onSelect={() => update({ authMethod: "browser" })}
							title={m.tailscale_authBrowser()}
							description={m.tailscale_authBrowserDesc()}
						/>
						<AuthOption
							selected={form.authMethod === "key"}
							onSelect={() => update({ authMethod: "key" })}
							title={m.tailscale_authKey()}
							description={m.tailscale_authKeyDesc()}
						/>
					</div>
					{form.authMethod === "key" && (
						<div className="space-y-1.5">
							<Input
								type="password"
								value={form.authKey}
								onChange={(e) => update({ authKey: e.target.value })}
								placeholder="tskey-auth-..."
								className="font-mono-data"
								autoComplete="off"
							/>
							<a
								href={TAILSCALE_KEYS_URL}
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-1 text-xs text-muted-foreground underline"
							>
								{m.tailscale_generateKey()}
								<ExternalLink className="h-3 w-3" />
							</a>
						</div>
					)}
				</div>
			)}

			{loginError && (
				<Alert variant="destructive">
					<AlertDescription>
						{m.tailscale_failed({ error: loginError })}
					</AlertDescription>
				</Alert>
			)}

			<div className="flex flex-wrap gap-2">
				{editing ? (
					<>
						<Button
							size="sm"
							onClick={handleSave}
							disabled={!canSubmit || busy}
							className="gap-2"
						>
							{updateMutation.isPending && <Spinner size="sm" />}
							{m.tailscale_save()}
						</Button>
						<Button
							size="sm"
							variant="ghost"
							onClick={() => setEditing(false)}
							disabled={busy}
						>
							{m.tailscale_cancel()}
						</Button>
					</>
				) : (
					<Button
						size="sm"
						onClick={handleConnect}
						disabled={!canSubmit || busy}
						className="gap-2"
					>
						{loginMutation.isPending ? (
							<Spinner size="sm" />
						) : (
							<LogIn className="h-4 w-4" />
						)}
						{data.status.installed
							? m.tailscale_connect()
							: m.tailscale_installAndConnect()}
					</Button>
				)}
			</div>
		</div>
	);
}

function ToggleRow({
	icon,
	title,
	description,
	checked,
	onChange,
}: {
	icon: React.ReactNode;
	title: string;
	description: string;
	checked: boolean;
	onChange: (value: boolean) => void;
}) {
	return (
		<div className="flex items-center justify-between gap-4 rounded-lg border border-border/50 p-3">
			<div className="flex items-start gap-3">
				{icon}
				<div>
					<p className="text-sm font-medium">{title}</p>
					<p className="text-xs text-muted-foreground">{description}</p>
				</div>
			</div>
			<Switch checked={checked} onCheckedChange={(v) => onChange(v === true)} />
		</div>
	);
}

function AuthOption({
	selected,
	onSelect,
	title,
	description,
}: {
	selected: boolean;
	onSelect: () => void;
	title: string;
	description: string;
}) {
	return (
		<button
			type="button"
			onClick={onSelect}
			className={`rounded-lg border p-3 text-left transition-colors ${
				selected
					? "border-primary bg-primary/5"
					: "border-border/50 hover:bg-muted/50"
			}`}
		>
			<p className="text-sm font-medium">{title}</p>
			<p className="text-xs text-muted-foreground">{description}</p>
		</button>
	);
}
