import { useEffect, useRef, useState } from "react";

interface UseLogStreamOptions {
	appName: string;
	enabled?: boolean;
	maxLines?: number;
}

export function useLogStream({
	appName,
	enabled = true,
	maxLines = 500,
}: UseLogStreamOptions) {
	const [lines, setLines] = useState<string[]>([]);
	const [connected, setConnected] = useState(false);
	const eventSourceRef = useRef<EventSource | null>(null);

	useEffect(() => {
		if (!enabled || !appName) return;

		const es = new EventSource(`/api/homelab/logs/${appName}`);
		eventSourceRef.current = es;

		es.onopen = () => setConnected(true);

		es.onmessage = (event) => {
			setLines((prev) => {
				const next = [...prev, event.data];
				return next.length > maxLines ? next.slice(-maxLines) : next;
			});
		};

		es.onerror = () => {
			setConnected(false);
			es.close();
		};

		return () => {
			es.close();
			eventSourceRef.current = null;
			setConnected(false);
		};
	}, [appName, enabled, maxLines]);

	const clear = () => setLines([]);

	return { lines, connected, clear };
}
