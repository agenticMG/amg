import sql from "./db";

export async function getOverview() {
  const [latestSnapshot, todayStats, openPositions, totalFees] = await Promise.all([
    sql`SELECT * FROM portfolio_snapshots ORDER BY timestamp DESC LIMIT 1`,
    sql`
      SELECT
        COUNT(*) FILTER (WHERE timestamp >= CURRENT_DATE) as trades_today,
        COALESCE(SUM(pnl) FILTER (WHERE timestamp >= CURRENT_DATE AND pnl IS NOT NULL), 0) as pnl_today
      FROM trades
    `,
    sql`SELECT COUNT(*) as count FROM perp_positions WHERE status = 'open'`,
    sql`SELECT COALESCE(SUM(total_usd_value), 0) as total FROM fee_claims`,
  ]);

  return {
    snapshot: latestSnapshot[0] || null,
    tradesToday: Number(todayStats[0].trades_today),
    pnlToday: Number(todayStats[0].pnl_today),
    openPositions: Number(openPositions[0].count),
    totalFeesClaimed: Number(totalFees[0].total),
  };
}

export async function getRecentTrades(limit = 50) {
  return sql`
    SELECT * FROM trades
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `;
}

export async function getPositions() {
  const [open, closed] = await Promise.all([
    sql`SELECT * FROM perp_positions WHERE status = 'open' ORDER BY opened_at DESC`,
    sql`SELECT * FROM perp_positions WHERE status != 'open' ORDER BY closed_at DESC LIMIT 50`,
  ]);
  return { open, closed };
}

export async function getDecisions(limit = 50) {
  return sql`
    SELECT * FROM agent_decisions
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `;
}

export async function getFeeClaims(limit = 50) {
  const [claims, total] = await Promise.all([
    sql`SELECT * FROM fee_claims ORDER BY timestamp DESC LIMIT ${limit}`,
    sql`SELECT COALESCE(SUM(total_usd_value), 0) as total FROM fee_claims`,
  ]);
  return { claims, totalClaimed: Number(total[0].total) };
}

export async function getRiskEvents(limit = 50) {
  return sql`
    SELECT * FROM risk_events
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `;
}

export async function getPortfolioHistory(hours = 24) {
  return sql`
    SELECT timestamp, total_portfolio_value, sol_balance, daily_pnl, daily_pnl_pct
    FROM portfolio_snapshots
    WHERE timestamp >= NOW() - INTERVAL '1 hour' * ${hours}
    ORDER BY timestamp ASC
  `;
}

export async function getRecentActivity() {
  const [trades, decisions] = await Promise.all([
    sql`SELECT * FROM trades ORDER BY timestamp DESC LIMIT 10`,
    sql`SELECT * FROM agent_decisions ORDER BY timestamp DESC LIMIT 5`,
  ]);
  return { trades, decisions };
}
