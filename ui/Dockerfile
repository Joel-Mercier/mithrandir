# ---------- Build stage ----------
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy workspace root + both workspace package.jsons for resolution
COPY package.json bun.lock tsconfig.base.json ./
COPY cli/package.json cli/
COPY docs/package.json docs/
COPY ui/package.json ui/

# Install from root so bun resolves the workspace graph correctly
RUN bun install --frozen-lockfile --ignore-scripts

# Copy CLI lib sources (used by UI server-side imports)
COPY cli/src/lib/ cli/src/lib/
COPY cli/src/types.ts cli/src/

# Copy UI source and build
COPY ui/ ui/
RUN cd ui && bun run build

# ---------- Runtime stage ----------
FROM oven/bun:1
WORKDIR /app

COPY --from=builder /app/ui/dist ./dist
COPY --from=builder /app/ui/node_modules ./node_modules
COPY --from=builder /app/ui/package.json ./

ENV PORT=4180
EXPOSE 4180
CMD ["bun", "run", "dist/server/server.js"]
