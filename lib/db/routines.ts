import { db } from "@/lib/db";
import { getLocalUserId } from "@/lib/auth/session";
import { requestSync } from "@/lib/sync/syncEngine";
import { newId } from "@/lib/utils/ids";

// The sync engine only pushes upserts (no delete channel), so "deleting" a
// routine/day/exercise is just setting deleted_at — same pipeline, no new
// sync mechanism needed. Dexie has no FK cascade like Postgres, so deleting
// a parent row cascades the soft-delete to its children manually, in one
// transaction per operation.

export async function createRoutine(name: string): Promise<string | null> {
  const userId = await getLocalUserId();
  if (!userId) return null;

  const id = newId();
  await db.routines.add({
    id,
    user_id: userId,
    created_at: new Date().toISOString(),
    name: name.trim(),
    is_active: true,
    deleted_at: null,
    synced: 0,
  });

  requestSync();
  return id;
}

export async function updateRoutine(
  id: string,
  patch: Partial<{ name: string; is_active: boolean }>
): Promise<void> {
  await db.routines.update(id, { ...patch, synced: 0 });
  requestSync();
}

export async function deleteRoutine(id: string): Promise<void> {
  const deletedAt = new Date().toISOString();

  await db.transaction("rw", db.routines, db.routine_days, db.routine_day_exercises, async () => {
    await db.routines.update(id, { deleted_at: deletedAt, synced: 0 });

    const days = await db.routine_days.where("routine_id").equals(id).toArray();
    const dayIds = days.map((d) => d.id);
    if (dayIds.length > 0) {
      await db.routine_days
        .where("id")
        .anyOf(dayIds)
        .modify({ deleted_at: deletedAt, synced: 0 });

      const dayExercises = await db.routine_day_exercises
        .where("routine_day_id")
        .anyOf(dayIds)
        .toArray();
      const dayExerciseIds = dayExercises.map((e) => e.id);
      if (dayExerciseIds.length > 0) {
        await db.routine_day_exercises
          .where("id")
          .anyOf(dayExerciseIds)
          .modify({ deleted_at: deletedAt, synced: 0 });
      }
    }
  });

  requestSync();
}

export async function createRoutineDay(input: {
  routine_id: string;
  day_label: string;
  day_order: number;
}): Promise<string | null> {
  const userId = await getLocalUserId();
  if (!userId) return null;

  const id = newId();
  await db.routine_days.add({
    id,
    user_id: userId,
    created_at: new Date().toISOString(),
    routine_id: input.routine_id,
    day_label: input.day_label.trim(),
    day_order: input.day_order,
    notes: null,
    deleted_at: null,
    synced: 0,
  });

  requestSync();
  return id;
}

export async function updateRoutineDay(
  id: string,
  patch: Partial<{ day_label: string; day_order: number; notes: string | null }>
): Promise<void> {
  await db.routine_days.update(id, { ...patch, synced: 0 });
  requestSync();
}

export async function deleteRoutineDay(id: string): Promise<void> {
  const deletedAt = new Date().toISOString();

  await db.transaction("rw", db.routine_days, db.routine_day_exercises, async () => {
    await db.routine_days.update(id, { deleted_at: deletedAt, synced: 0 });

    const dayExercises = await db.routine_day_exercises
      .where("routine_day_id")
      .equals(id)
      .toArray();
    const dayExerciseIds = dayExercises.map((e) => e.id);
    if (dayExerciseIds.length > 0) {
      await db.routine_day_exercises
        .where("id")
        .anyOf(dayExerciseIds)
        .modify({ deleted_at: deletedAt, synced: 0 });
    }
  });

  requestSync();
}

const DEFAULT_TARGET_SETS = 3;
const DEFAULT_TARGET_REPS_MIN = 8;
const DEFAULT_TARGET_REPS_MAX = 12;
const DEFAULT_TARGET_RIR = 2;

export async function createRoutineDayExercise(input: {
  routine_day_id: string;
  exercise_id: string;
  exercise_order: number;
  target_sets?: number;
  target_reps_min?: number;
  target_reps_max?: number;
  target_rir?: number | null;
  rest_seconds?: number | null;
  progression_notes?: string | null;
}): Promise<string | null> {
  const userId = await getLocalUserId();
  if (!userId) return null;

  const id = newId();
  await db.routine_day_exercises.add({
    id,
    user_id: userId,
    created_at: new Date().toISOString(),
    routine_day_id: input.routine_day_id,
    exercise_id: input.exercise_id,
    exercise_order: input.exercise_order,
    target_sets: input.target_sets ?? DEFAULT_TARGET_SETS,
    target_reps_min: input.target_reps_min ?? DEFAULT_TARGET_REPS_MIN,
    target_reps_max: input.target_reps_max ?? DEFAULT_TARGET_REPS_MAX,
    target_rir: input.target_rir === undefined ? DEFAULT_TARGET_RIR : input.target_rir,
    rest_seconds: input.rest_seconds ?? null,
    progression_notes: input.progression_notes ?? null,
    deleted_at: null,
    synced: 0,
  });

  requestSync();
  return id;
}

export async function updateRoutineDayExercise(
  id: string,
  patch: Partial<{
    target_sets: number;
    target_reps_min: number;
    target_reps_max: number;
    target_rir: number | null;
    rest_seconds: number | null;
    progression_notes: string | null;
  }>
): Promise<void> {
  await db.routine_day_exercises.update(id, { ...patch, synced: 0 });
  requestSync();
}

export async function deleteRoutineDayExercise(id: string): Promise<void> {
  await db.routine_day_exercises.update(id, {
    deleted_at: new Date().toISOString(),
    synced: 0,
  });
  requestSync();
}

async function swapRoutineDayExerciseOrder(
  routineDayId: string,
  id: string,
  direction: "up" | "down"
): Promise<void> {
  const dayExercises = await db.routine_day_exercises
    .where("routine_day_id")
    .equals(routineDayId)
    .filter((e) => e.deleted_at === null)
    .sortBy("exercise_order");

  const index = dayExercises.findIndex((e) => e.id === id);
  const neighborIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || neighborIndex < 0 || neighborIndex >= dayExercises.length) return;

  const current = dayExercises[index];
  const neighbor = dayExercises[neighborIndex];

  await db.transaction("rw", db.routine_day_exercises, async () => {
    await db.routine_day_exercises.update(current.id, {
      exercise_order: neighbor.exercise_order,
      synced: 0,
    });
    await db.routine_day_exercises.update(neighbor.id, {
      exercise_order: current.exercise_order,
      synced: 0,
    });
  });

  requestSync();
}

export function moveRoutineDayExerciseUp(routineDayId: string, id: string): Promise<void> {
  return swapRoutineDayExerciseOrder(routineDayId, id, "up");
}

export function moveRoutineDayExerciseDown(routineDayId: string, id: string): Promise<void> {
  return swapRoutineDayExerciseOrder(routineDayId, id, "down");
}
