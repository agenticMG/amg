"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type UpdateData = {
  trades: Record<string, unknown>[];
  decisions: Record<string, unknown>[];
  risk_events: Record<string, unknown>[];
  fee_claims: Record<string, unknown>[];
  snapshots: Record<string, unknown>[];
};

type WsContextType = {
  update: UpdateData | null;
  connected: boolean;
};

const WsContext = createContext<WsContextType>({ update: null, connected: false });

export function useWs() {
  return useContext(WsContext);
}

const POLL_INTERVAL = 10_000;

export function WsProvider({ children }: { children: ReactNode }) {
  const [update, setUpdate] = useState<UpdateData | null>(null);
  const [connected, setConnected] = useState(false);
  const idsRef = useRef<Record<string, number> | null>(null);

  useEffect(() => {
    let active = true;
    let interval: ReturnType<typeof setInterval>;

    (async () => {
      // Seed: get current max IDs so first poll doesn't return the whole history
      try {
        const res = await fetch("/api/updates?seed=true");
        if (!active) return;
        if (!res.ok) {
          setConnected(false);
          return;
        }
        const { seed } = await res.json();
        idsRef.current = seed;
        setConnected(true);
      } catch {
        if (active) setConnected(false);
        return;
      }

      // Poll for new rows
      const poll = async () => {
        if (!idsRef.current || !active) return;
        try {
          const ids = idsRef.current;
          const params = new URLSearchParams({
            trades: String(ids.trades),
            decisions: String(ids.decisions),
            risk: String(ids.risk),
            fees: String(ids.fees),
            snapshots: String(ids.snapshots),
          });
          const res = await fetch(`/api/updates?${params}`);
          if (!active) return;
          if (!res.ok) {
            setConnected(false);
            return;
          }
          const data: UpdateData = await res.json();
          setConnected(true);

          // Advance cursors
          const maxId = (rows: Record<string, unknown>[]) =>
            rows.reduce((m, r) => Math.max(m, (r as { id: number }).id), 0);
          if (data.trades.length) ids.trades = maxId(data.trades);
          if (data.decisions.length) ids.decisions = maxId(data.decisions);
          if (data.risk_events.length) ids.risk = maxId(data.risk_events);
          if (data.fee_claims.length) ids.fees = maxId(data.fee_claims);
          if (data.snapshots.length) ids.snapshots = maxId(data.snapshots);

          const hasNew =
            data.trades.length > 0 ||
            data.decisions.length > 0 ||
            data.risk_events.length > 0 ||
            data.fee_claims.length > 0 ||
            data.snapshots.length > 0;
          if (hasNew) setUpdate(data);
        } catch {
          if (active) setConnected(false);
        }
      };

      interval = setInterval(poll, POLL_INTERVAL);
    })();

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <WsContext.Provider value={{ update, connected }}>
      {children}
    </WsContext.Provider>
  );
}
