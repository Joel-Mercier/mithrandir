import { useState } from "react";
import { Languages } from "lucide-react";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

const languages = [
	{ code: "en", label: "English" },
	{ code: "fr", label: "Français" },
	{ code: "es", label: "Español" },
	{ code: "de", label: "Deutsch" },
	{ code: "ja", label: "日本語" },
] as const;

type LangCode = (typeof languages)[number]["code"];

function getInitialLang(): LangCode {
	if (typeof window === "undefined") return "en";
	const stored = window.localStorage.getItem("lang");
	if (languages.some((l) => l.code === stored)) return stored as LangCode;
	return "en";
}

export default function LanguageSwitch() {
	const [lang, setLang] = useState<LangCode>(getInitialLang);

	function selectLang(code: LangCode) {
		setLang(code);
		window.localStorage.setItem("lang", code);
	}

	const current = languages.find((l) => l.code === lang);

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
			<DropdownMenuContent align="end" className="min-w-[8rem]">
				{languages.map((l) => (
					<DropdownMenuItem
						key={l.code}
						onClick={() => selectLang(l.code)}
						className={lang === l.code ? "font-medium text-foreground" : ""}
					>
						{l.label}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
