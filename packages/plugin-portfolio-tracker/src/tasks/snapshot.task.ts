import type { IAgentRuntime, TaskWorker, Task } from "@elizaos/core";
import { createLogger, TOKENS } from "@amg/shared";
import type { DatabaseService } from "../services/database.service.js";
import type { BalanceService } from "../services/balance.service.js";

const log = createLogger("snapshot-task");

export const snapshotWorker: TaskWorker = {
  name: "PORTFOLIO_SNAPSHOT",

  execute: async (runtime: IAgentRuntime, _options: Record<string, unknown>, _task: Task) => {
    log.info("Taking portfolio snapshot...");

    const dbService = runtime.getService("amg_database") as DatabaseService | null;
    const portfolioService = runtime.getService("portfolio") as BalanceService | null;

    if (!dbService || !portfolioService) {
      log.warn("Database or portfolio service unavailable, skipping snapshot");
      return;
    }

    try {
      const state = await portfolioService.getPortfolioState();

      // Enrich with USD prices from market data service
      const marketService = runtime.getService("market_data") as any;
      let solPrice = 0;
      if (marketService) {
        try {
          const overview = await marketService.getMarketOverview();
          solPrice = overview.solPrice ?? 0;

          // Price known tokens
          for (const token of state.tokenBalances) {
            const tp = marketService.getTokenPrice(token.mint);
            if (tp) {
              token.usdValue = token.uiAmount * tp.price;
            }
          }
        } catch (err) {
          log.warn({ err }, "Failed to fetch market prices for snapshot");
        }
      }

      const solUsdValue = state.solBalance * solPrice;
      const tokenUsdValue = state.tokenBalances.reduce((sum, t) => sum + (t.usdValue || 0), 0);
      const totalPortfolioValue = solUsdValue + tokenUsdValue + state.totalPerpUsdValue + state.totalLPUsdValue;

      await dbService.snapshots.insert({
        timestamp: state.timestamp,
        walletAddress: state.walletAddress,
        solBalance: state.solBalance,
        tokenBalances: state.tokenBalances,
        perpPositionsValue: state.totalPerpUsdValue,
        lpPositionsValue: state.totalLPUsdValue,
        totalPortfolioValue,
        dailyPnl: state.dailyPnl,
        dailyPnlPct: state.dailyPnlPct,
      });

      log.info(
        { totalValue: totalPortfolioValue, solBalance: state.solBalance, solPrice },
        "Portfolio snapshot saved"
      );
    } catch (err) {
      log.error({ err }, "Failed to take portfolio snapshot");
    }
  },
};
