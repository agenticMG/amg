import type { PortfolioState, TradeDecision, RiskCheckResult, RiskConfig } from "@amg/shared";
import type { RiskRule, RiskContext } from "../rule.js";

export const dailyLossLimitRule: RiskRule = {
  name: "daily_loss_limit",

  check(
    portfolio: PortfolioState,
    _decision: TradeDecision,
    config: RiskConfig,
    context: RiskContext,
  ): RiskCheckResult {
    const totalValue = portfolio.totalPortfolioUsdValue;
    if (totalValue === 0) {
      return { allowed: true, ruleName: "daily_loss_limit" };
    }

    const dailyLossPct = Math.abs(Math.min(0, context.dailyPnlPct));

    if (dailyLossPct >= config.dailyLossLimitPct) {
      return {
        allowed: false,
        ruleName: "daily_loss_limit",
        reason: `Daily loss ${(dailyLossPct * 100).toFixed(2)}% exceeds limit ${(config.dailyLossLimitPct * 100).toFixed(2)}%. Trading halted.`,
        currentValue: dailyLossPct,
        threshold: config.dailyLossLimitPct,
      };
    }

    return { allowed: true, ruleName: "daily_loss_limit" };
  },
};
