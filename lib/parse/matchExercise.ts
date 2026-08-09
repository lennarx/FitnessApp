export interface ExerciseCandidate {
  id: string;
  name_es: string;
  name_en: string | null;
}

export type ExerciseMatch =
  | { kind: "single"; exercise: ExerciseCandidate }
  | { kind: "candidates"; exercises: ExerciseCandidate[] }
  | { kind: "none" };

const SINGLE_THRESHOLD = 0.6;
const SINGLE_MARGIN = 0.2;
const MAX_CANDIDATES = 5;

/** Lowercase, diacritics stripped, punctuation collapsed to whitespace. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  const normalized = normalizeText(text);
  return normalized.length > 0 ? normalized.split(" ") : [];
}

/**
 * Score = share of query tokens that match a candidate token (equal or as a
 * prefix), plus a bonus for an exact full-name match, minus a small penalty
 * per leftover candidate token — prefers "Prensa" over "Prensa inclinada 45°
 * unilateral" when the query is just "prensa".
 */
export function scoreExercise(query: string, candidate: ExerciseCandidate): number {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return 0;

  const names = [candidate.name_es, candidate.name_en].filter(
    (n): n is string => n !== null && n !== undefined
  );
  if (names.length === 0) return 0;

  const normalizedQuery = normalizeText(query);

  let best = 0;
  for (const name of names) {
    const candidateTokens = tokenize(name);
    if (candidateTokens.length === 0) continue;

    const matchedCandidateTokens = new Set<number>();
    let matchedQueryTokens = 0;

    for (const qToken of queryTokens) {
      const idx = candidateTokens.findIndex(
        (cToken, i) =>
          !matchedCandidateTokens.has(i) && (cToken === qToken || cToken.startsWith(qToken))
      );
      if (idx !== -1) {
        matchedCandidateTokens.add(idx);
        matchedQueryTokens += 1;
      }
    }

    let score = matchedQueryTokens / queryTokens.length;

    if (normalizeText(name) === normalizedQuery) {
      score += 0.5;
    }

    const leftoverTokens = candidateTokens.length - matchedCandidateTokens.size;
    score -= leftoverTokens * 0.05;

    best = Math.max(best, score);
  }

  return best;
}

export function resolveExerciseMatch(
  query: string,
  candidates: ExerciseCandidate[]
): ExerciseMatch {
  const scored = candidates
    .map((exercise) => ({ exercise, score: scoreExercise(query, exercise) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return { kind: "none" };

  const [best, second] = scored;
  const isClearWinner =
    best.score >= SINGLE_THRESHOLD && (!second || best.score - second.score >= SINGLE_MARGIN);

  if (isClearWinner) {
    return { kind: "single", exercise: best.exercise };
  }

  return { kind: "candidates", exercises: scored.slice(0, MAX_CANDIDATES).map((e) => e.exercise) };
}
