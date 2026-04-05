import { Check, ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "#/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#/components/ui/popover";
import { cn } from "#/lib/utils";

const TIMEZONES = Intl.supportedValuesOf("timeZone");

function groupTimezones(timezones: string[]) {
	const groups = new Map<string, string[]>();
	for (const tz of timezones) {
		const slash = tz.indexOf("/");
		const region = slash === -1 ? "Other" : tz.slice(0, slash);
		const existing = groups.get(region);
		if (existing) {
			existing.push(tz);
		} else {
			groups.set(region, [tz]);
		}
	}
	return groups;
}

export function TimezoneSelect({
	value,
	onValueChange,
}: {
	value: string;
	onValueChange: (value: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const grouped = useMemo(() => groupTimezones(TIMEZONES), []);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="w-full justify-between font-mono-data"
				>
					{value || "Select timezone…"}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[--radix-popover-trigger-width] p-0">
				<Command>
					<CommandInput placeholder="Search timezone…" />
					<CommandList>
						<CommandEmpty>No timezone found.</CommandEmpty>
						{[...grouped.entries()].map(([region, tzs]) => (
							<CommandGroup key={region} heading={region}>
								{tzs.map((tz) => (
									<CommandItem
										key={tz}
										value={tz}
										onSelect={(v) => {
											onValueChange(v);
											setOpen(false);
										}}
										className="font-mono-data"
									>
										<Check
											className={cn(
												"mr-2 h-4 w-4",
												value === tz ? "opacity-100" : "opacity-0",
											)}
										/>
										{tz}
									</CommandItem>
								))}
							</CommandGroup>
						))}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
