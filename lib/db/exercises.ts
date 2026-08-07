import exerciseSeedData from "@/data/exercises.seed.json";
import { db } from "@/lib/db";
import { getLocalUserId } from "@/lib/auth/session";
import { requestSync } from "@/lib/sync/syncEngine";
import { newId } from "@/lib/utils/ids";

let seedInFlight = false;

/**
 * Imports the static exercise catalog into Dexie on first login. Guarded by
 * a count check (source: 'seed' rows) so re-running on later logins is a
 * no-op, plus a module-level flag so two AuthGuard effects firing close
 * together can't both pass the count check and double-seed.
 */
export async function ensureExerciseSeed(userId: string): Promise<void> {
  if (seedInFlight) return;
  seedInFlight = true;
  try {
    const existing = await db.exercises.where("source").equals("seed").count();
    if (existing > 0) return;

    const now = new Date().toISOString();
    const rows = exerciseSeedData.map((entry) => ({
      id: newId(),
      user_id: userId,
      created_at: now,
      name_es: entry.name_es,
      name_en: entry.name_en,
      muscle_group: entry.muscle_group,
      equipment: entry.equipment,
      image_url: entry.image_url,
      is_custom: false,
      source: "seed" as const,
      synced: 0 as const,
    }));

    await db.transaction("rw", db.exercises, async () => {
      await db.exercises.bulkAdd(rows);
    });

    requestSync();
  } finally {
    seedInFlight = false;
  }
}

export async function createCustomExercise(input: {
  name_es: string;
  muscle_group: string;
}): Promise<void> {
  const userId = await getLocalUserId();
  if (!userId) return;

  await db.exercises.add({
    id: newId(),
    user_id: userId,
    created_at: new Date().toISOString(),
    name_es: input.name_es.trim(),
    name_en: null,
    muscle_group: input.muscle_group,
    equipment: null,
    image_url: null,
    is_custom: true,
    source: "custom",
    synced: 0,
  });

  requestSync();
}
