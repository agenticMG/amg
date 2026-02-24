"use client";

import { useEffect, useState } from "react";
import { useWs } from "./ws-provider";

type Distribution = {
  id: number;
  timestamp: string;
  total_sol_distributed: number;
  total_recipients: number;
  distro_balance_before: number;
  distro_balance_after: number;
  status: string;
  error: string | null;
  tx_signatures: string[] | null;
  sent_count?: number;
  failed_count?: number;
};

type TopRecipient = {
  recipient_wallet: string;
  total_sol: number;
  distribution_count: number;
};

type DistributionData = {
  distributions: Distribution[];
  totalSolDistributed: number;
  uniqueRecipients: number;
  topRecipients: TopRecipient[];
};

export function DistributionsTable() {
  const [data, setData] = useState<DistributionData | null>(null);
  const { update } = useWs();

  useEffect(() => {
    fetch("/api/distributions?limit=50").then((r) => r.json()).then(setData);
  }, []);

  useEffect(() => {
    if (update?.distributions?.length) {
      fetch("/api/distributions?limit=50").then((r) => r.json()).then(setData);
    }
  }, [update]);

  if (!data) {
    return <div className="animate-pulse h-32 sketch-border-light bg-paper" />;
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="sketch-card bg-paper p-4">
          <p className="text-xs text-ink-lighter uppercase tracking-wider font-semibold">Total Distributed</p>
          <p className="text-2xl font-mono font-bold text-green">{data.totalSolDistributed.toFixed(4)} SOL</p>
        </div>
        <div className="sketch-card bg-paper p-4">
          <p className="text-xs text-ink-lighter uppercase tracking-wider font-semibold">Distribution Runs</p>
          <p className="text-2xl font-mono font-bold">{data.distributions.length}</p>
        </div>
        <div className="sketch-card bg-paper p-4">
          <p className="text-xs text-ink-lighter uppercase tracking-wider font-semibold">Unique Recipients</p>
          <p className="text-2xl font-mono font-bold">{data.uniqueRecipients}</p>
        </div>
      </div>

      {/* Distribution runs table */}
      <div>
        <h3 className="font-hand text-xl font-semibold mb-3">Distribution Runs</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-lighter uppercase tracking-wider border-b-2 border-dashed border-ink-faint">
                <th className="pb-2 pr-4">Time</th>
                <th className="pb-2 pr-4 text-right">SOL Distributed</th>
                <th className="pb-2 pr-4 text-right">Recipients</th>
                <th className="pb-2 pr-4 text-right">Balance Before</th>
                <th className="pb-2 pr-4 text-right">Balance After</th>
                <th className="pb-2 pr-4">Transactions</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.distributions.map((d) => (
                <tr key={d.id} className="border-b border-dashed border-ink-faint/50 hover:bg-cream-dark/50">
                  <td className="py-2 pr-4 font-mono text-xs text-ink-lighter">
                    {new Date(d.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-xs text-green font-medium">
                    {d.total_sol_distributed.toFixed(6)}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-xs">
                    {d.total_recipients}
                    {Number(d.failed_count) > 0 && (
                      <span className="text-red ml-1">({d.failed_count} failed)</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-xs text-ink-lighter">
                    {d.distro_balance_before.toFixed(4)}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-xs text-ink-lighter">
                    {d.distro_balance_after.toFixed(4)}
                  </td>
                  <td className="py-2 pr-4">
                    {d.tx_signatures && d.tx_signatures.length > 0 ? (
                      <span className="font-mono text-xs">
                        {d.tx_signatures.map((sig, i) => (
                          <span key={sig}>
                            {i > 0 && ", "}
                            <a href={`https://solscan.io/tx/${sig}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                              {sig.slice(0, 8)}...
                            </a>
                          </span>
                        ))}
                      </span>
                    ) : <span className="text-ink-faint">-</span>}
                  </td>
                  <td className="py-2">
                    <span className={`px-1.5 py-0.5 text-xs font-medium sketch-border-light ${
                      d.status === "completed" ? "bg-green/10 text-green" :
                      d.status === "failed" ? "bg-red/10 text-red" :
                      "bg-yellow-light text-yellow"
                    }`}>
                      {d.status}
                    </span>
                  </td>
                </tr>
              ))}
              {data.distributions.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-ink-lighter font-hand text-lg">No distributions yet...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top recipients */}
      {data.topRecipients.length > 0 && (
        <div>
          <h3 className="font-hand text-xl font-semibold mb-3">Top Recipients (All Time)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-lighter uppercase tracking-wider border-b-2 border-dashed border-ink-faint">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Wallet</th>
                  <th className="pb-2 pr-4 text-right">Total SOL</th>
                  <th className="pb-2 text-right">Distributions</th>
                </tr>
              </thead>
              <tbody>
                {data.topRecipients.map((r, i) => (
                  <tr key={r.recipient_wallet} className="border-b border-dashed border-ink-faint/50 hover:bg-cream-dark/50">
                    <td className="py-2 pr-4 font-mono text-xs text-ink-lighter">{i + 1}</td>
                    <td className="py-2 pr-4 font-mono text-xs">
                      <a href={`https://solscan.io/account/${r.recipient_wallet}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                        {r.recipient_wallet.slice(0, 8)}...{r.recipient_wallet.slice(-4)}
                      </a>
                    </td>
                    <td className="py-2 pr-4 text-right font-mono text-xs text-green font-medium">
                      {Number(r.total_sol).toFixed(6)}
                    </td>
                    <td className="py-2 text-right font-mono text-xs">{r.distribution_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
