import { Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { createDb, ensureDistributionTables, acquireAdvisoryLock, releaseAdvisoryLock, type DB } from "./lib/db.js";
import { getTokenHolders, calculateShares } from "./lib/holder-snapshot.js";
import { distributeSOL } from "./lib/sol-distributor.js";
import { distributions, distributionRecipients } from "@amg/plugin-portfolio-tracker";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

// ── Config ──────────────────────────────────────────────────────────────────
const DATABASE_URL = process.env.DATABASE_URL;
const DISTRIBUTION_WALLET_PRIVATE_KEY = process.env.DISTRIBUTION_WALLET_PRIVATE_KEY;
const AMG_TOKEN_MINT = process.env.AMG_TOKEN_MINT;
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const DISTRIBUTION_SOL_RESERVE = Number(process.env.DISTRIBUTION_SOL_RESERVE || "0.5");
const DRY_RUN = process.env.DRY_RUN === "true";
const DISTRIBUTION_BLACKLIST = new Set(
  (process.env.DISTRIBUTION_BLACKLIST || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

if (!DATABASE_URL) throw new Error("DATABASE_URL is required");
if (!DISTRIBUTION_WALLET_PRIVATE_KEY) throw new Error("DISTRIBUTION_WALLET_PRIVATE_KEY is required");
if (!AMG_TOKEN_MINT) throw new Error("AMG_TOKEN_MINT is required");

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const { db, client } = createDb(DATABASE_URL!);

  try {
    // 1. Ensure tables exist
    console.log("Ensuring distribution tables exist...");
    await ensureDistributionTables(db);

    // 2. Acquire advisory lock
    const acquired = await acquireAdvisoryLock(db);
    if (!acquired) {
      console.error("Another distribution is already running (advisory lock held). Exiting.");
      process.exit(1);
    }
    console.log("Advisory lock acquired.");

    try {
      // 3. Load distro wallet
      const distroKeypair = Keypair.fromSecretKey(bs58.decode(DISTRIBUTION_WALLET_PRIVATE_KEY!));
      console.log(`Distribution wallet: ${distroKeypair.publicKey.toBase58()}`);

      // 4. Get distro wallet SOL balance
      const connection = new Connection(SOLANA_RPC_URL, "confirmed");
      const balanceLamports = await connection.getBalance(distroKeypair.publicKey);
      const balanceSol = balanceLamports / 1e9;
      console.log(`Distro wallet balance: ${balanceSol.toFixed(6)} SOL`);

      // 5. Calculate distributable amount
      const distributable = balanceSol - DISTRIBUTION_SOL_RESERVE;
      if (distributable <= 0) {
        console.log(`Balance (${balanceSol.toFixed(6)}) <= reserve (${DISTRIBUTION_SOL_RESERVE}). Nothing to distribute.`);
        return;
      }
      console.log(`Distributable: ${distributable.toFixed(6)} SOL (reserve: ${DISTRIBUTION_SOL_RESERVE})`);

      // 6. Snapshot AMG token holders
      console.log(`Fetching AMG token holders for mint ${AMG_TOKEN_MINT}...`);
      const holders = await getTokenHolders(connection, AMG_TOKEN_MINT!, DISTRIBUTION_BLACKLIST);
      console.log(`Found ${holders.length} eligible holders`);

      if (holders.length === 0) {
        console.log("No eligible holders found. Exiting.");
        return;
      }

      // 7. Calculate proportional SOL amounts
      const shares = calculateShares(holders, distributable);
      console.log(`${shares.length} holders above dust threshold`);

      if (shares.length === 0) {
        console.log("All shares below dust threshold. Exiting.");
        return;
      }

      // 8. Create distribution record
      const [distRecord] = await db
        .insert(distributions)
        .values({
          totalSolDistributed: distributable,
          totalRecipients: shares.length,
          distroBalanceBefore: balanceSol,
          distroBalanceAfter: 0, // updated after
          status: "pending",
        })
        .returning();

      console.log(`Distribution #${distRecord.id} created (pending)`);

      // 9. Create recipient records
      const recipientRows = shares.map((s) => ({
        distributionId: distRecord.id,
        recipientWallet: s.wallet,
        tokenBalance: s.balance,
        tokenSharePct: s.sharePct * 100,
        solAmount: s.solAmount,
        status: "pending" as const,
      }));

      const insertedRecipients = await db
        .insert(distributionRecipients)
        .values(recipientRows)
        .returning();

      // 10. Execute batched transfers
      console.log(`\nExecuting transfers${DRY_RUN ? " (DRY RUN)" : ""}...`);
      const results = await distributeSOL(connection, distroKeypair, shares, DRY_RUN);

      // 11. Update recipient records with tx sigs
      const txSignatures = new Set<string>();
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const recipientRecord = insertedRecipients[i];

        if (result.txSignature) txSignatures.add(result.txSignature);

        await db
          .update(distributionRecipients)
          .set({
            status: result.success ? "sent" : "failed",
            txSignature: result.txSignature,
          })
          .where(eq(distributionRecipients.id, recipientRecord.id));
      }

      // 12. Update distribution record
      const balanceAfterLamports = await connection.getBalance(distroKeypair.publicKey);
      const balanceAfterSol = balanceAfterLamports / 1e9;
      const sentCount = results.filter((r) => r.success).length;
      const failedCount = results.filter((r) => !r.success).length;

      await db
        .update(distributions)
        .set({
          status: failedCount === 0 ? "completed" : "failed",
          distroBalanceAfter: balanceAfterSol,
          totalSolDistributed: shares.reduce((sum, s) => sum + s.solAmount, 0),
          totalRecipients: sentCount,
          txSignatures: [...txSignatures],
          error: failedCount > 0 ? `${failedCount} recipients failed` : null,
        })
        .where(eq(distributions.id, distRecord.id));

      // 13. Log summary
      console.log("\n=== Distribution Summary ===");
      console.log(`Distribution ID: ${distRecord.id}`);
      console.log(`Status: ${failedCount === 0 ? "completed" : "partial"}`);
      console.log(`Sent: ${sentCount} | Failed: ${failedCount}`);
      console.log(`Total distributed: ${distributable.toFixed(6)} SOL`);
      console.log(`Balance before: ${balanceSol.toFixed(6)} SOL`);
      console.log(`Balance after: ${balanceAfterSol.toFixed(6)} SOL`);
      console.log(`Unique tx signatures: ${txSignatures.size}`);

      // Query running per-wallet totals
      const totals = await db
        .select({
          recipientWallet: distributionRecipients.recipientWallet,
          totalSol: sql<number>`SUM(${distributionRecipients.solAmount})`.as("total_sol"),
          count: sql<number>`COUNT(*)`.as("count"),
        })
        .from(distributionRecipients)
        .where(eq(distributionRecipients.status, "sent"))
        .groupBy(distributionRecipients.recipientWallet)
        .orderBy(sql`SUM(${distributionRecipients.solAmount}) DESC`)
        .limit(20);

      if (totals.length > 0) {
        console.log("\n=== Top 20 Running Totals ===");
        for (const t of totals) {
          console.log(`  ${t.recipientWallet}: ${Number(t.totalSol).toFixed(6)} SOL (${t.count} distributions)`);
        }
      }
    } finally {
      // 14. Release advisory lock
      await releaseAdvisoryLock(db);
      console.log("Advisory lock released.");
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Distribution failed:", err);
  process.exit(1);
});
