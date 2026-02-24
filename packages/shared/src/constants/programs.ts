export const PROGRAM_IDS = {
  JUPITER_PERPS: "PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu",
  METEORA_DAMM_V2: "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG",
  TOKEN_PROGRAM: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  ASSOCIATED_TOKEN_PROGRAM: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
  SYSTEM_PROGRAM: "11111111111111111111111111111111",
} as const;

export const JUPITER_PERP_MARKETS = {
  "SOL-PERP": {
    symbol: "SOL-PERP",
    baseToken: "SOL",
    marketIndex: 0,
  },
  "ETH-PERP": {
    symbol: "ETH-PERP",
    baseToken: "ETH",
    marketIndex: 1,
  },
  "BTC-PERP": {
    symbol: "BTC-PERP",
    baseToken: "BTC",
    marketIndex: 2,
  },
} as const;

export type PerpMarket = keyof typeof JUPITER_PERP_MARKETS;
