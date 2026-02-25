import type { IAgentRuntime, TaskWorker, Task } from "@elizaos/core";
import { createLogger, type TradeDecision, type PortfolioState, type MarketOverview, type MarketAnalysis, type RiskAssessment, type TradeAction } from "@amg/shared";
import { buildDecisionPrompt, parseDecisionResponse } from "../prompts/decision.prompt.js";
import { PublicKey } from "@solana/web3.js";
import Anthropic from "@anthropic-ai/sdk";

const log = createLogger("main-cycle");

// Service type constants for our custom services
const SVC = {
  PORTFOLIO: "portfolio",
  MARKET_DATA: "market_data",
  RISK: "risk",
  JUPITER: "jupiter",
  METEORA: "meteora",
  DISTRIBUTION: "distribution",
  DATABASE: "amg_database",
} as const;

let lastFeeClaimTime = 0;

export const mainCycleWorker: TaskWorker = {
  name: "AMG_MAIN_CYCLE",

  execute: async (runtime: IAgentRuntime, options: Record<string, unknown>, task: Task) => {
    const startTime = Date.now();
    log.info("=== AMG Main Cycle Starting ===");

    const dryRun = runtime.getSetting("DRY_RUN") !== false;
    if (dryRun) log.info("[DRY_RUN] Running in dry-run mode");

    try {
      // Step 1: Check fee claiming
      const feeClaimIntervalMs = Number(runtime.getSetting("FEE_CLAIM_INTERVAL_MS") || 3_600_000);
      const now = Date.now();

      if (now - lastFeeClaimTime >= feeClaimIntervalMs) {
        log.info("Step 1: Claiming Meteora LP fees...");
        try {
          const meteoraService = runtime.getService(SVC.METEORA) as any;
          if (meteoraService) {
            // Snapshot SOL balance before claim
            const solBefore = await meteoraService.getWalletSolBalance();

            let claimResult: { txSignature?: string; tokenAAmount: number; tokenBAmount: number } | null = null;
            if (dryRun) {
              log.info("[DRY_RUN] Would claim fees from Meteora LP positions");
            } else {
              claimResult = await meteoraService.claimAllFees();
            }
            lastFeeClaimTime = now;

            // Record fee claim in DB
            if (claimResult?.txSignature) {
              const dbSvc = runtime.getService(SVC.DATABASE) as any;
              if (dbSvc?.feeClaims) {
                try {
                  const poolAddr = runtime.getSetting("METEORA_POOL_ADDRESS") as string || "";
                  const posAddr = runtime.getSetting("METEORA_POSITION_ADDRESS") as string || "";
                  await dbSvc.feeClaims.insert({
                    poolAddress: poolAddr,
                    positionAddress: posAddr,
                    tokenAMint: "",
                    tokenBMint: "",
                    tokenAAmount: claimResult.tokenAAmount,
                    tokenBAmount: claimResult.tokenBAmount,
                    totalUsdValue: 0,
                    txSignature: claimResult.txSignature,
                    dryRun: false,
                  });
                  log.info({ tx: claimResult.txSignature }, "Fee claim recorded in DB");
                } catch (dbErr) {
                  log.error({ err: dbErr }, "Failed to record fee claim in DB");
                }
              }
            }

            // Transfer 50% of claimed SOL to distribution wallet
            const distroWalletPubkey = runtime.getSetting("DISTRIBUTION_WALLET_PUBKEY") as string;
            if (distroWalletPubkey && !dryRun) {
              const solAfter = await meteoraService.getWalletSolBalance();
              const delta = solAfter - solBefore;
              if (delta > 0.001) {
                const halfDelta = delta / 2;
                log.info({ delta, halfDelta }, "Transferring 50% of claimed SOL to distribution wallet");
                const sig = await meteoraService.transferSol(new PublicKey(distroWalletPubkey), halfDelta);
                log.info({ sig, amount: halfDelta }, "Distribution wallet transfer complete");
              } else {
                log.info({ delta }, "Claimed SOL delta too small, skipping distribution transfer");
              }
            } else if (distroWalletPubkey && dryRun) {
              log.info("[DRY_RUN] Would transfer 50% of claimed SOL to distribution wallet");
            }
          } else {
            log.warn("Meteora service not available, skipping fee claim");
          }
        } catch (err) {
          log.error({ err }, "Fee claiming failed, continuing cycle");
        }

        // Step 1b: Run distribution to AMG holders
        log.info("Step 1b: Running distribution to token holders...");
        try {
          const distributionService = runtime.getService(SVC.DISTRIBUTION) as any;
          const dbService = runtime.getService(SVC.DATABASE) as any;
          if (distributionService?.isConfigured()) {
            const result = await distributionService.runDistribution();
            if (result && dbService) {
              // Record distribution in DB
              try {
                const [distRecord] = await dbService.distributions.insert({
                  totalSolDistributed: result.totalDistributed,
                  totalRecipients: result.totalRecipients,
                  distroBalanceBefore: result.balanceBefore,
                  distroBalanceAfter: result.balanceAfter,
                  status: result.recipients.some((r: any) => !r.success) ? "failed" : "completed",
                  txSignatures: result.txSignatures,
                  error: result.recipients.some((r: any) => !r.success) ? `${result.recipients.filter((r: any) => !r.success).length} failed` : null,
                });
                // Record recipients
                const recipientRows = result.recipients.map((r: any) => ({
                  distributionId: distRecord.id,
                  recipientWallet: r.wallet,
                  tokenBalance: 0,
                  tokenSharePct: 0,
                  solAmount: r.solAmount,
                  txSignature: r.txSignature,
                  status: r.success ? "sent" : "failed",
                }));
                if (recipientRows.length > 0) {
                  await dbService.distributionRecipients.insertMany(recipientRows);
                }
                log.info({ id: distRecord.id, recipients: result.totalRecipients, sol: result.totalDistributed }, "Distribution recorded");
              } catch (dbErr) {
                log.error({ err: dbErr }, "Failed to record distribution in DB");
              }
            } else if (!result) {
              log.info("No distribution needed (balance below reserve or no holders)");
            }
          } else {
            log.info("Distribution service not configured, skipping");
          }
        } catch (err) {
          log.error({ err }, "Distribution failed, continuing cycle");
        }
      } else {
        log.info("Step 1: Fee claim not due yet, skipping");
      }

      // Step 2: Compose state from all providers
      log.info("Step 2: Composing state from providers...");
      const portfolioService = runtime.getService(SVC.PORTFOLIO) as any;
      const marketService = runtime.getService(SVC.MARKET_DATA) as any;
      const riskService = runtime.getService(SVC.RISK) as any;
      const dbService = runtime.getService(SVC.DATABASE) as any;

      const portfolio: PortfolioState = portfolioService
        ? await portfolioService.getPortfolioState()
        : getDefaultPortfolioState();

      const market: MarketOverview = marketService
        ? await marketService.getMarketOverview()
        : getDefaultMarketOverview();

      const analysis: MarketAnalysis = marketService
        ? await marketService.getMarketAnalysis()
        : getDefaultMarketAnalysis();

      // Step 3: Risk gate
      log.info("Step 3: Running risk assessment...");
      const risk: RiskAssessment = riskService
        ? await riskService.assess(portfolio, { action: "HOLD" } as TradeDecision)
        : { allowed: true, results: [], summary: "Risk service unavailable, proceeding with caution" };

      if (!risk.allowed) {
        log.warn({ blockedBy: risk.blockedBy }, "Risk gate BLOCKED trading");
        await recordDecision(dbService, "HOLD", 0, `Risk blocked: ${risk.summary}`, false, null, dryRun);
        return;
      }

      // Step 4: Claude decision
      log.info("Step 4: Requesting Claude decision...");
      const recentDecisions = dbService
        ? await dbService.getRecentDecisions(5)
        : [];

      const prompt = buildDecisionPrompt({
        portfolio,
        market,
        analysis,
        risk,
        recentDecisions,
      });

      const anthropicApiKey = runtime.getSetting("ANTHROPIC_API_KEY") as string;
      if (!anthropicApiKey) {
        log.error("ANTHROPIC_API_KEY not configured");
        return;
      }

      const anthropic = new Anthropic({ apiKey: anthropicApiKey });
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });

      const responseText = response.content[0].type === "text" ? response.content[0].text : "";
      const decision = parseDecisionResponse(responseText);

      log.info({ action: decision.action, confidence: decision.confidence }, "Claude decision received");

      // Step 5: Validate decision through risk rules
      log.info("Step 5: Validating decision...");
      if (riskService && decision.action !== "HOLD") {
        const validation = await riskService.assess(portfolio, decision);
        if (!validation.allowed) {
          log.warn({ blockedBy: validation.blockedBy }, "Decision blocked by risk rules");
          await recordDecision(dbService, decision.action, decision.confidence,
            `Blocked by risk: ${validation.summary}. Original reasoning: ${decision.reasoning}`,
            false, null, dryRun);
          return;
        }
      }

      // Step 6: Execute
      log.info({ action: decision.action }, "Step 6: Executing decision...");
      let txSignature: string | null = null;

      if (decision.action === "HOLD") {
        log.info("Holding — no action taken");
      } else if (dryRun) {
        log.info({ action: decision.action, params: decision.params }, "[DRY_RUN] Would execute trade");
      } else {
        txSignature = await executeDecision(runtime, decision);
      }

      // Step 7: Log
      log.info("Step 7: Logging decision...");
      await recordDecision(
        dbService,
        decision.action,
        decision.confidence,
        decision.reasoning,
        true,
        txSignature,
        dryRun,
      );

      const elapsed = Date.now() - startTime;
      log.info({ elapsed, action: decision.action }, "=== AMG Main Cycle Complete ===");

    } catch (err) {
      log.error({ err }, "Main cycle failed");
    }
  },
};

