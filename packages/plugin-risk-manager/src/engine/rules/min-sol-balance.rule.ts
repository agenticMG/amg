import type { PortfolioState, TradeDecision, RiskCheckResult, RiskConfig } from "@amg/shared";
import type { RiskRule, RiskContext } from "../rule.js";

export const minSolBalanceRule: RiskRule = {
  name: "min_sol_balance",

  check(
    portfolio: PortfolioState,
    decision: TradeDecision,
    config: RiskConfig,
    _context: RiskContext,
  ): RiskCheckResult {
    if (decision.action === "HOLD") {
      return { allowed: true, ruleName: "min_sol_balance" };
    }

    if (portfolio.solBalance < config.minSolBalance) {
      return {
        allowed: false,
        ruleName: "min_sol_balance",
        reason: `SOL balance ${portfolio.solBalance.toFixed(4)} below minimum ${config.minSolBalance} SOL (needed for gas)`,
        currentValue: portfolio.solBalance,
        threshold: config.minSolBalance,
      };
    }

    return { allowed: true, ruleName: "min_sol_balance" };
  },
};
