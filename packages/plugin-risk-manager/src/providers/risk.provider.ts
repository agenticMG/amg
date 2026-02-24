import type { Provider, IAgentRuntime, Memory, State } from "@elizaos/core";
import { createLogger } from "@amg/shared";
import type { RiskService } from "../services/risk.service.js";

const log = createLogger("risk-provider");

export const riskStatusProvider: Provider = {
  name: "RISK_STATUS",
  description: "Current risk management status and trading eligibility",
  dynamic: true,
  position: -30,

  get: async (runtime: IAgentRuntime, _message: Memory, _state: State) => {
    const service = runtime.getService("risk") as RiskService | null;
    if (!service) {
      return {
        text: "Risk management unavailable",
        values: { riskAvailable: false },
        data: {},
      };
    }

    // Do a quick pre-check with a HOLD action to see overall status
    const portfolioService = runtime.getService("portfolio") as any;
    const portfolio = portfolioService
      ? await portfolioService.getPortfolioState()
      : null;

    if (!portfolio) {
      return {
        text: "Risk status: Portfolio data unavailable for risk check",
        values: { riskAvailable: true },
        data: {},
      };
    }

    const assessment = await service.assess(portfolio, {
      action: "HOLD",
      confidence: 1,
      reasoning: "Risk status check",
    });

    const text = [
      `Risk Status: ${assessment.allowed ? "TRADING ALLOWED" : "TRADING BLOCKED"}`,
      assessment.summary,
    ].join("\n");

    return {
      text,
      values: {
        tradingAllowed: assessment.allowed,
        riskAvailable: true,
      },
      data: { assessment },
    };
  },
};
