import { Service, type IAgentRuntime } from "@elizaos/core";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import { createLogger } from "@amg/shared";

const log = createLogger("distribution-service");

// Well-known SPL Token program ID
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

const TRANSFERS_PER_TX = 18;
const BATCH_DELAY_MS = 500;
const DUST_THRESHOLD_SOL = 0.001;

export interface TokenHolder {
  wallet: string;
  balance: number;
}

export interface HolderShare {
  wallet: string;
  balance: number;
  sharePct: number;
  solAmount: number;
}

export interface DistributionResult {
  totalDistributed: number;
  totalRecipients: number;
  balanceBefore: number;
  balanceAfter: number;
  txSignatures: string[];
  recipients: { wallet: string; solAmount: number; txSignature: string | null; success: boolean }[];
}

export class DistributionService extends Service {
  static serviceType = "distribution";
  capabilityDescription = "Distributes SOL from distribution wallet to AMG token holders";

  private connection!: Connection;
  private distroKeypair!: Keypair | null;
  private amgTokenMint!: string | null;
  private solReserve = 0.5;
  private blacklist = new Set<string>();
  private dryRun = true;

  static async start(runtime: IAgentRuntime): Promise<DistributionService> {
    const service = new DistributionService();
    const rpcUrl = runtime.getSetting("SOLANA_RPC_URL") as string || "https://api.mainnet-beta.solana.com";
    service.connection = new Connection(rpcUrl, "confirmed");

    const distroPrivKey = runtime.getSetting("DISTRIBUTION_WALLET_PRIVATE_KEY") as string;
    if (distroPrivKey) {
      service.distroKeypair = Keypair.fromSecretKey(bs58.decode(distroPrivKey));
      log.info({ wallet: service.distroKeypair.publicKey.toBase58() }, "Distribution wallet loaded");
    } else {
      service.distroKeypair = null;
      log.warn("No DISTRIBUTION_WALLET_PRIVATE_KEY configured, distribution disabled");
    }

    service.amgTokenMint = runtime.getSetting("AMG_TOKEN_MINT") as string || null;
    service.solReserve = Number(runtime.getSetting("DISTRIBUTION_SOL_RESERVE") || "0.5");
    service.dryRun = runtime.getSetting("DRY_RUN") !== false;

    const blacklistStr = runtime.getSetting("DISTRIBUTION_BLACKLIST") as string || "";
    service.blacklist = new Set(blacklistStr.split(",").map(s => s.trim()).filter(Boolean));

    log.info({
      mint: service.amgTokenMint || "not configured",
      reserve: service.solReserve,
      dryRun: service.dryRun,
    }, "Distribution service started");

    return service;
  }

  isConfigured(): boolean {
    return !!this.distroKeypair && !!this.amgTokenMint;
  }

  async getDistroBalance(): Promise<number> {
    if (!this.distroKeypair) return 0;
    const lamports = await this.connection.getBalance(this.distroKeypair.publicKey);
    return lamports / 1e9;
  }

