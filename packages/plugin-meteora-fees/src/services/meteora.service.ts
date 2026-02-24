import { Service, type IAgentRuntime } from "@elizaos/core";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, type TransactionInstruction } from "@solana/web3.js";
import bs58 from "bs58";
import { createLogger, type LPPosition, type AddLiquidityParams, PROGRAM_IDS, withRetry } from "@amg/shared";

const log = createLogger("meteora-service");

export class MeteoraService extends Service {
  static serviceType = "meteora";
  capabilityDescription = "Meteora DAMMv2 fee claiming and LP management";

  private connection!: Connection;
  private wallet!: Keypair;
  private poolAddress?: PublicKey;
  private positionAddress?: PublicKey;
  private dryRun = true;

  static async start(runtime: IAgentRuntime): Promise<MeteoraService> {
    const service = new MeteoraService();
    const rpcUrl = runtime.getSetting("SOLANA_RPC_URL") as string || "https://api.mainnet-beta.solana.com";
    service.connection = new Connection(rpcUrl, "confirmed");

    const privateKey = runtime.getSetting("SOLANA_PRIVATE_KEY") as string;
    if (privateKey) {
      service.wallet = Keypair.fromSecretKey(bs58.decode(privateKey));
    }

    const poolAddr = runtime.getSetting("METEORA_POOL_ADDRESS") as string;
    const posAddr = runtime.getSetting("METEORA_POSITION_ADDRESS") as string;

    if (poolAddr) service.poolAddress = new PublicKey(poolAddr);
    if (posAddr) service.positionAddress = new PublicKey(posAddr);

    service.dryRun = runtime.getSetting("DRY_RUN") !== false;

    if (!poolAddr) {
      log.warn("No METEORA_POOL_ADDRESS configured, fee claiming disabled");
    }

    log.info({
      pool: poolAddr || "not configured",
      position: posAddr || "not configured",
      dryRun: service.dryRun,
    }, "Meteora service started");

    return service;
  }

  async claimAllFees(): Promise<{ txSignature?: string; tokenAAmount: number; tokenBAmount: number }> {
    if (!this.poolAddress || !this.positionAddress) {
      log.warn("Pool or position address not configured, cannot claim fees");
      return { tokenAAmount: 0, tokenBAmount: 0 };
    }

    if (this.dryRun) {
      log.info("[DRY_RUN] Would claim fees from Meteora LP position");
      return { tokenAAmount: 0, tokenBAmount: 0 };
    }

    return withRetry(async () => {
      log.info({ pool: this.poolAddress!.toBase58() }, "Claiming fees...");

      // Use the Meteora DAMM v2 program to build the claim instruction
      // The actual CpAmm SDK would be used here in production
      // For now we build the instruction manually using the program ID
      const programId = new PublicKey(PROGRAM_IDS.METEORA_DAMM_V2);

      // This is a placeholder - in production, you'd use @meteora-ag/cp-amm-sdk
      // to build the actual claim transaction
      const tx = await this.buildClaimFeesTransaction(programId);

      if (tx) {
        const txSignature = await this.connection.sendTransaction(tx, [this.wallet]);
        await this.connection.confirmTransaction(txSignature, "confirmed");
        log.info({ txSignature }, "Fees claimed successfully");
        return { txSignature, tokenAAmount: 0, tokenBAmount: 0 };
      }

      return { tokenAAmount: 0, tokenBAmount: 0 };
    }, { label: "claim-fees", maxRetries: 2 });
  }

  async addLiquidity(params: AddLiquidityParams): Promise<{ txSignature?: string }> {
    if (this.dryRun) {
      log.info({ params }, "[DRY_RUN] Would add liquidity");
      return {};
    }

    log.info({ params }, "Adding liquidity...");

    // Placeholder for actual LP add via @meteora-ag/cp-amm-sdk
    return {};
  }

  async getPositionStatus(): Promise<LPPosition | null> {
    if (!this.poolAddress || !this.positionAddress) {
      return null;
    }

    try {
      // Fetch on-chain position data
      // In production, use @meteora-ag/cp-amm-sdk to parse the position account
      const accountInfo = await this.connection.getAccountInfo(this.positionAddress);

      if (!accountInfo) {
        log.warn("LP position account not found");
        return null;
      }

      // Placeholder return — real implementation would parse the account data
      return {
        poolAddress: this.poolAddress.toBase58(),
        positionAddress: this.positionAddress.toBase58(),
        tokenA: {
          mint: "",
          symbol: "A",
          amount: 0,
          uiAmount: 0,
          usdValue: 0,
          decimals: 9,
        },
        tokenB: {
          mint: "",
          symbol: "B",
          amount: 0,
          uiAmount: 0,
          usdValue: 0,
          decimals: 6,
        },
        totalUsdValue: 0,
        unclaimedFeeA: 0,
        unclaimedFeeB: 0,
        unclaimedFeeUsdValue: 0,
      };
    } catch (err) {
      log.error({ err }, "Failed to get position status");
      return null;
    }
  }

  private async buildClaimFeesTransaction(_programId: PublicKey): Promise<any> {
    // In production, this would use @meteora-ag/cp-amm-sdk
    // CpAmmSdk.claimPositionFee()
    log.warn("Claim fees transaction builder not yet connected to CpAmm SDK");
    return null;
  }

  async getWalletSolBalance(): Promise<number> {
    const lamports = await this.connection.getBalance(this.wallet.publicKey);
    return lamports / 1e9;
  }

  async transferSol(toPubkey: PublicKey, solAmount: number): Promise<string | null> {
    if (this.dryRun) {
      log.info({ to: toPubkey.toBase58(), solAmount }, "[DRY_RUN] Would transfer SOL");
      return null;
    }

    const lamports = Math.floor(solAmount * 1e9);
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.wallet.publicKey,
        toPubkey,
        lamports,
      }),
    );

    const sig = await this.connection.sendTransaction(tx, [this.wallet]);
    await this.connection.confirmTransaction(sig, "confirmed");
    log.info({ sig, to: toPubkey.toBase58(), solAmount }, "SOL transfer confirmed");
    return sig;
  }

  async stop() {
    log.info("Meteora service stopped");
  }
}
