import type { MediaCategoryInfo } from "@mithrandir/cli/lib/media";
import type { MediaSortDirection, MediaSortField } from "@mithrandir/cli/lib/media";
import { Link } from "@tanstack/react-router";
import {
	ArrowDownAZ,
	ArrowDownZA,
	ArrowUpDown,
	Film,
	FolderOpen,
	HardDrive,
	Headphones,
	Image,
	Loader2,
	Music,
	Podcast,
	Search,
	Tv,
	Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Input } from "#/components/ui/input";
import { Progress } from "#/components/ui/progress";
import { ScrollArea } from "#/components/ui/scroll-area";
import { Skeleton } from "#/components/ui/skeleton";
import { useMediaCategory, useMediaLibrary } from "#/hooks/homelab";
import { cn, formatFileSize } from "#/lib/utils";
import { m } from "#/paraglide/messages.js";
import FileTree from "./FileTree";

const CATEGORY_META: Record<
	string,
	{ icon: typeof Film; label: () => string }
> = {
	movies: { icon: Film, label: () => m.upload_movies() },
	tv: { icon: Tv, label: () => m.upload_tv() },
	music: { icon: Music, label: () => m.upload_music() },
	audiobooks: { icon: Headphones, label: () => m.upload_audiobooks() },
	podcasts: { icon: Podcast, label: () => m.upload_podcasts() },
	pictures: { icon: Image, label: () => m.upload_pictures() },
};

function CategoryCard({
	info,
	isSelected,
	onSelect,
}: {
	info: MediaCategoryInfo;
	isSelected: boolean;
	onSelect: () => void;
}) {
	const meta = CATEGORY_META[info.category];
	if (!meta) return null;
	const Icon = meta.icon;

	return (
		<Button
			variant="outline"
			onClick={onSelect}
			className={cn(
				"h-auto justify-start gap-3 px-4 py-3 text-left",
				isSelected
					? "border-border/30 bg-primary/5 shadow-sm"
					: "border-border/50 hover:border-border hover:bg-accent/30",
			)}
		>
			<div
				className={cn(
					"flex size-9 shrink-0 items-center justify-center rounded-md",
					isSelected
						? "bg-primary/10 text-primary"
						: "bg-muted text-muted-foreground",
				)}
			>
				<Icon className="size-4" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-semibold">{meta.label()}</p>
				<p className="text-xs text-muted-foreground">
					{info.fileCount} {info.fileCount === 1 ? m.mediaLibrary_file() : m.mediaLibrary_files()}
					{info.totalSize > 0 && ` \u00b7 ${formatFileSize(info.totalSize)}`}
				</p>
			</div>
		</Button>
	);
}

