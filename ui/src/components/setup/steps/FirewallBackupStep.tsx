import { Clock, Shield } from "lucide-react";
import { Card, CardContent, CardHeader } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Switch } from "#/components/ui/switch";
import { StepNavigation } from "../StepNavigation";
import type { SetupState } from "../SetupWizard";

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
	return (
		<div>
			<h2 className="font-display text-2xl font-bold tracking-tight">
				Firewall & Backup
			</h2>
			<p className="mt-2 text-muted-foreground">
				Configure network security and automated backup scheduling.
			</p>

			<div className="mt-8 space-y-6">
				{/* Firewall */}
				<Card>
					<CardHeader className="pb-3">
						<div className="flex items-center gap-2">
							<Shield className="h-4 w-4 text-muted-foreground" />
							<span className="text-sm font-medium">Firewall (UFW)</span>
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm">Enable UFW firewall</p>
								<p className="text-xs text-muted-foreground">
									Uses ufw-docker to properly manage Docker iptables
									rules. SSH (port 22) is always allowed.
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
								Automated Backups
							</span>
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-1.5">
							<Label htmlFor="backup-hour">
								Daily backup hour (0-23)
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
								Backups run daily via systemd timer. Default: 2:00 AM.
								Configs are backed up locally and synced to configured
								rclone remotes.
							</p>
						</div>
					</CardContent>
				</Card>
			</div>

			<StepNavigation
				onBack={onBack}
				onNext={onComplete}
				nextLabel="Finish"
			/>
		</div>
	);
}
