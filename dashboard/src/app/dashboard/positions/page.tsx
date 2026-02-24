import { PositionsTable } from "@/components/positions-table";

export default function PositionsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-hand text-4xl font-bold">Perp Positions</h1>
      <div className="sketch-card bg-paper p-5">
        <PositionsTable />
      </div>
    </div>
  );
}
