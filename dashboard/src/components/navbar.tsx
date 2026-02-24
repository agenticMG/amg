"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
];

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-cream/90 backdrop-blur-sm">
      <nav className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="font-hand text-3xl font-bold text-ink group-hover:rotate-[-2deg] transition-transform">
            AMG
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {links.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-ink text-cream sketch-border"
                    : "text-ink-light hover:text-ink hover:bg-cream-dark"
                }`}
                style={active ? { boxShadow: "2px 2px 0px var(--color-ink)", borderRadius: "3px 8px 5px 10px" } : {}}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com/agenticMG/amg"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg text-ink-light hover:text-ink hover:bg-cream-dark transition-colors"
            aria-label="GitHub"
          >
            <GithubIcon />
          </a>
          <a
            href="https://x.com/agenticMG"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg text-ink-light hover:text-ink hover:bg-cream-dark transition-colors"
            aria-label="X / Twitter"
          >
            <XIcon />
          </a>
        </div>
      </nav>
      <div className="sketch-divider max-w-6xl mx-auto" />
    </header>
  );
}
