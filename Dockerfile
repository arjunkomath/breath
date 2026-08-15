# syntax=docker/dockerfile:1

# Versions match mise.toml.
ARG BUN_VERSION=1.3.14
ARG NODE_VERSION=26.7.0

# bun installs (it owns bun.lock) but does not build: `bun run build` crashes
# with SIGTRAP running next build in a container, on both musl and glibc.
FROM oven/bun:${BUN_VERSION} AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM node:${NODE_VERSION}-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN ./node_modules/.bin/next build

FROM oven/bun:${BUN_VERSION}-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# server.js serves these two itself, but only if they sit here.
COPY --from=builder --chown=bun:bun /app/.next/standalone ./
COPY --from=builder --chown=bun:bun /app/.next/static ./.next/static
COPY --from=builder --chown=bun:bun /app/public ./public

USER bun
EXPOSE 3000
CMD ["bun", "server.js"]
