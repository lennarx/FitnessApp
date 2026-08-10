import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { LocalNlInbox } from "@/types/entities";

/** Pending inbox entries of a given kind, newest first. Fase 4 only uses "sets". */
export function usePendingNlInbox(kind: "sets" | "meal"): LocalNlInbox[] | undefined {
  return useLiveQuery(async () => {
    const entries = await db.nl_inbox
      .where("status")
      .equals("pending")
      .filter((e) => e.kind === kind)
      .toArray();

    return entries.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }, [kind]);
}
