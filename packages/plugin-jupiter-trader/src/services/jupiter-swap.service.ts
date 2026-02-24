import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { createLogger, type SpotSwapParams, type TradeResult, withRetry } from "@amg/shared";

const log = createLogger("jupiter-swap");

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
      // Step 1: Request order from Jupiter Ultra
      const orderResponse = await fetch(`${this.ultraUrl}/order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify({
          inputMint: params.inputMint,
          outputMint: params.outputMint,
          amount: params.amount,
          taker: this.wallet.publicKey.toBase58(),
        }),
      });

      if (!orderResponse.ok) {
        const errText = await orderResponse.text();
        throw new Error(`Jupiter Ultra order failed: ${orderResponse.status} ${errText}`);
      }

      const orderData = await orderResponse.json() as any;
      log.info({ orderId: orderData.requestId }, "Order created");

      // Step 2: Deserialize and sign the transaction
      const transactionBase64 = orderData.transaction;
      if (!transactionBase64) {
        throw new Error("No transaction returned from Jupiter Ultra");
      }

      const txBuffer = Buffer.from(transactionBase64, "base64");
      const transaction = VersionedTransaction.deserialize(txBuffer);

      // Sign with our wallet
      transaction.sign([this.wallet]);

      // Step 3: Send the signed transaction
      const txSignature = await this.connection.sendRawTransaction(
        transaction.serialize(),
        { skipPreflight: false, maxRetries: 2 }
      );

      // Step 4: Confirm
      const confirmation = await this.connection.confirmTransaction(txSignature, "confirmed");

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      log.info({ txSignature }, "Swap executed successfully");

      return {
        success: true,
        txSignature,
        executedAmount: orderData.outAmount ? Number(orderData.outAmount) : undefined,
        executedPrice: orderData.price ? Number(orderData.price) : undefined,
      };
    }, { label: "jupiter-swap", maxRetries: 2 });
  }

  async getQuote(inputMint: string, outputMint: string, amount: number): Promise<any> {
    const res = await fetch(
      `${this.ultraUrl}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}`,
      {
        headers: { "x-api-key": this.apiKey },
      }
    );

    if (!res.ok) {
      throw new Error(`Jupiter quote failed: ${res.status}`);
    }

    return res.json();
  }
}
