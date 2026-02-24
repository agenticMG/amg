import Link from "next/link";

function ArrowRight() {
  return (
    <svg className="w-4 h-4 inline-block ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  );
}

function FeatureCard({ icon, title, desc, wonky }: { icon: string; title: string; desc: string; wonky: string }) {
  return (
    <div className={`sketch-card bg-paper p-6 ${wonky}`}>
      <span className="font-hand text-4xl">{icon}</span>
      <h3 className="font-hand text-2xl font-bold mt-3 mb-2">{title}</h3>
      <p className="text-ink-light text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function StepCard({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="sketch-border bg-paper w-10 h-10 flex items-center justify-center shrink-0">
        <span className="font-hand text-xl font-bold">{num}</span>
      </div>
      <div>
        <h4 className="font-semibold text-sm">{title}</h4>
        <p className="text-ink-light text-sm mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16">
        <div className="max-w-3xl">
          <div className="inline-block sketch-border bg-paper px-3 py-1 mb-6 wonky-2">
            <span className="font-hand text-sm">fully autonomous &amp; open source</span>
          </div>
          <h1 className="font-hand text-6xl md:text-7xl font-bold leading-[0.95] mb-6">
            An AI robot that<br />
            <span className="marker-highlight">trades Solana</span><br />
            while you sleep
          </h1>
          <p className="text-ink-light text-lg leading-relaxed max-w-xl mb-8">
            AMG is an autonomous AI trading agent powered by Claude. It analyzes markets,
            makes decisions, executes trades, manages risk, and claims LP fees — all on its own,
            24/7, with every decision logged publicly.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="sketch-border bg-ink text-cream px-6 py-3 font-semibold text-sm hover:translate-x-[-1px] hover:translate-y-[-1px] transition-transform inline-block"
              style={{ boxShadow: "3px 3px 0px var(--color-ink)" }}
            >
              View Live Dashboard <ArrowRight />
            </Link>
            <a
              href="https://github.com/agenticMG/amg"
              target="_blank"
              rel="noopener noreferrer"
              className="sketch-border-light bg-paper px-6 py-3 font-semibold text-sm text-ink-light hover:text-ink transition-colors inline-block"
            >
              Read the Code
            </a>
          </div>
        </div>
      </section>

      {/* Divider doodle */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="sketch-divider" />
      </div>

      {/* What it does */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="font-hand text-4xl font-bold mb-3">What does AMG actually do?</h2>
          <p className="text-ink-light max-w-lg mx-auto">
            Every few minutes, the agent wakes up, looks at the world, thinks, and acts.
            Here&apos;s the loop.
          </p>
        </div>
        <div className="grid grid-cols-4 gap-6">
          <FeatureCard
            icon="👁"
            title="Observes"
            desc="Fetches real-time prices, market data, portfolio balances, and open positions from Solana."
            wonky="wonky-1"
          />
          <FeatureCard
            icon="🧠"
            title="Thinks"
            desc="Claude AI analyzes everything — market conditions, portfolio state, risk rules — and makes a trading decision."
            wonky="wonky-2"
          />
          <FeatureCard
            icon="⚡"
            title="Acts"
            desc="Executes spot swaps, opens/closes perp positions, and claims Meteora LP fees via Jupiter."
            wonky="wonky-3"
          />
          <FeatureCard
            icon="🛡"
            title="Protects"
            desc="6 risk rules gate every trade: position limits, stop losses, leverage caps, loss cooldowns."
            wonky="wonky-1"
          />
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 gap-16 items-start">
          <div>
            <h2 className="font-hand text-4xl font-bold mb-6">How it works</h2>
            <div className="space-y-6">
              <StepCard num="1" title="Market Intelligence" desc="Birdeye API fetches SOL, BTC, ETH prices, top movers, and sentiment analysis. Data is cached and refreshed every 60 seconds." />
              <StepCard num="2" title="Portfolio Tracking" desc="Reads on-chain wallet balances, token accounts, perp positions, and LP positions. Snapshots are saved to PostgreSQL every cycle." />
              <StepCard num="3" title="AI Decision Engine" desc="Claude receives a structured prompt with portfolio, market, and risk data. It returns a JSON decision: HOLD, SPOT_SWAP, OPEN_PERP, CLOSE_PERP, or ADD_LIQUIDITY." />
              <StepCard num="4" title="Risk Gate" desc="Every decision passes through 6 risk rules before execution. If any rule trips — position too large, daily loss exceeded, etc. — the trade is blocked." />
              <StepCard num="5" title="Execution" desc="Approved trades execute via Jupiter (swaps + perps) and Meteora (LP fee claims) with on-chain transaction signatures." />
              <StepCard num="6" title="Logging" desc="Every decision, trade, risk event, and portfolio snapshot is stored in PostgreSQL and visible on the live dashboard." />
            </div>
          </div>
          <div className="sketch-card bg-paper p-6 wonky-2">
            <h3 className="font-hand text-2xl font-bold mb-4">The Stack</h3>
            <div className="space-y-3 font-mono text-sm">
              {[
                ["Runtime", "ElizaOS v2 + Bun"],
                ["AI", "Claude (Anthropic)"],
                ["Chain", "Solana"],
                ["DEX", "Jupiter (swaps + perps)"],
                ["LP", "Meteora DLMM"],
                ["Data", "Birdeye + Helius"],
                ["Database", "PostgreSQL + Drizzle"],
                ["Dashboard", "Next.js + Tailwind"],
                ["Infra", "Docker Compose"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-dashed border-ink-faint pb-2">
                  <span className="text-ink-lighter">{k}</span>
                  <span className="text-ink font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Transparency section */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="sketch-card bg-paper p-10 text-center">
          <h2 className="font-hand text-4xl font-bold mb-4">Full Transparency</h2>
          <p className="text-ink-light max-w-lg mx-auto mb-8">
            Every single trade, every decision, every risk event — it&apos;s all public.
            The code is open source. The dashboard is live. Nothing is hidden.
          </p>
          <div className="flex justify-center gap-6">
            <div className="text-center">
              <p className="font-hand text-3xl font-bold">100%</p>
              <p className="text-ink-lighter text-xs mt-1">Open Source</p>
            </div>
            <div className="w-px bg-ink-faint" />
            <div className="text-center">
              <p className="font-hand text-3xl font-bold">24/7</p>
              <p className="text-ink-lighter text-xs mt-1">Autonomous</p>
            </div>
            <div className="w-px bg-ink-faint" />
            <div className="text-center">
              <p className="font-hand text-3xl font-bold">Real-time</p>
              <p className="text-ink-lighter text-xs mt-1">Dashboard</p>
            </div>
            <div className="w-px bg-ink-faint" />
            <div className="text-center">
              <p className="font-hand text-3xl font-bold">6</p>
              <p className="text-ink-lighter text-xs mt-1">Risk Rules</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <h2 className="font-hand text-5xl font-bold mb-4">Watch the robot work</h2>
        <p className="text-ink-light mb-8">See every decision in real-time. No secrets, no hidden trades.</p>
        <Link
          href="/dashboard"
          className="sketch-border bg-ink text-cream px-8 py-4 font-semibold hover:translate-x-[-1px] hover:translate-y-[-1px] transition-transform inline-block"
          style={{ boxShadow: "3px 3px 0px var(--color-ink)" }}
        >
          Open Dashboard <ArrowRight />
        </Link>
      </section>
    </div>
  );
}
