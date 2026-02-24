import { KpiCards } from "@/components/kpi-cards";
import { PortfolioChart } from "@/components/portfolio-chart";
import { TradesTable } from "@/components/trades-table";
import { DecisionsTable } from "@/components/decisions-table";

export default function DashboardOverview() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-hand text-4xl font-bold">Dashboard</h1>
        <p className="text-ink-lighter text-sm mt-1">Real-time view of everything the agent is doing</p>
      </div>
      <KpiCards />
      <PortfolioChart />
      <div className="grid grid-cols-2 gap-6">
        <div className="sketch-card bg-paper p-5">
          <h2 className="font-hand text-xl font-semibold mb-3">Recent Trades</h2>
          <TradesTable compact />
        </div>
        <div className="sketch-card bg-paper p-5">
          <h2 className="font-hand text-xl font-semibold mb-3">Recent Decisions</h2>
          <DecisionsTable compact />
        </div>
      </div>
    </div>
  );
}
