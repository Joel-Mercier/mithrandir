import { Badge } from "#/components/ui/badge";

const scoreStyles = {
	low: "bg-status-healthy/10 text-status-healthy border-status-healthy/30",
	medium: "bg-status-warning/10 text-status-warning border-status-warning/30",
	high: "bg-status-critical/10 text-status-critical border-status-critical/30",
} as const;

const scoreLabels = {
	low: "Low",
	medium: "Medium",
	high: "High",
} as const;

export function ScoreBadge({ score }: { score: "low" | "medium" | "high" }) {
	return (
		<Badge variant="outline" className={`text-[10px] ${scoreStyles[score]}`}>
			{scoreLabels[score]}
		</Badge>
	);
}
