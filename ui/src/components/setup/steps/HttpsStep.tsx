import { Globe, Mail, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Card, CardContent } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Switch } from "#/components/ui/switch";
import { useSetupHttps } from "#/hooks/homelab";
import { m } from "#/paraglide/messages.js";
import type { SetupState } from "../SetupWizard";
import { StepNavigation } from "../StepNavigation";

interface HttpsStepProps {
	state: SetupState;
	updateState: (updates: Partial<SetupState>) => void;
	onComplete: () => void;
	onSkip: () => void;
	onBack: () => void;
}

export function HttpsStep({
	state,
	updateState,
	onComplete,
	onSkip,
	onBack,
}: HttpsStepProps) {
	const hasDuckDns = state.selectedApps.includes("duckdns");
	const domain = state.secrets.DUCKDNS_SUBDOMAINS
		? `${state.secrets.DUCKDNS_SUBDOMAINS}.duckdns.org`
		: "yourdomain.duckdns.org";
	const httpsMutation = useSetupHttps();

	const handleNext = () => {
		if (state.httpsEnabled) {
			httpsMutation.mutate(state.acmeEmail, {
				onSuccess: () => onComplete(),
			});
		} else {
			onSkip();
		}
	};

	return (
		<div>
			<h2 className="font-display text-2xl font-bold tracking-tight">
				{m.httpsStep_title()}
			</h2>
			<p className="mt-2 text-muted-foreground">{m.httpsStep_subtitle()}</p>

			<div className="mt-8 space-y-6">
				{/* Enable toggle */}
				<div className="flex items-center justify-between rounded-lg border border-border/50 p-4">
					<div className="flex items-center gap-3">
						<ShieldCheck className="h-5 w-5 text-muted-foreground" />
						<div>
							<p className="text-sm font-medium">{m.httpsStep_enableCaddy()}</p>
							<p className="text-xs text-muted-foreground">
								{m.httpsStep_enableCaddyDesc()}
							</p>
						</div>
					</div>
					<Switch
						checked={state.httpsEnabled}
						onCheckedChange={(checked) =>
							updateState({ httpsEnabled: checked === true })
						}
					/>
				</div>

				{!hasDuckDns && state.httpsEnabled && (
					<Alert variant="destructive">
						<AlertDescription>{m.httpsStep_requiresDuckDns()}</AlertDescription>
					</Alert>
				)}

				{state.httpsEnabled && hasDuckDns && (
					<>
						{/* ACME email */}
						<div className="space-y-1.5">
							<Label htmlFor="acme-email" className="flex items-center gap-2">
								<Mail className="h-4 w-4" />
								{m.httpsStep_acmeEmail()}
							</Label>
							<Input
								id="acme-email"
								type="email"
								value={state.acmeEmail}
								onChange={(e) => updateState({ acmeEmail: e.target.value })}
								placeholder="you@example.com"
							/>
							<p className="text-xs text-muted-foreground">
								{m.httpsStep_acmeDesc()}
							</p>
						</div>

						{/* Domain preview */}
						<Card>
							<CardContent className="p-4">
								<div className="flex items-center gap-2 text-sm">
									<Globe className="h-4 w-4 text-muted-foreground" />
									<span className="text-muted-foreground">
										{m.httpsStep_availableAt()}
									</span>
								</div>
								<div className="mt-3 space-y-1.5">
									{state.selectedApps
										.filter((a) => a !== "duckdns")
										.slice(0, 5)
										.map((app) => (
											<p
												key={app}
												className="font-mono-data text-xs text-muted-foreground"
											>
												https://{app}.{domain}
											</p>
										))}
									{state.selectedApps.length > 6 && (
										<p className="text-xs text-muted-foreground">
											{m.httpsStep_andMore({
												count: String(state.selectedApps.length - 6),
											})}
										</p>
									)}
								</div>
							</CardContent>
						</Card>
					</>
				)}

				{httpsMutation.isError && (
					<Alert variant="destructive">
						<AlertDescription>
							{m.httpsStep_failedConfig({
								error:
									httpsMutation.error instanceof Error
										? httpsMutation.error.message
										: m.httpsStep_unknownError(),
							})}
						</AlertDescription>
					</Alert>
				)}
			</div>

			<StepNavigation
				onBack={onBack}
				onNext={handleNext}
				onSkip={onSkip}
				showSkip={!state.httpsEnabled}
				nextDisabled={
					state.httpsEnabled && (!hasDuckDns || !state.acmeEmail.trim())
				}
				isLoading={httpsMutation.isPending}
			/>
		</div>
	);
}
