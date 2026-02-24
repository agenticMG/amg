"use client";

import { useState } from "react";

export function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-2 sketch-border-light bg-paper px-3 py-1.5 font-mono text-xs text-ink-light hover:text-ink hover:bg-cream-dark transition-colors cursor-pointer group"
      title="Click to copy"
    >
      <span className="text-ink-lighter">$AMG</span>
      <span>{address.slice(0, 4)}...{address.slice(-3)}</span>
      <svg className="w-3.5 h-3.5 text-ink-lighter group-hover:text-ink transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        {copied ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        )}
      </svg>
      {copied && <span className="text-green text-[10px] font-sans font-medium">Copied!</span>}
    </button>
  );
}
