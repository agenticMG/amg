"use client";

import { useEffect, useState } from "react";
import { useWs } from "./ws-provider";

type OverviewData = {
  snapshot: {
    total_portfolio_value: number;
    sol_balance: number;
    daily_pnl: number | null;
    daily_pnl_pct: number | null;
  } | null;
  tradesToday: number;
  pnlToday: number;
  openPositions: number;
  totalFeesClaimed: number;
};

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function Card({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="sketch-card bg-paper p-4">
      <p className="text-xs text-ink-lighter uppercase tracking-wider font-semibold mb-1">{label}</p>
      <p className={`text-2xl font-mono font-bold ${color || "text-ink"}`}>{value}</p>
      {sub && <p className="text-xs text-ink-lighter mt-1">{sub}</p>}
    </div>
  );
}

export function KpiCards() {
  const [data, setData] = useState<OverviewData | null>(null);
  const { lastMessage } = useWs();

  useEffect(() => {
    fetch("/api/overview").then((r) => r.json()).then(setData);
  }, []);

  useEffect(() => {
    if (lastMessage?.type === "snapshot" || lastMessage?.type === "trade") {
      fetch("/api/overview").then((r) => r.json()).then(setData);
    }
  }, [lastMessage]);

  if (!data) {
    return (
      <div className="grid grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="sketch-border-light bg-paper p-4 h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  const pnlPct = data.snapshot?.daily_pnl_pct;
  const pnlColor = (pnlPct ?? 0) >= 0 ? "text-green" : "text-red";

  return (
    <div className="grid grid-cols-5 gap-4">
      <Card
        label="Portfolio Value"
        value={`$${fmt(data.snapshot?.total_portfolio_value ?? 0)}`}
      />
      <Card
        label="SOL Balance"
        value={fmt(data.snapshot?.sol_balance ?? 0, 4)}
        sub="SOL"
      />
      <Card
        label="Daily P&L"
        value={`${(pnlPct ?? 0) >= 0 ? "+" : ""}${fmt(pnlPct ?? 0)}%`}
        sub={`$${fmt(data.pnlToday)}`}
        color={pnlColor}
      />
      <Card
        label="Open Positions"
        value={String(data.openPositions)}
        sub={`${data.tradesToday} trades today`}
      />
      <Card
        label="Fees Claimed"
        value={`$${fmt(data.totalFeesClaimed)}`}
      />
    </div>
  );
}
