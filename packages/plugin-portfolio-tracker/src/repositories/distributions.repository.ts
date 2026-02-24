import { desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { distributions } from "../schema.js";
import type * as schema from "../schema.js";

export class DistributionsRepository {
  constructor(private db: PostgresJsDatabase<typeof schema>) {}

  async insert(data: typeof distributions.$inferInsert) {
    return this.db.insert(distributions).values(data).returning();
  }

  async updateStatus(id: number, status: string, updates?: Partial<typeof distributions.$inferInsert>) {
    return this.db
      .update(distributions)
      .set({ status, ...updates })
      .where(eq(distributions.id, id))
      .returning();
  }

  async getRecent(limit = 20) {
    return this.db.select().from(distributions).orderBy(desc(distributions.timestamp)).limit(limit);
  }

  async getById(id: number) {
    const rows = await this.db.select().from(distributions).where(eq(distributions.id, id)).limit(1);
    return rows[0] ?? null;
  }
}
