import type { EnvConfig } from "@mithrandir/cli/lib/config";

export function isRcloneInstalled(): Promise<boolean>;
export function installRclone(): Promise<void>;
export function listDirs(remote: string, remotePath: string): Promise<string[]>;
export function listFiles(
	remote: string,
	remotePath: string,
): Promise<string[]>;
export function isRcloneRemoteConfigured(
	remoteName: string,
	env?: EnvConfig,
): Promise<{ configured: true } | { configured: false; reason: string }>;