function DiskUsageCard({
	mountpoint,
	usedBytes,
	totalBytes,
	availBytes,
}: {
	mountpoint: string;
	usedBytes: number;
	totalBytes: number;
	availBytes: number;
}) {
	const pct = totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0;

	const progressColor =
		pct >= 95
			? "[&>[data-slot=progress-indicator]]:bg-status-critical"
			: pct >= 80
				? "[&>[data-slot=progress-indicator]]:bg-status-warning"
				: "[&>[data-slot=progress-indicator]]:bg-status-healthy";

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-2">
					<HardDrive className="size-4 text-muted-foreground" />
					<CardTitle className="text-sm">{m.mediaLibrary_diskUsage()}</CardTitle>
				</div>
				<CardDescription>
					{mountpoint}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					<div className="flex items-baseline justify-between">
						<span className="font-mono-data text-lg font-semibold">
							{pct.toFixed(1)}%
						</span>
						<span className="text-xs text-muted-foreground">
							{formatFileSize(availBytes)} {m.mediaLibrary_free()}
						</span>
					</div>
					<Progress value={pct} className={progressColor} />
					<div className="flex justify-between text-xs text-muted-foreground">
						<span>
							{formatFileSize(usedBytes)} {m.mediaLibrary_used()}
						</span>
						<span>
							{formatFileSize(totalBytes)} {m.mediaLibrary_total()}
						</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function LoadingSkeleton() {
	return (
		<div className="space-y-6">
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
				{Array.from({ length: 6 }).map((_, i) => (
					<Skeleton key={`cat-skel-${i}`} className="h-[72px] rounded-lg" />
				))}
			</div>
			<Skeleton className="h-[200px] rounded-xl" />
		</div>
	);
}

export default function MediaLibraryContent() {
	const { data, isPending, isError } = useMediaLibrary();
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [sortBy, setSortBy] = useState<MediaSortField>("name");
	const [sortDirection, setSortDirection] = useState<MediaSortDirection>("asc");

	// Debounce search input
	useEffect(() => {
		const timer = setTimeout(() => setDebouncedSearch(search), 300);
		return () => clearTimeout(timer);
	}, [search]);

	// Reset search when category changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional trigger on category change
	useEffect(() => {
		setSearch("");
		setDebouncedSearch("");
	}, [selectedCategory]);

	const {
		data: categoryData,
		isPending: isCategoryPending,
		isFetching: isCategoryFetching,
	} = useMediaCategory(selectedCategory, {
		search: debouncedSearch || undefined,
		sortBy,
		sortDirection,
	});

	if (isPending) return <LoadingSkeleton />;

	if (isError || !data) {
		return (
			<Card>
				<CardContent className="py-8 text-center text-sm text-muted-foreground">
					{m.mediaLibrary_errorLoading()}
				</CardContent>
			</Card>
		);
	}

	const categoryDetail = categoryData?.categories[0];

	const totalFiles = data.categories.reduce((sum, c) => sum + c.fileCount, 0);
	const totalSize = data.categories.reduce((sum, c) => sum + c.totalSize, 0);

	const sortLabel = sortBy === "name" ? m.mediaLibrary_sortByName() : m.mediaLibrary_sortBySize();

	return (
		<div className="space-y-6">
			{/* Summary row */}
			<div className="flex flex-wrap items-center gap-3">
				<Badge variant="secondary" className="gap-1.5">
					<FolderOpen className="size-3" />
					{totalFiles} {totalFiles === 1 ? "file" : "files"}
				</Badge>
				{totalSize > 0 && (
					<Badge variant="secondary" className="gap-1.5">
						<HardDrive className="size-3" />
						{formatFileSize(totalSize)}
					</Badge>
				)}
				<div className="ml-auto">
					<Button variant="default" size="sm" asChild>
						<Link to="/upload">
							<Upload data-icon="inline-start" />
							{m.mediaLibrary_uploadFiles()}
						</Link>
					</Button>
				</div>
			</div>

			{/* Category grid */}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
				{data.categories.map((cat) => (
					<CategoryCard
						key={cat.category}
						info={cat}
						isSelected={selectedCategory === cat.category}
						onSelect={() =>
							setSelectedCategory(
								selectedCategory === cat.category ? null : cat.category,
							)
						}
					/>
				))}
			</div>

			{/* File tree */}
			{selectedCategory && (
				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							{(() => {
								const meta = CATEGORY_META[selectedCategory];
								if (!meta) return null;
								const Icon = meta.icon;
								return <Icon className="size-4 text-primary" />;
							})()}
							<CardTitle className="text-sm">
								{CATEGORY_META[selectedCategory]?.label()}
							</CardTitle>
						</div>
						<CardDescription>
							{data.mediaDir}/{selectedCategory}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{/* Search and sort controls */}
						<div className="flex items-center gap-2">
							<div className="relative flex-1">
								<Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder={m.mediaLibrary_searchPlaceholder()}
									className="pl-9"
								/>
							</div>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm" className="shrink-0 gap-1.5">
										<ArrowUpDown className="size-3.5" />
										<span className="hidden sm:inline">{sortLabel}</span>
										{sortDirection === "asc" ? (
											<ArrowDownAZ className="size-3.5 text-muted-foreground" />
										) : (
											<ArrowDownZA className="size-3.5 text-muted-foreground" />
										)}
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as MediaSortField)}>
										<DropdownMenuRadioItem value="name">{m.mediaLibrary_sortByName()}</DropdownMenuRadioItem>
										<DropdownMenuRadioItem value="size">{m.mediaLibrary_sortBySize()}</DropdownMenuRadioItem>
									</DropdownMenuRadioGroup>
									<DropdownMenuSeparator />
									<DropdownMenuRadioGroup value={sortDirection} onValueChange={(v) => setSortDirection(v as MediaSortDirection)}>
										<DropdownMenuRadioItem value="asc">{m.mediaLibrary_ascending()}</DropdownMenuRadioItem>
										<DropdownMenuRadioItem value="desc">{m.mediaLibrary_descending()}</DropdownMenuRadioItem>
									</DropdownMenuRadioGroup>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>

						{/* Tree content */}
						{isCategoryPending ? (
							<div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
								<Loader2 className="size-4 animate-spin" />
								{m.mediaLibrary_loadingCategory()}
							</div>
						) : categoryDetail?.tree.length === 0 && debouncedSearch ? (
							<div className="flex flex-col items-center justify-center py-8 text-center">
								<Search className="mb-3 size-8 text-muted-foreground/40" />
								<p className="text-sm text-muted-foreground">
									{m.mediaLibrary_noResults()}
								</p>
							</div>
						) : categoryDetail?.tree.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-8 text-center">
								<FolderOpen className="mb-3 size-8 text-muted-foreground/40" />
								<p className="text-sm text-muted-foreground">
									{m.mediaLibrary_emptyCategory()}
								</p>
							</div>
						) : (
							<div className="relative rounded-md border border-border/30 bg-muted/20 p-2">
								{isCategoryFetching && (
									<div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
										<Loader2 className="size-5 animate-spin text-muted-foreground" />
									</div>
								)}
								<ScrollArea className="max-h-[500px]">
									<FileTree nodes={categoryDetail?.tree ?? []} />
								</ScrollArea>
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{!selectedCategory && (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12 text-center">
						<FolderOpen className="mb-3 size-10 text-muted-foreground/40" />
						<p className="text-sm font-medium text-muted-foreground">
							{m.mediaLibrary_selectCategory()}
						</p>
					</CardContent>
				</Card>
			)}

			{/* Disk usage */}
			{data.disk && (
				<DiskUsageCard
					mountpoint={data.disk.mountpoint}
					usedBytes={data.disk.usedBytes}
					totalBytes={data.disk.totalBytes}
					availBytes={data.disk.availBytes}
				/>
			)}
		</div>
	);
}
