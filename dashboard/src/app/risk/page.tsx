import { RiskTable } from "@/components/risk-table";

export default function RiskPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Risk Events</h1>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <RiskTable />
      </div>
    </div>
  );
}
