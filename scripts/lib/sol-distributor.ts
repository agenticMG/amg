import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";

const TRANSFERS_PER_TX = 18;
const BATCH_DELAY_MS = 500;

export interface TransferResult {
  wallet: string;
  txSignature: string | null;
  success: boolean;
  error?: string;
}

export async function distributeSOL(
  connection: Connection,
  payer: Keypair,
  recipients: { wallet: string; solAmount: number }[],
  dryRun: boolean = false,
): Promise<TransferResult[]> {
  const results: TransferResult[] = [];

  // Batch recipients into groups of TRANSFERS_PER_TX
  const batches: typeof recipients[] = [];
  for (let i = 0; i < recipients.length; i += TRANSFERS_PER_TX) {
    batches.push(recipients.slice(i, i + TRANSFERS_PER_TX));
  }

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    if (dryRun) {
      for (const r of batch) {
        console.log(`[DRY_RUN] Would send ${r.solAmount.toFixed(6)} SOL to ${r.wallet}`);
        results.push({ wallet: r.wallet, txSignature: null, success: true });
      }
      continue;
    }

    try {
      const tx = new Transaction();

      for (const r of batch) {
        const lamports = Math.floor(r.solAmount * 1e9);
        tx.add(
          SystemProgram.transfer({
            fromPubkey: payer.publicKey,
            toPubkey: new PublicKey(r.wallet),
            lamports,
          }),
        );
      }

      const sig = await connection.sendTransaction(tx, [payer]);
      await connection.confirmTransaction(sig, "confirmed");

      for (const r of batch) {
        results.push({ wallet: r.wallet, txSignature: sig, success: true });
      }

      console.log(`Batch ${i + 1}/${batches.length} confirmed: ${sig} (${batch.length} recipients)`);
    } catch (err: any) {
      console.error(`Batch ${i + 1}/${batches.length} failed:`, err.message);
      for (const r of batch) {
        results.push({ wallet: r.wallet, txSignature: null, success: false, error: err.message });
      }
    }

    // Delay between batches to avoid rate limiting
    if (i < batches.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  return results;
}
