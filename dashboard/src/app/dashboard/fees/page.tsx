import { FeesTable } from "@/components/fees-table";
import Link from "next/link";

export default function FeesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-hand text-4xl font-bold">Meteora Fee Claims</h1>
        <Link href="/dashboard/distributions" className="text-sm text-accent hover:underline">
          View Distributions →
        </Link>
      </div>
      <div className="sketch-card bg-paper p-5">
        <FeesTable />
      </div>
    </div>
  );
}
