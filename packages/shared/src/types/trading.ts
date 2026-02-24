export type TradeAction =
  | "SPOT_SWAP"
  | "OPEN_PERP"
  | "CLOSE_PERP"
  | "ADJUST_PERP"
  | "ADD_LIQUIDITY"
  | "HOLD";

export type PerpSide = "long" | "short";

export interface SpotSwapParams {
  inputMint: string;
  outputMint: string;
  amount: number;        // in input token smallest unit
  slippageBps?: number;
}

export interface OpenPerpParams {
  market: string;        // e.g. "SOL-PERP"
  side: PerpSide;
  collateralAmount: number;
  leverage: number;
  stopLossPrice?: number;
}

export interface ClosePerpParams {
  positionPublicKey: string;
  market: string;
}

export interface AdjustPerpParams {
  positionPublicKey: string;
  market: string;
  newSize?: number;
  newLeverage?: number;
  newStopLossPrice?: number;
}

export interface AddLiquidityParams {
  poolAddress: string;
  tokenAAmount: number;
  tokenBAmount: number;
  slippageBps?: number;
}

export interface TradeDecision {
  action: TradeAction;
  confidence: number;    // 0-1
  reasoning: string;
  params?: SpotSwapParams | OpenPerpParams | ClosePerpParams | AdjustPerpParams | AddLiquidityParams;
}

export interface TradeResult {
  success: boolean;
  txSignature?: string;
  error?: string;
  executedPrice?: number;
  executedAmount?: number;
  fees?: number;
}

export interface TradeRecord {
  id?: number;
  timestamp: Date;
  action: TradeAction;
  inputToken?: string;
  outputToken?: string;
  inputAmount?: number;
  outputAmount?: number;
  executedPrice?: number;
  pnl?: number;
  txSignature?: string;
  reasoning: string;
  success: boolean;
  error?: string;
}
