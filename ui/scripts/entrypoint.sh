#!/bin/sh
echo "Running database migrations..."
bun run scripts/migrate.ts
echo "Starting server..."
exec bun run .output/server/index.mjs
