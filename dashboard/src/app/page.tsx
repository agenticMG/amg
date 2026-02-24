import { KpiCards } from "@/components/kpi-cards";
import { PortfolioChart } from "@/components/portfolio-chart";
import { TradesTable } from "@/components/trades-table";
import { DecisionsTable } from "@/components/decisions-table";

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Overview</h1>
      <KpiCards />
      <PortfolioChart />
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <h2 className="text-sm font-medium text-zinc-400 mb-3">Recent Trades</h2>
          <TradesTable compact />
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <h2 className="text-sm font-medium text-zinc-400 mb-3">Recent Decisions</h2>
          <DecisionsTable compact />
        </div>
      </div>
    </div>
  );
}