async function executeDecision(runtime: IAgentRuntime, decision: TradeDecision): Promise<string | null> {
  const jupiterService = runtime.getService(SVC.JUPITER) as any;
  const meteoraService = runtime.getService(SVC.METEORA) as any;

  switch (decision.action) {
    case "SPOT_SWAP": {
      if (!jupiterService) throw new Error("Jupiter service not available");
      const result = await jupiterService.swap(decision.params);
      return result.txSignature ?? null;
    }
    case "OPEN_PERP": {
      if (!jupiterService) throw new Error("Jupiter service not available");
      const result = await jupiterService.openPerp(decision.params);
      return result.txSignature ?? null;
    }
    case "CLOSE_PERP": {
      if (!jupiterService) throw new Error("Jupiter service not available");
      const result = await jupiterService.closePerp(decision.params);
      return result.txSignature ?? null;
    }
    case "ADJUST_PERP": {
      if (!jupiterService) throw new Error("Jupiter service not available");
      const result = await jupiterService.adjustPerp(decision.params);
      return result.txSignature ?? null;
    }
    case "ADD_LIQUIDITY": {
      if (!meteoraService) throw new Error("Meteora service not available");
      const result = await meteoraService.addLiquidity(decision.params);
      return result.txSignature ?? null;
    }
    default:
      return null;
  }
}

