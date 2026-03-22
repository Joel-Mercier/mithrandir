import { Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowRight,
	CheckCircle2,
	ExternalLink,
	Info,
	Loader2,
	Shield,
} from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent } from "#/components/ui/card";
import { useAppRegistry, useCompleteSetup } from "#/hooks/homelab";
import type { SetupState } from "../SetupWizard";

interface SummaryStepProps {
	state: SetupState;
}

export function SummaryStep({ state }: SummaryStepProps) {
	const navigate = useNavigate();
	const { data: registry } = useAppRegistry();
	const completeSetupMutation = useCompleteSetup();

	const appMap = new Map(
		(registry?.apps ?? []).map((app) => [app.name, app]),
	);
	const domain = state.secrets.DUCKDNS_SUBDOMAINS
		? `${state.secrets.DUCKDNS_SUBDOMAINS}.duckdns.org`
		: null;

	const serviceApps = state.selectedApps
		.map((name) => appMap.get(name))
		.filter(
			(app): app is NonNullable<typeof app> =>
				app != null && !app.hidden && app.port != null,
		);

	async function handleGoToDashboard() {
		await completeSetupMutation.mutateAsync();
		navigate({ to: "/" });
	}

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
							const url =
								state.httpsEnabled && domain
									? `https://${app.name}.${domain}`
									: `http://localhost:${app.port}`;

							return (
								<Card key={app.name}>
									<CardContent className="flex items-center justify-between p-4">
										<div className="flex items-center gap-3">
											<div className="h-2 w-2 rounded-full bg-status-healthy" />
											<div>
												<Link
													to="/apps/$appName"
													params={{ appName: app.name }}
													className="text-sm font-medium hover:underline"
												>
													{app.displayName}
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
				<Button
					size="lg"
					className="gap-2"
					disabled={completeSetupMutation.isPending}
					onClick={handleGoToDashboard}
				>
					{completeSetupMutation.isPending ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<ArrowRight className="h-4 w-4" />
					)}
					Go to Dashboard
				</Button>
			</div>
		</div>
	);
}
