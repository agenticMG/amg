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
      <div className="mb-4 bg-zinc-900 border border-zinc-800 rounded-lg p-4 inline-block">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Fees Claimed</p>
        <p className="text-2xl font-mono font-bold text-emerald-400">${totalClaimed.toFixed(2)}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
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
              <tr key={f.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                <td className="py-2 pr-4 font-mono text-xs text-zinc-400">
                  {new Date(f.timestamp).toLocaleString()}
                </td>
                <td className="py-2 pr-4 font-mono text-xs">
                  <a
                    href={`https://solscan.io/account/${f.pool_address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    {f.pool_address.slice(0, 8)}...
                  </a>
                </td>
                <td className="py-2 pr-4 text-right font-mono text-xs">{f.token_a_amount.toFixed(6)}</td>
                <td className="py-2 pr-4 text-right font-mono text-xs">{f.token_b_amount.toFixed(6)}</td>
                <td className="py-2 pr-4 text-right font-mono text-xs text-emerald-400">
                  ${f.total_usd_value.toFixed(2)}
                </td>
                <td className="py-2 pr-4">
                  {f.tx_signature ? (
                    <a
                      href={`https://solscan.io/tx/${f.tx_signature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 font-mono text-xs"
                    >
                      {f.tx_signature.slice(0, 8)}...
                    </a>
                  ) : (
                    <span className="text-zinc-600">-</span>
                  )}
                </td>
                <td className="py-2">
                  {f.dry_run && (
                    <span className="px-1.5 py-0.5 rounded text-xs bg-yellow-900/50 text-yellow-400">DRY</span>
                  )}
                </td>
              </tr>
            ))}
            {claims.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-zinc-600">No fee claims yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
