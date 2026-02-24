import type { Action, IAgentRuntime, Memory, State, HandlerCallback, ActionResult } from "@elizaos/core";
import { createLogger, type OpenPerpParams, type ClosePerpParams, type AdjustPerpParams } from "@amg/shared";
import type { JupiterService } from "../services/jupiter.service.js";

const log = createLogger("perp-actions");

export const openPerpAction: Action = {
  name: "OPEN_PERP",
  similes: ["OPEN_PERPETUAL", "LONG_PERP", "SHORT_PERP"],
  description: "Open a perpetual futures position on Jupiter Perps",

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
    const params = options?.params as OpenPerpParams;

    if (!params) {
      return { success: false, error: "Missing perp open parameters" };
    }

    try {
      const result = await service.openPerp(params);

      if (callback) {
        await callback({
          text: result.success
            ? `${params.side.toUpperCase()} ${params.market} ${params.leverage}x opened. TX: ${result.txSignature || "dry-run"}`
            : `Failed to open position: ${result.error}`,
        });
      }

      return {
        success: result.success,
        text: result.success ? "Position opened" : "Failed to open position",
        data: result as any,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error({ err }, "Open perp failed");
      return { success: false, error: msg };
    }
  },
};

export const closePerpAction: Action = {
  name: "CLOSE_PERP",
  similes: ["CLOSE_PERPETUAL", "CLOSE_POSITION"],
  description: "Close a perpetual futures position",

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
    const params = options?.params as ClosePerpParams;

    if (!params) {
      return { success: false, error: "Missing perp close parameters" };
    }

    try {
      const result = await service.closePerp(params);

      if (callback) {
        await callback({
          text: result.success
            ? `Position closed. TX: ${result.txSignature || "dry-run"}`
            : `Failed to close: ${result.error}`,
        });
      }

      return {
        success: result.success,
        text: result.success ? "Position closed" : "Failed to close",
        data: result as any,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error({ err }, "Close perp failed");
      return { success: false, error: msg };
    }
  },
};

export const adjustPerpAction: Action = {
  name: "ADJUST_PERP",
  similes: ["MODIFY_PERP", "UPDATE_STOP_LOSS"],
  description: "Adjust a perpetual position (size, leverage, or stop-loss)",

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
    const params = options?.params as AdjustPerpParams;

    if (!params) {
      return { success: false, error: "Missing perp adjust parameters" };
    }

    try {
      const result = await service.adjustPerp(params);

      if (callback) {
        await callback({
          text: result.success ? "Position adjusted" : `Failed to adjust: ${result.error}`,
        });
      }

      return {
        success: result.success,
        data: result as any,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error({ err }, "Adjust perp failed");
      return { success: false, error: msg };
    }
  },
};
