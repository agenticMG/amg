import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  // Seed mode: return current max IDs so the client knows where to start polling from
  if (params.get("seed") === "true") {
    const [row] = await sql`
      SELECT
        (SELECT COALESCE(MAX(id), 0) FROM trades) AS trades,
        (SELECT COALESCE(MAX(id), 0) FROM agent_decisions) AS decisions,
        (SELECT COALESCE(MAX(id), 0) FROM risk_events) AS risk,
        (SELECT COALESCE(MAX(id), 0) FROM fee_claims) AS fees,
        (SELECT COALESCE(MAX(id), 0) FROM portfolio_snapshots) AS snapshots
    `;
    return NextResponse.json({ seed: row });
  }

  // Poll mode: return new rows since the given IDs
  const trades = parseInt(params.get("trades") || "0", 10);
  const decisions = parseInt(params.get("decisions") || "0", 10);
  const risk = parseInt(params.get("risk") || "0", 10);
  const fees = parseInt(params.get("fees") || "0", 10);
  const snapshots = parseInt(params.get("snapshots") || "0", 10);

  const [newTrades, newDecisions, newRisk, newFees, newSnapshots] =
    await Promise.all([
      sql`SELECT * FROM trades WHERE id > ${trades} ORDER BY id DESC LIMIT 50`,
      sql`SELECT * FROM agent_decisions WHERE id > ${decisions} ORDER BY id DESC LIMIT 50`,
      sql`SELECT * FROM risk_events WHERE id > ${risk} ORDER BY id DESC LIMIT 50`,
      sql`SELECT * FROM fee_claims WHERE id > ${fees} ORDER BY id DESC LIMIT 50`,
      sql`SELECT * FROM portfolio_snapshots WHERE id > ${snapshots} ORDER BY id DESC LIMIT 50`,
    ]);

  return NextResponse.json({
    trades: newTrades,
    decisions: newDecisions,
    risk_events: newRisk,
    fee_claims: newFees,
    snapshots: newSnapshots,
  });
}
