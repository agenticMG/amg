import type { Plugin, IAgentRuntime } from "@elizaos/core";
import { createLogger, DEFAULTS } from "@amg/shared";
import { JupiterService } from "./services/jupiter.service.js";
import { spotSwapAction } from "./actions/spot-swap.action.js";
import { openPerpAction, closePerpAction, adjustPerpAction } from "./actions/perp.actions.js";
import { perpMonitorWorker } from "./tasks/perp-monitor.task.js";

const log = createLogger("plugin-jupiter-trader");

export const jupiterTraderPlugin: Plugin = {
  name: "amg-jupiter-trader",
  description: "Jupiter spot swaps (Ultra) and perpetual positions for AMG",

  services: [JupiterService as any],

  actions: [spotSwapAction, openPerpAction, closePerpAction, adjustPerpAction],

  init: async (_config: Record<string, string>, runtime: IAgentRuntime) => {
    log.info("Initializing Jupiter trader plugin...");

    runtime.registerTaskWorker(perpMonitorWorker);

    setTimeout(async () => {
      try {
        const existingTasks = await runtime.getTasksByName("PERP_POSITION_MONITOR");
        if (existingTasks.length === 0) {
          await runtime.createTask({
            name: "PERP_POSITION_MONITOR",
            description: "Monitor open perp positions and enforce stop-losses (30s interval)",
            tags: ["queue", "repeat"],
            metadata: { updateInterval: DEFAULTS.PERP_MONITOR_INTERVAL_MS },
            worldId: runtime.agentId,
          });
          log.info("Created perp monitor recurring task (30s)");
        }
      } catch (err) {
        log.warn({ err }, "Deferred task creation failed");
      }
    }, 2000);

    log.info("Jupiter trader plugin initialized");
  },
};

export { JupiterService } from "./services/jupiter.service.js";
