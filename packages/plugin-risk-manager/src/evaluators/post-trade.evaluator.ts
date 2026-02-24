import type { Evaluator, IAgentRuntime, Memory, State } from "@elizaos/core";
import { createLogger } from "@amg/shared";
import type { RiskService } from "../services/risk.service.js";

const log = createLogger("post-trade-evaluator");

export const postTradeEvaluator: Evaluator = {
  name: "post-trade-risk",
  description: "Evaluates trade outcomes and updates risk state",
  alwaysRun: false,

  validate: async (_runtime: IAgentRuntime, message: Memory, _state?: State) => {
    // Only run after trade actions
    const content = message.content as any;
    return content?.actions?.some((a: string) =>
      ["SPOT_SWAP", "OPEN_PERP", "CLOSE_PERP"].includes(a)
    ) ?? false;
  },

  handler: async (runtime: IAgentRuntime, message: Memory, _state?: State) => {
    const riskService = runtime.getService("risk") as RiskService | null;
    if (!riskService) return;

    const content = message.content as any;
    const pnl = content?.data?.pnl ?? 0;
    const portfolioValue = content?.data?.portfolioValue ?? 0;

    if (pnl !== 0) {
      riskService.recordTradeResult(pnl, portfolioValue);
      log.info({ pnl, portfolioValue }, "Post-trade risk evaluation complete");
    }
  },

  examples: [
    {
      prompt: "Trade executed",
      messages: [
        { name: "agent" as any, content: { text: "Executed spot swap SOL->USDC" } },
      ],
      outcome: "Risk state updated with trade P&L",
    },
  ],
};
