import { TradesTable } from "@/components/trades-table";

export default function TradesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Trade History</h1>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <TradesTable />
      </div>
    </div>
  );
}
