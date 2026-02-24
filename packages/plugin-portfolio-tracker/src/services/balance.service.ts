import { Service, type IAgentRuntime } from "@elizaos/core";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  createLogger,
  type TokenBalance,
  type PortfolioState,
  TOKENS,
  TOKEN_BY_MINT,
  DEFAULTS,
} from "@amg/shared";

const log = createLogger("balance-service");

export class BalanceService extends Service {
  static serviceType = "portfolio";
  capabilityDescription = "Tracks wallet balances and portfolio state";

  private connection!: Connection;
  private walletAddress!: string;
  private cachedState: PortfolioState | null = null;
  private lastRefresh = 0;

  static async start(runtime: IAgentRuntime): Promise<BalanceService> {
    const service = new BalanceService();
    const rpcUrl = runtime.getSetting("SOLANA_RPC_URL") as string || "https://api.mainnet-beta.solana.com";
    const commitment = (runtime.getSetting("SOLANA_COMMITMENT") as string) || "confirmed";

    service.connection = new Connection(rpcUrl, commitment as any);

    // Derive wallet address from private key
    const privateKey = runtime.getSetting("SOLANA_PRIVATE_KEY") as string;
    if (privateKey) {
      const bs58 = await import("bs58");
      const { Keypair } = await import("@solana/web3.js");
      const wallet = Keypair.fromSecretKey(bs58.default.decode(privateKey));
      service.walletAddress = wallet.publicKey.toBase58();
    } else {
      service.walletAddress = "unknown";
      log.warn("No SOLANA_PRIVATE_KEY, balance tracking disabled");
    }

    log.info({ walletAddress: service.walletAddress }, "Balance service started");
    return service;
  }

  async getPortfolioState(): Promise<PortfolioState> {
    const now = Date.now();
    if (this.cachedState && now - this.lastRefresh < DEFAULTS.MARKET_CACHE_TTL_MS) {
      return this.cachedState;
    }

    try {
      const state = await this.fetchPortfolioState();
      this.cachedState = state;
      this.lastRefresh = now;
      return state;
    } catch (err) {
      log.error({ err }, "Failed to fetch portfolio state");
      return this.cachedState ?? this.getEmptyState();
    }
  }

  private async fetchPortfolioState(): Promise<PortfolioState> {
    if (this.walletAddress === "unknown") return this.getEmptyState();

    const walletPubkey = new PublicKey(this.walletAddress);

    // Get SOL balance
    const solLamports = await this.connection.getBalance(walletPubkey);
    const solBalance = solLamports / DEFAULTS.LAMPORTS_PER_SOL;

    // Get token accounts
    const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(walletPubkey, {
      programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    });

    const tokenBalances: TokenBalance[] = [];
    for (const account of tokenAccounts.value) {
      const info = account.account.data.parsed.info;
      const mint = info.mint;
      const tokenInfo = TOKEN_BY_MINT[mint];
      const uiAmount = info.tokenAmount.uiAmount ?? 0;

      if (uiAmount > 0) {
        tokenBalances.push({
          mint,
          symbol: tokenInfo?.symbol ?? mint.slice(0, 8),
          amount: Number(info.tokenAmount.amount),
          uiAmount,
          usdValue: 0, // Will be filled by market data provider
          decimals: info.tokenAmount.decimals,
        });
      }
    }

    return {
      timestamp: new Date(),
      walletAddress: this.walletAddress,
      solBalance,
      tokenBalances,
      perpPositions: [],
      lpPositions: [],
      totalWalletUsdValue: 0,  // Calculated after price enrichment
      totalPerpUsdValue: 0,
      totalLPUsdValue: 0,
      totalPortfolioUsdValue: 0,
      dailyPnl: 0,
      dailyPnlPct: 0,
    };
  }

  private getEmptyState(): PortfolioState {
    return {
      timestamp: new Date(),
      walletAddress: this.walletAddress,
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

  async stop() {
    log.info("Balance service stopped");
  }
}
