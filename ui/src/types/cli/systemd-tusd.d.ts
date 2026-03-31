export const TUSD_PORT: number;
export function installTusdService(repoRoot: string, uploadDir: string): Promise<void>;
export function removeTusdService(): Promise<void>;
export function isTusdServiceActive(): Promise<boolean>;
