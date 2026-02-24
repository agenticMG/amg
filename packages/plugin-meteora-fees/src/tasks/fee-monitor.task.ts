import type { IAgentRuntime, TaskWorker, Task } from "@elizaos/core";
import { createLogger } from "@amg/shared";
import type { MeteoraService } from "../services/meteora.service.js";

const log = createLogger("fee-monitor-task");

export const feeMonitorWorker: TaskWorker = {
  name: "METEORA_FEE_MONITOR",

  execute: async (runtime: IAgentRuntime, _options: Record<string, unknown>, _task: Task) => {
    const service = runtime.getService("meteora") as MeteoraService | null;
    if (!service) {
      log.warn("Meteora service unavailable");
      return;
    }

    try {
      const position = await service.getPositionStatus();
      if (position) {
        log.info({
          pool: position.poolAddress.slice(0, 12),
          totalValue: position.totalUsdValue,
          unclaimedFees: position.unclaimedFeeUsdValue,
        }, "LP position status");
      } else {
        log.debug("No LP positions to monitor");
      }
    } catch (err) {
      log.error({ err }, "Fee monitor check failed");
    }
  },
};
