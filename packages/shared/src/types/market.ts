export interface TokenPrice {
  mint: string;
  symbol: string;
  price: number;
  priceChange24h: number;
  priceChange24hPct: number;
  volume24h: number;
  marketCap?: number;
  lastUpdated: Date;
}

export interface MarketOverview {
  timestamp: Date;
  solPrice: number;
  btcPrice: number;
  ethPrice: number;
  topMovers: TokenPrice[];
  watchlist: TokenPrice[];
  totalCryptoMarketCap?: number;
  fearGreedIndex?: number;
}

export interface MarketAnalysis {
  timestamp: Date;
  summary: string;
  sentiment: "very_bearish" | "bearish" | "neutral" | "bullish" | "very_bullish";
  keyInsights: string[];
  opportunities: MarketOpportunity[];
  risks: string[];
}

export interface MarketOpportunity {
  token: string;
  mint: string;
  action: "buy" | "sell" | "long" | "short" | "provide_liquidity";
  reasoning: string;
  confidence: number;    // 0-1
  timeframe: "short" | "medium" | "long";
}
