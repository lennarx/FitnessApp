/**
 * Generates the id used as both the Dexie primary key and the Supabase row
 * id, so retried pushes upsert onto the same row instead of duplicating it.
 */
export function newId(): string {
  return crypto.randomUUID();
}
