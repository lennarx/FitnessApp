"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BottomNav } from "@/components/nav/BottomNav";
import { SyncStatusBadge } from "@/components/sync/SyncStatusBadge";
import { ensureExerciseSeed } from "@/lib/db/exercises";
import { createClient } from "@/lib/supabase/client";
import { useSyncTrigger } from "@/lib/sync/useSyncTrigger";

const PUBLIC_PATH_PREFIXES = ["/login", "/auth"];

/**
 * Client-side session gate. Uses getSession() — reads the persisted local
 * session with no network call — never getUser(), which would validate
 * against Supabase's servers and incorrectly block the user while offline.
 * This is what lets the installed PWA open while in airplane mode: once
 * Serwist serves the cached shell, this is the only thing deciding whether
 * to render the app or bounce to /login.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_PATH_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  const [status, setStatus] = useState<"checking" | "authed" | "guest">(
    "checking"
  );

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setStatus(session ? "authed" : "guest");
      if (session) void ensureExerciseSeed(session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session ? "authed" : "guest");
      if (session) void ensureExerciseSeed(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (status === "guest" && !isPublicRoute) {
      router.replace("/login");
    }
  }, [status, isPublicRoute, router]);

  // Called unconditionally (Rules of Hooks) — pushPending() is a no-op when
  // there's nothing local to push yet, which is always true before login.
  useSyncTrigger();

  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (status !== "authed") {
    return null;
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-800 bg-neutral-950 p-2">
        <Link
          href="/ajustes"
          aria-label="Ajustes"
          className="rounded-md px-2 py-1 text-lg text-neutral-400"
        >
          ⚙
        </Link>
        <SyncStatusBadge />
      </div>
      <div className="flex-1">{children}</div>
      <BottomNav />
    </div>
  );
}
