import { createServer } from "http";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";
import postgres from "postgres";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3001", 10);

const app = next({ dev, port });
const handle = app.getRequestHandler();

const sql = postgres(process.env.DATABASE_URL!, { max: 2 });

interface LastIds {
  trades: number;
  decisions: number;
  risk_events: number;
  fee_claims: number;
  snapshots: number;
}

async function getLastIds(): Promise<LastIds> {
  const [t, d, r, f, s] = await Promise.all([
    sql`SELECT COALESCE(MAX(id), 0) as id FROM trades`,
    sql`SELECT COALESCE(MAX(id), 0) as id FROM agent_decisions`,
    sql`SELECT COALESCE(MAX(id), 0) as id FROM risk_events`,
    sql`SELECT COALESCE(MAX(id), 0) as id FROM fee_claims`,
    sql`SELECT COALESCE(MAX(id), 0) as id FROM portfolio_snapshots`,
  ]);
  return {
    trades: t[0].id,
    decisions: d[0].id,
    risk_events: r[0].id,
    fee_claims: f[0].id,
    snapshots: s[0].id,
  };
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const wss = new WebSocketServer({ server });
  const clients = new Set<WebSocket>();

  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.on("close", () => clients.delete(ws));
  });

  function broadcast(msg: object) {
    const data = JSON.stringify(msg);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  let lastIds: LastIds = { trades: 0, decisions: 0, risk_events: 0, fee_claims: 0, snapshots: 0 };

  // Initialize last IDs then start polling
  getLastIds().then((ids) => {
    lastIds = ids;
  });

  setInterval(async () => {
    if (clients.size === 0) return;
    try {
      const [newTrades, newDecisions, newRisk, newFees, newSnapshots] = await Promise.all([
        sql`SELECT * FROM trades WHERE id > ${lastIds.trades} ORDER BY id`,
        sql`SELECT * FROM agent_decisions WHERE id > ${lastIds.decisions} ORDER BY id`,
        sql`SELECT * FROM risk_events WHERE id > ${lastIds.risk_events} ORDER BY id`,
        sql`SELECT * FROM fee_claims WHERE id > ${lastIds.fee_claims} ORDER BY id`,
        sql`SELECT * FROM portfolio_snapshots WHERE id > ${lastIds.snapshots} ORDER BY id`,
      ]);

      for (const row of newTrades) {
        broadcast({ type: "trade", data: row });
        lastIds.trades = row.id;
      }
      for (const row of newDecisions) {
        broadcast({ type: "decision", data: row });
        lastIds.decisions = row.id;
      }
      for (const row of newRisk) {
        broadcast({ type: "risk_event", data: row });
        lastIds.risk_events = row.id;
      }
      for (const row of newFees) {
        broadcast({ type: "fee_claim", data: row });
        lastIds.fee_claims = row.id;
      }
      for (const row of newSnapshots) {
        broadcast({ type: "snapshot", data: row });
        lastIds.snapshots = row.id;
      }
    } catch (err) {
      console.error("WS poll error:", err);
    }
  }, 5000);

  server.listen(port, () => {
    console.log(`Dashboard ready on http://localhost:${port}`);
  });
});
