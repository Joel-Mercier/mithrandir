export function getActiveSlot(uiDir: string): "blue" | "green";
export function getInactiveSlot(uiDir: string): "blue" | "green";
export function deployUiBuild(uiDir: string): Promise<void>;
export function bootstrapDeployment(uiDir: string): Promise<void>;
export function hasValidDeployment(uiDir: string): boolean;
