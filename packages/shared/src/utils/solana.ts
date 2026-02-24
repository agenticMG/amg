import {
  Connection,
  Keypair,
  PublicKey,
  type Commitment,
} from "@solana/web3.js";
import bs58 from "bs58";
import { DEFAULTS } from "../constants/defaults.js";

let _connection: Connection | null = null;
let _wallet: Keypair | null = null;

export function getConnection(rpcUrl?: string, commitment?: Commitment): Connection {
  if (!_connection) {
    _connection = new Connection(
      rpcUrl || process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
      commitment || (process.env.SOLANA_COMMITMENT as Commitment) || "confirmed"
    );
  }
  return _connection;
}

export function getWallet(privateKey?: string): Keypair {
  if (!_wallet) {
    const key = privateKey || process.env.SOLANA_PRIVATE_KEY;
    if (!key) throw new Error("SOLANA_PRIVATE_KEY is required");
    _wallet = Keypair.fromSecretKey(bs58.decode(key));
  }
  return _wallet;
}

export function getWalletAddress(): string {
  return getWallet().publicKey.toBase58();
}

export async function getSolBalance(connection?: Connection): Promise<number> {
  const conn = connection || getConnection();
  const wallet = getWallet();
  const balance = await conn.getBalance(wallet.publicKey);
  return balance / DEFAULTS.LAMPORTS_PER_SOL;
}

export function toPublicKey(address: string): PublicKey {
  return new PublicKey(address);
}

export function lamportsToSol(lamports: number): number {
  return lamports / DEFAULTS.LAMPORTS_PER_SOL;
}

export function solToLamports(sol: number): number {
  return Math.floor(sol * DEFAULTS.LAMPORTS_PER_SOL);
}
