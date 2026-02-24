import { DistributionsTable } from "@/components/distributions-table";

export default function DistributionsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-hand text-4xl font-bold">Fee Distributions</h1>
      <p className="text-ink-lighter text-sm">SOL distributions to AMG token holders from claimed LP fees</p>
      <div className="sketch-card bg-paper p-5">
        <DistributionsTable />
      </div>
    </div>
  );
}
