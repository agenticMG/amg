import { DecisionsTable } from "@/components/decisions-table";

export default function DecisionsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Agent Decisions</h1>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <DecisionsTable />
      </div>
    </div>
  );
}
