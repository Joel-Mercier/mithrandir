import type { AppDefinition } from "./apps";

export function isUfwInstalled(): Promise<boolean>;
export function isUfwDockerInstalled(): Promise<boolean>;
export function isUfwActive(): Promise<boolean>;
export function installUfw(): Promise<void>;
export function installUfwDocker(): Promise<void>;
export function enableUfw(): Promise<void>;
export function allowAppPorts(app: AppDefinition): Promise<void>;
export function removeAppPorts(app: AppDefinition): Promise<void>;
export function syncAllAppPorts(apps: AppDefinition[]): Promise<void>;
export function getUfwStatus(): Promise<string>;
