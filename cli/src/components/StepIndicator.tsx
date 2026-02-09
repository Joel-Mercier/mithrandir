import React from "react";
import { Box, Text } from "ink";

interface StepIndicatorProps {
  current: number;
  total: number;
  label: string;
}

export function StepIndicator({ current, total, label }: StepIndicatorProps) {
  return (
    <Box marginBottom={1}>
      <Text bold color="blue">
        [{current}/{total}]
      </Text>
      <Text> {label}</Text>
    </Box>
  );
}
