import { FeesTable } from "@/components/fees-table";

export default function FeesPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-hand text-4xl font-bold">Meteora Fee Claims</h1>
      <div className="sketch-card bg-paper p-5">
        <FeesTable />
      </div>
    </div>
  );
}
