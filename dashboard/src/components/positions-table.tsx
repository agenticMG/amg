"use client";

import { useEffect, useState } from "react";
import { useWs } from "./ws-provider";

type Position = {
  id: number;
  opened_at: string;
  closed_at: string | null;
  market: string;
  side: string;
  size: number;
  leverage: number;
  entry_price: number;
  exit_price: number | null;
  collateral: number;
  realized_pnl: number | null;
  stop_loss_price: number | null;
  status: string;
};

export function PositionsTable() {
  const [open, setOpen] = useState<Position[]>([]);
  const [closed, setClosed] = useState<Position[]>([]);
  const { lastMessage } = useWs();

  const load = () => {
    fetch("/api/positions").then((r) => r.json()).then((d: { open: Position[]; closed: Position[] }) => {
      setOpen(d.open);
      setClosed(d.closed);
    });
  };

  useEffect(load, []);
  useEffect(() => { if (lastMessage?.type === "trade") load(); }, [lastMessage]);

  const renderTable = (positions: Position[], title: string) => (
    <div className="mb-8">
      <h3 className="font-hand text-xl font-semibold mb-3">{title}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-ink-lighter uppercase tracking-wider border-b-2 border-dashed border-ink-faint">
            <th className="pb-2 pr-4">Market</th>
            <th className="pb-2 pr-4">Side</th>
            <th className="pb-2 pr-4 text-right">Size</th>
            <th className="pb-2 pr-4 text-right">Leverage</th>
            <th className="pb-2 pr-4 text-right">Entry</th>
            {title.includes("Closed") && <th className="pb-2 pr-4 text-right">Exit</th>}
            <th className="pb-2 pr-4 text-right">Collateral</th>
            <th className="pb-2 pr-4 text-right">P&L</th>
            <th className="pb-2 pr-4 text-right">Stop Loss</th>
            <th className="pb-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => (
            <tr key={p.id} className="border-b border-dashed border-ink-faint/50 hover:bg-cream-dark/50">
              <td className="py-2 pr-4 font-mono text-xs font-medium">{p.market}</td>
              <td className="py-2 pr-4">
                <span className={`px-2 py-0.5 text-xs font-medium sketch-border-light ${
                  p.side === "long" ? "bg-green-light text-green" : "bg-red-light text-red"
                }`}>
                  {p.side.toUpperCase()}
                </span>
              </td>
              <td className="py-2 pr-4 text-right font-mono text-xs">{p.size.toFixed(4)}</td>
              <td className="py-2 pr-4 text-right font-mono text-xs">{p.leverage.toFixed(1)}x</td>
              <td className="py-2 pr-4 text-right font-mono text-xs">${p.entry_price.toFixed(2)}</td>
              {title.includes("Closed") && (
                <td className="py-2 pr-4 text-right font-mono text-xs">
                  {p.exit_price != null ? `$${p.exit_price.toFixed(2)}` : "-"}
                </td>
              )}
              <td className="py-2 pr-4 text-right font-mono text-xs">${p.collateral.toFixed(2)}</td>
              <td className={`py-2 pr-4 text-right font-mono text-xs font-medium ${
                p.realized_pnl != null ? (p.realized_pnl >= 0 ? "text-green" : "text-red") : "text-ink-faint"
              }`}>
                {p.realized_pnl != null ? `${p.realized_pnl >= 0 ? "+" : ""}$${p.realized_pnl.toFixed(2)}` : "-"}
              </td>
              <td className="py-2 pr-4 text-right font-mono text-xs">
                {p.stop_loss_price != null ? `$${p.stop_loss_price.toFixed(2)}` : "-"}
              </td>
              <td className="py-2">
                <span className={`px-1.5 py-0.5 text-xs font-medium sketch-border-light ${
                  p.status === "open" ? "bg-accent-light text-accent" :
                  p.status === "liquidated" ? "bg-red-light text-red" :
                  "bg-cream-dark text-ink-lighter"
                }`}>{p.status}</span>
              </td>
            </tr>
          ))}
          {positions.length === 0 && (
            <tr><td colSpan={10} className="py-8 text-center text-ink-lighter font-hand text-lg">No positions...</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      {renderTable(open, "Open Positions")}
      {renderTable(closed, "Closed Positions")}
    </div>
  );
}
