# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS dashboard-build
WORKDIR /app/dashboard
COPY dashboard/package.json dashboard/package-lock.json ./
RUN npm ci
COPY dashboard/ ./
RUN npm run build

FROM node:20-bookworm-slim
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY bot-with-dashboard.ts bot-config.ts tsconfig.json ./
COPY src ./src
COPY --from=dashboard-build /app/dashboard/dist ./dashboard/dist

RUN mkdir -p /data \
    && chown -R node:node /app /data

USER node

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3001 \
    DATA_DIR=/data \
    DRY_RUN=true \
    ARBITRAGE_ENABLED=false \
    DIPARB_ENABLED=false \
    SMARTMONEY_ENABLED=false \
    TREND_ANALYSIS_ENABLED=false

VOLUME ["/data"]

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-3001}/health" || exit 1

CMD ["./node_modules/.bin/tsx", "bot-with-dashboard.ts"]
