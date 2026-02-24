import type { PortfolioState, TradeDecision, RiskCheckResult, RiskConfig } from "@amg/shared";

export interface RiskRule {
  name: string;
  check(
    portfolio: PortfolioState,
    decision: TradeDecision,
    config: RiskConfig,
    context: RiskContext,
  ): RiskCheckResult;
}

export interface RiskContext {
  dailyPnl: number;
  dailyPnlPct: number;
  consecutiveLosses: number;
}
