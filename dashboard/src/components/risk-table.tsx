"use client";

import { useEffect, useState } from "react";
import { useWs } from "./ws-provider";

type RiskEvent = {
  id: number;
  timestamp: string;
  rule_name: string;
  triggered: boolean;
  details: string;
  current_value: number;
  threshold: number;
  action: string;
};

export function RiskTable() {
  const [events, setEvents] = useState<RiskEvent[]>([]);
  const { lastMessage } = useWs();

  useEffect(() => {
    fetch("/api/risk?limit=50").then((r) => r.json()).then(setEvents);
  }, []);

  useEffect(() => {
    if (lastMessage?.type === "risk_event") {
      setEvents((prev) => [lastMessage.data as unknown as RiskEvent, ...prev].slice(0, 50));
    }
  }, [lastMessage]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-ink-lighter uppercase tracking-wider border-b-2 border-dashed border-ink-faint">
            <th className="pb-2 pr-4">Time</th>
            <th className="pb-2 pr-4">Rule</th>
            <th className="pb-2 pr-4">Triggered</th>
            <th className="pb-2 pr-4 text-right">Current</th>
            <th className="pb-2 pr-4 text-right">Threshold</th>
            <th className="pb-2 pr-4">Action</th>
            <th className="pb-2">Details</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id} className="border-b border-dashed border-ink-faint/50 hover:bg-cream-dark/50">
              <td className="py-2 pr-4 font-mono text-xs text-ink-lighter">
                {new Date(e.timestamp).toLocaleString()}
              </td>
              <td className="py-2 pr-4">
                <span className="sketch-border-light px-2 py-0.5 text-xs font-medium bg-cream-dark">{e.rule_name}</span>
              </td>
              <td className="py-2 pr-4">
                {e.triggered ? (
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-red-light text-red sketch-border-light">TRIGGERED</span>
                ) : (
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-green-light text-green sketch-border-light">PASS</span>
                )}
              </td>
              <td className="py-2 pr-4 text-right font-mono text-xs">{e.current_value.toFixed(4)}</td>
              <td className="py-2 pr-4 text-right font-mono text-xs">{e.threshold.toFixed(4)}</td>
              <td className="py-2 pr-4 text-xs text-ink-light">{e.action}</td>
              <td className="py-2 text-xs text-ink-lighter max-w-xs truncate">{e.details}</td>
            </tr>
          ))}
          {events.length === 0 && (
            <tr><td colSpan={7} className="py-8 text-center text-ink-lighter font-hand text-lg">No risk events yet...</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
