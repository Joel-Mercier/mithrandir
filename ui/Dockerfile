# ---------- Build stage ----------
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy workspace root files needed for resolution
COPY package.json bun.lock ./
COPY cli/package.json cli/
COPY ui/package.json ui/

RUN cd ui && bun install --frozen-lockfile

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
