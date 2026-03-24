import { Cloud, HardDrive, Server } from "lucide-react";
import { useEffect, useRef } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader } from "#/components/ui/card";
import { Spinner } from "#/components/ui/spinner";
import { useInstallSystemDep, useSystemRequirements } from "#/hooks/homelab";
import { m } from "#/paraglide/messages.js";
import type { SetupState } from "../SetupWizard";
import { StepNavigation } from "../StepNavigation";

type CheckStatus = SetupState["systemChecks"]["docker"];

interface WelcomeStepProps {
	state: SetupState;
	updateState: (updates: Partial<SetupState>) => void;
	onComplete: () => void;
}

function getChecks() {
	return [
		{
			key: "docker" as const,
			label: m.welcome_dockerEngine(),
			icon: Server,
			description: m.welcome_dockerDesc(),
			action: m.welcome_installDocker(),
			optional: false,
		},
		{
			key: "swap" as const,
			label: m.welcome_swapMemory(),
			icon: HardDrive,
			description: m.welcome_swapDesc(),
			action: m.welcome_configureSwap(),
			optional: true,
		},
		{
			key: "rclone" as const,
			label: m.welcome_rclone(),
			icon: Cloud,
			description: m.welcome_rcloneDesc(),
			action: m.welcome_installRclone(),
			optional: false,
		},
	];
}

function StatusBadge({
	status,
	optional,
}: {
	status: CheckStatus;
	optional?: boolean;
}) {
	if (status === "checking") {
		return (
			<Badge variant="outline" className="gap-1">
				<Spinner size="sm" className="h-3 w-3" />
				{m.welcome_checking()}
			</Badge>
		);
	}
	if (status === "installed") {
		return (
			<Badge className="bg-status-healthy text-white">
				{m.welcome_installed()}
			</Badge>
		);
	}
	if (optional) {
		return <Badge variant="secondary">{m.welcome_optional()}</Badge>;
	}
	return <Badge variant="destructive">{m.welcome_missing()}</Badge>;
}

export function WelcomeStep({
	state,
	updateState,
	onComplete,
}: WelcomeStepProps) {
	const { data } = useSystemRequirements();
	const installDep = useInstallSystemDep();

	const updateStateRef = useRef(updateState);
	updateStateRef.current = updateState;

	useEffect(() => {
		if (!data) return;
		updateStateRef.current({
			systemChecks: {
				docker: data.docker === "installed" ? "installed" : "missing",
				swap: data.swap === "installed" ? "installed" : "missing",
				rclone: data.rclone === "installed" ? "installed" : "missing",
			},
		});
	}, [data]);

	const checks = getChecks();

	const allReady = checks
		.filter((c) => !c.optional)
		.every((c) => state.systemChecks[c.key] === "installed");

	return (
		<div>
			<h1 className="font-display text-3xl font-bold tracking-tight">
				{m.welcome_title()}
			</h1>
			<p className="mt-2 text-muted-foreground">{m.welcome_subtitle()}</p>

			<div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
				{checks.map((check) => {
					const status = state.systemChecks[check.key];
					const Icon = check.icon;

					return (
						<Card key={check.key}>
							<CardHeader className="flex flex-row items-center justify-between pb-2">
								<div className="flex items-center gap-2">
									<Icon className="h-4 w-4 text-muted-foreground" />
									<span className="text-sm font-medium">{check.label}</span>
								</div>
								<StatusBadge status={status} optional={check.optional} />
							</CardHeader>
							<CardContent>
								<p className="mb-3 text-xs text-muted-foreground">
									{check.description}
								</p>
								{status === "missing" && (
									<Button
										size="sm"
										variant="outline"
										className="w-full"
										disabled={installDep.isPending}
										onClick={() => installDep.mutate(check.key)}
									>
										{installDep.isPending &&
										installDep.variables === check.key ? (
											<>
												<Spinner size="sm" className="mr-1 h-3 w-3" />
												{m.common_installing()}
											</>
										) : (
											check.action
										)}
									</Button>
								)}
							</CardContent>
						</Card>
					);
				})}
			</div>

			<StepNavigation
				onNext={onComplete}
				nextDisabled={!allReady}
				showBack={false}
				nextLabel={m.welcome_getStarted()}
			/>
		</div>
	);
}
