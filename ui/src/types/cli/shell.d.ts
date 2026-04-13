interface ShellOptions {
	sudo?: boolean;
	/** Run command as a specific user via sudo -u */
	user?: string;
	cwd?: string;
	/** If true, don't throw on non-zero exit */
	ignoreError?: boolean;
	/** Environment variables to pass */
	env?: Record<string, string>;
	/** Timeout in milliseconds */
	timeout?: number;
}

interface ShellResult {
	stdout: string;
	stderr?: string;
	exitCode: number;
}

export function shell(
	cmd: string,
	args: string[],
	options?: ShellOptions,
): Promise<ShellResult>;
export function dockerNeedsSudo(): Promise<boolean>;
export function commandExists(cmd: string): Promise<boolean>;
