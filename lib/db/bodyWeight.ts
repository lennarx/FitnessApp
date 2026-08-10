import { db } from "@/lib/db";
import { getLocalUserId } from "@/lib/auth/session";
import { requestSync } from "@/lib/sync/syncEngine";
import { todayLocalDate } from "@/lib/utils/dates";
import { newId } from "@/lib/utils/ids";

export async function createBodyWeight(input: {
  weight_kg: number;
  notes: string | null;
  measured_at?: string;
}): Promise<string | null> {
  const userId = await getLocalUserId();
  if (!userId) return null;

  const id = newId();
  await db.body_weight.add({
    id,
    user_id: userId,
    created_at: new Date().toISOString(),
    measured_at: input.measured_at ?? todayLocalDate(),
    weight_kg: input.weight_kg,
    notes: input.notes,
    deleted_at: null,
    synced: 0,
  });

  requestSync();
  return id;
}

export async function updateBodyWeight(
  id: string,
  patch: Partial<{ weight_kg: number; notes: string | null; measured_at: string }>
): Promise<void> {
  await db.body_weight.update(id, { ...patch, synced: 0 });
  requestSync();
}

export async function deleteBodyWeight(id: string): Promise<void> {
  await db.body_weight.update(id, { deleted_at: new Date().toISOString(), synced: 0 });
  requestSync();
}
