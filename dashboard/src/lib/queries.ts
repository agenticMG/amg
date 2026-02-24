import sql from "./db";

export async function getOverview() {
  const [latestSnapshot, todayStats, openPositions, totalFees, totalDistributed] = await Promise.all([
    sql`SELECT * FROM portfolio_snapshots ORDER BY timestamp DESC LIMIT 1`,
    sql`
      SELECT
        COUNT(*) FILTER (WHERE timestamp >= CURRENT_DATE) as trades_today,
        COALESCE(SUM(pnl) FILTER (WHERE timestamp >= CURRENT_DATE AND pnl IS NOT NULL), 0) as pnl_today
      FROM trades
    `,
    sql`SELECT COUNT(*) as count FROM perp_positions WHERE status = 'open'`,
    sql`SELECT COALESCE(SUM(total_usd_value), 0) as total FROM fee_claims`,
    sql`SELECT COALESCE(SUM(total_sol_distributed), 0) as total FROM distributions WHERE status = 'completed'`,
  ]);

  return {
    snapshot: latestSnapshot[0] || null,
    tradesToday: Number(todayStats[0].trades_today),
    pnlToday: Number(todayStats[0].pnl_today),
    openPositions: Number(openPositions[0].count),
    totalFeesClaimed: Number(totalFees[0].total),
    totalSolDistributed: Number(totalDistributed[0].total),
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

export async function getDistributions(limit = 50) {
  const [runs, totalDistributed, totalRecipients] = await Promise.all([
    sql`
      SELECT d.*,
        (SELECT COUNT(*) FROM distribution_recipients dr WHERE dr.distribution_id = d.id AND dr.status = 'sent') as sent_count,
        (SELECT COUNT(*) FROM distribution_recipients dr WHERE dr.distribution_id = d.id AND dr.status = 'failed') as failed_count
      FROM distributions d
      ORDER BY d.timestamp DESC
      LIMIT ${limit}
    `,
    sql`SELECT COALESCE(SUM(total_sol_distributed), 0) as total FROM distributions WHERE status = 'completed'`,
    sql`SELECT COUNT(DISTINCT recipient_wallet) as total FROM distribution_recipients WHERE status = 'sent'`,
  ]);
  return {
    distributions: runs,
    totalSolDistributed: Number(totalDistributed[0].total),
    uniqueRecipients: Number(totalRecipients[0].total),
  };
}

export async function getDistributionRecipients(distributionId: number) {
  return sql`
    SELECT * FROM distribution_recipients
    WHERE distribution_id = ${distributionId}
    ORDER BY sol_amount DESC
  `;
}

export async function getTopRecipients(limit = 20) {
  return sql`
    SELECT
      recipient_wallet,
      SUM(sol_amount) as total_sol,
      COUNT(*) as distribution_count
    FROM distribution_recipients
    WHERE status = 'sent'
    GROUP BY recipient_wallet
    ORDER BY SUM(sol_amount) DESC
    LIMIT ${limit}
  `;
}

export async function getRecentActivity() {
  const [trades, decisions] = await Promise.all([
    sql`SELECT * FROM trades ORDER BY timestamp DESC LIMIT 10`,
    sql`SELECT * FROM agent_decisions ORDER BY timestamp DESC LIMIT 5`,
  ]);
  return { trades, decisions };
}
