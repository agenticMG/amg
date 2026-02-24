import type { PortfolioState, TradeDecision, RiskCheckResult, RiskConfig } from "@amg/shared";
import type { RiskRule, RiskContext } from "../rule.js";

export const lossCooldownRule: RiskRule = {
  name: "loss_cooldown",

  check(
    _portfolio: PortfolioState,
    decision: TradeDecision,
    config: RiskConfig,
    context: RiskContext,
  ): RiskCheckResult {
    if (decision.action === "HOLD") {
      return { allowed: true, ruleName: "loss_cooldown" };
    }

    if (context.consecutiveLosses >= config.cooldownAfterLosses) {
      return {
        allowed: false,
        ruleName: "loss_cooldown",
        reason: `${context.consecutiveLosses} consecutive losses reached cooldown threshold of ${config.cooldownAfterLosses}`,
        currentValue: context.consecutiveLosses,
        threshold: config.cooldownAfterLosses,
      };
    }

    return { allowed: true, ruleName: "loss_cooldown" };
  },
};
