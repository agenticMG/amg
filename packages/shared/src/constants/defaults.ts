export const DEFAULTS = {
  CYCLE_INTERVAL_MS: 300_000,          // 5 minutes
  FEE_CLAIM_INTERVAL_MS: 3_600_000,   // 1 hour
  PERP_MONITOR_INTERVAL_MS: 30_000,   // 30 seconds
  SNAPSHOT_INTERVAL_MS: 600_000,       // 10 minutes
  MARKET_CACHE_TTL_MS: 60_000,        // 1 minute
  PRICE_FEED_INTERVAL_MS: 30_000,     // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1_000,
  DEFAULT_SLIPPAGE_BPS: 50,           // 0.5%
  SOL_DECIMALS: 9,
  LAMPORTS_PER_SOL: 1_000_000_000,
} as const;
