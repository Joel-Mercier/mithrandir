import { Check, Languages } from "lucide-react";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { cn } from "#/lib/utils";
import { getLocale, setLocale } from "#/paraglide/runtime.js";

const languages = [
	{ code: "en", label: "English" },
	{ code: "fr", label: "Français" },
] as const;

export default function LanguageSwitch() {
	const locale = getLocale();
	const current = languages.find((l) => l.code === locale);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					aria-label={`Language: ${current?.label}`}
					title={`Language: ${current?.label}`}
				>
					<Languages className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-32">
				{languages.map((l) => (
					<DropdownMenuItem
						key={l.code}
						onClick={() => setLocale(l.code)}
						className={cn("cursor-pointer focus:outline-0", {
							"font-medium text-foreground": locale === l.code,
						})}
					>
						{l.label}
            {locale === l.code ? <Check className="mr-1 h-4 w-4" /> : null}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
