export function pctChange(oldVal: number, newVal: number): number {
  if (oldVal === 0) return 0;
  return (newVal - oldVal) / oldVal;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function roundTo(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

export function toTokenAmount(uiAmount: number, decimals: number): number {
  return Math.floor(uiAmount * Math.pow(10, decimals));
}

export function toUiAmount(rawAmount: number, decimals: number): number {
  return rawAmount / Math.pow(10, decimals);
}

export function formatUsd(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}
