import React from "react";
import { Box, Text } from "ink";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color="cyan">
        {"  _   _                      _       _     "}
      </Text>
      <Text bold color="cyan">
        {" | | | | ___  _ __ ___   ___| | __ _| |__  "}
      </Text>
      <Text bold color="cyan">
        {" | |_| |/ _ \\| '_ ` _ \\ / _ \\ |/ _` | '_ \\ "}
      </Text>
      <Text bold color="cyan">
        {" |  _  | (_) | | | | | |  __/ | (_| | |_) |"}
      </Text>
      <Text bold color="cyan">
        {" |_| |_|\\___/|_| |_| |_|\\___|_|\\__,_|_.__/ "}
      </Text>
      {title && (
        <Text dimColor>  {title}</Text>
      )}
    </Box>
  );
}
