"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWs } from "./ws-provider";

const links = [
  { href: "/dashboard", label: "Overview", icon: "~" },
  { href: "/dashboard/trades", label: "Trades", icon: "$" },
  { href: "/dashboard/positions", label: "Positions", icon: "%" },
  { href: "/dashboard/decisions", label: "Decisions", icon: "?" },
  { href: "/dashboard/fees", label: "Fees", icon: "+" },
  { href: "/dashboard/distributions", label: "Distributions", icon: ">" },
  { href: "/dashboard/risk", label: "Risk", icon: "!" },
];

export function DashboardNav() {
  const pathname = usePathname();
  const { connected } = useWs();

  return (
    <nav className="w-48 shrink-0">
      <div className="sticky top-28">
        <div className="mb-4 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? "bg-green" : "bg-red"}`} />
          <span className="text-xs text-ink-lighter font-mono">{connected ? "live" : "offline"}</span>
        </div>
        <div className="flex flex-col gap-1">
          {links.map(({ href, label, icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  active
                    ? "bg-ink text-cream sketch-border"
                    : "text-ink-light hover:text-ink hover:bg-cream-dark"
                }`}
                style={active ? { boxShadow: "2px 2px 0px var(--color-ink)", borderRadius: "3px 8px 5px 10px" } : {}}
              >
                <span className="font-hand text-lg leading-none">{icon}</span>
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
