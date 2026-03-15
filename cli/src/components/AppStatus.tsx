import { Text } from "ink";

type Status = "running" | "stopped" | "installing" | "error" | "done" | "skipped";

interface AppStatusProps {
  name: string;
  status: Status;
  message?: string;
}

const statusConfig: Record<Status, { symbol: string; color: string }> = {
  running: { symbol: "●", color: "green" },
  stopped: { symbol: "●", color: "red" },
  installing: { symbol: "◌", color: "yellow" },
  error: { symbol: "✗", color: "red" },
  done: { symbol: "✓", color: "green" },
  skipped: { symbol: "–", color: "gray" },
};

export function AppStatus({ name, status, message }: AppStatusProps) {
  const config = statusConfig[status];
  return (
    <Text>
      <Text color={config.color}>{config.symbol}</Text>
      <Text> {name}</Text>
      {message && <Text dimColor> — {message}</Text>}
    </Text>
  );
}
