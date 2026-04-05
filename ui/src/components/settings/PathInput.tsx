import { FolderOpen } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { DirectoryPickerDialog } from "./DirectoryPickerDialog";

interface PathInputProps {
	id: string;
	value: string;
	onChange: (path: string) => void;
}

export function PathInput({ id, value, onChange }: PathInputProps) {
	const [pickerOpen, setPickerOpen] = useState(false);

	return (
		<>
			<div className="flex gap-2">
				<Input
					id={id}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					className="font-mono-data"
				/>
				<Button
					type="button"
					variant="outline"
					size="icon"
					className="shrink-0"
					onClick={() => setPickerOpen(true)}
				>
					<FolderOpen className="size-4" />
				</Button>
			</div>
			<DirectoryPickerDialog
				open={pickerOpen}
				onOpenChange={setPickerOpen}
				initialPath={value || "/"}
				onSelect={onChange}
			/>
		</>
	);
}
