import type { Plugin, IAgentRuntime } from "@elizaos/core";
import { createLogger, DEFAULTS } from "@amg/shared";
import { DatabaseService } from "./services/database.service.js";
import { BalanceService } from "./services/balance.service.js";
import { portfolioProvider } from "./providers/portfolio.provider.js";
import { snapshotWorker } from "./tasks/snapshot.task.js";

const log = createLogger("plugin-portfolio-tracker");

export const portfolioTrackerPlugin: Plugin = {
  name: "amg-portfolio-tracker",
  description: "Portfolio tracking, database, and balance monitoring for AMG",

  services: [DatabaseService as any, BalanceService as any],

  providers: [portfolioProvider],

  init: async (_config: Record<string, string>, runtime: IAgentRuntime) => {
    log.info("Initializing portfolio tracker plugin...");

    // Register snapshot task worker
    runtime.registerTaskWorker(snapshotWorker);

    // Create recurring snapshot task
    const existingTasks = await runtime.getTasksByName("PORTFOLIO_SNAPSHOT");
    if (existingTasks.length === 0) {
      await runtime.createTask({
        name: "PORTFOLIO_SNAPSHOT",
        description: "Take periodic portfolio snapshots",
        tags: ["queue", "repeat"],
        metadata: {
          updateInterval: DEFAULTS.SNAPSHOT_INTERVAL_MS,
        },
      });
      log.info("Created portfolio snapshot recurring task");
    }

    log.info("Portfolio tracker plugin initialized");
  },
};

// Re-export for external use
export { DatabaseService } from "./services/database.service.js";
export { BalanceService } from "./services/balance.service.js";
export * from "./schema.js";
export * from "./repositories/index.js";
