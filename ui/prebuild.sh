#!/bin/sh
# Remove .output/ if it exists but is not writable by the current user
# (e.g. owned by root from a previous systemd/Docker build)
OUTPUT_DIR="$(dirname "$0")/.output"
if [ -d "$OUTPUT_DIR" ] && [ ! -w "$OUTPUT_DIR" ]; then
  rm -rf "$OUTPUT_DIR" 2>/dev/null || sudo rm -rf "$OUTPUT_DIR"
fi
