/**
 * One-time seed builder — NOT part of the app bundle. Run manually with:
 *
 *   npx tsx scripts/build-exercise-seed.ts
 *
 * Downloads the yuhonas/free-exercise-db dataset (public domain, Unlicense),
 * translates exercise names to Spanish via OpenRouter, merges the curated
 * plan-specific exercises, and writes data/exercises.seed.json — which is
 * what the app actually imports at runtime (this script never runs in the
 * browser). Re-run this whenever the upstream dataset changes or you want
 * to regenerate the translations.
 *
 * Requires OPENROUTER_API_KEY in .env.local (or the environment). Model is
 * configurable via OPENROUTER_MODEL (defaults to a cheap OpenRouter model).
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATASET_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const IMAGE_BASE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";
const BATCH_SIZE = 50;
const DEFAULT_MODEL = "deepseek/deepseek-chat";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const CURATED_PATH = path.join(REPO_ROOT, "data", "exercises.curated.json");
const OUTPUT_PATH = path.join(REPO_ROOT, "data", "exercises.seed.json");

// primaryMuscles[0] (dataset, English) -> fixed Spanish muscle_group set.
const MUSCLE_MAP: Record<string, string> = {
  chest: "pecho",
  back: "espalda",
  lats: "espalda",
  "middle back": "espalda",
  "lower back": "espalda",
  traps: "espalda",
  shoulders: "hombros",
  biceps: "bíceps",
  triceps: "tríceps",
  quadriceps: "cuádriceps",
  hamstrings: "isquios",
  glutes: "glúteos",
  calves: "gemelos",
  abdominals: "core",
  forearms: "antebrazos",
  neck: "otro",
  adductors: "otro",
  abductors: "otro",
};

interface RawExercise {
  id: string;
  name: string;
  equipment: string | null;
  primaryMuscles?: string[];
  images?: string[];
}

interface SeedExercise {
  name_es: string;
  name_en: string | null;
  muscle_group: string;
  equipment: string | null;
  image_url: string | null;
}

function muscleGroupFor(primaryMuscles: string[] | undefined): string {
  const primary = primaryMuscles?.[0];
  if (!primary) return "otro";
  return MUSCLE_MAP[primary] ?? "otro";
}

function imageUrlFor(images: string[] | undefined): string | null {
  if (!images || images.length === 0) return null;
  return `${IMAGE_BASE}${images[0]}`;
}

async function fetchDataset(): Promise<RawExercise[]> {
  const res = await fetch(DATASET_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch dataset: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data) || data.length === 0 || typeof data[0]?.name !== "string") {
    throw new Error("Unexpected dataset shape");
  }
  return data as RawExercise[];
}

async function translateBatch(
  names: string[],
  apiKey: string,
  model: string
): Promise<string[]> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "Traducís nombres de ejercicios de gimnasio del inglés al español rioplatense (Argentina). " +
            "Devolvé SOLO un array JSON de strings, en el mismo orden y con la misma cantidad de elementos " +
            "que la lista de entrada, sin texto adicional. Usá terminología de gimnasio habitual " +
            "(ej: 'Curl con barra', 'Press de banca con mancuernas').",
        },
        { role: "user", content: JSON.stringify(names) },
      ],
      temperature: 0,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter request failed: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? "[]";
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed) || parsed.length !== names.length) {
    throw new Error("Translation batch length mismatch");
  }
  return parsed as string[];
}

async function translateAll(
  names: string[],
  apiKey: string,
  model: string
): Promise<string[]> {
  const result: string[] = [];
  for (let i = 0; i < names.length; i += BATCH_SIZE) {
    const batch = names.slice(i, i + BATCH_SIZE);
    try {
      const translated = await translateBatch(batch, apiKey, model);
      result.push(...translated);
    } catch (err) {
      console.warn(
        `Batch ${i / BATCH_SIZE + 1} failed, retrying once (${(err as Error).message})`
      );
      try {
        const translated = await translateBatch(batch, apiKey, model);
        result.push(...translated);
      } catch (err2) {
        console.warn(
          `Batch ${i / BATCH_SIZE + 1} failed again, falling back to English names (${(err2 as Error).message})`
        );
        result.push(...batch);
      }
    }
  }
  return result;
}

async function main() {
  let raw: RawExercise[];
  let translations: string[];

  try {
    raw = await fetchDataset();
  } catch (err) {
    console.error(`Could not fetch/parse dataset, aborting: ${(err as Error).message}`);
    process.exit(1);
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

  if (!apiKey) {
    console.warn(
      "OPENROUTER_API_KEY not set — falling back to English names (no translation)."
    );
    translations = raw.map((e) => e.name);
  } else {
    translations = await translateAll(
      raw.map((e) => e.name),
      apiKey,
      model
    );
  }

  const datasetSeed: SeedExercise[] = raw.map((e, i) => ({
    name_es: translations[i] ?? e.name,
    name_en: e.name,
    muscle_group: muscleGroupFor(e.primaryMuscles),
    equipment: e.equipment ?? null,
    image_url: imageUrlFor(e.images),
  }));

  const curatedRaw = await readFile(CURATED_PATH, "utf-8");
  const curated = JSON.parse(curatedRaw) as SeedExercise[];

  const final = [...datasetSeed, ...curated];
  await writeFile(OUTPUT_PATH, JSON.stringify(final, null, 2), "utf-8");
  console.log(`Wrote ${final.length} exercises to ${path.relative(REPO_ROOT, OUTPUT_PATH)}`);
}

main();
