export interface TokenBalance {
  mint: string;
  symbol: string;
  amount: number;       // raw amount in token decimals
  uiAmount: number;     // human-readable amount
  usdValue: number;
  decimals: number;
}

export interface PerpPositionState {
  market: string;       // e.g. "SOL-PERP"
  side: "long" | "short";
  size: number;         // in base token
  leverage: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  liquidationPrice: number;
  positionPublicKey: string;
}

export interface LPPosition {
  poolAddress: string;
  positionAddress: string;
  tokenA: TokenBalance;
  tokenB: TokenBalance;
  totalUsdValue: number;
  unclaimedFeeA: number;
  unclaimedFeeB: number;
  unclaimedFeeUsdValue: number;
}

export interface PortfolioState {
  timestamp: Date;
  walletAddress: string;
  solBalance: number;
  tokenBalances: TokenBalance[];
  perpPositions: PerpPositionState[];
  lpPositions: LPPosition[];
  totalWalletUsdValue: number;
  totalPerpUsdValue: number;
  totalLPUsdValue: number;
  totalPortfolioUsdValue: number;
  dailyPnl: number;
  dailyPnlPct: number;
}
