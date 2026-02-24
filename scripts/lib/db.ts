import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import * as schema from "@amg/plugin-portfolio-tracker";

export type DB = PostgresJsDatabase<typeof schema>;

export function createDb(databaseUrl: string): { db: DB; client: ReturnType<typeof postgres> } {
  const client = postgres(databaseUrl);
  const db = drizzle(client, { schema });
  return { db, client };
}

export async function ensureDistributionTables(db: DB) {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS distributions (
      id SERIAL PRIMARY KEY,
      timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
      total_sol_distributed REAL NOT NULL,
      total_recipients INTEGER NOT NULL,
      distro_balance_before REAL NOT NULL,
      distro_balance_after REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      error TEXT,
      tx_signatures JSONB
    );

    CREATE TABLE IF NOT EXISTS distribution_recipients (
      id SERIAL PRIMARY KEY,
      distribution_id INTEGER NOT NULL,
      recipient_wallet TEXT NOT NULL,
      token_balance REAL NOT NULL,
      token_share_pct REAL NOT NULL,
      sol_amount REAL NOT NULL,
      tx_signature TEXT,
      status TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE INDEX IF NOT EXISTS distributions_timestamp_idx ON distributions (timestamp);
    CREATE INDEX IF NOT EXISTS distributions_status_idx ON distributions (status);
    CREATE INDEX IF NOT EXISTS dist_recipients_dist_id_idx ON distribution_recipients (distribution_id);
    CREATE INDEX IF NOT EXISTS dist_recipients_wallet_idx ON distribution_recipients (recipient_wallet);
    CREATE INDEX IF NOT EXISTS dist_recipients_status_idx ON distribution_recipients (status);
  `);
}

export async function acquireAdvisoryLock(db: DB, lockId: number = 42424242): Promise<boolean> {
  const result = await db.execute(sql`SELECT pg_try_advisory_lock(${lockId}) as acquired`);
  return (result as any)[0]?.acquired === true;
}

export async function releaseAdvisoryLock(db: DB, lockId: number = 42424242) {
  await db.execute(sql`SELECT pg_advisory_unlock(${lockId})`);
}
