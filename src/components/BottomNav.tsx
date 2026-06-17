"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Eye,
  Path,
  VinylRecord,
  CalendarBlank,
  ChartLineUp,
} from "@phosphor-icons/react";

const TABS = [
  { href: "/vision", label: "Vision", Icon: Eye },
  { href: "/roadmap", label: "Roadmap", Icon: Path },
  { href: "/releases", label: "Releases", Icon: VinylRecord },
  { href: "/content", label: "Content", Icon: CalendarBlank },
  { href: "/results", label: "Results", Icon: ChartLineUp },
];

/*
  Persistent mobile bottom navigation for the artist's five pages (Section 6.7).
  Active tab is marked with a thin cyan bar — cyan is reserved for "active"
  states in the brand system.
*/
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface-secondary/95 backdrop-blur">
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`relative flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-2 transition-colors ${
                  active ? "text-ink" : "text-ink-soft"
                }`}
              >
                {active && (
                  <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-accent-cyan" />
                )}
                <Icon size={25} weight={active ? "regular" : "thin"} />
                <span className="text-[11px] tracking-wide">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
