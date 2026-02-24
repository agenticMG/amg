import { createLogger } from "./logger.js";
import { DEFAULTS } from "../constants/defaults.js";

const log = createLogger("retry");

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: {
    maxRetries?: number;
    delayMs?: number;
    backoff?: boolean;
    label?: string;
  } = {}
): Promise<T> {
  const maxRetries = opts.maxRetries ?? DEFAULTS.MAX_RETRIES;
  const delayMs = opts.delayMs ?? DEFAULTS.RETRY_DELAY_MS;
  const label = opts.label ?? "operation";

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const wait = opts.backoff ? delayMs * Math.pow(2, attempt) : delayMs;
        log.warn({ attempt: attempt + 1, maxRetries, wait, label }, `${label} failed, retrying...`);
        await sleep(wait);
      }
    }
  }

  log.error({ label, maxRetries }, `${label} failed after ${maxRetries} retries`);
  throw lastError;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
