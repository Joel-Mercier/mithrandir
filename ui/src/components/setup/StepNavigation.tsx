import { ArrowLeft, ArrowRight, SkipForward } from "lucide-react";
import { Button } from "#/components/ui/button";

interface StepNavigationProps {
	onBack?: () => void;
	onNext?: () => void;
	onSkip?: () => void;
	backLabel?: string;
	nextLabel?: string;
	skipLabel?: string;
	nextDisabled?: boolean;
	showBack?: boolean;
	showSkip?: boolean;
	isLoading?: boolean;
}

export function StepNavigation({
	onBack,
	onNext,
	onSkip,
	backLabel = "Back",
	nextLabel = "Next",
	skipLabel = "Skip",
	nextDisabled = false,
	showBack = true,
	showSkip = false,
	isLoading = false,
}: StepNavigationProps) {
	return (
		<div className="mt-8 flex items-center justify-between border-t border-border/50 pt-6">
			<div>
				{showBack && onBack && (
					<Button
						variant="ghost"
						onClick={onBack}
						disabled={isLoading}
						className="gap-2"
					>
						<ArrowLeft className="h-4 w-4" />
						{backLabel}
					</Button>
				)}
			</div>
			<div className="flex items-center gap-2">
				{showSkip && onSkip && (
					<Button
						variant="ghost"
						onClick={onSkip}
						disabled={isLoading}
						className="gap-2 text-muted-foreground"
					>
						{skipLabel}
						<SkipForward className="h-4 w-4" />
					</Button>
				)}
				{onNext && (
					<Button
						onClick={onNext}
						disabled={nextDisabled || isLoading}
						className="gap-2"
					>
						{nextLabel}
						<ArrowRight className="h-4 w-4" />
					</Button>
				)}
			</div>
		</div>
	);
}
