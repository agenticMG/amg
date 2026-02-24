import type { Provider, IAgentRuntime, Memory, State } from "@elizaos/core";
import { createLogger, formatUsd } from "@amg/shared";
import type { MeteoraService } from "../services/meteora.service.js";

const log = createLogger("lp-status-provider");

export const lpStatusProvider: Provider = {
  name: "LP_STATUS",
  description: "Current Meteora LP position status and unclaimed fees",
  dynamic: true,
  position: -40,

  get: async (runtime: IAgentRuntime, _message: Memory, _state: State) => {
    const service = runtime.getService("meteora") as MeteoraService | null;
    if (!service) {
      return { text: "LP status unavailable", values: {}, data: {} };
    }

    try {
      const position = await service.getPositionStatus();

      if (!position) {
        return {
          text: "No LP positions configured",
          values: { hasLpPosition: false },
          data: {},
        };
      }

      const text = [
        `LP Position Status:`,
        `- Pool: ${position.poolAddress.slice(0, 12)}...`,
        `- Total Value: ${formatUsd(position.totalUsdValue)}`,
        `- Unclaimed Fees: ${formatUsd(position.unclaimedFeeUsdValue)}`,
      ].join("\n");

      return {
        text,
        values: {
          hasLpPosition: true,
          lpTotalValue: position.totalUsdValue,
          unclaimedFees: position.unclaimedFeeUsdValue,
        },
        data: { position },
      };
    } catch (err) {
      log.error({ err }, "Failed to get LP status");
      return { text: "LP status error", values: {}, data: {} };
    }
  },
};
