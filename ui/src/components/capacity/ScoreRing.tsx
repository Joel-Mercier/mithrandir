const SIZE = 64;
const STROKE = 5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ringStroke(color: string) {
	switch (color) {
		case "green":
			return "stroke-status-healthy";
		case "yellow":
			return "stroke-status-warning";
		case "red":
			return "stroke-status-critical";
		default:
			return "stroke-muted-foreground";
	}
}

function ringText(color: string) {
	switch (color) {
		case "green":
			return "fill-status-healthy";
		case "yellow":
			return "fill-status-warning";
		case "red":
			return "fill-status-critical";
		default:
			return "fill-muted-foreground";
	}
}

export function CapacityScoreRing({
	score,
	max,
	color,
}: {
	score: number;
	max: number;
	color: string;
}) {
	const pct = max > 0 ? (score / max) * 100 : 0;
	const offset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE;

	return (
		<svg
			width={SIZE}
			height={SIZE}
			viewBox={`0 0 ${SIZE} ${SIZE}`}
			className="shrink-0"
			role="img"
			aria-label={`Score: ${Math.round(pct)}%`}
		>
			<circle
				cx={SIZE / 2}
				cy={SIZE / 2}
				r={RADIUS}
				fill="none"
				strokeWidth={STROKE}
				className="stroke-border"
			/>
			<circle
				cx={SIZE / 2}
				cy={SIZE / 2}
				r={RADIUS}
				fill="none"
				strokeWidth={STROKE}
				strokeLinecap="round"
				strokeDasharray={CIRCUMFERENCE}
				strokeDashoffset={offset}
				className={`${ringStroke(color)} transition-[stroke-dashoffset] duration-700 ease-out`}
				transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
			/>
			<text
				x="50%"
				y="50%"
				textAnchor="middle"
				dy="0.35em"
				className={`${ringText(color)} text-[11px] font-bold`}
				style={{ fontFamily: "ui-monospace, monospace" }}
			>
				{Math.round(pct)}%
			</text>
		</svg>
	);
}
