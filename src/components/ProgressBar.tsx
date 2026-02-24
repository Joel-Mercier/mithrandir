import { Text } from "ink";

interface ProgressBarProps {
  percent: number;
  width?: number;
  label?: string;
}

export function ProgressBar({ percent, width = 30, label }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const filled = Math.round((clamped / 100) * width);
  const empty = width - filled;
  const bar = `${"█".repeat(filled)}${"░".repeat(empty)}`;

  return (
    <Text>
      {"  ["}
      <Text color="green">{bar}</Text>
      {"] "}
      <Text>{Math.round(clamped)}%</Text>
      {label && <Text dimColor> {label}</Text>}
    </Text>
  );
}
