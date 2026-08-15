/**
 * Renders the PWA icon set and the link-share card from the committee emblem.
 *
 *   node scripts/generate-icons.mjs
 *
 * Re-run this whenever public/brand/logo.png changes.
 *
 * Two marks, deliberately:
 *
 *   - The emblem (public/brand/logo.png) carries the committee's name, village
 *     and year in its artwork. It only reads at size, so it is used for the
 *     launcher icons and the share card, where it is never smaller than 180px.
 *   - The line-art mark in src/components/brand/ganesha-mark.tsx stays the
 *     in-app logo at 16–32px, and still draws the browser favicon below, since
 *     five lines of text in a 32px square would be a smudge.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT = path.join(process.cwd(), "public", "icons");
const LOGO = path.join(process.cwd(), "public", "brand", "logo.png");
const SAFFRON = "#ea5308";
/** Warm white. The emblem is gold on navy, which the brand saffron muddies. */
const CREAM = "#fff6ec";

/** The line-art mark, drawn inside a 64×64 box. Kept in sync with GaneshaMark. */
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

/** Saffron tile carrying the line-art mark — used for the favicon sizes. */
function markSvg({ size, inset, radius }) {
  const box = size * (1 - inset * 2);
  const r = size * radius;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="${SAFFRON}"/>
  <svg x="${size * inset}" y="${size * inset}" width="${box}" height="${box}" viewBox="0 0 64 64">${MARK}</svg>
</svg>`;
}

/** A rounded cream tile for the emblem to sit on. */
function tileSvg({ size, radius }) {
  const r = size * radius;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="${CREAM}"/>
</svg>`,
  );
}

const TARGETS = [
  // Standard launcher icons — generous corner radius, art near the edges.
  { file: "icon-192.png", size: 192, inset: 0.06, radius: 0.22 },
  { file: "icon-512.png", size: 512, inset: 0.06, radius: 0.22 },
  // Maskable icons get cropped to a circle by Android, so the art sits well
  // inside the 80% safe zone and the background is a full bleed square.
  { file: "maskable-512.png", size: 512, inset: 0.14, radius: 0 },
  // iOS applies its own mask and does not want transparency or rounding.
  { file: "apple-touch-icon.png", size: 180, inset: 0.06, radius: 0 },
];

await mkdir(OUT, { recursive: true });

for (const { file, size, inset, radius } of TARGETS) {
  const inner = Math.round(size * (1 - inset * 2));
  const emblem = await sharp(LOGO)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const png = await sharp(tileSvg({ size, radius }))
    .composite([{ input: emblem, gravity: "centre" }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  await writeFile(path.join(OUT, file), png);
  console.log(`wrote icons/${file} (${size}px)`);
}

/**
 * Link-share card. This is what a villager sees when the app is forwarded on
 * WhatsApp, so it is the emblem at its most legible: 1200×630, the standard
 * Open Graph frame, with the artwork centred and never cropped.
 */
const OG = { width: 1200, height: 630 };
const ogEmblem = await sharp(LOGO)
  .resize(Math.round(OG.height * 0.86), Math.round(OG.height * 0.86), {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .toBuffer();

const og = await sharp({
  create: {
    width: OG.width,
    height: OG.height,
    channels: 4,
    background: { r: 255, g: 246, b: 236, alpha: 1 },
  },
})
  .composite([{ input: ogEmblem, gravity: "centre" }])
  .png({ compressionLevel: 9 })
  .toBuffer();

await writeFile(path.join(process.cwd(), "public", "og.png"), og);
console.log(`wrote og.png (${OG.width}×${OG.height})`);

// A vector favicon for browsers that prefer one — the line-art mark, which is
// the only one of the two that survives being drawn at 16px.
await writeFile(
  path.join(OUT, "icon.svg"),
  markSvg({ size: 64, inset: 0.1, radius: 0.22 }),
);
console.log("wrote icons/icon.svg");

// Next.js picks up src/app/favicon.ico automatically; a 48px PNG covers the rest.
const favicon = await sharp(Buffer.from(markSvg({ size: 48, inset: 0.1, radius: 0.22 })))
  .png()
  .toBuffer();
await writeFile(path.join(process.cwd(), "public", "favicon.png"), favicon);
console.log("wrote favicon.png");
