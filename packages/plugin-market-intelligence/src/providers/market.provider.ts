import type { Provider, IAgentRuntime, Memory, State } from "@elizaos/core";
import { createLogger } from "@amg/shared";
import type { MarketDataService } from "../services/market-data.service.js";

const log = createLogger("market-provider");

export const marketDataProvider: Provider = {
  name: "MARKET_DATA",
  description: "Current market prices, trends, and volumes",
  dynamic: true,
  position: -80,

  get: async (runtime: IAgentRuntime, _message: Memory, _state: State) => {
    const service = runtime.getService("market_data") as MarketDataService | null;
    if (!service) {
      return { text: "Market data unavailable", values: {}, data: {} };
    }

    try {
      const overview = await service.getMarketOverview();

      const text = [
        `Market Overview:`,
        `- SOL: $${overview.solPrice.toFixed(2)}`,
        `- BTC: $${overview.btcPrice.toFixed(2)}`,
        `- ETH: $${overview.ethPrice.toFixed(2)}`,
        `Top movers: ${overview.topMovers.slice(0, 3).map(t =>
          `${t.symbol} (${(t.priceChange24hPct * 100).toFixed(1)}%)`
        ).join(", ")}`,
      ].join("\n");

      return {
        text,
        values: {
          solPrice: overview.solPrice,
          btcPrice: overview.btcPrice,
          ethPrice: overview.ethPrice,
        },
        data: { overview },
      };
    } catch (err) {
      log.error({ err }, "Failed to get market data");
      return { text: "Market data error", values: {}, data: {} };
    }
  },
};

export const marketAnalysisProvider: Provider = {
  name: "MARKET_ANALYSIS",
  description: "Claude-powered market analysis and opportunities",
  dynamic: true,
  position: -60,

  get: async (runtime: IAgentRuntime, _message: Memory, _state: State) => {
    const service = runtime.getService("market_data") as MarketDataService | null;
    if (!service) {
      return { text: "Market analysis unavailable", values: {}, data: {} };
    }

    try {
      const analysis = await service.getMarketAnalysis();

      const text = [
        `Market Analysis:`,
        `- Sentiment: ${analysis.sentiment}`,
        `- Summary: ${analysis.summary}`,
        `- Opportunities: ${analysis.opportunities.length}`,
        `- Risks: ${analysis.risks.length}`,
      ].join("\n");

      return {
        text,
        values: {
          sentiment: analysis.sentiment,
          opportunityCount: analysis.opportunities.length,
        },
        data: { analysis },
      };
    } catch (err) {
      log.error({ err }, "Failed to get market analysis");
      return { text: "Market analysis error", values: {}, data: {} };
    }
  },
};
