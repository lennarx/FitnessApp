"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/plan", label: "Plan" },
  { href: "/sesion", label: "Sesión" },
  { href: "/comidas", label: "Comidas" },
  { href: "/historial", label: "Historial" },
  { href: "/ejercicios", label: "Ejercicios" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 flex border-t border-neutral-800 bg-neutral-950">
      {TABS.map((tab) => {
        const isActive = pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs ${
              isActive ? "text-emerald-400" : "text-neutral-400"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
