import type { PortfolioState, TradeDecision, RiskCheckResult, RiskConfig } from "@amg/shared";
import type { RiskRule, RiskContext } from "../rule.js";

export const leverageCapRule: RiskRule = {
  name: "leverage_cap",

  check(
    _portfolio: PortfolioState,
    decision: TradeDecision,
    config: RiskConfig,
    _context: RiskContext,
  ): RiskCheckResult {
    if (decision.action !== "OPEN_PERP" && decision.action !== "ADJUST_PERP") {
      return { allowed: true, ruleName: "leverage_cap" };
    }

    const params = decision.params as any;
    const leverage = params?.leverage ?? params?.newLeverage;

    if (leverage && leverage > config.maxLeverage) {
      return {
        allowed: false,
        ruleName: "leverage_cap",
        reason: `Leverage ${leverage}x exceeds maximum ${config.maxLeverage}x`,
        currentValue: leverage,
        threshold: config.maxLeverage,
      };
    }

    return { allowed: true, ruleName: "leverage_cap" };
  },
};
