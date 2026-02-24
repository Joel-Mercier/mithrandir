import { Component, type ReactNode } from "react";
import { Box, Text } from "ink";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <Box flexDirection="column" marginY={1}>
          <Text bold color="red">
            Something went wrong
          </Text>
          <Text color="red">{this.state.error.message}</Text>
          {this.state.error.stack && (
            <Box marginTop={1}>
              <Text dimColor>{this.state.error.stack}</Text>
            </Box>
          )}
        </Box>
      );
    }

    return this.props.children;
  }
}
