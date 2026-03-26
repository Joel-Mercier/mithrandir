#!/bin/sh
# Remove dirs that may be owned by root from a previous systemd/Docker build
BASE="$(dirname "$0")"
for dir in "$BASE/.output" "$BASE/src/paraglide"; do
  if [ -d "$dir" ] && [ ! -w "$dir" ]; then
    rm -rf "$dir" 2>/dev/null || sudo rm -rf "$dir"
  fi
done
