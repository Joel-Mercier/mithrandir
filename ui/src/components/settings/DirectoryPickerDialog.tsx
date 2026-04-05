import type { DirEntry } from "@mithrandir/cli/lib/filesystem";
import { ChevronRight, Folder, FolderOpen, HardDrive } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "#/components/ui/breadcrumb";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { ScrollArea } from "#/components/ui/scroll-area";
import { Spinner } from "#/components/ui/spinner";
import { useBrowseDirectory } from "#/hooks/homelab";

interface DirectoryPickerDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialPath?: string;
	onSelect: (path: string) => void;
}

function PathBreadcrumb({
	path,
	onNavigate,
}: { path: string; onNavigate: (path: string) => void }) {
	const segments = path.split("/").filter(Boolean);

	return (
		<Breadcrumb>
			<BreadcrumbList className="flex-nowrap overflow-hidden">
				<BreadcrumbItem>
					{segments.length === 0 ? (
						<BreadcrumbPage className="flex items-center gap-1">
							<HardDrive className="size-3.5" />
							<span>/</span>
						</BreadcrumbPage>
					) : (
						<BreadcrumbLink
							className="flex cursor-pointer items-center gap-1"
							onClick={() => onNavigate("/")}
						>
							<HardDrive className="size-3.5" />
							<span>/</span>
						</BreadcrumbLink>
					)}
				</BreadcrumbItem>
				{segments.map((segment, i) => {
					const segmentPath = `/${segments.slice(0, i + 1).join("/")}`;
					const isLast = i === segments.length - 1;
					return (
						<span key={segmentPath} className="contents">
							<BreadcrumbSeparator>
								<ChevronRight />
							</BreadcrumbSeparator>
							<BreadcrumbItem className="min-w-0">
								{isLast ? (
									<BreadcrumbPage className="truncate">
										{segment}
									</BreadcrumbPage>
								) : (
									<BreadcrumbLink
										className="cursor-pointer truncate"
										onClick={() => onNavigate(segmentPath)}
									>
										{segment}
									</BreadcrumbLink>
								)}
							</BreadcrumbItem>
						</span>
					);
				})}
			</BreadcrumbList>
		</Breadcrumb>
	);
}

function DirectoryRow({
	entry,
	onClick,
}: { entry: DirEntry; onClick: () => void }) {
	return (
		<button
			type="button"
			className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none"
			onClick={onClick}
		>
			<Folder className="size-4 shrink-0 text-primary/70" />
			<span className="truncate">{entry.name}</span>
			<ChevronRight className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
		</button>
	);
}

export function DirectoryPickerDialog({
	open,
	onOpenChange,
	initialPath,
	onSelect,
}: DirectoryPickerDialogProps) {
	const [currentPath, setCurrentPath] = useState(initialPath || "/");
	const { data, isLoading } = useBrowseDirectory(currentPath);

	useEffect(() => {
		if (open) {
			setCurrentPath(initialPath || "/");
		}
	}, [open, initialPath]);

	const navigateTo = useCallback((path: string) => {
		setCurrentPath(path);
	}, []);

	const navigateUp = useCallback(() => {
		const parent = currentPath.replace(/\/[^/]+\/?$/, "") || "/";
		setCurrentPath(parent);
	}, [currentPath]);

	const handleSelect = useCallback(() => {
		onSelect(data?.path ?? currentPath);
		onOpenChange(false);
	}, [data?.path, currentPath, onSelect, onOpenChange]);

	const isRoot = currentPath === "/";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[80vh] flex-col sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Select Directory</DialogTitle>
					<DialogDescription className="sr-only">
						Browse the filesystem to select a directory path.
					</DialogDescription>
				</DialogHeader>

				<div className="rounded-md border bg-muted/30 px-3 py-2">
					<PathBreadcrumb path={currentPath} onNavigate={navigateTo} />
				</div>

				<ScrollArea className="h-[340px] rounded-md border">
					{isLoading ? (
						<div className="flex items-center justify-center py-12">
							<Spinner />
						</div>
					) : (
						<div className="p-1">
							{!isRoot && (
								<button
									type="button"
									className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none"
									onClick={navigateUp}
								>
									<FolderOpen className="size-4 shrink-0" />
									<span>..</span>
								</button>
							)}
							{data?.entries.length === 0 && (
								<div className="py-8 text-center text-sm text-muted-foreground">
									Empty directory
								</div>
							)}
							{data?.entries.map((entry) => (
								<DirectoryRow
									key={entry.name}
									entry={entry}
									onClick={() =>
										navigateTo(
											currentPath === "/"
												? `/${entry.name}`
												: `${currentPath}/${entry.name}`,
										)
									}
								/>
							))}
						</div>
					)}
				</ScrollArea>

				<div className="truncate rounded-md bg-muted/50 px-3 py-1.5 font-mono-data text-xs text-muted-foreground">
					{data?.path ?? currentPath}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleSelect}>Select</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
