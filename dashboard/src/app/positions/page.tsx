import { PositionsTable } from "@/components/positions-table";

export default function PositionsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Perp Positions</h1>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <PositionsTable />
      </div>
    </div>
  );
}
