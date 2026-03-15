import { Box, Text } from "ink";

type Scalar = string | number | boolean | null | undefined;

interface DataTableProps {
  data: Record<string, Scalar>[];
  columns?: string[];
  padding?: number;
  maxColWidth?: number;
}

function pad(str: string, width: number): string {
  return str + " ".repeat(Math.max(0, width - str.length));
}

/** Split a string into lines that fit within maxWidth */
function wrapText(str: string, maxWidth: number): string[] {
  if (str.length <= maxWidth) return [str];
  const lines: string[] = [];
  for (let i = 0; i < str.length; i += maxWidth) {
    lines.push(str.slice(i, i + maxWidth));
  }
  return lines;
}

/**
 * A lightweight table component that renders data with box-drawing characters.
 * Drop-in replacement for ink-table that's fully ESM-compatible.
 */
export function DataTable({ data, columns, padding = 1, maxColWidth }: DataTableProps) {
  if (data.length === 0) return null;

  // Determine columns from data keys if not specified
  const cols = columns ?? Object.keys(data[0]);

  // Calculate column widths (capped by maxColWidth if set)
  const colWidths = cols.map((col) => {
    const headerLen = col.length;
    const maxDataLen = Math.max(
      0,
      ...data.map((row) => String(row[col] ?? "").length),
    );
    const natural = Math.max(headerLen, maxDataLen);
    return maxColWidth ? Math.min(natural, Math.max(headerLen, maxColWidth)) : natural;
  });

  const p = " ".repeat(padding);

  const line = (left: string, mid: string, right: string, fill: string) =>
    `${left}${colWidths.map((w) => fill.repeat(w + padding * 2)).join(mid)}${right}`;

  /** Render a row that may span multiple lines when values wrap */
  function renderRow(row: Record<string, Scalar>, rowIdx: number) {
    // Wrap each cell's value into lines
    const cellLines = cols.map((col, i) => {
      const str = String(row[col] ?? "");
      return maxColWidth ? wrapText(str, colWidths[i]) : [str];
    });
    const lineCount = Math.max(...cellLines.map((l) => l.length));

    if (lineCount === 1) {
      return (
        <Text key={rowIdx}>
          {"│"}
          {cols.map((col, i) => (
            <Text key={col}>
              {p}
              <Text>{pad(cellLines[i][0], colWidths[i])}</Text>
              {p}{"│"}
            </Text>
          ))}
        </Text>
      );
    }

    // Multi-line row
    const lines = [];
    for (let ln = 0; ln < lineCount; ln++) {
      lines.push(
        <Text key={`${rowIdx}-${ln}`}>
          {"│"}
          {cols.map((col, i) => (
            <Text key={col}>
              {p}
              <Text>{pad(cellLines[i][ln] ?? "", colWidths[i])}</Text>
              {p}{"│"}
            </Text>
          ))}
        </Text>,
      );
    }
    return lines;
  }

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
      {data.map((row, rowIdx) => renderRow(row, rowIdx))}

      {/* Bottom border */}
      <Text>{line("└", "┴", "┘", "─")}</Text>
    </Box>
  );
}
