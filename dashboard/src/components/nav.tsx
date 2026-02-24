"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Overview" },
  { href: "/trades", label: "Trades" },
  { href: "/positions", label: "Positions" },
  { href: "/decisions", label: "Decisions" },
  { href: "/fees", label: "Fees" },
  { href: "/risk", label: "Risk" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="w-56 shrink-0 border-r border-zinc-800 bg-zinc-950 p-4 flex flex-col gap-1">
      <div className="mb-6 px-3">
        <h1 className="text-lg font-bold text-white tracking-tight">AMG Dashboard</h1>
        <p className="text-xs text-zinc-500">Autonomous Trading Agent</p>
      </div>
      {links.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              active
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
