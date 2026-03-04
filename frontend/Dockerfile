# Build context: repository root
# This allows access to both backend/proto and frontend/

FROM oven/bun:1.1-alpine AS deps

WORKDIR /app

COPY frontend/package.json frontend/bun.lockb* ./
RUN bun install

# ---- Proto generation ----
FROM oven/bun:1.1-alpine AS proto-gen

RUN apk add --no-cache curl bash

# Install buf
RUN curl -sSL \
    "https://github.com/bufbuild/buf/releases/download/v1.34.0/buf-Linux-x86_64" \
    -o /usr/local/bin/buf && chmod +x /usr/local/bin/buf

WORKDIR /workspace

COPY backend/proto ./backend/proto
COPY frontend/buf.gen.yaml ./frontend/buf.gen.yaml

WORKDIR /workspace/frontend

COPY --from=deps /app/node_modules ./node_modules
COPY frontend/package.json .

RUN buf generate --config buf.gen.yaml || \
    (echo "WARNING: buf generate failed, proto files may be missing" && mkdir -p src/gen)

# ---- Builder ----
FROM oven/bun:1.1-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ .
COPY --from=proto-gen /workspace/frontend/src/gen ./src/gen

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_PUBLIC_BACKEND_URL=http://backend:8080

RUN bun run build

# ---- Runner ----
FROM oven/bun:1.1-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
