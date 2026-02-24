import type { RiskConfig } from "./risk.js";

export interface AppConfig {
  solana: {
    rpcUrl: string;
    privateKey: string;
    commitment: "processed" | "confirmed" | "finalized";
  };
  anthropic: {
    apiKey: string;
  };
  jupiter: {
    apiKey: string;
    ultraUrl: string;
  };
  birdeye: {
    apiKey: string;
  };
  helius: {
    apiKey: string;
    rpcUrl?: string;
  };
  meteora: {
    poolAddress?: string;
    positionAddress?: string;
  };
  database: {
    url: string;
  };
  agent: {
    cycleIntervalMs: number;
    feeClaimIntervalMs: number;
    dryRun: boolean;
  };
  risk: RiskConfig;
  server: {
    port: number;
  };
}

export function loadConfig(): AppConfig {
  return {
    solana: {
      rpcUrl: env("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com"),
      privateKey: env("SOLANA_PRIVATE_KEY"),
      commitment: (process.env.SOLANA_COMMITMENT as AppConfig["solana"]["commitment"]) || "confirmed",
    },
    anthropic: {
      apiKey: env("ANTHROPIC_API_KEY"),
    },
    jupiter: {
      apiKey: env("JUPITER_API_KEY", "86a2564b-34e7-47a9-b6ba-6d99852ea252"),
      ultraUrl: env("JUPITER_ULTRA_URL", "https://lite.jup.ag/ultra/v1"),
    },
    birdeye: {
      apiKey: env("BIRDEYE_API_KEY", ""),
    },
    helius: {
      apiKey: env("HELIUS_API_KEY", ""),
      rpcUrl: process.env.HELIUS_RPC_URL,
    },
    meteora: {
      poolAddress: process.env.METEORA_POOL_ADDRESS,
      positionAddress: process.env.METEORA_POSITION_ADDRESS,
    },
    database: {
      url: env("DATABASE_URL", "postgresql://amg:amg_password@localhost:5432/amg"),
    },
    agent: {
      cycleIntervalMs: numEnv("CYCLE_INTERVAL_MS", 300_000),
      feeClaimIntervalMs: numEnv("FEE_CLAIM_INTERVAL_MS", 3_600_000),
      dryRun: process.env.DRY_RUN !== "false",
    },
    risk: {
      maxPositionSizePct: numEnv("MAX_POSITION_SIZE_PCT", 0.25),
      perpStopLossPct: numEnv("PERP_STOP_LOSS_PCT", 0.05),
      maxLeverage: numEnv("MAX_LEVERAGE", 20),
      dailyLossLimitPct: numEnv("DAILY_LOSS_LIMIT_PCT", 0.10),
      minSolBalance: numEnv("MIN_SOL_BALANCE", 0.5),
      cooldownAfterLosses: numEnv("COOLDOWN_AFTER_LOSSES", 3),
    },
    server: {
      port: numEnv("PORT", 3000),
    },
  };
}

function env(key: string, fallback?: string): string {
  const val = process.env[key];
  if (val !== undefined) return val;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required environment variable: ${key}`);
}

function numEnv(key: string, fallback: number): number {
  const val = process.env[key];
  if (val === undefined) return fallback;
  const num = Number(val);
  if (isNaN(num)) throw new Error(`Environment variable ${key} must be a number, got: ${val}`);
  return num;
}
