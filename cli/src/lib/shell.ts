import { execa, type ResultPromise } from "execa";

export interface ShellOptions {
  sudo?: boolean;
  cwd?: string;
  /** If true, don't throw on non-zero exit */
  ignoreError?: boolean;
  /** Environment variables to pass */
  env?: Record<string, string>;
}

export interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Run a shell command safely using execa (no shell injection risk).
 * Arguments are passed as an array, never through a shell.
 */
export async function shell(
  command: string,
  args: string[] = [],
  options: ShellOptions = {},
): Promise<ShellResult> {
  const { sudo = false, cwd, ignoreError = false, env } = options;

  const cmd = sudo ? "sudo" : command;
  const cmdArgs = sudo ? [command, ...args] : args;

  try {
    const result = await execa(cmd, cmdArgs, {
      cwd,
      env,
      reject: !ignoreError,
    });
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode ?? 0,
    };
  } catch (error: any) {
    if (ignoreError) {
      return {
        stdout: error.stdout ?? "",
        stderr: error.stderr ?? "",
        exitCode: (error.exitCode ?? 1) as number,
      };
    }
    throw error;
  }
}

/**
 * Run a command and stream output in real-time (for long-running ops).
 */
export function shellStream(
  command: string,
  args: string[] = [],
  options: ShellOptions = {},
): ResultPromise {
  const { sudo = false, cwd, env } = options;

  const cmd = sudo ? "sudo" : command;
  const cmdArgs = sudo ? [command, ...args] : args;

  return execa(cmd, cmdArgs, {
    cwd,
    env,
    stdout: "pipe",
    stderr: "pipe",
  });
}

/** Check if a command exists on the system */
export async function commandExists(cmd: string): Promise<boolean> {
  const result = await shell("which", [cmd], { ignoreError: true });
  return result.exitCode === 0;
}

/** Check if we have sudo access without a password prompt */
export async function hasSudoAccess(): Promise<boolean> {
  const result = await shell("sudo", ["-n", "true"], { ignoreError: true });
  return result.exitCode === 0;
}
