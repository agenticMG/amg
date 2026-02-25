import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { createLogger, type SpotSwapParams, type TradeResult, withRetry } from "@amg/shared";

const log = createLogger("jupiter-swap");

const SWAP_API_BASE = "https://api.jup.ag/swap/v1";

export class JupiterSwapService {
  constructor(
    private connection: Connection,
    private wallet: Keypair,
    private apiKey: string,
    private ultraUrl: string,
    private dryRun: boolean,
  ) {}

  async swap(params: SpotSwapParams): Promise<TradeResult> {
    log.info({
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      amount: params.amount,
    }, "Executing spot swap...");

    if (this.dryRun) {
      log.info("[DRY_RUN] Would execute swap");
      return { success: true };
    }

    return withRetry(async () => {
      // Step 1: Get quote
      const quoteUrl = `${SWAP_API_BASE}/quote?inputMint=${params.inputMint}&outputMint=${params.outputMint}&amount=${params.amount}&slippageBps=100`;
      const quoteRes = await fetch(quoteUrl, {
        headers: { "x-api-key": this.apiKey },
      });

      if (!quoteRes.ok) {
        const errText = await quoteRes.text();
        throw new Error(`Jupiter quote failed: ${quoteRes.status} ${errText}`);
      }

      const quoteData = await quoteRes.json() as any;
      log.info({
        inAmount: quoteData.inAmount,
        outAmount: quoteData.outAmount,
        priceImpact: quoteData.priceImpactPct,
      }, "Quote received");

      // Step 2: Get swap transaction
      const swapRes = await fetch(`${SWAP_API_BASE}/swap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify({
          userPublicKey: this.wallet.publicKey.toBase58(),
          quoteResponse: quoteData,
          dynamicComputeUnitLimit: true,
          dynamicSlippage: true,
          prioritizationFeeLamports: {
            priorityLevelWithMaxLamports: {
              priorityLevel: "veryHigh",
              maxLamports: 1000000,
            },
          },
        }),
      });

      if (!swapRes.ok) {
        const errText = await swapRes.text();
        throw new Error(`Jupiter swap failed: ${swapRes.status} ${errText}`);
      }

      const swapData = await swapRes.json() as any;

      // Step 3: Deserialize and sign the transaction
      const txBuffer = Buffer.from(swapData.swapTransaction, "base64");
      const transaction = VersionedTransaction.deserialize(txBuffer);
      transaction.sign([this.wallet]);

      // Step 4: Send the signed transaction
      const txSignature = await this.connection.sendRawTransaction(
        transaction.serialize(),
        { skipPreflight: false, maxRetries: 2 },
      );

      // Step 5: Confirm
      const confirmation = await this.connection.confirmTransaction(txSignature, "confirmed");

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      log.info({ txSignature, outAmount: quoteData.outAmount }, "Swap executed successfully");

      return {
        success: true,
        txSignature,
        executedAmount: quoteData.outAmount ? Number(quoteData.outAmount) : undefined,
        executedPrice: quoteData.price ? Number(quoteData.price) : undefined,
      };
    }, { label: "jupiter-swap", maxRetries: 2 });
  }

  async getQuote(inputMint: string, outputMint: string, amount: number): Promise<any> {
    const res = await fetch(
      `${SWAP_API_BASE}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=100`,
      {
        headers: { "x-api-key": this.apiKey },
      },
    );

    if (!res.ok) {
      throw new Error(`Jupiter quote failed: ${res.status}`);
    }

    return res.json();
  }
}
