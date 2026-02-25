import type { PortfolioState, MarketOverview, MarketAnalysis, RiskAssessment, TradeAction } from "@amg/shared";

export interface DecisionPromptInput {
  portfolio: PortfolioState;
  market: MarketOverview;
  analysis: MarketAnalysis;
  risk: RiskAssessment;
  recentDecisions: Array<{ action: TradeAction; reasoning: string; success: boolean; timestamp: Date }>;
}

export function buildDecisionPrompt(input: DecisionPromptInput): string {
  const { portfolio, market, analysis, risk, recentDecisions } = input;

  const portfolioSection = `
## Current Portfolio
- **Wallet Address**: ${portfolio.walletAddress}
- **SOL Balance**: ${portfolio.solBalance.toFixed(4)} SOL
- **Total Wallet Value**: $${portfolio.totalWalletUsdValue.toFixed(2)}
- **Total Perp Value**: $${portfolio.totalPerpUsdValue.toFixed(2)}
- **Total LP Value**: $${portfolio.totalLPUsdValue.toFixed(2)}
- **Total Portfolio**: $${portfolio.totalPortfolioUsdValue.toFixed(2)}
- **Daily P&L**: $${portfolio.dailyPnl.toFixed(2)} (${(portfolio.dailyPnlPct * 100).toFixed(2)}%)

### Token Balances
${portfolio.tokenBalances.map(t => `- ${t.symbol}: ${t.uiAmount.toFixed(4)} ($${t.usdValue.toFixed(2)})`).join("\n")}

### Open Perp Positions
${portfolio.perpPositions.length === 0 ? "- None" :
  portfolio.perpPositions.map(p =>
    `- ${p.market} ${p.side.toUpperCase()} ${p.leverage}x | Size: ${p.size} | Entry: $${p.entryPrice.toFixed(2)} | Current: $${p.currentPrice.toFixed(2)} | uPnL: $${p.unrealizedPnl.toFixed(2)} (${(p.unrealizedPnlPct * 100).toFixed(2)}%)`
  ).join("\n")}

### LP Positions
${portfolio.lpPositions.length === 0 ? "- None" :
  portfolio.lpPositions.map(lp =>
    `- Pool ${lp.poolAddress.slice(0, 8)}... | Value: $${lp.totalUsdValue.toFixed(2)} | Unclaimed Fees: $${lp.unclaimedFeeUsdValue.toFixed(2)}`
  ).join("\n")}`;

  const marketSection = `
## Market Overview
- **SOL**: $${market.solPrice.toFixed(2)}
- **BTC**: $${market.btcPrice.toFixed(2)}
- **ETH**: $${market.ethPrice.toFixed(2)}
${market.fearGreedIndex !== undefined ? `- **Fear/Greed Index**: ${market.fearGreedIndex}` : ""}

### Top Movers (24h)
${market.topMovers.slice(0, 5).map(t =>
  `- ${t.symbol}: $${t.price.toFixed(4)} (${t.priceChange24hPct >= 0 ? "+" : ""}${(t.priceChange24hPct * 100).toFixed(2)}%) | Vol: $${(t.volume24h / 1e6).toFixed(2)}M`
).join("\n")}`;

  const analysisSection = `
## Market Analysis
- **Sentiment**: ${analysis.sentiment.toUpperCase()}
- **Summary**: ${analysis.summary}

### Key Insights
${analysis.keyInsights.map(i => `- ${i}`).join("\n")}

### Opportunities
${analysis.opportunities.map(o =>
  `- ${o.action.toUpperCase()} ${o.token} (confidence: ${(o.confidence * 100).toFixed(0)}%, ${o.timeframe} term): ${o.reasoning}`
).join("\n")}

### Risks
${analysis.risks.map(r => `- ${r}`).join("\n")}`;

  const riskSection = `
## Risk Assessment
- **Trading Allowed**: ${risk.allowed ? "YES" : "NO"}
${!risk.allowed ? `- **Blocked By**: ${risk.blockedBy?.join(", ")}` : ""}
- **Summary**: ${risk.summary}

### Rule Status
${risk.results.map(r =>
  `- ${r.ruleName}: ${r.allowed ? "PASS" : "BLOCKED"}${r.reason ? ` — ${r.reason}` : ""}`
).join("\n")}`;

  const recentSection = `
## Recent Decisions (last 5)
${recentDecisions.length === 0 ? "- No recent decisions" :
  recentDecisions.slice(0, 5).map(d =>
    `- [${d.timestamp.toISOString()}] ${d.action} | ${d.success ? "SUCCESS" : "FAILED"} | ${d.reasoning.slice(0, 100)}`
  ).join("\n")}`;

  return `You are AMG, an autonomous Solana portfolio management agent. Analyze the current state and decide your next action.

${portfolioSection}

${marketSection}

${analysisSection}

${riskSection}

${recentSection}

---

Based on the above data, decide your next action. You MUST respond with ONLY a valid JSON object (no markdown, no explanation outside JSON):

{
  "action": "SPOT_SWAP" | "OPEN_PERP" | "CLOSE_PERP" | "ADJUST_PERP" | "ADD_LIQUIDITY" | "HOLD",
  "confidence": <number 0.0 to 1.0>,
  "reasoning": "<your detailed analysis and reasoning>",
  "params": {
    // For SPOT_SWAP: { "inputMint": "...", "outputMint": "...", "amount": <number in smallest unit> }
    // For OPEN_PERP: { "market": "SOL-PERP|ETH-PERP|BTC-PERP", "side": "long|short", "collateralAmount": <number>, "leverage": <number>, "stopLossPrice": <number> }
    // For CLOSE_PERP: { "positionPublicKey": "...", "market": "..." }
    // For ADJUST_PERP: { "positionPublicKey": "...", "market": "...", "newStopLossPrice": <number> }
    // For ADD_LIQUIDITY: { "poolAddress": "...", "tokenAAmount": <number>, "tokenBAmount": <number> }
    // For HOLD: null
  }
}

Important:
- If risk assessment says trading is NOT allowed, you MUST choose HOLD.
- You are an ACTIVE trader. Look for opportunities and take them. Only HOLD if there is genuinely nothing worth trading.
- Trade when confidence > 0.35. You don't need to be highly certain — small edges compound over time.
- Prefer small, frequent trades over waiting for perfect setups.
- Consider gas costs: keep at least 0.5 SOL for transactions.
- Perp stop-losses are enforced client-side, so always specify stopLossPrice for new positions.`;
}

export function parseDecisionResponse(response: string): {
  action: TradeAction;
  confidence: number;
  reasoning: string;
  params: Record<string, unknown> | null;
} {
  // Strip markdown code fences if present
  let cleaned = response.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  const parsed = JSON.parse(cleaned);

  const validActions: TradeAction[] = [
    "SPOT_SWAP", "OPEN_PERP", "CLOSE_PERP", "ADJUST_PERP", "ADD_LIQUIDITY", "HOLD",
  ];

  if (!validActions.includes(parsed.action)) {
    throw new Error(`Invalid action: ${parsed.action}`);
  }

  if (typeof parsed.confidence !== "number" || parsed.confidence < 0 || parsed.confidence > 1) {
    throw new Error(`Invalid confidence: ${parsed.confidence}`);
  }

  if (typeof parsed.reasoning !== "string" || parsed.reasoning.length === 0) {
    throw new Error("Missing reasoning");
  }

  return {
    action: parsed.action,
    confidence: parsed.confidence,
    reasoning: parsed.reasoning,
    params: parsed.params ?? null,
  };
}
