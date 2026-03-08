FROM oven/bun:1 AS builder
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY .git .git
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY docs/ docs/
RUN VITEPRESS_BASE=/ bun run docs:build

FROM caddy:alpine
COPY --from=builder /app/docs/.vitepress/dist /usr/share/caddy
EXPOSE 80
