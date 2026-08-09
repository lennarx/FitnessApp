import { db } from "@/lib/db";
import { getLocalUserId } from "@/lib/auth/session";
import { requestSync } from "@/lib/sync/syncEngine";
import { newId } from "@/lib/utils/ids";

export async function createNlInboxEntry(input: {
  kind: "sets" | "meal";
  raw_text: string;
}): Promise<string | null> {
  const userId = await getLocalUserId();
  if (!userId) return null;

  const id = newId();
  await db.nl_inbox.add({
    id,
    user_id: userId,
    created_at: new Date().toISOString(),
    kind: input.kind,
    raw_text: input.raw_text.trim(),
    status: "pending",
    synced: 0,
  });

  requestSync();
  return id;
}

export async function markNlInboxProcessed(id: string): Promise<void> {
  await db.nl_inbox.update(id, { status: "processed", synced: 0 });
  requestSync();
}

export async function discardNlInboxEntry(id: string): Promise<void> {
  await db.nl_inbox.update(id, { status: "discarded", synced: 0 });
  requestSync();
}
