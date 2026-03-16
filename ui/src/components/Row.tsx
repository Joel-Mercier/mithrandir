export function Row({
	label,
	children,
	mono = true,
}: {
	label: string;
	children: React.ReactNode;
	mono?: boolean;
}) {
	return (
		<div className="flex items-baseline justify-between text-sm">
			<span className="text-muted-foreground">{label}</span>
			<span className={mono ? "font-mono-data text-xs" : "text-xs"}>
				{children}
			</span>
		</div>
	);
}
