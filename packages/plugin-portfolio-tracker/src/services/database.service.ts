import { Service, type IAgentRuntime } from "@elizaos/core";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { createLogger, type TradeAction } from "@amg/shared";
import * as schema from "../schema.js";
import {
  TradesRepository,
  SnapshotsRepository,
  FeeClaimsRepository,
  PerpPositionsRepository,
  DecisionsRepository,
  RiskEventsRepository,
} from "../repositories/index.js";

const log = createLogger("database-service");

export class DatabaseService extends Service {
  static serviceType = "amg_database";
  capabilityDescription = "PostgreSQL database for AMG trading data";

  private client!: ReturnType<typeof postgres>;
  db!: PostgresJsDatabase<typeof schema>;
  trades!: TradesRepository;
  snapshots!: SnapshotsRepository;
  feeClaims!: FeeClaimsRepository;
  perpPositions!: PerpPositionsRepository;
  decisions!: DecisionsRepository;
  riskEvents!: RiskEventsRepository;

  static async start(runtime: IAgentRuntime): Promise<DatabaseService> {
    const service = new DatabaseService();
    const databaseUrl = runtime.getSetting("DATABASE_URL") as string
      || "postgresql://amg:amg_password@localhost:5432/amg";

    service.client = postgres(databaseUrl);
    service.db = drizzle(service.client, { schema });

    // Auto-create tables
    await service.createTables();

    // Init repositories
    service.trades = new TradesRepository(service.db);
    service.snapshots = new SnapshotsRepository(service.db);
    service.feeClaims = new FeeClaimsRepository(service.db);
    service.perpPositions = new PerpPositionsRepository(service.db);
    service.decisions = new DecisionsRepository(service.db);
    service.riskEvents = new RiskEventsRepository(service.db);

    log.info("Database service started");
    return service;
  }

  private async createTables() {
    log.info("Creating tables if not exist...");
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS trades (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        action TEXT NOT NULL,
        input_token TEXT,
        output_token TEXT,
        input_amount REAL,
        output_amount REAL,
        executed_price REAL,
        pnl REAL,
        tx_signature TEXT,
        reasoning TEXT NOT NULL,
        success BOOLEAN NOT NULL,
        error TEXT,
        dry_run BOOLEAN NOT NULL DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS portfolio_snapshots (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        wallet_address TEXT NOT NULL,
        sol_balance REAL NOT NULL,
        token_balances JSONB NOT NULL,
        perp_positions_value REAL NOT NULL,
        lp_positions_value REAL NOT NULL,
        total_portfolio_value REAL NOT NULL,
        daily_pnl REAL,
        daily_pnl_pct REAL
      );

      CREATE TABLE IF NOT EXISTS fee_claims (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        pool_address TEXT NOT NULL,
        position_address TEXT NOT NULL,
        token_a_mint TEXT NOT NULL,
        token_b_mint TEXT NOT NULL,
        token_a_amount REAL NOT NULL,
        token_b_amount REAL NOT NULL,
        total_usd_value REAL NOT NULL,
        tx_signature TEXT,
        dry_run BOOLEAN NOT NULL DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS perp_positions (
        id SERIAL PRIMARY KEY,
        opened_at TIMESTAMP NOT NULL DEFAULT NOW(),
        closed_at TIMESTAMP,
        market TEXT NOT NULL,
        side TEXT NOT NULL,
        size REAL NOT NULL,
        leverage REAL NOT NULL,
        entry_price REAL NOT NULL,
        exit_price REAL,
        collateral REAL NOT NULL,
        realized_pnl REAL,
        stop_loss_price REAL,
        position_public_key TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        open_tx_signature TEXT,
        close_tx_signature TEXT
      );

      CREATE TABLE IF NOT EXISTS agent_decisions (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        action TEXT NOT NULL,
        confidence REAL NOT NULL,
        reasoning TEXT NOT NULL,
        portfolio_state JSONB,
        market_state JSONB,
        risk_assessment JSONB,
        success BOOLEAN NOT NULL,
        tx_signature TEXT,
        error TEXT,
        dry_run BOOLEAN NOT NULL DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS risk_events (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        rule_name TEXT NOT NULL,
        triggered BOOLEAN NOT NULL,
        details TEXT NOT NULL,
        current_value REAL NOT NULL,
        threshold REAL NOT NULL,
        action TEXT NOT NULL
      );
    `);

    // Create indexes
    await this.db.execute(sql`
      CREATE INDEX IF NOT EXISTS trades_timestamp_idx ON trades (timestamp);
      CREATE INDEX IF NOT EXISTS trades_action_idx ON trades (action);
      CREATE INDEX IF NOT EXISTS portfolio_snapshots_timestamp_idx ON portfolio_snapshots (timestamp);
      CREATE INDEX IF NOT EXISTS fee_claims_timestamp_idx ON fee_claims (timestamp);
      CREATE INDEX IF NOT EXISTS fee_claims_pool_idx ON fee_claims (pool_address);
      CREATE INDEX IF NOT EXISTS perp_positions_market_idx ON perp_positions (market);
      CREATE INDEX IF NOT EXISTS perp_positions_status_idx ON perp_positions (status);
      CREATE INDEX IF NOT EXISTS agent_decisions_timestamp_idx ON agent_decisions (timestamp);
      CREATE INDEX IF NOT EXISTS agent_decisions_action_idx ON agent_decisions (action);
      CREATE INDEX IF NOT EXISTS risk_events_timestamp_idx ON risk_events (timestamp);
      CREATE INDEX IF NOT EXISTS risk_events_rule_idx ON risk_events (rule_name);
    `);

    log.info("Tables and indexes created");
  }

  async recordDecision(data: {
    timestamp: Date;
    action: TradeAction;
    confidence: number;
    reasoning: string;
    success: boolean;
    txSignature: string | null;
    dryRun: boolean;
  }) {
    return this.decisions.insert({
      timestamp: data.timestamp,
      action: data.action,
      confidence: data.confidence,
      reasoning: data.reasoning,
      success: data.success,
      txSignature: data.txSignature,
      dryRun: data.dryRun,
    });
  }

  async getRecentDecisions(limit = 5) {
    const rows = await this.decisions.getRecent(limit);
    return rows.map(r => ({
      action: r.action as TradeAction,
      reasoning: r.reasoning,
      success: r.success,
      timestamp: r.timestamp,
    }));
  }

  async stop() {
    await this.client.end();
    log.info("Database service stopped");
  }
}
