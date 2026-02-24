import { DashboardNav } from "@/components/nav";
import { WsProvider } from "@/components/ws-provider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <WsProvider>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          <DashboardNav />
          <div className="flex-1 min-w-0">
            {children}
          </div>
        </div>
      </div>
    </WsProvider>
  );
}
