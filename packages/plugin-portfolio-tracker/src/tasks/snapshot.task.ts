import type { IAgentRuntime, TaskWorker, Task } from "@elizaos/core";
import { createLogger } from "@amg/shared";
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

      await dbService.snapshots.insert({
        timestamp: state.timestamp,
        walletAddress: state.walletAddress,
        solBalance: state.solBalance,
        tokenBalances: state.tokenBalances,
        perpPositionsValue: state.totalPerpUsdValue,
        lpPositionsValue: state.totalLPUsdValue,
        totalPortfolioValue: state.totalPortfolioUsdValue,
        dailyPnl: state.dailyPnl,
        dailyPnlPct: state.dailyPnlPct,
      });

      log.info(
        { totalValue: state.totalPortfolioUsdValue, solBalance: state.solBalance },
        "Portfolio snapshot saved"
      );
    } catch (err) {
      log.error({ err }, "Failed to take portfolio snapshot");
    }
  },
};
