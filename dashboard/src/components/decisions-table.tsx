"use client";

import { useEffect, useState } from "react";
import { useWs } from "./ws-provider";

type Decision = {
  id: number;
  timestamp: string;
  action: string;
  confidence: number;
  reasoning: string;
  success: boolean;
  tx_signature: string | null;
  error: string | null;
  dry_run: boolean;
};

export function DecisionsTable({ compact = false }: { compact?: boolean }) {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const { lastMessage } = useWs();
  const limit = compact ? 5 : 50;

  useEffect(() => {
    fetch(`/api/decisions?limit=${limit}`).then((r) => r.json()).then(setDecisions);
  }, [limit]);

  useEffect(() => {
    if (lastMessage?.type === "decision") {
      setDecisions((prev) => [lastMessage.data as unknown as Decision, ...prev].slice(0, limit));
    }
  }, [lastMessage, limit]);

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-ink-lighter uppercase tracking-wider border-b-2 border-dashed border-ink-faint">
            <th className="pb-2 pr-4">Time</th>
            <th className="pb-2 pr-4">Action</th>
            <th className="pb-2 pr-4">Confidence</th>
            {!compact && <th className="pb-2 pr-4">Reasoning</th>}
            <th className="pb-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {decisions.map((d) => (
            <tr
              key={d.id}
              className="border-b border-dashed border-ink-faint/50 hover:bg-cream-dark/50 cursor-pointer"
              onClick={() => toggle(d.id)}
            >
              <td className="py-2 pr-4 font-mono text-xs text-ink-lighter">
                {new Date(d.timestamp).toLocaleString()}
              </td>
              <td className="py-2 pr-4">
                <span className="sketch-border-light px-2 py-0.5 text-xs font-medium bg-cream-dark">
                  {d.action}
                </span>
              </td>
              <td className="py-2 pr-4">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-cream-dark rounded-full overflow-hidden sketch-border-light">
                    <div
                      className={`h-full ${
                        d.confidence >= 0.7 ? "bg-green" : d.confidence >= 0.4 ? "bg-yellow" : "bg-red"
                      }`}
                      style={{ width: `${d.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-ink-lighter">{(d.confidence * 100).toFixed(0)}%</span>
                </div>
              </td>
              {!compact && (
                <td className="py-2 pr-4 text-xs text-ink-light max-w-md">
                  {expanded.has(d.id) ? (
                    <div className="whitespace-pre-wrap">{d.reasoning}</div>
                  ) : (
                    <div className="truncate">{d.reasoning.slice(0, 100)}...</div>
                  )}
                </td>
              )}
              <td className="py-2">
                {d.success ? (
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-green-light text-green sketch-border-light">OK</span>
                ) : (
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-red-light text-red sketch-border-light">BLOCKED</span>
                )}
                {d.dry_run && (
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-yellow-light text-yellow sketch-border-light ml-1">DRY</span>
                )}
              </td>
            </tr>
          ))}
          {decisions.length === 0 && (
            <tr><td colSpan={compact ? 4 : 5} className="py-8 text-center text-ink-lighter font-hand text-lg">No decisions yet...</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
