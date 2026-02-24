import { desc } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { agentDecisions } from "../schema.js";
import type * as schema from "../schema.js";

export class DecisionsRepository {
  constructor(private db: PostgresJsDatabase<typeof schema>) {}

  async insert(decision: typeof agentDecisions.$inferInsert) {
    return this.db.insert(agentDecisions).values(decision).returning();
  }

  async getRecent(limit = 10) {
    return this.db
      .select()
      .from(agentDecisions)
      .orderBy(desc(agentDecisions.timestamp))
      .limit(limit);
  }
}
