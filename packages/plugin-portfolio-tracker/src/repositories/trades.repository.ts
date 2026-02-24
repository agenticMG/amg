import { desc, eq, and, gte } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { trades } from "../schema.js";
import type * as schema from "../schema.js";

export class TradesRepository {
  constructor(private db: PostgresJsDatabase<typeof schema>) {}

  async insert(trade: typeof trades.$inferInsert) {
    return this.db.insert(trades).values(trade).returning();
  }

  async getRecent(limit = 10) {
    return this.db.select().from(trades).orderBy(desc(trades.timestamp)).limit(limit);
  }

  async getByAction(action: string, limit = 10) {
    return this.db
      .select()
      .from(trades)
      .where(eq(trades.action, action))
      .orderBy(desc(trades.timestamp))
      .limit(limit);
  }

  async getDailyTrades(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    return this.db
      .select()
      .from(trades)
      .where(gte(trades.timestamp, startOfDay))
      .orderBy(desc(trades.timestamp));
  }

  async getDailyPnl(date: Date): Promise<number> {
    const dayTrades = await this.getDailyTrades(date);
    return dayTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  }

  async getConsecutiveLosses(): Promise<number> {
    const recent = await this.db
      .select()
      .from(trades)
      .where(eq(trades.success, true))
      .orderBy(desc(trades.timestamp))
      .limit(20);

    let count = 0;
    for (const trade of recent) {
      if (trade.pnl !== null && trade.pnl < 0) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }
}
