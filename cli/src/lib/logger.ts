import { appendFile } from "fs/promises";

/** Format a timestamp for log entries */
function timestamp(): string {
  return new Date().toISOString().replace("T", " ").replace(/\.\d+Z$/, "");
}

/**
 * Logger that works in both TTY (Ink) and non-TTY (systemd/pipe) modes.
 *
 * - TTY: Returns messages for Ink to render (no direct stdout writes)
 * - Non-TTY: Writes timestamped lines to stdout and optional log file
 */
export class Logger {
  private logFile: string | null;
  private isTTY: boolean;

  constructor(logFile: string | null = null) {
    this.logFile = logFile;
    this.isTTY = process.stdout.isTTY ?? false;
  }

  /** Log an info message */
  async info(message: string): Promise<void> {
    const line = `[${timestamp()}] ${message}`;
    if (!this.isTTY) {
      console.log(line);
    }
    if (this.logFile) {
      await appendFile(this.logFile, line + "\n").catch(() => {});
    }
  }

  /** Log a warning */
  async warn(message: string): Promise<void> {
    const line = `[${timestamp()}] WARN: ${message}`;
    if (!this.isTTY) {
      console.error(line);
    }
    if (this.logFile) {
      await appendFile(this.logFile, line + "\n").catch(() => {});
    }
  }

  /** Log an error */
  async error(message: string): Promise<void> {
    const line = `[${timestamp()}] ERROR: ${message}`;
    if (!this.isTTY) {
      console.error(line);
    }
    if (this.logFile) {
      await appendFile(this.logFile, line + "\n").catch(() => {});
    }
  }

  /** Format a message for return (used by Ink components) */
  format(message: string): string {
    return `[${timestamp()}] ${message}`;
  }
}

/** Create a backup logger */
export function createBackupLogger(): Logger {
  return new Logger("/var/log/homelab-backup.log");
}

/** Create a restore logger */
export function createRestoreLogger(): Logger {
  return new Logger("/var/log/homelab-restore.log");
}
