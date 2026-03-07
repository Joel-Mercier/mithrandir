import { execa, type ResultPromise } from "execa";

/**
 * Cached check: does Docker require sudo?
 * Returns false if already root or if user is in the `docker` group.
 */
let _dockerNeedsSudo: boolean | null = null;

export async function dockerNeedsSudo(): Promise<boolean> {
  if (_dockerNeedsSudo !== null) return _dockerNeedsSudo;
  if (process.getuid?.() === 0) {
    _dockerNeedsSudo = false;
    return false;
  }
  try {
    const result = await execa("id", ["-nG"], { reject: false });
    const groups = (result.stdout ?? "").trim().split(/\s+/);
    _dockerNeedsSudo = !groups.includes("docker");
  } catch {
    _dockerNeedsSudo = true;
  }
  return _dockerNeedsSudo;
}

export interface ShellOptions {
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
  let { sudo = false, user, cwd, ignoreError = false, env, timeout } = options;

  // Docker commands don't need sudo if the user is in the docker group
  if (sudo && !user && command === "docker") {
    if (!(await dockerNeedsSudo())) sudo = false;
  }

  let cmd: string;
  let cmdArgs: string[];
  if (user) {
    cmd = "sudo";
    cmdArgs = ["-u", user, command, ...args];
  } else if (sudo) {
    cmd = "sudo";
    cmdArgs = [command, ...args];
  } else {
    cmd = command;
    cmdArgs = args;
  }

  const execaOpts: Record<string, unknown> = { reject: !ignoreError };
  if (cwd) execaOpts.cwd = cwd;
  if (env) execaOpts.env = env;
  if (timeout) execaOpts.timeout = timeout;

  try {
    const result = await execa(cmd, cmdArgs, execaOpts);
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
export async function shellStream(
  command: string,
  args: string[] = [],
  options: ShellOptions = {},
): Promise<ResultPromise> {
  let { sudo = false, cwd, env } = options;

  // Docker commands don't need sudo if the user is in the docker group
  if (sudo && command === "docker") {
    if (!(await dockerNeedsSudo())) sudo = false;
  }

  const cmd = sudo ? "sudo" : command;
  const cmdArgs = sudo ? [command, ...args] : args;

  const execaOpts: Record<string, unknown> = { stdout: "pipe", stderr: "pipe" };
  if (cwd) execaOpts.cwd = cwd;
  if (env) execaOpts.env = env;

  return execa(cmd, cmdArgs, execaOpts);
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
