import Uppy from "@uppy/core";
import Tus from "@uppy/tus";
import DashboardComponent from "@uppy/react/dashboard";
import {
	Film,
	Headphones,
	Image,
	Music,
	Podcast,
	Tv,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { m } from "#/paraglide/messages.js";

import "@uppy/core/css/style.min.css";
import "@uppy/dashboard/css/style.min.css";

const MEDIA_TYPES = [
	{ value: "movies", label: () => m.upload_movies(), icon: Film },
	{ value: "tv", label: () => m.upload_tv(), icon: Tv },
	{ value: "music", label: () => m.upload_music(), icon: Music },
	{ value: "audiobooks", label: () => m.upload_audiobooks(), icon: Headphones },
	{ value: "podcasts", label: () => m.upload_podcasts(), icon: Podcast },
	{ value: "pictures", label: () => m.upload_pictures(), icon: Image },
] as const;

export default function UploadPanel() {
	const [mediaType, setMediaType] = useState<string>("");

	const [uppy] = useState(() => {
		const instance = new Uppy({
			restrictions: {
				// No file type or count restrictions — media can be anything
			},
		});

		instance.use(Tus, {
			endpoint: "/api/media/upload/tus",
			chunkSize: 50 * 1024 * 1024,
			retryDelays: [1000, 3000, 5000, 10000],
		});

		return instance;
	});

	// Set mediaType as metadata on every file added
	useEffect(() => {
		const handler = (file: { id: string } | undefined) => {
			if (!file || !mediaType) return;
			uppy.setFileMeta(file.id, { mediaType });
		};
		uppy.on("file-added", handler);
		return () => {
			uppy.off("file-added", handler);
		};
	}, [uppy, mediaType]);

	// Clean up on unmount
	useEffect(() => {
		return () => uppy.destroy();
	}, [uppy]);

	// Detect theme from <html> class
	const [theme, setTheme] = useState<"light" | "dark">("light");
	useEffect(() => {
		const root = document.documentElement;
		const update = () =>
			setTheme(root.classList.contains("dark") ? "dark" : "light");
		update();
		const observer = new MutationObserver(update);
		observer.observe(root, {
			attributes: true,
			attributeFilter: ["class"],
		});
		return () => observer.disconnect();
	}, []);

	return (
		<div className="space-y-6">
			{/* Media type selector */}
			<div className="max-w-xs">
				<Select value={mediaType} onValueChange={setMediaType}>
					<SelectTrigger>
						<SelectValue placeholder={m.upload_selectType()} />
					</SelectTrigger>
					<SelectContent>
						{MEDIA_TYPES.map((type) => (
							<SelectItem key={type.value} value={type.value}>
								<div className="flex items-center gap-2">
									<type.icon className="size-4 text-muted-foreground" />
									{type.label()}
								</div>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Uppy Dashboard */}
			{mediaType ? (
				<DashboardComponent
					uppy={uppy}
					theme={theme}
					height={400}
					proudlyDisplayPoweredByUppy={false}
				/>
			) : (
				<div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border/50 py-16 opacity-50">
					<p className="text-sm font-medium text-muted-foreground">
						{m.upload_dropzoneDisabled()}
					</p>
				</div>
			)}
		</div>
	);
}
