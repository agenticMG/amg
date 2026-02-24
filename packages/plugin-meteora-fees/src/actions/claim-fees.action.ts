import type { Action, IAgentRuntime, Memory, State, HandlerCallback, ActionResult } from "@elizaos/core";
import { createLogger } from "@amg/shared";
import type { MeteoraService } from "../services/meteora.service.js";

const log = createLogger("claim-fees-action");

export const claimFeesAction: Action = {
  name: "CLAIM_FEES",
  similes: ["CLAIM_LP_FEES", "COLLECT_FEES"],
  description: "Claim uncollected fees from Meteora DAMMv2 LP positions",

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
      const result = await service.claimAllFees();

      if (callback) {
        await callback({
          text: result.txSignature
            ? `Fees claimed. TX: ${result.txSignature}`
            : "Fee claim completed (no fees or dry run)",
        });
      }

      return {
        success: true,
        text: "Fees claimed",
        data: result,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error({ err }, "Claim fees failed");
      return { success: false, error: msg };
    }
  },
};
