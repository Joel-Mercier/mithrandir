export function generateServiceUnit(): string;
export function generateTimerUnit(hour?: number): string;
export function installSystemdUnits(hour?: number): Promise<void>;
export function removeSystemdUnits(): Promise<void>;
export function isTimerActive(): Promise<boolean>;
export function hasSystemd(): Promise<boolean>;
export function isWsl(): Promise<boolean>;
