import type { Plugin } from "@elizaos/core";
import { createLogger } from "@amg/shared";
import { RiskService } from "./services/risk.service.js";
import { riskStatusProvider } from "./providers/risk.provider.js";
import { postTradeEvaluator } from "./evaluators/post-trade.evaluator.js";

const log = createLogger("plugin-risk-manager");

export const riskManagerPlugin: Plugin = {
  name: "amg-risk-manager",
  description: "Risk management and trade validation for AMG",

  services: [RiskService as any],

  providers: [riskStatusProvider],

  evaluators: [postTradeEvaluator],

  init: async () => {
    log.info("Risk manager plugin initialized");
  },
};

export { RiskService } from "./services/risk.service.js";
export { RiskEngine } from "./engine/risk-engine.js";
