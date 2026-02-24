import { Service, type IAgentRuntime } from "@elizaos/core";
import Anthropic from "@anthropic-ai/sdk";
import {
  createLogger,
  type TokenPrice,
  type MarketOverview,
  type MarketAnalysis,
  TOKENS,
  DEFAULTS,
} from "@amg/shared";
import { BirdeyeClient } from "./birdeye.service.js";
import { HeliusClient } from "./helius.service.js";

const log = createLogger("market-data-service");

export class MarketDataService extends Service {
  static serviceType = "market_data";
  capabilityDescription = "Market data feeds and Claude-powered analysis";

  private birdeye!: BirdeyeClient;
  private helius!: HeliusClient;
  private anthropicApiKey!: string;

  private priceCache = new Map<string, TokenPrice>();
  private lastOverview: MarketOverview | null = null;
  private lastAnalysis: MarketAnalysis | null = null;
  private lastOverviewTime = 0;
  private lastAnalysisTime = 0;

  static async start(runtime: IAgentRuntime): Promise<MarketDataService> {
    const service = new MarketDataService();

    const birdeyeKey = runtime.getSetting("BIRDEYE_API_KEY") as string || "";
    const heliusKey = runtime.getSetting("HELIUS_API_KEY") as string || "";
    const heliusRpc = runtime.getSetting("HELIUS_RPC_URL") as string | undefined;
    service.anthropicApiKey = runtime.getSetting("ANTHROPIC_API_KEY") as string || "";

    service.birdeye = new BirdeyeClient(birdeyeKey);
    service.helius = new HeliusClient(heliusKey, heliusRpc);

    // Connect Helius WebSocket (non-blocking)
    if (heliusKey) {
      service.helius.connect().catch(err => {
        log.warn({ err }, "Helius WebSocket initial connection failed, will retry");
      });
    }

    log.info("Market data service started");
    return service;
  }

  async getMarketOverview(): Promise<MarketOverview> {
    const now = Date.now();
    if (this.lastOverview && now - this.lastOverviewTime < DEFAULTS.MARKET_CACHE_TTL_MS) {
      return this.lastOverview;
    }

    try {
      const watchMints = [TOKENS.SOL.mint, TOKENS.BTC.mint, TOKENS.ETH.mint, TOKENS.USDC.mint];
      const prices = await this.birdeye.getMultipleTokenPrices(watchMints);

      // Update cache
      for (const [mint, price] of prices) {
        this.priceCache.set(mint, price);
      }

      const topMovers = await this.birdeye.getTopGainers(10);

      const overview: MarketOverview = {
        timestamp: new Date(),
        solPrice: prices.get(TOKENS.SOL.mint)?.price ?? 0,
        btcPrice: prices.get(TOKENS.BTC.mint)?.price ?? 0,
        ethPrice: prices.get(TOKENS.ETH.mint)?.price ?? 0,
        topMovers,
        watchlist: Array.from(prices.values()),
      };

      this.lastOverview = overview;
      this.lastOverviewTime = now;
      return overview;
    } catch (err) {
      log.error({ err }, "Failed to fetch market overview");
      return this.lastOverview ?? {
        timestamp: new Date(),
        solPrice: 0,
        btcPrice: 0,
        ethPrice: 0,
        topMovers: [],
        watchlist: [],
      };
    }
  }

  async getMarketAnalysis(): Promise<MarketAnalysis> {
    const now = Date.now();
    // Cache analysis for 5 minutes
    if (this.lastAnalysis && now - this.lastAnalysisTime < 300_000) {
      return this.lastAnalysis;
    }

    if (!this.anthropicApiKey) {
      return {
        timestamp: new Date(),
        summary: "Claude API key not configured",
        sentiment: "neutral",
        keyInsights: [],
        opportunities: [],
        risks: ["Claude API key not configured"],
      };
    }

    try {
      const overview = await this.getMarketOverview();

      const prompt = `Analyze the current Solana DeFi market conditions and provide a concise analysis.

Market Data:
- SOL Price: $${overview.solPrice.toFixed(2)}
- BTC Price: $${overview.btcPrice.toFixed(2)}
- ETH Price: $${overview.ethPrice.toFixed(2)}

Top Movers (24h):
${overview.topMovers.slice(0, 5).map(t =>
  `- ${t.symbol}: $${t.price.toFixed(4)} (${(t.priceChange24hPct * 100).toFixed(2)}%) Vol: $${(t.volume24h / 1e6).toFixed(2)}M`
).join("\n")}

Respond with ONLY a valid JSON object:
{
  "summary": "1-2 sentence market summary",
  "sentiment": "very_bearish|bearish|neutral|bullish|very_bullish",
  "keyInsights": ["insight 1", "insight 2", "insight 3"],
  "opportunities": [
    {
      "token": "TOKEN_SYMBOL",
      "mint": "token_mint_address",
      "action": "buy|sell|long|short|provide_liquidity",
      "reasoning": "why this opportunity",
      "confidence": 0.0-1.0,
      "timeframe": "short|medium|long"
    }
  ],
  "risks": ["risk 1", "risk 2"]
}`;

      const anthropic = new Anthropic({ apiKey: this.anthropicApiKey });
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      let cleaned = text.trim();
      if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
      else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
      if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);

      const parsed = JSON.parse(cleaned.trim());

      const analysis: MarketAnalysis = {
        timestamp: new Date(),
        summary: parsed.summary,
        sentiment: parsed.sentiment,
        keyInsights: parsed.keyInsights ?? [],
        opportunities: parsed.opportunities ?? [],
        risks: parsed.risks ?? [],
      };

      this.lastAnalysis = analysis;
      this.lastAnalysisTime = now;
      return analysis;
    } catch (err) {
      log.error({ err }, "Failed to generate market analysis");
      return this.lastAnalysis ?? {
        timestamp: new Date(),
        summary: "Analysis unavailable",
        sentiment: "neutral",
        keyInsights: [],
        opportunities: [],
        risks: ["Analysis generation failed"],
      };
    }
  }

  getTokenPrice(mint: string): TokenPrice | undefined {
    return this.priceCache.get(mint);
  }

  async stop() {
    await this.helius.disconnect();
    log.info("Market data service stopped");
  }
}
