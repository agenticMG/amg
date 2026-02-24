import { desc, eq, gte } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { riskEvents } from "../schema.js";
import type * as schema from "../schema.js";

export class RiskEventsRepository {
  constructor(private db: PostgresJsDatabase<typeof schema>) {}

  async insert(event: typeof riskEvents.$inferInsert) {
    return this.db.insert(riskEvents).values(event).returning();
  }

  async getRecent(limit = 20) {
    return this.db.select().from(riskEvents).orderBy(desc(riskEvents.timestamp)).limit(limit);
  }

  async getByRule(ruleName: string, limit = 20) {
    return this.db
      .select()
      .from(riskEvents)
      .where(eq(riskEvents.ruleName, ruleName))
      .orderBy(desc(riskEvents.timestamp))
      .limit(limit);
  }

  async getTriggeredToday(): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const events = await this.db
      .select()
      .from(riskEvents)
      .where(gte(riskEvents.timestamp, startOfDay));
    return events.filter(e => e.triggered).length;
  }
}
