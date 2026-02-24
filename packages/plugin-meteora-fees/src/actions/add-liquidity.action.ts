import type { Action, IAgentRuntime, Memory, State, HandlerCallback, ActionResult } from "@elizaos/core";
import { createLogger } from "@amg/shared";
import type { MeteoraService } from "../services/meteora.service.js";

const log = createLogger("add-liquidity-action");

export const addLiquidityAction: Action = {
  name: "ADD_LIQUIDITY",
  similes: ["PROVIDE_LIQUIDITY", "LP_DEPOSIT"],
  description: "Add liquidity to a Meteora DAMMv2 pool",

  validate: async (runtime: IAgentRuntime, _message: Memory): Promise<boolean> => {
    const service = runtime.getService("meteora") as MeteoraService | null;
    return service !== null;
  },

  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
    _options?: any,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    const service = runtime.getService("meteora") as MeteoraService;

    try {
      const result = await service.addLiquidity({
        poolAddress: "",  // Will be set from decision params
        tokenAAmount: 0,
        tokenBAmount: 0,
      });

      if (callback) {
        await callback({
          text: result.txSignature
            ? `Liquidity added. TX: ${result.txSignature}`
            : "Liquidity add completed (dry run or no-op)",
        });
      }

      return {
        success: true,
        text: "Liquidity added",
        data: result,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error({ err }, "Add liquidity failed");
      return { success: false, error: msg };
    }
  },
};
