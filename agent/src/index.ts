import type { Project, ProjectAgent, IAgentRuntime } from "@elizaos/core";
import { createLogger } from "@amg/shared";
import { amgCharacter } from "./character.js";
import { mainCycleWorker } from "./tasks/main-cycle.task.js";

// Plugin imports — these will be filled in as we build each plugin
import { portfolioTrackerPlugin } from "@amg/plugin-portfolio-tracker";
import { marketIntelligencePlugin } from "@amg/plugin-market-intelligence";
import { jupiterTraderPlugin } from "@amg/plugin-jupiter-trader";
import { meteoraFeesPlugin } from "@amg/plugin-meteora-fees";
import { riskManagerPlugin } from "@amg/plugin-risk-manager";

const log = createLogger("agent");

const amgAgent: ProjectAgent = {
  character: amgCharacter,
  plugins: [
    portfolioTrackerPlugin,
    marketIntelligencePlugin,
    jupiterTraderPlugin,
    meteoraFeesPlugin,
    riskManagerPlugin,
  ],

  init: async (runtime: IAgentRuntime) => {
    log.info("Initializing AMG Agent...");

    // Register the main cycle task worker
    runtime.registerTaskWorker(mainCycleWorker);

    // Create the recurring main cycle task
    const cycleIntervalMs = Number(runtime.getSetting("CYCLE_INTERVAL_MS") || 300_000);
    const existingTasks = await runtime.getTasksByName("AMG_MAIN_CYCLE");

    if (existingTasks.length === 0) {
      await runtime.createTask({
        name: "AMG_MAIN_CYCLE",
        description: "Core autonomous trading loop — claims fees, analyzes market, makes trade decisions",
        tags: ["queue", "repeat"],
        metadata: {
          updateInterval: cycleIntervalMs,
        },
      });
      log.info({ intervalMs: cycleIntervalMs }, "Created main cycle recurring task");
    } else {
      log.info("Main cycle task already exists, skipping creation");
    }

    const dryRun = runtime.getSetting("DRY_RUN") !== "false";
    log.info({ dryRun }, "AMG Agent is running");
  },
};

const project: Project = {
  agents: [amgAgent],
};

export default project;