async function recordDecision(
  dbService: any,
  action: TradeAction,
  confidence: number,
  reasoning: string,
  success: boolean,
  txSignature: string | null,
  dryRun: boolean,
): Promise<void> {
  if (!dbService) {
    log.warn("DB service not available, skipping decision recording");
    return;
  }
  try {
    await dbService.recordDecision({
      timestamp: new Date(),
      action,
      confidence,
      reasoning,
      success,
      txSignature,
      dryRun,
    });
  } catch (err) {
    log.error({ err }, "Failed to record decision");
  }
}

function getDefaultPortfolioState(): PortfolioState {
  return {
    timestamp: new Date(),
    walletAddress: "unknown",
    solBalance: 0,
    tokenBalances: [],
    perpPositions: [],
    lpPositions: [],
    totalWalletUsdValue: 0,
    totalPerpUsdValue: 0,
    totalLPUsdValue: 0,
    totalPortfolioUsdValue: 0,
    dailyPnl: 0,
    dailyPnlPct: 0,
  };
}

function getDefaultMarketOverview(): MarketOverview {
  return {
    timestamp: new Date(),
    solPrice: 0,
    btcPrice: 0,
    ethPrice: 0,
    topMovers: [],
    watchlist: [],
  };
}

function getDefaultMarketAnalysis(): MarketAnalysis {
  return {
    timestamp: new Date(),
    summary: "Market data unavailable",
    sentiment: "neutral",
    keyInsights: [],
    opportunities: [],
    risks: ["Market data service unavailable"],
  };
}
