import { Service, type IAgentRuntime } from "@elizaos/core";
import { Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import {
  createLogger,
  type SpotSwapParams,
  type OpenPerpParams,
  type ClosePerpParams,
  type AdjustPerpParams,
  type TradeResult,
  type PerpPositionState,
} from "@amg/shared";
import { JupiterSwapService } from "./jupiter-swap.service.js";
import { JupiterPerpsService } from "./jupiter-perps.service.js";

const log = createLogger("jupiter-service");

export class JupiterService extends Service {
  static serviceType = "jupiter";
  capabilityDescription = "Jupiter spot swaps (Ultra API) and perpetual positions";

  private swapService!: JupiterSwapService;
  private perpsService!: JupiterPerpsService;

  static async start(runtime: IAgentRuntime): Promise<JupiterService> {
    const service = new JupiterService();

    const rpcUrl = runtime.getSetting("SOLANA_RPC_URL") as string || "https://api.mainnet-beta.solana.com";
    const connection = new Connection(rpcUrl, "confirmed");

    const privateKey = runtime.getSetting("SOLANA_PRIVATE_KEY") as string;
    let wallet: Keypair;

    if (privateKey) {
      wallet = Keypair.fromSecretKey(bs58.decode(privateKey));
    } else {
      wallet = Keypair.generate();
      log.warn("No SOLANA_PRIVATE_KEY, using generated keypair (trading disabled)");
    }

    const apiKey = runtime.getSetting("JUPITER_API_KEY") as string || "86a2564b-34e7-47a9-b6ba-6d99852ea252";
    const ultraUrl = runtime.getSetting("JUPITER_ULTRA_URL") as string || "https://lite.jup.ag/ultra/v1";
    const dryRun = runtime.getSetting("DRY_RUN") !== "false";

    service.swapService = new JupiterSwapService(connection, wallet, apiKey, ultraUrl, dryRun);
    service.perpsService = new JupiterPerpsService(connection, wallet, dryRun);

    log.info({
      wallet: wallet.publicKey.toBase58(),
      dryRun,
    }, "Jupiter service started");

    return service;
  }

  // Spot swap via Jupiter Ultra
  async swap(params: SpotSwapParams): Promise<TradeResult> {
    return this.swapService.swap(params);
  }

  async getQuote(inputMint: string, outputMint: string, amount: number) {
    return this.swapService.getQuote(inputMint, outputMint, amount);
  }

  // Perpetual positions
  async openPerp(params: OpenPerpParams): Promise<TradeResult> {
    return this.perpsService.openPosition(params);
  }

  async closePerp(params: ClosePerpParams): Promise<TradeResult> {
    return this.perpsService.closePosition(params);
  }

  async adjustPerp(params: AdjustPerpParams): Promise<TradeResult> {
    return this.perpsService.adjustPosition(params);
  }

  async getOpenPositions(): Promise<PerpPositionState[]> {
    return this.perpsService.getPositions();
  }

  async getPositionPnl(positionKey: string) {
    return this.perpsService.getPositionPnl(positionKey);
  }

  async stop() {
    log.info("Jupiter service stopped");
  }
}
