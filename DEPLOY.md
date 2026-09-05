# Coolify Deployment

This repo is set up for a **Git import** in Coolify. Prefer the **Docker Compose** build pack so the dashboard port, health check, and `/data` volume are applied automatically.

## Quick start (Coolify UI)

1. **+ New** → **Resource** → **Public Repository** (or GitHub App / deploy key if private).
2. Paste `https://github.com/NixXxn/Polymarket-bot-coolify`.
3. **Build Pack**: **Docker Compose**.
4. **Compose location**: `/docker-compose.yaml` (Coolify default).
5. Assign a domain to the `bot` service (Coolify proxy + HTTPS).
6. **Environment** — paste from [`.env.example`](.env.example). Required:
   - `POLYMARKET_PRIVATE_KEY`
   - leave `DRY_RUN=true` until you have tested the dashboard
7. Deploy.

The container listens on **`0.0.0.0:3001`**. Health check: **`GET /health`**.

## Dockerfile-only import

If you use the **Dockerfile** build pack instead of Compose:

1. Build pack: **Dockerfile** (file at `/Dockerfile`).
2. **Port**: `3001`.
3. **Storages**: add a volume with mount path `/data`.
4. Set the same environment variables as above.
5. Health check path `/health` on port `3001`.

## Health check

| Setting | Value |
|---------|--------|
| Path | `/health` |
| Port | `3001` |
| Expected | `{"status":"ok",...}` |

Defined in both `Dockerfile` and `docker-compose.yaml`. Coolify uses this for Traefik routing and rolling updates.

## Persistent data

Session history is written to `DATA_DIR` (default `/data` → `session-history.json`).

Compose already mounts volume `bot-data` → `/data`. For a Dockerfile resource, add that volume in **Storages** or history is lost on every redeploy.

## Environment

| Variable | Default | Notes |
|----------|---------|--------|
| `POLYMARKET_PRIVATE_KEY` | (none) | Required. Bot exits on startup if missing. |
| `DRY_RUN` | `true` | Set `false` only for live orders. |
| `CAPITAL_USD` | `50` | Position-sizing budget, not wallet balance. |
| `ARBITRAGE_ENABLED` | `false` | YES+NO sum arb |
| `DIPARB_ENABLED` | `false` | 15m crypto dip arb |
| `SMARTMONEY_ENABLED` | `false` | Copy-trade leaderboard wallets |
| `TREND_ANALYSIS_ENABLED` | `false` | Binance trend overlay |
| `PORT` | `3001` | Must match Coolify “ports exposes” / domain port |
| `HOST` | `0.0.0.0` | Required behind Coolify’s proxy |
| `DATA_DIR` | `/data` | Keep this on a volume |

Enable Coolify **HTTP Basic Auth** (or equivalent) on the domain. The dashboard has no built-in login.

## Local Docker

```bash
cp .env.example .env
# set POLYMARKET_PRIVATE_KEY; keep DRY_RUN=true
docker compose up -d --build
# dashboard: http://localhost:3001
```

## Safety

Start with `DRY_RUN=true`. Live mode (`DRY_RUN=false`) sends real Polymarket orders from the wallet behind `POLYMARKET_PRIVATE_KEY`.
