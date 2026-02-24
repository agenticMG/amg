import { pgTable, serial, text, timestamp, real, integer, boolean, jsonb, index } from "drizzle-orm/pg-core";

// All executed trades
export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  action: text("action").notNull(),           // SPOT_SWAP, OPEN_PERP, CLOSE_PERP, etc.
  inputToken: text("input_token"),
  outputToken: text("output_token"),
  inputAmount: real("input_amount"),
  outputAmount: real("output_amount"),
  executedPrice: real("executed_price"),
  pnl: real("pnl"),
  txSignature: text("tx_signature"),
  reasoning: text("reasoning").notNull(),
  success: boolean("success").notNull(),
  error: text("error"),
  dryRun: boolean("dry_run").notNull().default(false),
}, (table) => [
  index("trades_timestamp_idx").on(table.timestamp),
  index("trades_action_idx").on(table.action),
]);

// Periodic portfolio snapshots
export const portfolioSnapshots = pgTable("portfolio_snapshots", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  walletAddress: text("wallet_address").notNull(),
  solBalance: real("sol_balance").notNull(),
  tokenBalances: jsonb("token_balances").notNull(),       // TokenBalance[]
  perpPositionsValue: real("perp_positions_value").notNull(),
  lpPositionsValue: real("lp_positions_value").notNull(),
  totalPortfolioValue: real("total_portfolio_value").notNull(),
  dailyPnl: real("daily_pnl"),
  dailyPnlPct: real("daily_pnl_pct"),
}, (table) => [
  index("portfolio_snapshots_timestamp_idx").on(table.timestamp),
]);

// Meteora fee claims
export const feeClaims = pgTable("fee_claims", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  poolAddress: text("pool_address").notNull(),
  positionAddress: text("position_address").notNull(),
  tokenAMint: text("token_a_mint").notNull(),
  tokenBMint: text("token_b_mint").notNull(),
  tokenAAmount: real("token_a_amount").notNull(),
  tokenBAmount: real("token_b_amount").notNull(),
  totalUsdValue: real("total_usd_value").notNull(),
  txSignature: text("tx_signature"),
  dryRun: boolean("dry_run").notNull().default(false),
}, (table) => [
  index("fee_claims_timestamp_idx").on(table.timestamp),
  index("fee_claims_pool_idx").on(table.poolAddress),
]);

// Perpetual positions (open and closed)
export const perpPositions = pgTable("perp_positions", {
  id: serial("id").primaryKey(),
  openedAt: timestamp("opened_at").notNull().defaultNow(),
  closedAt: timestamp("closed_at"),
  market: text("market").notNull(),               // SOL-PERP, ETH-PERP, BTC-PERP
  side: text("side").notNull(),                    // long, short
  size: real("size").notNull(),
  leverage: real("leverage").notNull(),
  entryPrice: real("entry_price").notNull(),
  exitPrice: real("exit_price"),
  collateral: real("collateral").notNull(),
  realizedPnl: real("realized_pnl"),
  stopLossPrice: real("stop_loss_price"),
  positionPublicKey: text("position_public_key").notNull(),
  status: text("status").notNull().default("open"),  // open, closed, liquidated
  openTxSignature: text("open_tx_signature"),
  closeTxSignature: text("close_tx_signature"),
}, (table) => [
  index("perp_positions_market_idx").on(table.market),
  index("perp_positions_status_idx").on(table.status),
]);

// Agent decisions (full LLM reasoning log)
export const agentDecisions = pgTable("agent_decisions", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  action: text("action").notNull(),
  confidence: real("confidence").notNull(),
  reasoning: text("reasoning").notNull(),
  portfolioState: jsonb("portfolio_state"),        // snapshot of portfolio at decision time
  marketState: jsonb("market_state"),              // snapshot of market data
  riskAssessment: jsonb("risk_assessment"),        // risk check results
  success: boolean("success").notNull(),
  txSignature: text("tx_signature"),
  error: text("error"),
  dryRun: boolean("dry_run").notNull().default(false),
}, (table) => [
  index("agent_decisions_timestamp_idx").on(table.timestamp),
  index("agent_decisions_action_idx").on(table.action),
]);

// Distribution runs
export const distributions = pgTable("distributions", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  totalSolDistributed: real("total_sol_distributed").notNull(),
  totalRecipients: integer("total_recipients").notNull(),
  distroBalanceBefore: real("distro_balance_before").notNull(),
  distroBalanceAfter: real("distro_balance_after").notNull(),
  status: text("status").notNull().default("pending"),  // pending / completed / failed
  error: text("error"),
  txSignatures: jsonb("tx_signatures"),  // string[]
}, (table) => [
  index("distributions_timestamp_idx").on(table.timestamp),
  index("distributions_status_idx").on(table.status),
]);

// Distribution recipients (one row per recipient per distribution)
export const distributionRecipients = pgTable("distribution_recipients", {
  id: serial("id").primaryKey(),
  distributionId: integer("distribution_id").notNull(),
  recipientWallet: text("recipient_wallet").notNull(),
  tokenBalance: real("token_balance").notNull(),
  tokenSharePct: real("token_share_pct").notNull(),
  solAmount: real("sol_amount").notNull(),
  txSignature: text("tx_signature"),
  status: text("status").notNull().default("pending"),  // pending / sent / failed
}, (table) => [
  index("dist_recipients_dist_id_idx").on(table.distributionId),
  index("dist_recipients_wallet_idx").on(table.recipientWallet),
  index("dist_recipients_status_idx").on(table.status),
]);

// Risk events (triggered rules)
export const riskEvents = pgTable("risk_events", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  ruleName: text("rule_name").notNull(),
  triggered: boolean("triggered").notNull(),
  details: text("details").notNull(),
  currentValue: real("current_value").notNull(),
  threshold: real("threshold").notNull(),
  action: text("action").notNull(),               // what action was blocked/flagged
}, (table) => [
  index("risk_events_timestamp_idx").on(table.timestamp),
  index("risk_events_rule_idx").on(table.ruleName),
]);
