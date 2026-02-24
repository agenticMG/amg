import { desc, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { distributionRecipients } from "../schema.js";
import type * as schema from "../schema.js";

export class DistributionRecipientsRepository {
  constructor(private db: PostgresJsDatabase<typeof schema>) {}

  async insertMany(rows: (typeof distributionRecipients.$inferInsert)[]) {
    return this.db.insert(distributionRecipients).values(rows).returning();
  }

  async updateStatus(id: number, status: string, txSignature?: string) {
    return this.db
      .update(distributionRecipients)
      .set({ status, txSignature })
      .where(eq(distributionRecipients.id, id))
      .returning();
  }

  async getByDistributionId(distributionId: number) {
    return this.db
      .select()
      .from(distributionRecipients)
      .where(eq(distributionRecipients.distributionId, distributionId))
      .orderBy(desc(distributionRecipients.solAmount));
  }

  async getRunningTotals() {
    return this.db
      .select({
        recipientWallet: distributionRecipients.recipientWallet,
        totalSol: sql<number>`SUM(${distributionRecipients.solAmount})`.as("total_sol"),
        distributionCount: sql<number>`COUNT(*)`.as("distribution_count"),
      })
      .from(distributionRecipients)
      .where(eq(distributionRecipients.status, "sent"))
      .groupBy(distributionRecipients.recipientWallet)
      .orderBy(sql`SUM(${distributionRecipients.solAmount}) DESC`);
  }
}
