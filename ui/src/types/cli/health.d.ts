export type CheckStatus = "pass" | "warn" | "fail";

export interface CheckResult {
	name: string;
	status: CheckStatus;
	message: string;
}

export function runHealthChecks(
	projectRoot?: string,
): Promise<CheckResult[]>;
