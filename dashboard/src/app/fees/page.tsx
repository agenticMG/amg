import { FeesTable } from "@/components/fees-table";

export default function FeesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Meteora Fee Claims</h1>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <FeesTable />
      </div>
    </div>
  );
}
