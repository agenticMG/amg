import { desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { feeClaims } from "../schema.js";
import type * as schema from "../schema.js";

export class FeeClaimsRepository {
  constructor(private db: PostgresJsDatabase<typeof schema>) {}

  async insert(claim: typeof feeClaims.$inferInsert) {
    return this.db.insert(feeClaims).values(claim).returning();
  }

  async getRecent(limit = 20) {
    return this.db.select().from(feeClaims).orderBy(desc(feeClaims.timestamp)).limit(limit);
  }

  async getByPool(poolAddress: string, limit = 20) {
    return this.db
      .select()
      .from(feeClaims)
      .where(eq(feeClaims.poolAddress, poolAddress))
      .orderBy(desc(feeClaims.timestamp))
      .limit(limit);
  }

  async getTotalClaimedUsd(): Promise<number> {
    const all = await this.db.select({ totalUsdValue: feeClaims.totalUsdValue }).from(feeClaims);
    return all.reduce((sum, row) => sum + row.totalUsdValue, 0);
  }
}
