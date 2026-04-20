import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Check, ChevronDown, FileText, Save, Shield } from "lucide-react";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "#/components/ui/collapsible";
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
import { Spinner } from "#/components/ui/spinner";
import { Switch } from "#/components/ui/switch";
import { Textarea } from "#/components/ui/textarea";
import {
	useGluetunConfig,
	usePreviewWireguardConfig,
	useSaveGluetunConfig,
} from "#/hooks/homelab";

const PROVIDERS = [
	{ value: "mullvad", label: "Mullvad" },
	{ value: "protonvpn", label: "ProtonVPN" },
	{ value: "airvpn", label: "AirVPN" },
	{ value: "windscribe", label: "Windscribe" },
	{ value: "custom", label: "Custom" },
];

function mask(value: string, visible = 4): string {
	if (!value) return "";
	if (value.length <= visible * 2) return "•".repeat(value.length);
	return `${value.slice(0, visible)}${"•".repeat(Math.max(6, value.length - visible * 2))}${value.slice(-visible)}`;
}

export function GluetunSetupCard() {
	const configQuery = useGluetunConfig(true);
	const previewMutation = usePreviewWireguardConfig();
	const saveMutation = useSaveGluetunConfig();

	const [provider, setProvider] = useState("mullvad");
	const [confBlob, setConfBlob] = useState("");
	const [privateKey, setPrivateKey] = useState("");
	const [addresses, setAddresses] = useState("");
	const [presharedKey, setPresharedKey] = useState("");
	const [serverCountries, setServerCountries] = useState("");
	const [qbUseVpn, setQbUseVpn] = useState(false);
	const [manualOpen, setManualOpen] = useState(false);
	const [parsedEndpoint, setParsedEndpoint] = useState<string | undefined>();

	const config = configQuery.data;

	useEffect(() => {
		if (config) {
			setProvider(config.provider || "mullvad");
			setPrivateKey(config.privateKey);
			setAddresses(config.addresses);
			setPresharedKey(config.presharedKey);
			setServerCountries(config.serverCountries);
			setQbUseVpn(config.qbittorrentUseVpn);
			if (!config.privateKey && !config.addresses) setManualOpen(true);
		}
	}, [config]);

	const handleParse = () => {
		if (!confBlob.trim()) {
			toast.error("Paste a WireGuard config first");
			return;
		}
		previewMutation.mutate(confBlob, {
			onSuccess: (data) => {
				if (data.error) {
					toast.error(data.error);
					return;
				}
				if (data.privateKey) setPrivateKey(data.privateKey);
				if (data.addresses) setAddresses(data.addresses);
				if (data.presharedKey) setPresharedKey(data.presharedKey);
				setParsedEndpoint(data.endpoint);
				toast.success("WireGuard config parsed");
			},
			onError: (err) => toast.error(`Parse failed: ${err.message}`),
		});
	};

	const handleSave = () => {
		saveMutation.mutate(
			{
				provider,
				privateKey,
				addresses,
				presharedKey,
				serverCountries,
				qbittorrentUseVpn: qbUseVpn,
			},
			{
				onSuccess: () => toast.success("VPN settings saved"),
				onError: (err) => toast.error(`Save failed: ${err.message}`),
			},
		);
	};

	const hasCredentials = !!(privateKey && addresses);
	const showPreview = hasCredentials;

	return (
		<Card className="col-span-full">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-sm font-medium">
					<Shield className="h-4 w-4" />
					VPN setup
				</CardTitle>
				<CardDescription>
					Configure the VPN provider and credentials Gluetun uses to tunnel traffic.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-5">
				{/* Provider */}
				<div className="space-y-2">
					<Label htmlFor="vpn-provider">Provider</Label>
					<Select value={provider} onValueChange={setProvider}>
						<SelectTrigger id="vpn-provider">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{PROVIDERS.map((p) => (
								<SelectItem key={p.value} value={p.value}>
									{p.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<p className="text-xs text-muted-foreground">
						Choose the commercial VPN you have a subscription with.
					</p>
				</div>

				<Separator />

				{/* Paste .conf */}
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<Label htmlFor="wg-conf" className="flex items-center gap-1.5">
							<FileText className="h-3.5 w-3.5" />
							WireGuard config
						</Label>
						{parsedEndpoint && (
							<span className="font-mono-data text-[10px] text-muted-foreground">
								{parsedEndpoint}
							</span>
						)}
					</div>
					<Textarea
						id="wg-conf"
						value={confBlob}
						onChange={(e) => setConfBlob(e.target.value)}
						placeholder={`[Interface]\nPrivateKey = ...\nAddress = 10.64.222.21/32\n\n[Peer]\n...`}
						className="font-mono-data min-h-28 text-xs"
					/>
					<div className="flex items-center justify-between">
						<p className="text-xs text-muted-foreground">
							Paste the full <code className="font-mono-data">.conf</code> from your provider —
							we'll extract the fields below.
						</p>
						<Button
							size="sm"
							variant="secondary"
							onClick={handleParse}
							disabled={previewMutation.isPending || !confBlob.trim()}
							className="gap-1.5"
						>
							{previewMutation.isPending && <Spinner size="sm" />}
							Parse
						</Button>
					</div>
				</div>

				{/* Preview strip (animates in when credentials exist) */}
				{showPreview && (
					<div className="animate-in fade-in slide-in-from-top-1 duration-300 grid gap-2 rounded-lg border border-border/50 bg-muted/30 p-3 sm:grid-cols-3">
						<PreviewStat label="Private Key" value={mask(privateKey)} />
						<PreviewStat label="Address" value={addresses} />
						<PreviewStat
							label="Preshared"
							value={presharedKey ? mask(presharedKey) : "—"}
							muted={!presharedKey}
						/>
					</div>
				)}

				{/* Manual entry fallback */}
				<Collapsible open={manualOpen} onOpenChange={setManualOpen}>
					<CollapsibleTrigger asChild>
						<button
							type="button"
							className="flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground"
						>
							<span>Enter fields manually</span>
							<ChevronDown
								className={`h-3.5 w-3.5 transition-transform ${manualOpen ? "rotate-180" : ""}`}
							/>
						</button>
					</CollapsibleTrigger>
					<CollapsibleContent className="space-y-3 pt-3">
						<div className="space-y-1.5">
							<Label htmlFor="vpn-privkey" className="text-xs">
								Private Key
							</Label>
							<Input
								id="vpn-privkey"
								value={privateKey}
								onChange={(e) => setPrivateKey(e.target.value)}
								type="password"
								className="font-mono-data"
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="vpn-addrs" className="text-xs">
								Addresses
							</Label>
							<Input
								id="vpn-addrs"
								value={addresses}
								onChange={(e) => setAddresses(e.target.value)}
								placeholder="10.64.222.21/32"
								className="font-mono-data"
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="vpn-psk" className="text-xs">
								Preshared Key <span className="text-muted-foreground">(optional)</span>
							</Label>
							<Input
								id="vpn-psk"
								value={presharedKey}
								onChange={(e) => setPresharedKey(e.target.value)}
								type="password"
								className="font-mono-data"
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="vpn-countries" className="text-xs">
								Server Countries{" "}
								<span className="text-muted-foreground">(optional, comma-separated)</span>
							</Label>
							<Input
								id="vpn-countries"
								value={serverCountries}
								onChange={(e) => setServerCountries(e.target.value)}
								placeholder="Switzerland,Sweden"
							/>
						</div>
					</CollapsibleContent>
				</Collapsible>

				<Separator />

				{/* qBittorrent routing toggle */}
				<div className="flex items-start justify-between gap-4 rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50">
					<div className="space-y-0.5">
						<Label>Route qBittorrent through this VPN</Label>
						<p className="text-xs text-muted-foreground">
							qBittorrent joins Gluetun's network namespace — downloads egress via the VPN exit IP.
						</p>
						{qbUseVpn && !config?.qbittorrentInstalled && (
							<p className="text-xs text-status-warning">
								qBittorrent isn't installed yet — install it to apply this routing.
							</p>
						)}
					</div>
					<Switch checked={qbUseVpn} onCheckedChange={setQbUseVpn} />
				</div>

				{!hasCredentials && (
					<Alert className="border-status-warning/30 bg-status-warning/5 text-status-warning">
						<AlertTriangle className="h-4 w-4" />
						<AlertDescription>
							Private Key and Address are required before Gluetun can connect.
						</AlertDescription>
					</Alert>
				)}

				<div className="flex justify-end">
					<Button
						onClick={handleSave}
						disabled={saveMutation.isPending || !hasCredentials}
						className="gap-2"
					>
						{saveMutation.isPending ? (
							<Spinner size="sm" />
						) : saveMutation.isSuccess ? (
							<Check className="h-4 w-4" />
						) : (
							<Save className="h-4 w-4" />
						)}
						Save VPN settings
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

function PreviewStat({
	label,
	value,
	muted,
}: {
	label: string;
	value: string;
	muted?: boolean;
}) {
	return (
		<div className="space-y-1">
			<p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
			<p
				className={`font-mono-data text-xs ${muted ? "text-muted-foreground" : "text-foreground"} truncate`}
				title={value}
			>
				{value}
			</p>
		</div>
	);
}
