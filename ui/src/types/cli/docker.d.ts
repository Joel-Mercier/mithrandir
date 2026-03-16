export function isContainerRunning(containerName: string): Promise<boolean>;
export function composeUp(composePath: string): Promise<void>;
export function composeDown(composePath: string): Promise<void>;
export function isDockerInstalled(): Promise<boolean>;
