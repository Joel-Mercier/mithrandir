import { useState } from "react";
import {
	CheckCircle2,
	AlertTriangle,
	XCircle,
	Stethoscope,
	Loader2,
} from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { useDoctor } from "#/hooks/homelab";
import type { DoctorCheckResult, DoctorCheckStatus } from "#/lib/types";
import { m } from "#/paraglide/messages.js";

function StatusIcon({ status }: { status: DoctorCheckStatus }) {
	switch (status) {
		case "pass":
			return <CheckCircle2 className="h-4 w-4 text-status-healthy" />;
		case "warn":
			return <AlertTriangle className="h-4 w-4 text-status-warning" />;
		case "fail":
			return <XCircle className="h-4 w-4 text-status-critical" />;
	}
}

function StatusBadge({ status }: { status: DoctorCheckStatus }) {
	const classes: Record<DoctorCheckStatus, string> = {
		pass: "bg-status-healthy/15 text-status-healthy border-status-healthy/30",
		warn: "bg-status-warning/15 text-status-warning border-status-warning/30",
		fail: "bg-status-critical/15 text-status-critical border-status-critical/30",
	};
	return (
		<Badge variant="outline" className={classes[status]}>
			{status.toUpperCase()}
		</Badge>
	);
}

function CheckRow({ check }: { check: DoctorCheckResult }) {
	return (
		<div className="space-y-0.5">
			<div className="flex items-center gap-2 text-sm">
				<StatusIcon status={check.status} />
				<span className="font-medium">{check.name}</span>
				<span className="text-muted-foreground">{check.message}</span>
				<StatusBadge status={check.status} />
			</div>
			{check.hint && (
				<p className="ml-6 text-xs text-muted-foreground">
					{check.hint}
				</p>
			)}
		</div>
	);
}

export default function DoctorDialog() {
	const [open, setOpen] = useState(false);
	const doctor = useDoctor();

	function handleOpen(nextOpen: boolean) {
		setOpen(nextOpen);
		if (nextOpen && !doctor.data && !doctor.isPending) {
			doctor.mutate();
		}
	}

	function handleRerun() {
		doctor.mutate();
	}

	const categories = doctor.data
		? [...new Set(doctor.data.checks.map((c) => c.category))]
		: [];

	return (
		<Dialog open={open} onOpenChange={handleOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className="gap-2">
					<Stethoscope className="h-4 w-4" />
					{m.doctor_runButton()}
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto bg-background/95 backdrop-blur">
				<DialogHeader>
					<DialogTitle>{m.doctor_title()}</DialogTitle>
					<DialogDescription>
						{m.doctor_description()}
					</DialogDescription>
				</DialogHeader>

				{doctor.isPending && (
					<div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
						{m.doctor_running()}
					</div>
				)}

				{doctor.isError && (
					<p className="py-4 text-sm text-destructive">
						{m.doctor_error({
							error:
								doctor.error?.message ?? "Unknown error",
						})}
					</p>
				)}

				{doctor.data && (
					<div className="space-y-4">
						{categories.map((cat) => (
							<div key={cat} className="space-y-2">
								<h4 className="text-sm font-semibold">
									{cat}
								</h4>
								<div className="space-y-2 pl-1">
									{doctor.data.checks
										.filter((c) => c.category === cat)
										.map((c) => (
											<CheckRow
												key={c.name}
												check={c}
											/>
										))}
								</div>
							</div>
						))}

						<p className="text-sm text-muted-foreground">
							{doctor.data.issueCount === 0
								? m.doctor_noIssues()
								: m.doctor_issuesFound({
										count: String(
											doctor.data.issueCount,
										),
										s:
											doctor.data.issueCount !== 1
												? "s"
												: "",
									})}
						</p>
					</div>
				)}

				<DialogFooter>
					{doctor.data && (
						<Button
							variant="outline"
							size="sm"
							onClick={handleRerun}
							disabled={doctor.isPending}
						>
							{m.doctor_rerun()}
						</Button>
					)}
					<Button
						variant="outline"
						size="sm"
						onClick={() => setOpen(false)}
					>
						{m.doctor_close()}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
