import { RiskTable } from "@/components/risk-table";

export default function RiskPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-hand text-4xl font-bold">Risk Events</h1>
      <div className="sketch-card bg-paper p-5">
        <RiskTable />
      </div>
    </div>
  );
}
