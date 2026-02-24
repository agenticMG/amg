import { DecisionsTable } from "@/components/decisions-table";

export default function DecisionsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-hand text-4xl font-bold">Agent Decisions</h1>
      <div className="sketch-card bg-paper p-5">
        <DecisionsTable />
      </div>
    </div>
  );
}
