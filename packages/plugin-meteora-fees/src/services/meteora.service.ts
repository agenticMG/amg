import { Service, type IAgentRuntime } from "@elizaos/core";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { CpAmm, getTokenProgram } from "@meteora-ag/cp-amm-sdk";
import bs58 from "bs58";
import { createLogger, type LPPosition, type AddLiquidityParams, withRetry } from "@amg/shared";

const log = createLogger("meteora-service");

export class MeteoraService extends Service {
  static serviceType = "meteora";
  capabilityDescription = "Meteora DAMMv2 fee claiming and LP management";

  private connection!: Connection;
  private wallet!: Keypair;
  private cpAmm!: CpAmm;
  private poolAddress?: PublicKey;
  private positionAddress?: PublicKey;
  private dryRun = true;

  static async start(runtime: IAgentRuntime): Promise<MeteoraService> {
    const service = new MeteoraService();
    const rpcUrl = runtime.getSetting("SOLANA_RPC_URL") as string || "https://api.mainnet-beta.solana.com";
    service.connection = new Connection(rpcUrl, "confirmed");
    service.cpAmm = new CpAmm(service.connection);

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
      wallet: service.wallet?.publicKey?.toBase58() || "not configured",
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
      log.info({
        pool: this.poolAddress!.toBase58(),
        position: this.positionAddress!.toBase58(),
      }, "Claiming fees via CpAmm SDK...");

      // 1. Fetch pool state for vault/mint/flag info
      const poolState = await this.cpAmm.fetchPoolState(this.poolAddress!);
      log.info({
        tokenAMint: poolState.tokenAMint.toBase58(),
        tokenBMint: poolState.tokenBMint.toBase58(),
      }, "Pool state fetched");

      // 2. Fetch position state to get the NFT mint
      const positionState = await this.cpAmm.fetchPositionState(this.positionAddress!);

      // 3. Derive the position NFT token account (Token-2022)
      const positionNftAccount = getAssociatedTokenAddressSync(
        positionState.nftMint,
        this.wallet.publicKey,
        true,
        TOKEN_2022_PROGRAM_ID,
      );

      log.info({
        nftMint: positionState.nftMint.toBase58(),
        nftAccount: positionNftAccount.toBase58(),
      }, "Position NFT resolved");

      // 4. Build the claim fee transaction
      const claimTx = await this.cpAmm.claimPositionFee({
        owner: this.wallet.publicKey,
        receiver: this.wallet.publicKey,
        pool: this.poolAddress!,
        position: this.positionAddress!,
        positionNftAccount,
        tokenAVault: poolState.tokenAVault,
        tokenBVault: poolState.tokenBVault,
        tokenAMint: poolState.tokenAMint,
        tokenBMint: poolState.tokenBMint,
        tokenAProgram: getTokenProgram(poolState.tokenAFlag),
        tokenBProgram: getTokenProgram(poolState.tokenBFlag),
      });

      // 5. Set fee payer and blockhash
      claimTx.feePayer = this.wallet.publicKey;
      claimTx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

      // 6. Send and confirm
      const txSignature = await sendAndConfirmTransaction(
        this.connection,
        claimTx,
        [this.wallet],
        { commitment: "confirmed" },
      );

      log.info({ txSignature }, "Fees claimed successfully");
      return { txSignature, tokenAAmount: 0, tokenBAmount: 0 };
    }, { label: "claim-fees", maxRetries: 2 });
  }

  async addLiquidity(params: AddLiquidityParams): Promise<{ txSignature?: string }> {
    if (this.dryRun) {
      log.info({ params }, "[DRY_RUN] Would add liquidity");
      return {};
    }

    log.info({ params }, "Adding liquidity...");
    return {};
  }

  async getPositionStatus(): Promise<LPPosition | null> {
    if (!this.poolAddress || !this.positionAddress) {
      return null;
    }

    try {
      const poolState = await this.cpAmm.fetchPoolState(this.poolAddress);
      const positionState = await this.cpAmm.fetchPositionState(this.positionAddress);

      return {
        poolAddress: this.poolAddress.toBase58(),
        positionAddress: this.positionAddress.toBase58(),
        tokenA: {
          mint: poolState.tokenAMint.toBase58(),
          symbol: "A",
          amount: 0,
          uiAmount: 0,
          usdValue: 0,
          decimals: 9,
        },
        tokenB: {
          mint: poolState.tokenBMint.toBase58(),
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

    const sig = await sendAndConfirmTransaction(
      this.connection,
      tx,
      [this.wallet],
      { commitment: "confirmed" },
    );
    log.info({ sig, to: toPubkey.toBase58(), solAmount }, "SOL transfer confirmed");
    return sig;
  }

  async stop() {
    log.info("Meteora service stopped");
  }
}
