import type { EnvConfig } from "@mithrandir/cli/lib/config";

export function isRcloneInstalled(): Promise<boolean>;
export function listRemotes(): Promise<{ name: string; type: string }[]>;
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
export function isRemoteReachable(remote: string): Promise<boolean>;
export function createRemote(
	name: string,
	type: string,
	params: Record<string, string>,
): Promise<void>;
export function deleteRemote(name: string): Promise<void>;
export function getRemoteType(remote: string): Promise<string | null>;
export function obscurePassword(password: string): Promise<string>;
