/**
 * Renders the PWA icon set from the same Ganesha line art the app uses.
 *
 *   node scripts/generate-icons.mjs
 *
 * Re-run this whenever the mark in src/components/brand/ganesha-mark.tsx changes.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT = path.join(process.cwd(), "public", "icons");
const SAFFRON = "#ea5308";

/** The mark, drawn inside a 64×64 box. Kept in sync with GaneshaMark. */
const MARK = `
  <g stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M24.8 16.6c0-6 3.2-10.6 7.2-10.6s7.2 4.6 7.2 10.6" />
    <path d="M19.8 23.6c1.4-5.6 6.2-9.6 12.2-9.6s10.8 4 12.2 9.6" />
    <path d="M20.2 21.6c-6.6-2.2-11.4 1.8-11.4 8.2 0 5.6 3.6 9.4 7.8 9.4 2.6 0 4.4-1.5 5-3.6" />
    <path d="M43.8 21.6c6.6-2.2 11.4 1.8 11.4 8.2 0 5.6-3.6 9.4-7.8 9.4-2.6 0-4.4-1.5-5-3.6" />
    <path d="M24.6 26.4h5.4M34 26.4h5.4" />
    <path d="M32 28.2c0 6.4-.6 9.2-3.4 12.4-2.4 2.8-3.6 5.2-3.6 8 0 3.4 2.6 5.8 5.6 5.8 2.6 0 4.4-1.6 5-3.8" />
    <path d="M14 55c4-3.6 10.6-5.6 18-5.6s14 2 18 5.6" opacity=".5" />
  </g>
  <circle cx="32" cy="3.4" r="1.7" fill="#fff" />
  <circle cx="32" cy="20.4" r="1.5" fill="#fff" />
`;

/**
 * @param {object} opts
 * @param {number} opts.size      canvas size in px
 * @param {number} opts.inset     0–0.5, how far the mark is inset from the edge
 * @param {number} opts.radius    corner radius as a fraction of size (1 = circle)
 */
function svg({ size, inset, radius }) {
  const box = size * (1 - inset * 2);
  const r = size * radius;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="${SAFFRON}"/>
  <svg x="${size * inset}" y="${size * inset}" width="${box}" height="${box}" viewBox="0 0 64 64">${MARK}</svg>
</svg>`;
}

const TARGETS = [
  // Standard launcher icons — generous corner radius, art near the edges.
  { file: "icon-192.png", size: 192, inset: 0.14, radius: 0.22 },
  { file: "icon-512.png", size: 512, inset: 0.14, radius: 0.22 },
  // Maskable icons get cropped to a circle by Android, so the art sits well
  // inside the 80% safe zone and the background is a full bleed square.
  { file: "maskable-512.png", size: 512, inset: 0.26, radius: 0 },
  // iOS applies its own mask and does not want transparency or rounding.
  { file: "apple-touch-icon.png", size: 180, inset: 0.16, radius: 0 },
];

await mkdir(OUT, { recursive: true });

for (const target of TARGETS) {
  const markup = svg(target);
  const png = await sharp(Buffer.from(markup)).png({ compressionLevel: 9 }).toBuffer();
  await writeFile(path.join(OUT, target.file), png);
  console.log(`wrote icons/${target.file} (${target.size}px)`);
}

// A vector favicon for browsers that prefer one.
await writeFile(
  path.join(OUT, "icon.svg"),
  svg({ size: 64, inset: 0.1, radius: 0.22 }),
);
console.log("wrote icons/icon.svg");

// Next.js picks up src/app/favicon.ico automatically; a 48px PNG covers the rest.
const favicon = await sharp(Buffer.from(svg({ size: 48, inset: 0.1, radius: 0.22 })))
  .png()
  .toBuffer();
await writeFile(path.join(process.cwd(), "public", "favicon.png"), favicon);
console.log("wrote favicon.png");
