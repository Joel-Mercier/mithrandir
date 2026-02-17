import { Box, Text } from "ink";

type Scalar = string | number | boolean | null | undefined;

interface DataTableProps {
  data: Record<string, Scalar>[];
  columns?: string[];
  padding?: number;
}

function pad(str: string, width: number): string {
  return str + " ".repeat(Math.max(0, width - str.length));
}

/**
 * A lightweight table component that renders data with box-drawing characters.
 * Drop-in replacement for ink-table that's fully ESM-compatible.
 */
export function DataTable({ data, columns, padding = 1 }: DataTableProps) {
  if (data.length === 0) return null;

  // Determine columns from data keys if not specified
  const cols = columns ?? Object.keys(data[0]);

  // Calculate column widths
  const colWidths = cols.map((col) => {
    const headerLen = col.length;
    const maxDataLen = Math.max(
      0,
      ...data.map((row) => String(row[col] ?? "").length),
    );
    return Math.max(headerLen, maxDataLen);
  });

  const p = " ".repeat(padding);

  const line = (left: string, mid: string, right: string, fill: string) =>
    `${left}${colWidths.map((w) => fill.repeat(w + padding * 2)).join(mid)}${right}`;

  return (
    <Box flexDirection="column">
      {/* Top border */}
      <Text>{line("┌", "┬", "┐", "─")}</Text>

      {/* Header row */}
      <Text>
        {"│"}
        {cols.map((col, i) => (
          <Text key={col}>
            {p}
            <Text bold>{pad(col, colWidths[i])}</Text>
            {p}{"│"}
          </Text>
        ))}
      </Text>

      {/* Separator */}
      <Text>{line("├", "┼", "┤", "─")}</Text>

      {/* Data rows */}
      {data.map((row, rowIdx) => (
        <Text key={rowIdx}>
          {"│"}
          {cols.map((col, i) => (
            <Text key={col}>
              {p}
              <Text>{pad(String(row[col] ?? ""), colWidths[i])}</Text>
              {p}{"│"}
            </Text>
          ))}
        </Text>
      ))}

      {/* Bottom border */}
      <Text>{line("└", "┴", "┘", "─")}</Text>
    </Box>
  );
}
