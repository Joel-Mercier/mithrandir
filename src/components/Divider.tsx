import { Box, Text } from "ink";
import type { TextProps } from "ink";

interface DividerProps {
  title?: string;
  width?: number;
  dividerChar?: string;
  dividerColor?: TextProps["color"];
  titleColor?: TextProps["color"];
  padding?: number;
  titlePadding?: number;
}

export function Divider({
  title,
  width = 50,
  dividerChar = "─",
  dividerColor = "gray",
  titleColor = "white",
  padding = 0,
  titlePadding = 1,
}: DividerProps) {
  if (!title) {
    return (
      <Box>
        {padding > 0 && <Text>{" ".repeat(padding)}</Text>}
        <Text color={dividerColor}>{dividerChar.repeat(width)}</Text>
        {padding > 0 && <Text>{" ".repeat(padding)}</Text>}
      </Box>
    );
  }

  const titleWithPadding = `${" ".repeat(titlePadding)}${title}${" ".repeat(titlePadding)}`;
  const remainingWidth = Math.max(0, width - titleWithPadding.length);
  const leftWidth = Math.floor(remainingWidth / 2);
  const rightWidth = remainingWidth - leftWidth;

  return (
    <Box>
      {padding > 0 && <Text>{" ".repeat(padding)}</Text>}
      <Text color={dividerColor}>{dividerChar.repeat(leftWidth)}</Text>
      <Text color={titleColor}>{titleWithPadding}</Text>
      <Text color={dividerColor}>{dividerChar.repeat(rightWidth)}</Text>
      {padding > 0 && <Text>{" ".repeat(padding)}</Text>}
    </Box>
  );
}
