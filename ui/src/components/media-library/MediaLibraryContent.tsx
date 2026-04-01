import type { MediaCategoryInfo } from "@mithrandir/cli/lib/media";
import { Link } from "@tanstack/react-router";
import {
	Film,
	FolderOpen,
	HardDrive,
	Headphones,
	Image,
	Music,
	Podcast,
	Tv,
	Upload,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Progress } from "#/components/ui/progress";
import { Skeleton } from "#/components/ui/skeleton";
import { useMediaLibrary } from "#/hooks/homelab";
import { formatFileSize } from "#/lib/utils";
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
		<button
			type="button"
			onClick={onSelect}
			className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all ${
				isSelected
					? "border-primary bg-primary/5 shadow-sm"
					: "border-border/50 hover:border-border hover:bg-accent/30"
			}`}
		>
			<div
				className={`flex size-9 shrink-0 items-center justify-center rounded-md ${
					isSelected
						? "bg-primary/10 text-primary"
						: "bg-muted text-muted-foreground"
				}`}
			>
				<Icon className="size-4" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-semibold">{meta.label()}</p>
				<p className="text-xs text-muted-foreground">
					{info.fileCount} {info.fileCount === 1 ? "file" : "files"}
					{info.totalSize > 0 && ` \u00b7 ${formatFileSize(info.totalSize)}`}
				</p>
			</div>
		</button>
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

	const selected = data.categories.find(
		(c) => c.category === selectedCategory,
	);

	const totalFiles = data.categories.reduce((sum, c) => sum + c.fileCount, 0);
	const totalSize = data.categories.reduce((sum, c) => sum + c.totalSize, 0);

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
			{selected && (
				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							{(() => {
								const meta = CATEGORY_META[selected.category];
								if (!meta) return null;
								const Icon = meta.icon;
								return <Icon className="size-4 text-primary" />;
							})()}
							<CardTitle className="text-sm">
								{CATEGORY_META[selected.category]?.label()}
							</CardTitle>
						</div>
						<CardDescription>
							{data.mediaDir}/{selected.category}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="max-h-[500px] overflow-y-auto rounded-md border border-border/30 bg-muted/20 p-2">
							<FileTree nodes={selected.tree} />
						</div>
					</CardContent>
				</Card>
			)}

			{!selected && (
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
