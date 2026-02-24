import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { WsProvider } from "@/components/ws-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "AMG Dashboard",
  description: "Autonomous Trading Agent Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 antialiased">
        <WsProvider>
          <div className="flex h-screen overflow-hidden">
            <Nav />
            <main className="flex-1 overflow-y-auto p-6">
              {children}
            </main>
          </div>
        </WsProvider>
      </body>
    </html>
  );
}
