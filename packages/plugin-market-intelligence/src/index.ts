import type { Plugin, IAgentRuntime } from "@elizaos/core";
import { createLogger, DEFAULTS } from "@amg/shared";
import { MarketDataService } from "./services/market-data.service.js";
import { marketDataProvider, marketAnalysisProvider } from "./providers/market.provider.js";
import { priceFeedWorker } from "./tasks/price-feed.task.js";

const log = createLogger("plugin-market-intelligence");

export const marketIntelligencePlugin: Plugin = {
  name: "amg-market-intelligence",
  description: "Market data feeds and Claude-powered analysis for AMG",

  services: [MarketDataService as any],

  providers: [marketDataProvider, marketAnalysisProvider],

  init: async (_config: Record<string, string>, runtime: IAgentRuntime) => {
    log.info("Initializing market intelligence plugin...");

    runtime.registerTaskWorker(priceFeedWorker);

    const existingTasks = await runtime.getTasksByName("MARKET_PRICE_FEED");
    if (existingTasks.length === 0) {
      await runtime.createTask({
        name: "MARKET_PRICE_FEED",
        description: "Periodic price feed updates",
        tags: ["queue", "repeat"],
        metadata: {
          updateInterval: DEFAULTS.PRICE_FEED_INTERVAL_MS,
        },
      });
      log.info("Created price feed recurring task");
    }

    log.info("Market intelligence plugin initialized");
  },
};

export { MarketDataService } from "./services/market-data.service.js";
