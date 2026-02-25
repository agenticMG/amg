import type { PortfolioState, TradeDecision, RiskCheckResult, RiskConfig } from "@amg/shared";
import type { RiskRule, RiskContext } from "../rule.js";

export const positionSizeRule: RiskRule = {
  name: "position_size",

  check(
    portfolio: PortfolioState,
    decision: TradeDecision,
    config: RiskConfig,
    _context: RiskContext,
  ): RiskCheckResult {
    if (decision.action === "HOLD") {
      return { allowed: true, ruleName: "position_size" };
    }

    const params = decision.params as any;
    if (!params) {
      return { allowed: true, ruleName: "position_size" };
    }

    const totalValue = portfolio.totalPortfolioUsdValue;
    if (totalValue === 0) {
      // Portfolio value not yet computed — allow trade, other rules (min_sol_balance) still protect
      return { allowed: true, ruleName: "position_size", reason: "Portfolio value unavailable, skipping size check" };
    }

    // Estimate trade size (rough)
    let tradeSize = 0;
    if (params.amount) tradeSize = params.amount;
    if (params.collateralAmount) tradeSize = params.collateralAmount;
    if (params.tokenAAmount && params.tokenBAmount) {
      tradeSize = params.tokenAAmount + params.tokenBAmount;
    }

    const positionPct = tradeSize / totalValue;

    if (positionPct > config.maxPositionSizePct) {
      return {
        allowed: false,
        ruleName: "position_size",
        reason: `Position size ${(positionPct * 100).toFixed(1)}% exceeds max ${(config.maxPositionSizePct * 100).toFixed(1)}%`,
        currentValue: positionPct,
        threshold: config.maxPositionSizePct,
      };
    }

    return { allowed: true, ruleName: "position_size" };
  },
};
