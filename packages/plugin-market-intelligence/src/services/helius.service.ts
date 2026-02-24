import WebSocket from "ws";
import { createLogger } from "@amg/shared";

const log = createLogger("helius");

export type PriceCallback = (mint: string, price: number) => void;

export class HeliusClient {
  private ws: WebSocket | null = null;
  private subscriptions = new Map<string, PriceCallback[]>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private apiKey: string,
    private rpcUrl?: string
  ) {}

  async connect(): Promise<void> {
    if (!this.apiKey) {
      log.warn("No Helius API key, WebSocket disabled");
      return;
    }

    const wsUrl = this.rpcUrl
      ? this.rpcUrl.replace("https://", "wss://")
      : `wss://mainnet.helius-rpc.com/?api-key=${this.apiKey}`;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);

      this.ws.on("open", () => {
        log.info("Helius WebSocket connected");
        resolve();
      });

      this.ws.on("message", (data: Buffer) => {
        try {
          const msg = JSON.parse(data.toString());
          this.handleMessage(msg);
        } catch (err) {
          log.error({ err }, "Failed to parse WebSocket message");
        }
      });

      this.ws.on("close", () => {
        log.warn("Helius WebSocket disconnected, will reconnect...");
        this.scheduleReconnect();
      });

      this.ws.on("error", (err) => {
        log.error({ err }, "Helius WebSocket error");
        if (this.ws?.readyState === WebSocket.CONNECTING) {
          reject(err);
        }
      });
    });
  }

  private handleMessage(msg: any): void {
    // Handle account subscription notifications
    if (msg.method === "accountNotification") {
      const { subscription } = msg.params;
      log.debug({ subscription }, "Account notification received");
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
        // Re-subscribe
        for (const [mint] of this.subscriptions) {
          log.info({ mint }, "Re-subscribing after reconnect");
        }
      } catch (err) {
        log.error({ err }, "Reconnect failed");
        this.scheduleReconnect();
      }
    }, 5000);
  }

  async subscribeToAccount(address: string, callback: PriceCallback): Promise<void> {
    const callbacks = this.subscriptions.get(address) || [];
    callbacks.push(callback);
    this.subscriptions.set(address, callbacks);

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "accountSubscribe",
        params: [
          address,
          { encoding: "jsonParsed", commitment: "confirmed" },
        ],
      }));
    }
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscriptions.clear();
    log.info("Helius WebSocket disconnected");
  }
}
