/**
 * One-time icon generator — NOT part of the app bundle. Run manually with:
 *
 *   npx tsx scripts/build-icons.ts
 *
 * Rasterizes a vector dumbbell glyph (drawn with <rect>, never <text> — an
 * SVG renderer's text rendering depends on system fonts, which isn't
 * reliable across platforms) over the app's theme_color background, and
 * writes the actual PNGs the app ships. Re-run and commit the output
 * whenever the mark needs to change; nothing reads this script at runtime.
 *
 * Requires `sharp`, which ships as an optional dependency of `next` and is
 * already present in node_modules — see package-lock.json.
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const ICONS_DIR = path.join(REPO_ROOT, "public", "icons");
const PUBLIC_DIR = path.join(REPO_ROOT, "public");

const BACKGROUND = "#0a0a0a";
const FOREGROUND = "#10b981";

// Reference dumbbell (bar + two plates + two collars), hand-tuned so its
// bounding box spans exactly 70% of a 0-100 viewBox. Scaled about the
// canvas center (50,50) to hit an arbitrary target fill fraction below.
const REFERENCE_FRACTION = 0.7;
const REFERENCE_RECTS = [
  { x: 30, y: 45, width: 40, height: 10, rx: 5 }, // bar
  { x: 15, y: 30, width: 15, height: 40, rx: 4 }, // left plate
  { x: 70, y: 30, width: 15, height: 40, rx: 4 }, // right plate
  { x: 27, y: 38, width: 6, height: 24, rx: 2 }, // left collar
  { x: 67, y: 38, width: 6, height: 24, rx: 2 }, // right collar
];

function buildIconSvg(fillFraction: number): string {
  const factor = fillFraction / REFERENCE_FRACTION;
  const center = 50;

  const rectsMarkup = REFERENCE_RECTS.map((r) => {
    const x = center + (r.x - center) * factor;
    const y = center + (r.y - center) * factor;
    return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${(r.width * factor).toFixed(2)}" height="${(r.height * factor).toFixed(2)}" rx="${(r.rx * factor).toFixed(2)}" fill="${FOREGROUND}" />`;
  }).join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect x="0" y="0" width="100" height="100" fill="${BACKGROUND}" />
    ${rectsMarkup}
  </svg>`;
}

async function render(svg: string, size: number, outPath: string): Promise<void> {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outPath);
  console.log(`wrote ${outPath} (${size}x${size})`);
}

async function main() {
  await mkdir(ICONS_DIR, { recursive: true });

  // Standard icons: glyph fills ~72% of the canvas.
  await render(buildIconSvg(0.72), 192, path.join(ICONS_DIR, "icon-192.png"));
  await render(buildIconSvg(0.72), 512, path.join(ICONS_DIR, "icon-512.png"));

  // Maskable: Android crops to a circle/squircle, so the glyph needs a real
  // ~20%-per-side safe zone — smaller fill fraction than the standard icon.
  await render(buildIconSvg(0.6), 512, path.join(ICONS_DIR, "icon-512-maskable.png"));

  // iOS looks for /apple-touch-icon.png at the public root by convention,
  // even without an explicit <link> tag.
  await render(buildIconSvg(0.72), 180, path.join(PUBLIC_DIR, "apple-touch-icon.png"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
