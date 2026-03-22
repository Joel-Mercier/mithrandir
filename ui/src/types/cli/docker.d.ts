export function isContainerRunning(containerName: string): Promise<boolean>;
export function containerExists(containerName: string): Promise<boolean>;
export function composeUp(composePath: string): Promise<void>;
export function composeDown(composePath: string): Promise<void>;
export function isDockerInstalled(): Promise<boolean>;
export function installDocker(): Promise<void>;
export function waitForDocker(
	retries?: number,
	delay?: number,
): Promise<boolean>;
export function pullImageWithProgress(
	image: string,
	onProgress: (percent: number) => void,
): Promise<string>;
export function pullImage(image: string): Promise<string>;
export function removeContainer(name: string): Promise<void>;
export function getRunningImageId(name: string): Promise<string | null>;
export function stopContainer(containerName: string): Promise<void>;
