import { ElizaOS, type Project, type ProjectAgent, type IAgentRuntime } from "@elizaos/core";
import { createLogger } from "@amg/shared";
import { amgCharacter } from "./character.js";
import { mainCycleWorker } from "./tasks/main-cycle.task.js";
import { snapshotWorker } from "@amg/plugin-portfolio-tracker";

import elizaPluginSql, { createDatabaseAdapter } from "@elizaos/plugin-sql";
import { portfolioTrackerPlugin } from "@amg/plugin-portfolio-tracker";
import { marketIntelligencePlugin } from "@amg/plugin-market-intelligence";
import { jupiterTraderPlugin } from "@amg/plugin-jupiter-trader";
import { meteoraFeesPlugin } from "@amg/plugin-meteora-fees";
import { riskManagerPlugin } from "@amg/plugin-risk-manager";

const log = createLogger("agent");

const amgAgent: ProjectAgent = {
  character: amgCharacter,
  plugins: [
    elizaPluginSql,
    portfolioTrackerPlugin,
    marketIntelligencePlugin,
    jupiterTraderPlugin,
    meteoraFeesPlugin,
    riskManagerPlugin,
  ],

  init: async (runtime: IAgentRuntime) => {
    log.info("Initializing AMG Agent...");

    runtime.registerTaskWorker(mainCycleWorker);

    const dryRun = runtime.getSetting("DRY_RUN") !== false;
    const cycleIntervalMs = Number(runtime.getSetting("CYCLE_INTERVAL_MS") || 300_000);
    log.info({ dryRun, cycleIntervalMs }, "AMG Agent is running");

    // ElizaOS v2 doesn't auto-schedule recurring task workers,
    // so we run our own autonomous loop.
    const runCycle = async () => {
      try {
        log.info("Triggering main cycle...");
        await mainCycleWorker.execute(runtime, {}, {} as any);
      } catch (err) {
        log.error({ err }, "Main cycle execution failed");
      }
      try {
        await snapshotWorker.execute(runtime, {}, {} as any);
      } catch (err) {
        log.error({ err }, "Portfolio snapshot failed");
      }
    };

    // Run first cycle after a short delay to let all services initialize
    setTimeout(async () => {
      await runCycle();
      // Then schedule recurring execution
      setInterval(runCycle, cycleIntervalMs);
      log.info({ intervalMs: cycleIntervalMs }, "Autonomous loop started");
    }, 5000);
  },
};

const project: Project = {
  agents: [amgAgent],
};

// Pre-run ElizaOS schema migrations so tables exist before agent init
async function runPreMigrations() {
  const postgresUrl = process.env.DATABASE_URL;
  if (!postgresUrl) throw new Error("DATABASE_URL is required");

  log.info("Running pre-migrations to ensure ElizaOS tables exist...");

  // Create a temporary adapter to run migrations (uses a dummy agent ID)
  const tempAdapter = createDatabaseAdapter(
    { postgresUrl },
    "00000000-0000-0000-0000-000000000000" as any,
  );

  // Run plugin-sql's schema migrations to create core tables (agents, tasks, rooms, etc.)
  await tempAdapter.runPluginMigrations(
    [{ name: elizaPluginSql.name!, schema: elizaPluginSql.schema as any }],
    { verbose: false },
  );

  // Close the temporary connection
  if (typeof (tempAdapter as any).close === "function") {
    await (tempAdapter as any).close();
  }

  log.info("Pre-migrations complete");
}

// Self-bootstrap when run directly
async function main() {
  log.info("Starting AMG...");

  try {
    // Ensure ElizaOS core tables exist before starting the agent
    await runPreMigrations();

    const elizaOS = new ElizaOS();

    await elizaOS.addAgents(
      [
        {
          character: amgAgent.character,
          plugins: amgAgent.plugins,
          init: amgAgent.init,
          settings: {
            // Pass all env vars as settings
            SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,
            SOLANA_PRIVATE_KEY: process.env.SOLANA_PRIVATE_KEY,
            SOLANA_COMMITMENT: process.env.SOLANA_COMMITMENT,
            ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
            JUPITER_API_KEY: process.env.JUPITER_API_KEY,
            JUPITER_ULTRA_URL: process.env.JUPITER_ULTRA_URL,
            BIRDEYE_API_KEY: process.env.BIRDEYE_API_KEY,
            HELIUS_API_KEY: process.env.HELIUS_API_KEY,
            HELIUS_RPC_URL: process.env.HELIUS_RPC_URL,
            METEORA_POOL_ADDRESS: process.env.METEORA_POOL_ADDRESS,
            METEORA_POSITION_ADDRESS: process.env.METEORA_POSITION_ADDRESS,
            DATABASE_URL: process.env.DATABASE_URL,
            POSTGRES_URL: process.env.DATABASE_URL,
            CYCLE_INTERVAL_MS: process.env.CYCLE_INTERVAL_MS,
            FEE_CLAIM_INTERVAL_MS: process.env.FEE_CLAIM_INTERVAL_MS,
            DRY_RUN: process.env.DRY_RUN,
            MAX_POSITION_SIZE_PCT: process.env.MAX_POSITION_SIZE_PCT,
            PERP_STOP_LOSS_PCT: process.env.PERP_STOP_LOSS_PCT,
            MAX_LEVERAGE: process.env.MAX_LEVERAGE,
            DAILY_LOSS_LIMIT_PCT: process.env.DAILY_LOSS_LIMIT_PCT,
            MIN_SOL_BALANCE: process.env.MIN_SOL_BALANCE,
            COOLDOWN_AFTER_LOSSES: process.env.COOLDOWN_AFTER_LOSSES,
            DISTRIBUTION_WALLET_PUBKEY: process.env.DISTRIBUTION_WALLET_PUBKEY,
          },
        },
      ],
      { autoStart: true }
    );

    log.info("AMG Agent is running. Press Ctrl+C to stop.");

    // Keep alive
    process.on("SIGINT", async () => {
      log.info("Shutting down...");
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      log.info("Shutting down...");
      process.exit(0);
    });

  } catch (err) {
    log.error({ err }, "Failed to start AMG");
    process.exit(1);
  }
}

main();

export default project;
