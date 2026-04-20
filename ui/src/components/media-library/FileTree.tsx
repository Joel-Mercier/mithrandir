import type { FileNode } from "@mithrandir/cli/lib/media";
import { ChevronRight, File, Folder, FolderOpen, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "#/components/ui/collapsible";
import { cn, formatFileSize } from "#/lib/utils";
import { m } from "#/paraglide/messages.js";

function collectDescendantPaths(node: FileNode, path: string): string[] {
	const paths = [path];
	if (node.type === "directory" && node.children) {
		for (const child of node.children) {
			paths.push(...collectDescendantPaths(child, `${path}/${child.name}`));
		}
	}
	return paths;
}

function FileTreeItem({
	node,
	depth = 0,
	path,
	selectedPaths,
	onToggleSelect,
	onDelete,
	isDeleting,
}: {
	node: FileNode;
	depth?: number;
	path: string;
	selectedPaths: Set<string>;
	onToggleSelect: (paths: string[], checked: boolean) => void;
	onDelete: (path: string, name: string) => void;
	isDeleting: boolean;
}) {
	const [open, setOpen] = useState(false);
	const isSelected = selectedPaths.has(path);

	const handleCheckedChange = (checked: boolean | "indeterminate") => {
		const all = collectDescendantPaths(node, path);
		onToggleSelect(all, checked === true);
	};

	const rowPadding = { paddingLeft: `${depth * 16 + 8}px` };

	if (node.type === "file") {
		return (
			<div
				className={cn(
					"group flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors hover:bg-accent/50",
					isSelected && "bg-primary/5",
				)}
				style={rowPadding}
			>
				<Checkbox
					checked={isSelected}
					onCheckedChange={handleCheckedChange}
					onClick={(e) => e.stopPropagation()}
					aria-label={m.mediaLibrary_selectFile({ name: node.name })}
				/>
				<File className="shrink-0 text-muted-foreground" />
				<span className="truncate">{node.name}</span>
				<span className="ml-auto shrink-0 font-mono-data text-xs text-muted-foreground">
					{formatFileSize(node.size)}
				</span>
				<Button
					variant="ghost"
					size="icon"
					className="size-7 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-status-critical group-hover:opacity-100 focus-visible:opacity-100"
					disabled={isDeleting}
					onClick={() => onDelete(path, node.name)}
					aria-label={m.mediaLibrary_deleteFile({ name: node.name })}
				>
					<Trash2 className="size-3.5" />
				</Button>
			</div>
		);
	}

	const hasChildren = node.children && node.children.length > 0;

	return (
		<Collapsible open={open} onOpenChange={setOpen}>
			<div
				className={cn(
					"group flex items-center gap-2 rounded-md pr-1 transition-colors hover:bg-accent/50",
					isSelected && "bg-primary/5",
				)}
			>
				<div className="flex items-center pl-2" style={rowPadding}>
					<Checkbox
						checked={isSelected}
						onCheckedChange={handleCheckedChange}
						onClick={(e) => e.stopPropagation()}
						aria-label={m.mediaLibrary_selectFolder({ name: node.name })}
					/>
				</div>
				<CollapsibleTrigger asChild>
					<Button
						variant="ghost"
						className="h-auto flex-1 justify-start gap-2 px-2 py-1 text-sm font-medium"
					>
						<ChevronRight
							className={cn(
								"shrink-0 text-muted-foreground transition-transform duration-200",
								open && "rotate-90",
							)}
						/>
						{open ? (
							<FolderOpen className="shrink-0 text-primary/70" />
						) : (
							<Folder className="shrink-0 text-primary/70" />
						)}
						<span className="truncate">{node.name}</span>
						<span className="ml-auto shrink-0 font-mono-data text-xs text-muted-foreground">
							{formatFileSize(node.size)}
						</span>
					</Button>
				</CollapsibleTrigger>
				<Button
					variant="ghost"
					size="icon"
					className="size-7 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-status-critical group-hover:opacity-100 focus-visible:opacity-100"
					disabled={isDeleting}
					onClick={() => onDelete(path, node.name)}
					aria-label={m.mediaLibrary_deleteFolder({ name: node.name })}
				>
					<Trash2 className="size-3.5" />
				</Button>
			</div>
			{hasChildren && (
				<CollapsibleContent>
					{node.children!.map((child) => (
						<FileTreeItem
							key={child.name}
							node={child}
							depth={depth + 1}
							path={`${path}/${child.name}`}
							selectedPaths={selectedPaths}
							onToggleSelect={onToggleSelect}
							onDelete={onDelete}
							isDeleting={isDeleting}
						/>
					))}
				</CollapsibleContent>
			)}
		</Collapsible>
	);
}

export default function FileTree({
	nodes,
	basePath,
	selectedPaths,
	onToggleSelect,
	onDelete,
	isDeleting,
}: {
	nodes: FileNode[];
	basePath: string;
	selectedPaths: Set<string>;
	onToggleSelect: (paths: string[], checked: boolean) => void;
	onDelete: (path: string, name: string) => void;
	isDeleting: boolean;
}) {
	if (nodes.length === 0) {
		return (
			<div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
				Empty directory
			</div>
		);
	}

	return (
		<div className="space-y-0.5">
			{nodes.map((node) => (
				<FileTreeItem
					key={node.name}
					node={node}
					path={`${basePath}/${node.name}`}
					selectedPaths={selectedPaths}
					onToggleSelect={onToggleSelect}
					onDelete={onDelete}
					isDeleting={isDeleting}
				/>
			))}
		</div>
	);
}
