import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t-2 border-dashed border-ink-faint mt-20">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-3 gap-12">
          <div>
            <h3 className="font-hand text-2xl font-bold mb-3">AMG</h3>
            <p className="text-ink-light text-sm leading-relaxed">
              Autonomous Money Generator. An AI agent that trades Solana 24/7
              with full transparency.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-ink-lighter mb-3">Navigate</h4>
            <div className="flex flex-col gap-2">
              <Link href="/" className="text-sm text-ink-light hover:text-ink transition-colors">Home</Link>
              <Link href="/dashboard" className="text-sm text-ink-light hover:text-ink transition-colors">Dashboard</Link>
              <Link href="/dashboard/trades" className="text-sm text-ink-light hover:text-ink transition-colors">Trades</Link>
              <Link href="/dashboard/decisions" className="text-sm text-ink-light hover:text-ink transition-colors">Decisions</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-ink-lighter mb-3">Community</h4>
            <div className="flex flex-col gap-2">
              <a href="https://github.com/agenticMG/amg" target="_blank" rel="noopener noreferrer" className="text-sm text-ink-light hover:text-ink transition-colors">
                GitHub
              </a>
              <a href="https://x.com/agenticMG" target="_blank" rel="noopener noreferrer" className="text-sm text-ink-light hover:text-ink transition-colors">
                X / Twitter
              </a>
            </div>
          </div>
        </div>
        <div className="sketch-divider mt-8 pt-6 flex items-center justify-between">
          <p className="text-xs text-ink-lighter">Built by robots, for humans. Fully open source.</p>
          <p className="text-xs text-ink-lighter font-mono">2026 AMG</p>
        </div>
      </div>
    </footer>
  );
}
