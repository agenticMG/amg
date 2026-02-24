import { Service, type IAgentRuntime } from "@elizaos/core";
import {
  createLogger,
  type PortfolioState,
  type TradeDecision,
  type RiskAssessment,
  type RiskConfig,
} from "@amg/shared";
import { RiskEngine } from "../engine/risk-engine.js";
import type { RiskContext } from "../engine/rule.js";

const log = createLogger("risk-service");

export class RiskService extends Service {
  static serviceType = "risk";
  capabilityDescription = "Risk management and trade validation";

  private engine!: RiskEngine;
  private consecutiveLosses = 0;
  private dailyPnl = 0;
  private dailyPnlPct = 0;
  private lastDayReset = 0;

  static async start(runtime: IAgentRuntime): Promise<RiskService> {
    const service = new RiskService();

    const config: RiskConfig = {
      maxPositionSizePct: Number(runtime.getSetting("MAX_POSITION_SIZE_PCT") || 0.25),
      perpStopLossPct: Number(runtime.getSetting("PERP_STOP_LOSS_PCT") || 0.05),
      maxLeverage: Number(runtime.getSetting("MAX_LEVERAGE") || 20),
      dailyLossLimitPct: Number(runtime.getSetting("DAILY_LOSS_LIMIT_PCT") || 0.10),
      minSolBalance: Number(runtime.getSetting("MIN_SOL_BALANCE") || 0.5),
      cooldownAfterLosses: Number(runtime.getSetting("COOLDOWN_AFTER_LOSSES") || 3),
    };

    service.engine = new RiskEngine(config);
    service.lastDayReset = getStartOfDay();

    // Try to load consecutive losses from DB
    try {
      const dbService = runtime.getService("amg_database") as any;
      if (dbService) {
        service.consecutiveLosses = await dbService.trades.getConsecutiveLosses();
        service.dailyPnl = await dbService.trades.getDailyPnl(new Date());
      }
    } catch {
      // DB may not be ready yet
    }

    log.info({ config }, "Risk service started");
    return service;
  }

  async assess(portfolio: PortfolioState, decision: TradeDecision): Promise<RiskAssessment> {
    // Reset daily counters at start of new day
    const today = getStartOfDay();
    if (today > this.lastDayReset) {
      this.dailyPnl = 0;
      this.dailyPnlPct = 0;
      this.lastDayReset = today;
    }

    const context: RiskContext = {
      dailyPnl: this.dailyPnl,
      dailyPnlPct: this.dailyPnlPct,
      consecutiveLosses: this.consecutiveLosses,
    };

    return this.engine.assess(portfolio, decision, context);
  }

  recordTradeResult(pnl: number, portfolioValue: number) {
    this.dailyPnl += pnl;
    this.dailyPnlPct = portfolioValue > 0 ? this.dailyPnl / portfolioValue : 0;

    if (pnl < 0) {
      this.consecutiveLosses++;
    } else {
      this.consecutiveLosses = 0;
    }

    log.info({
      dailyPnl: this.dailyPnl,
      consecutiveLosses: this.consecutiveLosses,
    }, "Trade result recorded in risk service");
  }

  async stop() {
    log.info("Risk service stopped");
  }
}

function getStartOfDay(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
