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

  useEffect(() => {
    if (lastMessage?.type === "trade") load();
  }, [lastMessage]);

  const renderTable = (positions: Position[], title: string) => (
    <div>
      <h3 className="text-sm font-medium text-zinc-400 mb-3">{title}</h3>
      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
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
            <tr key={p.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
              <td className="py-2 pr-4 font-mono text-xs font-medium text-white">{p.market}</td>
              <td className="py-2 pr-4">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  p.side === "long" ? "bg-emerald-900/50 text-emerald-400" : "bg-red-900/50 text-red-400"
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
              <td className={`py-2 pr-4 text-right font-mono text-xs ${
                p.realized_pnl != null ? (p.realized_pnl >= 0 ? "text-emerald-400" : "text-red-400") : "text-zinc-600"
              }`}>
                {p.realized_pnl != null ? `${p.realized_pnl >= 0 ? "+" : ""}$${p.realized_pnl.toFixed(2)}` : "-"}
              </td>
              <td className="py-2 pr-4 text-right font-mono text-xs">
                {p.stop_loss_price != null ? `$${p.stop_loss_price.toFixed(2)}` : "-"}
              </td>
              <td className="py-2">
                <span className={`px-1.5 py-0.5 rounded text-xs ${
                  p.status === "open" ? "bg-blue-900/50 text-blue-400" :
                  p.status === "liquidated" ? "bg-red-900/50 text-red-400" :
                  "bg-zinc-800 text-zinc-400"
                }`}>{p.status}</span>
              </td>
            </tr>
          ))}
          {positions.length === 0 && (
            <tr>
              <td colSpan={10} className="py-8 text-center text-zinc-600">No positions</td>
            </tr>
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
