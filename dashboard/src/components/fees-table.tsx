"use client";

import { useEffect, useState } from "react";
import { useWs } from "./ws-provider";

type FeeClaim = {
  id: number;
  timestamp: string;
  pool_address: string;
  token_a_mint: string;
  token_b_mint: string;
  token_a_amount: number;
  token_b_amount: number;
  total_usd_value: number;
  tx_signature: string | null;
  dry_run: boolean;
};

export function FeesTable() {
  const [claims, setClaims] = useState<FeeClaim[]>([]);
  const [totalClaimed, setTotalClaimed] = useState(0);
  const { lastMessage } = useWs();

  useEffect(() => {
    fetch("/api/fees?limit=50").then((r) => r.json()).then((d: { claims: FeeClaim[]; totalClaimed: number }) => {
      setClaims(d.claims);
      setTotalClaimed(d.totalClaimed);
    });
  }, []);

  useEffect(() => {
    if (lastMessage?.type === "fee_claim") {
      const fc = lastMessage.data as unknown as FeeClaim;
      setClaims((prev) => [fc, ...prev].slice(0, 50));
      setTotalClaimed((prev) => prev + fc.total_usd_value);
    }
  }, [lastMessage]);

  return (
    <div>
      <div className="mb-4 sketch-card bg-paper p-4 inline-block">
        <p className="text-xs text-ink-lighter uppercase tracking-wider font-semibold">Total Fees Claimed</p>
        <p className="text-2xl font-mono font-bold text-green">${totalClaimed.toFixed(2)}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-lighter uppercase tracking-wider border-b-2 border-dashed border-ink-faint">
              <th className="pb-2 pr-4">Time</th>
              <th className="pb-2 pr-4">Pool</th>
              <th className="pb-2 pr-4 text-right">Token A</th>
              <th className="pb-2 pr-4 text-right">Token B</th>
              <th className="pb-2 pr-4 text-right">USD Value</th>
              <th className="pb-2 pr-4">Tx</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((f) => (
              <tr key={f.id} className="border-b border-dashed border-ink-faint/50 hover:bg-cream-dark/50">
                <td className="py-2 pr-4 font-mono text-xs text-ink-lighter">
                  {new Date(f.timestamp).toLocaleString()}
                </td>
                <td className="py-2 pr-4 font-mono text-xs">
                  <a href={`https://solscan.io/account/${f.pool_address}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                    {f.pool_address.slice(0, 8)}...
                  </a>
                </td>
                <td className="py-2 pr-4 text-right font-mono text-xs">{f.token_a_amount.toFixed(6)}</td>
                <td className="py-2 pr-4 text-right font-mono text-xs">{f.token_b_amount.toFixed(6)}</td>
                <td className="py-2 pr-4 text-right font-mono text-xs text-green font-medium">${f.total_usd_value.toFixed(2)}</td>
                <td className="py-2 pr-4">
                  {f.tx_signature ? (
                    <a href={`https://solscan.io/tx/${f.tx_signature}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-mono text-xs">
                      {f.tx_signature.slice(0, 8)}...
                    </a>
                  ) : <span className="text-ink-faint">-</span>}
                </td>
                <td className="py-2">
                  {f.dry_run && <span className="px-1.5 py-0.5 text-xs font-medium bg-yellow-light text-yellow sketch-border-light">DRY</span>}
                </td>
              </tr>
            ))}
            {claims.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-ink-lighter font-hand text-lg">No fee claims yet...</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
