FROM oven/bun:1 AS builder
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY .git .git
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY docs/ docs/
RUN bun run docs:build

FROM nginx:alpine
COPY --from=builder /app/docs/.vitepress/dist /usr/share/nginx/html
EXPOSE 80
