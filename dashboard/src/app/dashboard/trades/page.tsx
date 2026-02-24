import { TradesTable } from "@/components/trades-table";

export default function TradesPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-hand text-4xl font-bold">Trade History</h1>
      <div className="sketch-card bg-paper p-5">
        <TradesTable />
      </div>
    </div>
  );
}
