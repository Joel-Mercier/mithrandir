import { useEffect, useRef } from "react";
import { Cloud, HardDrive, Server } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader } from "#/components/ui/card";
import { Spinner } from "#/components/ui/spinner";
import { useSystemRequirements, useInstallSystemDep } from "#/hooks/homelab";
import { StepNavigation } from "../StepNavigation";
import type { SetupState } from "../SetupWizard";

type CheckStatus = SetupState["systemChecks"]["docker"];

interface WelcomeStepProps {
	state: SetupState;
	updateState: (updates: Partial<SetupState>) => void;
	onComplete: () => void;
}

const checks = [
	{
		key: "docker" as const,
		label: "Docker Engine",
		icon: Server,
		description: "Container runtime for all services",
		action: "Install Docker",
		optional: false,
	},
	{
		key: "swap" as const,
		label: "Swap Memory",
		icon: HardDrive,
		description: "Virtual memory for stability (recommended)",
		action: "Configure Swap",
		optional: true,
	},
	{
		key: "rclone" as const,
		label: "rclone",
		icon: Cloud,
		description: "Cloud storage for remote backups",
		action: "Install rclone",
		optional: false,
	},
];

function StatusBadge({ status, optional }: { status: CheckStatus; optional?: boolean }) {
	if (status === "checking") {
		return (
			<Badge variant="outline" className="gap-1">
				<Spinner size="sm" className="h-3 w-3" />
				Checking
			</Badge>
		);
	}
	if (status === "installed") {
		return (
			<Badge className="bg-status-healthy text-white">Installed</Badge>
		);
	}
	if (optional) {
		return <Badge variant="secondary">Optional</Badge>;
	}
	return <Badge variant="destructive">Missing</Badge>;
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

	const allReady = checks
		.filter((c) => !c.optional)
		.every((c) => state.systemChecks[c.key] === "installed");

	return (
		<div>
			<h1 className="font-display text-3xl font-bold tracking-tight">
				Welcome to Mithrandir
			</h1>
			<p className="mt-2 text-muted-foreground">
				Let's set up your homelab. First, we'll check that your system meets
				the requirements.
			</p>

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
												Installing...
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
				nextLabel="Get Started"
			/>
		</div>
	);
}
