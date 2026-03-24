import { Clock, Shield } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Switch } from "#/components/ui/switch";
import { useSetupBackupTimer, useSetupFirewall } from "#/hooks/homelab";
import { m } from "#/paraglide/messages.js";
import type { SetupState } from "../SetupWizard";
import { StepNavigation } from "../StepNavigation";

interface FirewallBackupStepProps {
	state: SetupState;
	updateState: (updates: Partial<SetupState>) => void;
	onComplete: () => void;
	onBack: () => void;
}

export function FirewallBackupStep({
	state,
	updateState,
	onComplete,
	onBack,
}: FirewallBackupStepProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const firewallMutation = useSetupFirewall();
	const backupTimerMutation = useSetupBackupTimer();

	async function handleFinish() {
		setIsSubmitting(true);
		try {
			if (state.firewallEnabled) {
				const allApps = [
					...state.selectedApps,
					...state.resolvedApps,
					...state.autoAddedDeps,
				];
				const uniqueApps = [...new Set(allApps)];
				await firewallMutation.mutateAsync(uniqueApps);
			}
			await backupTimerMutation.mutateAsync(state.backupHour);
			onComplete();
		} catch {
			setIsSubmitting(false);
		}
	}

	return (
		<div>
			<h2 className="font-display text-2xl font-bold tracking-tight">
				{m.firewallBackup_title()}
			</h2>
			<p className="mt-2 text-muted-foreground">
				{m.firewallBackup_subtitle()}
			</p>

			<div className="mt-8 space-y-6">
				{/* Firewall */}
				<Card>
					<CardHeader className="pb-3">
						<div className="flex items-center gap-2">
							<Shield className="h-4 w-4 text-muted-foreground" />
							<span className="text-sm font-medium">
								{m.firewallBackup_firewallUfw()}
							</span>
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm">{m.firewallBackup_enableUfw()}</p>
								<p className="text-xs text-muted-foreground">
									{m.firewallBackup_ufwDesc()}
								</p>
							</div>
							<Switch
								checked={state.firewallEnabled}
								onCheckedChange={(checked) =>
									updateState({ firewallEnabled: checked === true })
								}
							/>
						</div>
					</CardContent>
				</Card>

				{/* Backup */}
				<Card>
					<CardHeader className="pb-3">
						<div className="flex items-center gap-2">
							<Clock className="h-4 w-4 text-muted-foreground" />
							<span className="text-sm font-medium">
								{m.firewallBackup_automatedBackups()}
							</span>
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-1.5">
							<Label htmlFor="backup-hour">
								{m.firewallBackup_backupHour()}
							</Label>
							<Input
								id="backup-hour"
								type="number"
								min={0}
								max={23}
								value={state.backupHour}
								onChange={(e) => {
									const val = Number.parseInt(e.target.value, 10);
									if (!Number.isNaN(val) && val >= 0 && val <= 23) {
										updateState({ backupHour: val });
									}
								}}
								className="w-24"
							/>
							<p className="text-xs text-muted-foreground">
								{m.firewallBackup_backupDesc()}
							</p>
						</div>
					</CardContent>
				</Card>
			</div>

			<StepNavigation
				onBack={onBack}
				onNext={handleFinish}
				nextLabel={m.firewallBackup_finish()}
				isLoading={isSubmitting}
			/>
		</div>
	);
}
