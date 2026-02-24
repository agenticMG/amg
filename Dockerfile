# Stage 1: Install dependencies
FROM oven/bun:1.3 AS deps
WORKDIR /app

COPY package.json bun.lock* ./
COPY agent/package.json ./agent/
COPY packages/shared/package.json ./packages/shared/
COPY packages/plugin-portfolio-tracker/package.json ./packages/plugin-portfolio-tracker/
COPY packages/plugin-market-intelligence/package.json ./packages/plugin-market-intelligence/
COPY packages/plugin-jupiter-trader/package.json ./packages/plugin-jupiter-trader/
COPY packages/plugin-meteora-fees/package.json ./packages/plugin-meteora-fees/
COPY packages/plugin-risk-manager/package.json ./packages/plugin-risk-manager/

RUN bun install --frozen-lockfile || bun install

# Stage 2: Build
FROM oven/bun:1.3 AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN bun run build

# Stage 3: Production
FROM oven/bun:1.3-slim AS runner
WORKDIR /app

# Copy everything needed at runtime
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/agent ./agent
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package.json ./
COPY --from=builder /app/tsconfig.json ./

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

EXPOSE ${PORT:-3000}

CMD ["bun", "run", "agent/src/index.ts"]
