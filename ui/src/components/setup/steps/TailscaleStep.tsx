import { Globe, Lock, Smartphone, Waypoints } from "lucide-react";
import { useCallback } from "react";
import { TailscalePanel } from "#/components/tailscale/TailscalePanel";
import { Switch } from "#/components/ui/switch";
import type { TailscaleOverview } from "#/hooks/homelab";
import { m } from "#/paraglide/messages.js";
import type { SetupState } from "../SetupWizard";
import { StepNavigation } from "../StepNavigation";

interface TailscaleStepProps {
	state: SetupState;
	updateState: (updates: Partial<SetupState>) => void;
	onComplete: () => void;
	onSkip: () => void;
	onBack: () => void;
}

export function TailscaleStep({
	state,
	updateState,
	onComplete,
	onSkip,
	onBack,
}: TailscaleStepProps) {
	const handleStatus = useCallback(
		(o: TailscaleOverview) => {
			updateState({
				tailscaleConnected: o.status.connected,
				tailscaleDnsName: o.status.dnsName ?? o.status.ipv4 ?? "",
				tailscalePending: o.pendingRoutes.length > 0 || o.exitNodePending,
			});
		},
		[updateState],
	);

	const handleNext = () => {
		if (state.tailscaleEnabled && state.tailscaleConnected) onComplete();
		else onSkip();
	};

	return (
		<div>
			<h2 className="font-display text-2xl font-bold tracking-tight">
				{m.tailscaleStep_title()}
			</h2>
			<p className="mt-2 text-muted-foreground">{m.tailscaleStep_subtitle()}</p>

			<div className="mt-8 space-y-6">
				{/* Explainer */}
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
					<Benefit
						icon={<Smartphone className="h-4 w-4" />}
						title={m.tailscaleStep_benefitAnywhere()}
						description={m.tailscaleStep_benefitAnywhereDesc()}
					/>
					<Benefit
						icon={<Lock className="h-4 w-4" />}
						title={m.tailscaleStep_benefitPrivate()}
						description={m.tailscaleStep_benefitPrivateDesc()}
					/>
					<Benefit
						icon={<Globe className="h-4 w-4" />}
						title={m.tailscaleStep_benefitNoPorts()}
						description={m.tailscaleStep_benefitNoPortsDesc()}
					/>
				</div>
				<p className="text-xs text-muted-foreground">
					{m.tailscaleStep_accountNote()}
				</p>

				{/* Opt-in toggle */}
				<div className="flex items-center justify-between rounded-lg border border-border/50 p-4">
					<div className="flex items-center gap-3">
						<Waypoints className="h-5 w-5 text-muted-foreground" />
						<div>
							<p className="text-sm font-medium">{m.tailscaleStep_enable()}</p>
							<p className="text-xs text-muted-foreground">
								{m.tailscaleStep_enableDesc()}
							</p>
						</div>
					</div>
					<Switch
						checked={state.tailscaleEnabled}
						onCheckedChange={(checked) =>
							updateState({ tailscaleEnabled: checked === true })
						}
					/>
				</div>

				{state.tailscaleEnabled && (
					<TailscalePanel route="/setup" onStatus={handleStatus} />
				)}
			</div>

			<StepNavigation
				onBack={onBack}
				onNext={handleNext}
				onSkip={onSkip}
				showSkip={!state.tailscaleEnabled || !state.tailscaleConnected}
				nextDisabled={state.tailscaleEnabled && !state.tailscaleConnected}
			/>
		</div>
	);
}

function Benefit({
	icon,
	title,
	description,
}: {
	icon: React.ReactNode;
	title: string;
	description: string;
}) {
	return (
		<div className="rounded-lg border border-border/50 p-3">
			<div className="flex items-center gap-2 text-sm font-medium">
				{icon}
				{title}
			</div>
			<p className="mt-1 text-xs text-muted-foreground">{description}</p>
		</div>
	);
}
