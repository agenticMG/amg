"use client";

import { useEffect, useState } from "react";
import { useWs } from "./ws-provider";

type Trade = {
  id: number;
  timestamp: string;
  action: string;
  input_token: string | null;
  output_token: string | null;
  input_amount: number | null;
  output_amount: number | null;
  executed_price: number | null;
  pnl: number | null;
  tx_signature: string | null;
  success: boolean;
  dry_run: boolean;
};

function TxLink({ sig }: { sig: string | null }) {
  if (!sig) return <span className="text-ink-faint">-</span>;
  return (
    <a
      href={`https://solscan.io/tx/${sig}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent hover:underline font-mono text-xs"
    >
      {sig.slice(0, 8)}...
    </a>
  );
}

export function TradesTable({ compact = false }: { compact?: boolean }) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const { update } = useWs();
  const limit = compact ? 10 : 50;

  useEffect(() => {
    fetch(`/api/trades?limit=${limit}`).then((r) => r.json()).then(setTrades);
  }, [limit]);

  useEffect(() => {
    if (update?.trades.length) {
      setTrades((prev) => [...(update.trades as unknown as Trade[]), ...prev].slice(0, limit));
    }
  }, [update, limit]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-ink-lighter uppercase tracking-wider border-b-2 border-dashed border-ink-faint">
            <th className="pb-2 pr-4">Time</th>
            <th className="pb-2 pr-4">Action</th>
            <th className="pb-2 pr-4">From</th>
            <th className="pb-2 pr-4">To</th>
            <th className="pb-2 pr-4 text-right">Price</th>
            <th className="pb-2 pr-4 text-right">P&L</th>
            <th className="pb-2 pr-4">Tx</th>
            {!compact && <th className="pb-2">Status</th>}
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => (
            <tr key={t.id} className="border-b border-dashed border-ink-faint/50 hover:bg-cream-dark/50">
              <td className="py-2 pr-4 font-mono text-xs text-ink-lighter">
                {new Date(t.timestamp).toLocaleString()}
              </td>
              <td className="py-2 pr-4">
                <span className="sketch-border-light px-2 py-0.5 text-xs font-medium bg-cream-dark">
                  {t.action}
                </span>
              </td>
              <td className="py-2 pr-4 font-mono text-xs">
                {t.input_amount != null ? `${t.input_amount.toFixed(4)} ${t.input_token}` : "-"}
              </td>
              <td className="py-2 pr-4 font-mono text-xs">
                {t.output_amount != null ? `${t.output_amount.toFixed(4)} ${t.output_token}` : "-"}
              </td>
              <td className="py-2 pr-4 text-right font-mono text-xs">
                {t.executed_price != null ? `$${t.executed_price.toFixed(4)}` : "-"}
              </td>
              <td className={`py-2 pr-4 text-right font-mono text-xs font-medium ${
                t.pnl != null ? (t.pnl >= 0 ? "text-green" : "text-red") : "text-ink-faint"
              }`}>
                {t.pnl != null ? `${t.pnl >= 0 ? "+" : ""}$${t.pnl.toFixed(2)}` : "-"}
              </td>
              <td className="py-2 pr-4"><TxLink sig={t.tx_signature} /></td>
              {!compact && (
                <td className="py-2">
                  {t.dry_run && (
                    <span className="px-1.5 py-0.5 text-xs font-medium bg-yellow-light text-yellow sketch-border-light">DRY</span>
                  )}
                  {!t.success && (
                    <span className="px-1.5 py-0.5 text-xs font-medium bg-red-light text-red sketch-border-light ml-1">FAIL</span>
                  )}
                </td>
              )}
            </tr>
          ))}
          {trades.length === 0 && (
            <tr><td colSpan={compact ? 7 : 8} className="py-8 text-center text-ink-lighter font-hand text-lg">No trades yet...</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
