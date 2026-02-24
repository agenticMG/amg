# AMG — Agentic Money Glitch

**An autonomous AI agent that manages a Solana DeFi portfolio, generating yield for $AMG holders.**

AMG is a self-hosted trading agent built on [ElizaOS](https://elizaos.ai) that runs 24/7 on Solana. It claims LP fees from [Meteora](https://meteora.ag) positions, analyzes markets using Claude, and reinvests proceeds through spot swaps, perpetual positions, and liquidity provision — all autonomously, all on-chain, all for the benefit of $AMG holders.

---

## How It Works

```
Meteora LP Fees ──→ AMG Agent ──→ Portfolio Growth ──→ $AMG Holders
                       │
            ┌──────────┼──────────┐
            ▼          ▼          ▼
       Jupiter     Jupiter     Meteora
     Ultra Swaps    Perps    LP Reinvest
```

Every 5 minutes, the agent executes its core loop:

1. **Claim Fees** — Collects accrued LP fees from Meteora DAMMv2 positions
2. **Read the Market** — Pulls real-time prices, volumes, and trends from Birdeye and Helius
3. **Analyze with Claude** — Sends full portfolio + market state to Claude for structured trade decisions
4. **Check Risk Rules** — Validates the proposed action against 6 risk management rules
5. **Execute** — Routes to Jupiter Ultra (spot), Jupiter Perps, or Meteora (LP reinvestment)
6. **Log Everything** — Records every decision, trade, and outcome to PostgreSQL

The agent never trades recklessly. If risk rules block a trade or confidence is low, it holds. Every decision and its reasoning is logged and visible on the Grafana dashboard.

---

## Architecture

AMG is built as a modular plugin system on **ElizaOS v2**, the crypto-native TypeScript agent framework.

| Plugin | Role |
|--------|------|
| `plugin-portfolio-tracker` | Wallet balance tracking, PostgreSQL schema (6 tables), portfolio snapshots |
| `plugin-market-intelligence` | Birdeye price feeds, Helius WebSocket, Claude-powered market analysis |
| `plugin-jupiter-trader` | Jupiter Ultra spot swaps, Jupiter Perps (Anchor IDL), client-side stop-loss enforcement |
| `plugin-meteora-fees` | Meteora DAMMv2 fee claiming, LP management, fee accumulation monitoring |
| `plugin-risk-manager` | 6-rule risk engine with position sizing, leverage caps, daily loss limits, and cooldowns |

### Stack

| Layer | Technology |
|-------|------------|
| Agent Runtime | [ElizaOS v2](https://github.com/elizaos/eliza) |
| Language | TypeScript on [Bun](https://bun.sh) |
| LLM | Claude (Anthropic) |
| Swaps | Jupiter Ultra API |
| Perps | Jupiter Perps via Anchor |
| LP / Fees | Meteora DAMMv2 |
| Database | PostgreSQL + Drizzle ORM |
| Dashboards | Grafana (auto-provisioned) |
| Deployment | Docker Compose |

---

## Risk Management

The agent enforces strict risk rules on every trade decision. If any rule fails, the trade is blocked.

| Rule | Default | What It Does |
|------|---------|--------------|
| Position Size | 25% max | No single trade can exceed 25% of total portfolio |
| Stop-Loss | 5% | Client-side stop-loss enforcement on all perp positions (checked every 30s) |
| Leverage Cap | 20x max | Rejects any perpetual position above 20x leverage |
| Daily Loss Limit | 10% | Halts all trading if daily losses exceed 10% of portfolio |
| Min SOL Reserve | 0.5 SOL | Always keeps enough SOL for gas fees |
| Loss Cooldown | 3 strikes | Pauses trading after 3 consecutive losing trades |

All thresholds are configurable via environment variables.

---

## Observability

Three auto-provisioned Grafana dashboards ship out of the box:

- **Portfolio Overview** — Total value over time, SOL balance, daily P&L, recent trades and decisions
- **Trading Activity** — Trade distribution by type, success rate, cumulative P&L, open perp positions
- **Risk Monitoring** — Triggered risk events, daily loss gauge, consecutive loss tracking

Every decision the agent makes — including Claude's full reasoning — is stored in PostgreSQL and queryable.

---

## Project Structure

```
amg/
├── agent/                          # ElizaOS agent entry point + character
│   └── src/
│       ├── index.ts                # Agent bootstrap (Project pattern)
│       ├── character.ts            # AMG agent personality
│       ├── prompts/                # Claude decision prompt templates
│       └── tasks/                  # Core autonomous loop
├── packages/
│   ├── shared/                     # Types, constants, utilities
│   ├── plugin-portfolio-tracker/   # DB schema, repositories, balance tracking
│   ├── plugin-market-intelligence/ # Price feeds, Claude analysis
│   ├── plugin-jupiter-trader/      # Spot swaps + perps
│   ├── plugin-meteora-fees/        # Fee claiming + LP management
│   └── plugin-risk-manager/        # Risk rules engine
├── config/
│   ├── grafana/                    # Dashboard JSON + provisioning
│   └── postgres/                   # Init scripts
├── scripts/                        # Setup, dev, health check
├── docker-compose.yml              # Agent + PostgreSQL + Grafana
└── Dockerfile                      # Multi-stage Bun build
```

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.3+
- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- A funded Solana wallet
- [Anthropic API key](https://console.anthropic.com/)

### Setup

```bash
# Clone the repo
git clone https://github.com/agenticMG/amg.git
cd amg

# Install dependencies
bun install

# Configure environment
cp .env.example .env
# Edit .env with your keys:
#   SOLANA_PRIVATE_KEY  — your wallet (base58)
#   ANTHROPIC_API_KEY   — Claude API access
#   BIRDEYE_API_KEY     — market data (optional)
#   HELIUS_API_KEY      — WebSocket feeds (optional)

# Launch everything
docker compose up -d
```

The agent starts in **DRY_RUN mode** by default — it will analyze markets and make decisions but won't execute any transactions. Set `DRY_RUN=false` in `.env` when you're ready to go live.

### Access

| Service | URL |
|---------|-----|
| Agent | `http://localhost:3000` |
| Grafana | `http://localhost:3001` (admin / amg_admin) |
| PostgreSQL | `localhost:5432` (amg / amg_password) |

### Development

```bash
# Start just PostgreSQL
docker compose up -d postgres

# Run agent in dev mode (DRY_RUN=true)
bun run dev

# Build all packages
bun run build

# Health check
./scripts/health-check.sh
```

---

## Database Schema

| Table | Records |
|-------|---------|
| `trades` | Every executed trade — type, tokens, amounts, price, P&L, tx signature |
| `portfolio_snapshots` | Periodic portfolio state — total value, balances, positions |
| `fee_claims` | Every Meteora fee claim — pool, tokens, USD value, tx |
| `perp_positions` | Open and closed perps — market, side, leverage, entry/exit, P&L |
| `agent_decisions` | Full LLM reasoning — what Claude saw, decided, and why |
| `risk_events` | Triggered risk rules — what was blocked and why |

---

## For $AMG Holders

AMG isn't just a trading bot — it's an autonomous fund manager working around the clock for the community. The agent's portfolio is funded by Meteora LP fees generated from $AMG liquidity, and every trade decision is made with one goal: **grow the treasury**.

- Every decision is transparent and logged on-chain + in the database
- Risk management is hardcoded — the agent can't YOLO the treasury
- All portfolio performance is visible in real-time via Grafana
- The agent's reasoning for every single trade is stored and auditable

---

## License

MIT
