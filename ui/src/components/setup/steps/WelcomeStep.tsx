import { useEffect, useRef } from "react";
import { Cloud, HardDrive, Server } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader } from "#/components/ui/card";
import { Spinner } from "#/components/ui/spinner";
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
	},
	{
		key: "swap" as const,
		label: "Swap Memory",
		icon: HardDrive,
		description: "Virtual memory for stability",
		action: "Configure Swap",
	},
	{
		key: "rclone" as const,
		label: "rclone",
		icon: Cloud,
		description: "Cloud storage for remote backups",
		action: "Install rclone",
	},
];

function StatusBadge({ status }: { status: CheckStatus }) {
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
	return <Badge variant="destructive">Missing</Badge>;
}

export function WelcomeStep({
	state,
	updateState,
	onComplete,
}: WelcomeStepProps) {
	// Simulate system checks on mount
	const updateStateRef = useRef(updateState);
	updateStateRef.current = updateState;

	useEffect(() => {
		const timers = [
			setTimeout(
				() =>
					updateStateRef.current({
						systemChecks: { docker: "installed", swap: "checking", rclone: "checking" },
					}),
				800,
			),
			setTimeout(
				() =>
					updateStateRef.current({
						systemChecks: { docker: "installed", swap: "installed", rclone: "checking" },
					}),
				1200,
			),
			setTimeout(
				() =>
					updateStateRef.current({
						systemChecks: {
							docker: "installed",
							swap: "installed",
							rclone: "installed",
						},
					}),
				1600,
			),
		];
		return () => timers.forEach(clearTimeout);
	}, []);

	const allReady = Object.values(state.systemChecks).every(
		(s) => s === "installed",
	);

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
								<StatusBadge status={status} />
							</CardHeader>
							<CardContent>
								<p className="mb-3 text-xs text-muted-foreground">
									{check.description}
								</p>
								{status === "missing" && (
									<Button size="sm" variant="outline" className="w-full">
										{check.action}
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
