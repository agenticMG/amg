import { desc } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { portfolioSnapshots } from "../schema.js";
import type * as schema from "../schema.js";

export class SnapshotsRepository {
  constructor(private db: PostgresJsDatabase<typeof schema>) {}

  async insert(snapshot: typeof portfolioSnapshots.$inferInsert) {
    return this.db.insert(portfolioSnapshots).values(snapshot).returning();
  }

  async getLatest() {
    const rows = await this.db
      .select()
      .from(portfolioSnapshots)
      .orderBy(desc(portfolioSnapshots.timestamp))
      .limit(1);
    return rows[0] ?? null;
  }

  async getRecent(limit = 100) {
    return this.db
      .select()
      .from(portfolioSnapshots)
      .orderBy(desc(portfolioSnapshots.timestamp))
      .limit(limit);
  }
}
