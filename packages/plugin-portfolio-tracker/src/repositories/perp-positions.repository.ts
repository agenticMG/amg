import { desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { perpPositions } from "../schema.js";
import type * as schema from "../schema.js";

export class PerpPositionsRepository {
  constructor(private db: PostgresJsDatabase<typeof schema>) {}

  async insert(position: typeof perpPositions.$inferInsert) {
    return this.db.insert(perpPositions).values(position).returning();
  }

  async getOpen() {
    return this.db
      .select()
      .from(perpPositions)
      .where(eq(perpPositions.status, "open"))
      .orderBy(desc(perpPositions.openedAt));
  }

  async close(id: number, exitPrice: number, realizedPnl: number, closeTxSignature: string) {
    return this.db
      .update(perpPositions)
      .set({
        status: "closed",
        closedAt: new Date(),
        exitPrice,
        realizedPnl,
        closeTxSignature,
      })
      .where(eq(perpPositions.id, id))
      .returning();
  }

  async updateStopLoss(id: number, stopLossPrice: number) {
    return this.db
      .update(perpPositions)
      .set({ stopLossPrice })
      .where(eq(perpPositions.id, id))
      .returning();
  }

  async getByPublicKey(positionPublicKey: string) {
    const rows = await this.db
      .select()
      .from(perpPositions)
      .where(eq(perpPositions.positionPublicKey, positionPublicKey))
      .limit(1);
    return rows[0] ?? null;
  }

  async getRecent(limit = 20) {
    return this.db
      .select()
      .from(perpPositions)
      .orderBy(desc(perpPositions.openedAt))
      .limit(limit);
  }
}
