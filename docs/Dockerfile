FROM oven/bun:1 AS builder
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY .git .git
COPY package.json bun.lock* ./
COPY docs/package.json docs/
RUN bun install --frozen-lockfile
COPY docs/ docs/
RUN cd docs && bun run build

FROM caddy:alpine
COPY --from=builder /app/docs/.vitepress/dist /usr/share/caddy
EXPOSE 80
