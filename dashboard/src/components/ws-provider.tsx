"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";

type WsMessage = {
  type: "trade" | "decision" | "snapshot" | "risk_event" | "fee_claim";
  data: Record<string, unknown>;
};

type WsContextType = {
  lastMessage: WsMessage | null;
  connected: boolean;
};

const WsContext = createContext<WsContextType>({ lastMessage: null, connected: false });

export function useWs() {
  return useContext(WsContext);
}

export function WsProvider({ children }: { children: ReactNode }) {
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      reconnectTimer.current = setTimeout(connect, 3000);
    };
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WsMessage;
        setLastMessage(msg);
      } catch {}
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return (
    <WsContext.Provider value={{ lastMessage, connected }}>
      {children}
    </WsContext.Provider>
  );
}
