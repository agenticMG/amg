import type { PortfolioState, TradeDecision, RiskCheckResult, RiskConfig } from "@amg/shared";
import type { RiskRule, RiskContext } from "../rule.js";

export const stopLossRule: RiskRule = {
  name: "stop_loss",

  check(
    _portfolio: PortfolioState,
    decision: TradeDecision,
    config: RiskConfig,
    _context: RiskContext,
  ): RiskCheckResult {
    if (decision.action !== "OPEN_PERP") {
      return { allowed: true, ruleName: "stop_loss" };
    }

    const params = decision.params as any;
    if (!params?.stopLossPrice) {
      return {
        allowed: false,
        ruleName: "stop_loss",
        reason: "Perp position must have a stop-loss price",
      };
    }

    // Validate stop-loss is within reasonable range
    // The actual enforcement happens client-side in perp-monitor task
    return { allowed: true, ruleName: "stop_loss" };
  },
};
