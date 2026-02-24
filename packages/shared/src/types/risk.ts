export interface RiskConfig {
  maxPositionSizePct: number;   // 0.25 = 25%
  perpStopLossPct: number;      // 0.05 = 5%
  maxLeverage: number;          // 20
  dailyLossLimitPct: number;    // 0.10 = 10%
  minSolBalance: number;        // 0.5 SOL
  cooldownAfterLosses: number;  // 3 consecutive losses
}

export type RiskRuleName =
  | "position_size"
  | "stop_loss"
  | "leverage_cap"
  | "daily_loss_limit"
  | "min_sol_balance"
  | "loss_cooldown";

export interface RiskCheckResult {
  allowed: boolean;
  ruleName: RiskRuleName;
  reason?: string;
  currentValue?: number;
  threshold?: number;
}

export interface RiskAssessment {
  allowed: boolean;
  results: RiskCheckResult[];
  blockedBy?: RiskRuleName[];
  summary: string;
}

export interface RiskEvent {
  id?: number;
  timestamp: Date;
  ruleName: RiskRuleName;
  triggered: boolean;
  details: string;
  currentValue: number;
  threshold: number;
  action: string;         // what action was blocked/flagged
}
