import type { IAgentRuntime, TaskWorker, Task } from "@elizaos/core";
import { createLogger } from "@amg/shared";
import type { MarketDataService } from "../services/market-data.service.js";

const log = createLogger("price-feed-task");

export const priceFeedWorker: TaskWorker = {
  name: "MARKET_PRICE_FEED",

  execute: async (runtime: IAgentRuntime, _options: Record<string, unknown>, _task: Task) => {
    const service = runtime.getService("market_data") as MarketDataService | null;
    if (!service) {
      log.warn("Market data service unavailable");
      return;
    }

    try {
      const overview = await service.getMarketOverview();
      log.info(
        { sol: overview.solPrice, btc: overview.btcPrice, eth: overview.ethPrice },
        "Price feed updated"
      );
    } catch (err) {
      log.error({ err }, "Price feed update failed");
    }
  },
};
