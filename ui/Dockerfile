# ---------- Build stage ----------
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Copy workspace root + all workspace package.jsons for resolution
COPY package.json bun.lock tsconfig.base.json ./
COPY cli/package.json cli/tsconfig.json cli/
COPY docs/package.json docs/
COPY ui/package.json ui/

# Install from root so bun resolves the workspace graph correctly
RUN bun install --frozen-lockfile --ignore-scripts

# Copy CLI lib sources (bundled into the server output via tsconfig paths)
COPY cli/src/lib/ cli/src/lib/
COPY cli/src/types.ts cli/src/

# Copy UI source and build
COPY ui/ ui/
RUN cd ui && bun run build

# ---------- Runtime stage ----------
FROM oven/bun:1-alpine
WORKDIR /app
ENV NODE_ENV=production

# Nitro bundles everything into .output except native/dynamic deps:
# - execa: CLI shell.ts needs it for spawning Docker/system commands
# - @libsql/client: native bindings loaded via dynamic require
# - drizzle-orm: needed for migration script
COPY --from=builder /app/ui/.output ./.output
RUN echo '{}' > package.json \
    && bun add execa @libsql/client drizzle-orm \
    && rm -rf /root/.bun/install/cache

# Drizzle migrations and startup script
COPY --from=builder /app/ui/drizzle ./drizzle
COPY ui/scripts/migrate.ts ./scripts/migrate.ts
COPY ui/scripts/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# SQLite database lives in a persistent volume
RUN mkdir -p /app/data && chown bun:bun /app/data
VOLUME /app/data

ENV PORT=4180
ENV DB_FILE_NAME=file:/app/data/local.db
EXPOSE 4180
USER bun
ENTRYPOINT ["./entrypoint.sh"]
