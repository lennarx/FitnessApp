import { db } from "@/lib/db";
import { getLocalUserId } from "@/lib/auth/session";
import { requestSync } from "@/lib/sync/syncEngine";
import { parseLoad } from "@/lib/utils/parseLoad";
import { todayLocalDate } from "@/lib/utils/dates";
import { newId } from "@/lib/utils/ids";

/**
 * Finds today's training session for a given routine day (or the free
 * session when routineDayId is null) and returns its id, or creates one.
 * Matching on routine_day_id exactly (including the null case) is what lets
 * a free session and a routine-day session coexist on the same date without
 * one resuming the other. Wrapped in a transaction so two taps in quick
 * succession can't both miss the existing row and create two sessions.
 */
export async function getOrCreateTrainingSession(
  routineDayId: string | null
): Promise<string | null> {
  const userId = await getLocalUserId();
  if (!userId) return null;

  const sessionDate = todayLocalDate();

  const id = await db.transaction("rw", db.training_sessions, async () => {
    const existing = await db.training_sessions
      .where("session_date")
      .equals(sessionDate)
      .and((s) => s.user_id === userId && s.routine_day_id === routineDayId)
      .first();

    if (existing) return existing.id;

    const newSessionId = newId();
    await db.training_sessions.add({
      id: newSessionId,
      user_id: userId,
      created_at: new Date().toISOString(),
      routine_day_id: routineDayId,
      session_date: sessionDate,
      started_at: new Date().toISOString(),
      ended_at: null,
      notes: null,
      synced: 0,
    });
    return newSessionId;
  });

  requestSync();
  return id;
}

export async function updateTrainingSession(
  id: string,
  patch: Partial<{ notes: string | null; ended_at: string | null }>
): Promise<void> {
  await db.training_sessions.update(id, { ...patch, synced: 0 });
  requestSync();
}

export function endTrainingSession(id: string): Promise<void> {
  return updateTrainingSession(id, { ended_at: new Date().toISOString() });
}

export async function createLoggedSet(input: {
  training_session_id: string;
  exercise_id: string;
  set_order: number;
  load_raw: string;
  reps: number;
  rir: number | null;
}): Promise<string | null> {
  const userId = await getLocalUserId();
  if (!userId) return null;

  const id = newId();
  await db.logged_sets.add({
    id,
    user_id: userId,
    created_at: new Date().toISOString(),
    training_session_id: input.training_session_id,
    exercise_id: input.exercise_id,
    set_order: input.set_order,
    reps: input.reps,
    rir: input.rir,
    load_raw: input.load_raw.trim(),
    load_normalized_kg: parseLoad(input.load_raw),
    deleted_at: null,
    synced: 0,
  });

  requestSync();
  return id;
}

/**
 * If the patch carries load_raw, load_normalized_kg is recomputed in the
 * same update so the two never drift apart — callers never pass
 * load_normalized_kg directly.
 */
export async function updateLoggedSet(
  id: string,
  patch: Partial<{ load_raw: string; reps: number; rir: number | null }>
): Promise<void> {
  const { load_raw, ...rest } = patch;
  await db.logged_sets.update(id, {
    ...rest,
    ...(load_raw !== undefined
      ? { load_raw: load_raw.trim(), load_normalized_kg: parseLoad(load_raw) }
      : {}),
    synced: 0,
  });
  requestSync();
}

export async function deleteLoggedSet(id: string): Promise<void> {
  await db.logged_sets.update(id, {
    deleted_at: new Date().toISOString(),
    synced: 0,
  });
  requestSync();
}

export async function createCardioSession(input: {
  activity_type: "swim" | "other";
  duration_minutes: number;
  distance_meters: number | null;
  intensity_raw: string | null;
  intensity_rpe: number | null;
  notes: string | null;
}): Promise<string | null> {
  const userId = await getLocalUserId();
  if (!userId) return null;

  const id = newId();
  await db.cardio_sessions.add({
    id,
    user_id: userId,
    created_at: new Date().toISOString(),
    // Cardio is a day-level record, not tied to a gym session, so a swim on
    // a rest day (no training_session that date) can still be logged.
    training_session_id: null,
    session_date: todayLocalDate(),
    activity_type: input.activity_type,
    duration_minutes: input.duration_minutes,
    distance_meters: input.distance_meters,
    intensity_raw: input.intensity_raw,
    intensity_rpe: input.intensity_rpe,
    notes: input.notes,
    synced: 0,
  });

  requestSync();
  return id;
}
