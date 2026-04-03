import type { FileNode } from "@mithrandir/cli/lib/media";
import { ChevronRight, File, Folder, FolderOpen } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "#/components/ui/collapsible";
import { cn, formatFileSize } from "#/lib/utils";

function FileTreeItem({
	node,
	depth = 0,
}: { node: FileNode; depth?: number }) {
	const [open, setOpen] = useState(false);

	if (node.type === "file") {
		return (
			<div
				className="flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors hover:bg-accent/50"
				style={{ paddingLeft: `${depth * 16 + 8}px` }}
			>
				<File className="shrink-0 text-muted-foreground" />
				<span className="truncate">{node.name}</span>
				<span className="ml-auto shrink-0 font-mono-data text-xs text-muted-foreground">
					{formatFileSize(node.size)}
				</span>
			</div>
		);
	}

	const hasChildren = node.children && node.children.length > 0;

	return (
		<Collapsible open={open} onOpenChange={setOpen}>
			<CollapsibleTrigger asChild>
				<Button
					variant="ghost"
					className="h-auto w-full justify-start gap-2 px-2 py-1 text-sm font-medium"
					style={{ paddingLeft: `${depth * 16 + 8}px` }}
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
			{hasChildren && (
				<CollapsibleContent>
					{node.children!.map((child) => (
						<FileTreeItem
							key={child.name}
							node={child}
							depth={depth + 1}
						/>
					))}
				</CollapsibleContent>
			)}
		</Collapsible>
	);
}

export default function FileTree({ nodes }: { nodes: FileNode[] }) {
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
				<FileTreeItem key={node.name} node={node} />
			))}
		</div>
	);
}
