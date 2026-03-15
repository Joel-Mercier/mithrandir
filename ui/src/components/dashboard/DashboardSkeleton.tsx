import {
	Card,
	CardContent,
	CardHeader,
} from "#/components/ui/card";
import { Skeleton } from "#/components/ui/skeleton";

function CardSkeleton() {
	return (
		<Card>
			<CardHeader className="pb-2">
				<Skeleton className="h-4 w-28" />
			</CardHeader>
			<CardContent className="space-y-3">
				<Skeleton className="h-3 w-full" />
				<Skeleton className="h-3 w-3/4" />
				<Skeleton className="h-3 w-1/2" />
			</CardContent>
		</Card>
	);
}

function AppsGridSkeleton() {
	return (
		<div className="col-span-full space-y-3">
			<Skeleton className="h-4 w-24" />
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{Array.from({ length: 8 }, (_, i) => (
					<Card key={`skeleton-app-${String(i)}`}>
						<CardContent className="flex items-start gap-3 p-4">
							<Skeleton className="mt-1.5 h-2 w-2 rounded-full" />
							<div className="flex-1 space-y-2">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-3 w-full" />
							</div>
							<Skeleton className="h-5 w-14 rounded-full" />
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}

export default function DashboardSkeleton() {
	return (
		<div className="mx-auto max-w-7xl px-4 py-8">
			<div className="mb-6 space-y-2">
				<Skeleton className="h-7 w-36" />
				<Skeleton className="h-4 w-28" />
			</div>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				<CardSkeleton />
				<CardSkeleton />
				<CardSkeleton />
				<AppsGridSkeleton />
				<CardSkeleton />
				<CardSkeleton />
			</div>
		</div>
	);
}
