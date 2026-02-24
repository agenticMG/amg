import { createLogger, type PortfolioState, type TradeDecision, type RiskAssessment, type RiskConfig } from "@amg/shared";
import type { RiskRule, RiskContext } from "./rule.js";
import { positionSizeRule } from "./rules/position-size.rule.js";
import { stopLossRule } from "./rules/stop-loss.rule.js";
import { leverageCapRule } from "./rules/leverage-cap.rule.js";
import { dailyLossLimitRule } from "./rules/daily-loss-limit.rule.js";
import { minSolBalanceRule } from "./rules/min-sol-balance.rule.js";
import { lossCooldownRule } from "./rules/loss-cooldown.rule.js";

const log = createLogger("risk-engine");

const ALL_RULES: RiskRule[] = [
  positionSizeRule,
  stopLossRule,
  leverageCapRule,
  dailyLossLimitRule,
  minSolBalanceRule,
  lossCooldownRule,
];

export class RiskEngine {
  constructor(private config: RiskConfig) {}

  assess(
    portfolio: PortfolioState,
    decision: TradeDecision,
    context: RiskContext,
  ): RiskAssessment {
    const results = ALL_RULES.map(rule => {
      try {
        return rule.check(portfolio, decision, this.config, context);
      } catch (err) {
        log.error({ err, rule: rule.name }, "Risk rule check failed");
        return {
          allowed: false,
          ruleName: rule.name as any,
          reason: `Rule check error: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    });

    const blockedBy = results
      .filter(r => !r.allowed)
      .map(r => r.ruleName);

    const allowed = blockedBy.length === 0;

    const summary = allowed
      ? "All risk checks passed"
      : `Blocked by: ${blockedBy.join(", ")}. ${results.filter(r => !r.allowed).map(r => r.reason).join("; ")}`;

    log.info({ allowed, blockedBy, action: decision.action }, "Risk assessment complete");

    return { allowed, results, blockedBy, summary };
  }

  updateConfig(config: Partial<RiskConfig>) {
    Object.assign(this.config, config);
  }
}