  async runDistribution(): Promise<DistributionResult | null> {
    if (!this.distroKeypair || !this.amgTokenMint) {
      log.warn("Distribution not configured, skipping");
      return null;
    }

    // 1. Check balance
    const balanceBefore = await this.getDistroBalance();
    const distributable = balanceBefore - this.solReserve;

    if (distributable <= 0) {
      log.info({ balanceBefore, reserve: this.solReserve }, "Balance below reserve, nothing to distribute");
      return null;
    }

    log.info({ balanceBefore, distributable, reserve: this.solReserve }, "Starting distribution");

    // 2. Get token holders
    const holders = await this.getTokenHolders();
    if (holders.length === 0) {
      log.warn("No eligible token holders found");
      return null;
    }
    log.info({ holders: holders.length }, "Token holders fetched");

    // 3. Calculate shares
    const shares = this.calculateShares(holders, distributable);
    if (shares.length === 0) {
      log.info("All shares below dust threshold");
      return null;
    }
    log.info({ recipients: shares.length, distributable }, "Shares calculated");

    // 4. Execute transfers
    const recipients: DistributionResult["recipients"] = [];
    const txSignatures = new Set<string>();
    const batches: HolderShare[][] = [];

    for (let i = 0; i < shares.length; i += TRANSFERS_PER_TX) {
      batches.push(shares.slice(i, i + TRANSFERS_PER_TX));
    }

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      if (this.dryRun) {
        for (const r of batch) {
          log.info({ to: r.wallet, sol: r.solAmount }, "[DRY_RUN] Would send SOL");
          recipients.push({ wallet: r.wallet, solAmount: r.solAmount, txSignature: null, success: true });
        }
        continue;
      }

      try {
        const tx = new Transaction();
        for (const r of batch) {
          tx.add(
            SystemProgram.transfer({
              fromPubkey: this.distroKeypair!.publicKey,
              toPubkey: new PublicKey(r.wallet),
              lamports: Math.floor(r.solAmount * 1e9),
            }),
          );
        }

        const sig = await this.connection.sendTransaction(tx, [this.distroKeypair!]);
        await this.connection.confirmTransaction(sig, "confirmed");
        txSignatures.add(sig);

        for (const r of batch) {
          recipients.push({ wallet: r.wallet, solAmount: r.solAmount, txSignature: sig, success: true });
        }
        log.info({ batch: i + 1, total: batches.length, sig }, "Batch confirmed");
      } catch (err: any) {
        log.error({ err: err.message, batch: i + 1 }, "Batch failed");
        for (const r of batch) {
          recipients.push({ wallet: r.wallet, solAmount: r.solAmount, txSignature: null, success: false });
        }
      }

      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    const balanceAfter = await this.getDistroBalance();
    const result: DistributionResult = {
      totalDistributed: recipients.filter(r => r.success).reduce((sum, r) => sum + r.solAmount, 0),
      totalRecipients: recipients.filter(r => r.success).length,
      balanceBefore,
      balanceAfter,
      txSignatures: [...txSignatures],
      recipients,
    };

    log.info({
      distributed: result.totalDistributed,
      recipients: result.totalRecipients,
      txCount: result.txSignatures.length,
    }, "Distribution complete");

    return result;
  }

  private async getTokenHolders(): Promise<TokenHolder[]> {
    const mint = new PublicKey(this.amgTokenMint!);
    const accounts = await this.connection.getParsedProgramAccounts(TOKEN_PROGRAM_ID, {
      filters: [
        { dataSize: 165 },
        { memcmp: { offset: 0, bytes: mint.toBase58() } },
      ],
    });

    const holders: TokenHolder[] = [];

    for (const account of accounts) {
      const parsed = (account.account.data as any)?.parsed?.info;
      if (!parsed) continue;

      const owner = parsed.owner as string;
      const amount = Number(parsed.tokenAmount?.uiAmount ?? 0);

      if (amount <= 0) continue;
      if (this.blacklist.has(owner)) continue;

      try {
        const pk = new PublicKey(owner);
        if (!PublicKey.isOnCurve(pk.toBytes())) continue;
      } catch {
        continue;
      }

      holders.push({ wallet: owner, balance: amount });
    }

    return holders;
  }

  private calculateShares(holders: TokenHolder[], distributable: number): HolderShare[] {
    const totalBalance = holders.reduce((sum, h) => sum + h.balance, 0);
    if (totalBalance <= 0) return [];

    return holders
      .map(h => {
        const sharePct = h.balance / totalBalance;
        return {
          wallet: h.wallet,
          balance: h.balance,
          sharePct,
          solAmount: distributable * sharePct,
        };
      })
      .filter(h => h.solAmount >= DUST_THRESHOLD_SOL);
  }

  async stop() {
    log.info("Distribution service stopped");
  }
}
