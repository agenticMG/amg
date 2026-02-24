import { createLogger, type TokenPrice, TOKENS, withRetry } from "@amg/shared";

const log = createLogger("birdeye");

const BIRDEYE_BASE_URL = "https://public-api.birdeye.so";

export class BirdeyeClient {
  constructor(private apiKey: string) {}

  async getTokenPrice(mint: string): Promise<TokenPrice | null> {
    if (!this.apiKey) return null;

    return withRetry(async () => {
      const res = await fetch(`${BIRDEYE_BASE_URL}/defi/price?address=${mint}`, {
        headers: {
          "X-API-KEY": this.apiKey,
          "x-chain": "solana",
        },
      });

      if (!res.ok) {
        throw new Error(`Birdeye API error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json() as any;
      if (!data.success || !data.data) return null;

      return {
        mint,
        symbol: data.data.symbol || mint.slice(0, 8),
        price: data.data.value ?? 0,
        priceChange24h: 0,
        priceChange24hPct: data.data.priceChange24hPercent ? data.data.priceChange24hPercent / 100 : 0,
        volume24h: 0,
        lastUpdated: new Date(),
      };
    }, { label: "birdeye-price", maxRetries: 2 });
  }

  async getMultipleTokenPrices(mints: string[]): Promise<Map<string, TokenPrice>> {
    const priceMap = new Map<string, TokenPrice>();
    if (!this.apiKey) return priceMap;

    try {
      const mintList = mints.join(",");
      const res = await fetch(`${BIRDEYE_BASE_URL}/defi/multi_price?list_address=${mintList}`, {
        headers: {
          "X-API-KEY": this.apiKey,
          "x-chain": "solana",
        },
      });

      if (!res.ok) {
        log.warn({ status: res.status }, "Birdeye multi-price failed");
        return priceMap;
      }

      const data = await res.json() as any;
      if (!data.success || !data.data) return priceMap;

      for (const [mint, priceData] of Object.entries(data.data as Record<string, any>)) {
        priceMap.set(mint, {
          mint,
          symbol: priceData.symbol || mint.slice(0, 8),
          price: priceData.value ?? 0,
          priceChange24h: 0,
          priceChange24hPct: priceData.priceChange24hPercent ? priceData.priceChange24hPercent / 100 : 0,
          volume24h: 0,
          lastUpdated: new Date(),
        });
      }
    } catch (err) {
      log.error({ err }, "Failed to fetch multi-price");
    }

    return priceMap;
  }

  async getTokenOverview(mint: string): Promise<TokenPrice | null> {
    if (!this.apiKey) return null;

    try {
      const res = await fetch(`${BIRDEYE_BASE_URL}/defi/token_overview?address=${mint}`, {
        headers: {
          "X-API-KEY": this.apiKey,
          "x-chain": "solana",
        },
      });

      if (!res.ok) return null;

      const data = await res.json() as any;
      if (!data.success || !data.data) return null;

      const d = data.data;
      return {
        mint,
        symbol: d.symbol || mint.slice(0, 8),
        price: d.price ?? 0,
        priceChange24h: d.priceChange24h ?? 0,
        priceChange24hPct: d.priceChange24hPercent ? d.priceChange24hPercent / 100 : 0,
        volume24h: d.v24hUSD ?? 0,
        marketCap: d.mc,
        lastUpdated: new Date(),
      };
    } catch (err) {
      log.error({ err, mint }, "Failed to fetch token overview");
      return null;
    }
  }

  async getTopGainers(limit = 10): Promise<TokenPrice[]> {
    if (!this.apiKey) return [];

    try {
      const res = await fetch(`${BIRDEYE_BASE_URL}/defi/token_trending?sort_by=price_change_24h_percent&sort_type=desc&offset=0&limit=${limit}`, {
        headers: {
          "X-API-KEY": this.apiKey,
          "x-chain": "solana",
        },
      });

      if (!res.ok) return [];

      const data = await res.json() as any;
      if (!data.success || !data.data?.tokens) return [];

      return data.data.tokens.map((t: any) => ({
        mint: t.address,
        symbol: t.symbol || t.address.slice(0, 8),
        price: t.price ?? 0,
        priceChange24h: 0,
        priceChange24hPct: t.priceChange24hPercent ? t.priceChange24hPercent / 100 : 0,
        volume24h: t.v24hUSD ?? 0,
        marketCap: t.mc,
        lastUpdated: new Date(),
      }));
    } catch (err) {
      log.error({ err }, "Failed to fetch top gainers");
      return [];
    }
  }
}
