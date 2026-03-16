interface ShellOptions {
	sudo?: boolean;
	ignoreError?: boolean;
	timeout?: number;
	cwd?: string;
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
