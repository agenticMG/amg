import type { Plugin, IAgentRuntime } from "@elizaos/core";
import { createLogger } from "@amg/shared";
import { MeteoraService } from "./services/meteora.service.js";
import { DistributionService } from "./services/distribution.service.js";
import { lpStatusProvider } from "./providers/lp-status.provider.js";
import { claimFeesAction } from "./actions/claim-fees.action.js";
import { addLiquidityAction } from "./actions/add-liquidity.action.js";
import { feeMonitorWorker } from "./tasks/fee-monitor.task.js";

const log = createLogger("plugin-meteora-fees");

export const meteoraFeesPlugin: Plugin = {
  name: "amg-meteora-fees",
  description: "Meteora DAMMv2 fee claiming and LP management for AMG",

  services: [MeteoraService as any, DistributionService as any],

  providers: [lpStatusProvider],

  actions: [claimFeesAction, addLiquidityAction],

  init: async (_config: Record<string, string>, runtime: IAgentRuntime) => {
    log.info("Initializing Meteora fees plugin...");

    runtime.registerTaskWorker(feeMonitorWorker);

    setTimeout(async () => {
      try {
        const existingTasks = await runtime.getTasksByName("METEORA_FEE_MONITOR");
        if (existingTasks.length === 0) {
          await runtime.createTask({
            name: "METEORA_FEE_MONITOR",
            description: "Monitor LP fee accumulation",
            tags: ["queue", "repeat"],
            metadata: { updateInterval: 300_000 },
            worldId: runtime.agentId,
          });
          log.info("Created fee monitor recurring task");
        }
      } catch (err) {
        log.warn({ err }, "Deferred task creation failed");
      }
    }, 2000);

    log.info("Meteora fees plugin initialized");
  },
};

export { MeteoraService } from "./services/meteora.service.js";
export { DistributionService } from "./services/distribution.service.js";
