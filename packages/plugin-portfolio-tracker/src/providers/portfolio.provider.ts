import type { Provider, IAgentRuntime, Memory, State } from "@elizaos/core";
import { createLogger, formatUsd, formatPct } from "@amg/shared";
import type { BalanceService } from "../services/balance.service.js";

const log = createLogger("portfolio-provider");

export const portfolioProvider: Provider = {
  name: "PORTFOLIO",
  description: "Current portfolio state including balances, positions, and P&L",
  dynamic: true,
  position: -100, // Run early

  get: async (runtime: IAgentRuntime, _message: Memory, _state: State) => {
    const service = runtime.getService("portfolio") as BalanceService | null;
    if (!service) {
      return { text: "Portfolio data unavailable", values: {}, data: {} };
    }

    try {
      const portfolio = await service.getPortfolioState();

      const text = [
        `Portfolio Overview:`,
        `- Wallet: ${portfolio.walletAddress}`,
        `- SOL: ${portfolio.solBalance.toFixed(4)}`,
        `- Total Value: ${formatUsd(portfolio.totalPortfolioUsdValue)}`,
        `- Daily P&L: ${formatUsd(portfolio.dailyPnl)} (${formatPct(portfolio.dailyPnlPct)})`,
        `- Tokens: ${portfolio.tokenBalances.length}`,
        `- Open Perps: ${portfolio.perpPositions.length}`,
        `- LP Positions: ${portfolio.lpPositions.length}`,
      ].join("\n");

      return {
        text,
        values: {
          solBalance: portfolio.solBalance,
          totalPortfolioValue: portfolio.totalPortfolioUsdValue,
          dailyPnl: portfolio.dailyPnl,
        },
        data: { portfolio },
      };
    } catch (err) {
      log.error({ err }, "Failed to get portfolio state");
      return { text: "Portfolio data error", values: {}, data: {} };
    }
  },
};
