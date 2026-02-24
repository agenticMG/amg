import { Connection, PublicKey } from "@solana/web3.js";

// Well-known SPL Token program ID — avoids requiring @solana/spl-token
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

export interface TokenHolder {
  wallet: string;
  balance: number;
}

export async function getTokenHolders(
  connection: Connection,
  mintAddress: string,
  blacklist: Set<string>,
): Promise<TokenHolder[]> {
  const mint = new PublicKey(mintAddress);

  const accounts = await connection.getParsedProgramAccounts(TOKEN_PROGRAM_ID, {
    filters: [
      { dataSize: 165 },
      { memcmp: { offset: 0, bytes: mint.toBase58() } },
    ],
  });

  const holders: TokenHolder[] = [];

  for (const account of accounts) {
    const parsed = (account.account.data as any)?.parsed?.info;
    if (!parsed) continue;

    const owner = parsed.owner as string;
    const amount = Number(parsed.tokenAmount?.uiAmount ?? 0);

    // Skip zero balances
    if (amount <= 0) continue;

    // Skip blacklisted wallets
    if (blacklist.has(owner)) continue;

    // Skip PDAs (off-curve addresses)
    try {
      const pk = new PublicKey(owner);
      if (!PublicKey.isOnCurve(pk.toBytes())) continue;
    } catch {
      continue;
    }

    holders.push({ wallet: owner, balance: amount });
  }

  return holders;
}

export function calculateShares(
  holders: TokenHolder[],
  totalDistributable: number,
  dustThreshold: number = 0.001,
): { wallet: string; balance: number; sharePct: number; solAmount: number }[] {
  const totalBalance = holders.reduce((sum, h) => sum + h.balance, 0);
  if (totalBalance <= 0) return [];

  return holders
    .map((h) => {
      const sharePct = h.balance / totalBalance;
      const solAmount = totalDistributable * sharePct;
      return {
        wallet: h.wallet,
        balance: h.balance,
        sharePct,
        solAmount,
      };
    })
    .filter((h) => h.solAmount >= dustThreshold);
}
