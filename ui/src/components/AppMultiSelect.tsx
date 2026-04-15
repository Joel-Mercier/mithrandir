import { Loader2 } from "lucide-react";
import {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxItem,
	ComboboxList,
	ComboboxValue,
} from "#/components/ui/combobox";

export function AppMultiSelect({
	apps,
	selectedApps,
	setSelectedApps,
	loading,
	placeholder,
}: {
	apps: string[];
	selectedApps: string[];
	setSelectedApps: (apps: string[]) => void;
	loading?: boolean;
	placeholder?: string;
}) {
	if (loading) {
		return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
	}

	return (
		<Combobox
			items={apps}
			multiple
			value={selectedApps}
			onValueChange={setSelectedApps}
		>
			<ComboboxChips>
				<ComboboxValue>
					{selectedApps.map((app) => (
						<ComboboxChip key={app}>{app}</ComboboxChip>
					))}
				</ComboboxValue>
				<ComboboxChipsInput
					placeholder={
						selectedApps.length === 0 ? placeholder : undefined
					}
				/>
			</ComboboxChips>
			<ComboboxContent>
				<ComboboxEmpty>No apps found.</ComboboxEmpty>
				<ComboboxList>
					{(item) => (
						<ComboboxItem key={item} value={item}>
							{item}
						</ComboboxItem>
					)}
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
	);
}
