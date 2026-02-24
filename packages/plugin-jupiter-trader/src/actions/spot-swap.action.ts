import type { Action, IAgentRuntime, Memory, State, HandlerCallback, ActionResult } from "@elizaos/core";
import { createLogger, type SpotSwapParams } from "@amg/shared";
import type { JupiterService } from "../services/jupiter.service.js";

const log = createLogger("spot-swap-action");

export const spotSwapAction: Action = {
  name: "SPOT_SWAP",
  similes: ["SWAP_TOKEN", "BUY_TOKEN", "SELL_TOKEN"],
  description: "Execute a spot token swap via Jupiter Ultra API",

  validate: async (runtime: IAgentRuntime, _message: Memory): Promise<boolean> => {
    return runtime.getService("jupiter") !== null;
  },

  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
    options?: any,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    const service = runtime.getService("jupiter") as JupiterService;
    const params = options?.params as SpotSwapParams;

    if (!params) {
      return { success: false, error: "Missing swap parameters" };
    }

    try {
      const result = await service.swap(params);

      if (callback) {
        await callback({
          text: result.success
            ? `Swap executed. TX: ${result.txSignature || "dry-run"}`
            : `Swap failed: ${result.error}`,
        });
      }

      return {
        success: result.success,
        text: result.success ? "Swap executed" : "Swap failed",
        data: result as any,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error({ err }, "Spot swap action failed");
      return { success: false, error: msg };
    }
  },

  examples: [
    [
      { name: "{{user}}" as any, content: { text: "Swap 1 SOL for USDC" } },
      { name: "{{agent}}" as any, content: { text: "Executing swap...", actions: ["SPOT_SWAP"] } },
    ],
  ],
};
