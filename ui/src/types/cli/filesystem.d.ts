export interface FileNode {
	name: string;
	type: "file" | "directory";
	size: number;
	children?: FileNode[];
}

export interface DirEntry {
	name: string;
	type: "file" | "directory";
	size: number;
}

export interface ListDirectoryOptions {
	directoriesOnly?: boolean;
	showHidden?: boolean;
	ignoredNames?: Set<string>;
}

export interface ListDirectoryResult {
	path: string;
	entries: DirEntry[];
}

export function listDirectory(
	dirPath: string,
	options?: ListDirectoryOptions,
): Promise<ListDirectoryResult>;

export function scanDirectory(
	dirPath: string,
	maxDepth: number,
	currentDepth?: number,
): Promise<{ nodes: FileNode[]; totalSize: number; fileCount: number }>;

export function getDirectorySize(
	dirPath: string,
): Promise<{ totalSize: number; fileCount: number }>;
