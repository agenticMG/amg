import type { IAgentRuntime, TaskWorker, Task } from "@elizaos/core";
import { createLogger } from "@amg/shared";
import type { JupiterService } from "../services/jupiter.service.js";

const log = createLogger("perp-monitor");

export const perpMonitorWorker: TaskWorker = {
  name: "PERP_POSITION_MONITOR",

  execute: async (runtime: IAgentRuntime, _options: Record<string, unknown>, _task: Task) => {
    const jupiterService = runtime.getService("jupiter") as JupiterService | null;
    if (!jupiterService) {
      return;
    }

    const dryRun = runtime.getSetting("DRY_RUN") !== "false";
    const stopLossPct = Number(runtime.getSetting("PERP_STOP_LOSS_PCT") || 0.05);

    try {
      const positions = await jupiterService.getOpenPositions();

      if (positions.length === 0) {
        return; // Nothing to monitor
      }

      log.info({ count: positions.length }, "Monitoring perp positions...");

      // Get DB service for stop-loss prices
      const dbService = runtime.getService("amg_database") as any;

      for (const position of positions) {
        const pnlData = await jupiterService.getPositionPnl(position.positionPublicKey);
        if (!pnlData) continue;

        const { unrealizedPnl, currentPrice } = pnlData;
        const pnlPct = unrealizedPnl / (position.size * position.entryPrice);

        log.info({
          market: position.market,
          side: position.side,
          pnlPct: (pnlPct * 100).toFixed(2) + "%",
          currentPrice,
        }, "Position status");

        // Check stop-loss
        let shouldClose = false;

        // DB-tracked stop-loss price
        if (dbService) {
          const dbPosition = await dbService.perpPositions.getByPublicKey(position.positionPublicKey);
          if (dbPosition?.stopLossPrice) {
            if (position.side === "long" && currentPrice <= dbPosition.stopLossPrice) {
              shouldClose = true;
              log.warn({ market: position.market, currentPrice, stopLoss: dbPosition.stopLossPrice },
                "STOP-LOSS TRIGGERED (long, price below stop)");
            } else if (position.side === "short" && currentPrice >= dbPosition.stopLossPrice) {
              shouldClose = true;
              log.warn({ market: position.market, currentPrice, stopLoss: dbPosition.stopLossPrice },
                "STOP-LOSS TRIGGERED (short, price above stop)");
            }
          }
        }

        // Default percentage-based stop-loss
        if (!shouldClose && pnlPct <= -stopLossPct) {
          shouldClose = true;
          log.warn({ market: position.market, pnlPct: (pnlPct * 100).toFixed(2) + "%" },
            "DEFAULT STOP-LOSS TRIGGERED (% loss exceeded)");
        }

        if (shouldClose) {
          if (dryRun) {
            log.info("[DRY_RUN] Would close position due to stop-loss");
          } else {
            try {
              const result = await jupiterService.closePerp({
                positionPublicKey: position.positionPublicKey,
                market: position.market,
              });
              log.info({ txSignature: result.txSignature }, "Stop-loss position closed");

              // Update DB
              if (dbService) {
                const dbPos = await dbService.perpPositions.getByPublicKey(position.positionPublicKey);
                if (dbPos) {
                  await dbService.perpPositions.close(
                    dbPos.id,
                    currentPrice,
                    unrealizedPnl,
                    result.txSignature || "",
                  );
                }
              }
            } catch (closeErr) {
              log.error({ closeErr, market: position.market }, "Failed to close position on stop-loss");
            }
          }
        }
      }
    } catch (err) {
      log.error({ err }, "Perp monitor check failed");
    }
  },
};
