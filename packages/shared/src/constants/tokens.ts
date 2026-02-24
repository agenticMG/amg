export const TOKENS = {
  SOL: {
    mint: "So11111111111111111111111111111111111111112",
    symbol: "SOL",
    decimals: 9,
  },
  USDC: {
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    symbol: "USDC",
    decimals: 6,
  },
  USDT: {
    mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    symbol: "USDT",
    decimals: 6,
  },
  BTC: {
    mint: "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh",  // wBTC (Wormhole)
    symbol: "BTC",
    decimals: 8,
  },
  ETH: {
    mint: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",  // wETH (Wormhole)
    symbol: "ETH",
    decimals: 8,
  },
} as const;

export type TokenSymbol = keyof typeof TOKENS;

export const TOKEN_BY_MINT = Object.fromEntries(
  Object.entries(TOKENS).map(([, token]) => [token.mint, token])
) as Record<string, (typeof TOKENS)[TokenSymbol]>;
