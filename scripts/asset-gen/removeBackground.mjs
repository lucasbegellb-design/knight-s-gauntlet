#!/usr/bin/env node
/**
 * Strips the near-white studio background off generated hero/monster/companion
 * portraits so they read as real sprites instead of "cards" in both the HUD
 * thumbnails and the Phaser combat scene. The generator (Pollinations/AI Horde)
 * has no background-removal step of its own, so this runs as a separate pass
 * over whatever's already on disk in public/game-assets.
 *
 * Approach: flood-fill from every edge pixel through connected near-white
 * pixels, marking them transparent. Flood-fill (not a flat threshold) means
 * white highlights *inside* the subject (armor glints, teeth, etc.) survive
 * untouched as long as they're not connected to the border through other
 * near-white pixels. A 1px alpha blur softens the cutout edge afterward.
 *
 * Usage: node scripts/asset-gen/removeBackground.mjs [--only=id1,id2] [glob-dir ...]
 * Defaults to public/game-assets/{hero,monsters,companions}.
 */
import sharp from 'sharp';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../public/game-assets');

/**
 * Deliberately conservative: only treats a pixel as removable background if it's genuinely
 * near-white. A looser "any neutral/gradient tone" version was tried and rejected — it leaked
 * into grayscale subjects (skeleton bone, frost lich robes) and left ragged holes in them.
 * Missing a few colored/gray backdrops is a much smaller cost than corrupting a subject.
 */
const WHITE_MIN_CHANNEL = 225;
const WHITE_MAX_SPREAD = 22;
const FEATHER_BLUR_SIGMA = 0.6;

function isNearWhite(r, g, b) {
  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);
  return min >= WHITE_MIN_CHANNEL && max - min <= WHITE_MAX_SPREAD;
}

/** Flood-fills connected near-white pixels starting from every border pixel; returns a Uint8Array mask (1 = background). */
function floodFillBackgroundMask(data, width, height) {
  const mask = new Uint8Array(width * height);
  const visited = new Uint8Array(width * height);
  const stack = [];

  const pushIfBackground = (x, y) => {
    const i = y * width + x;
    if (visited[i]) return;
    visited[i] = 1;
    const p = i * 4;
    if (isNearWhite(data[p], data[p + 1], data[p + 2])) {
      mask[i] = 1;
      stack.push(i);
    }
  };

  for (let x = 0; x < width; x++) {
    pushIfBackground(x, 0);
    pushIfBackground(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    pushIfBackground(0, y);
    pushIfBackground(width - 1, y);
  }

  while (stack.length > 0) {
    const i = stack.pop();
    const x = i % width;
    const y = (i / width) | 0;
    if (x > 0) pushIfBackground(x - 1, y);
    if (x < width - 1) pushIfBackground(x + 1, y);
    if (y > 0) pushIfBackground(x, y - 1);
    if (y < height - 1) pushIfBackground(x, y + 1);
  }

  return mask;
}

/**
 * Many portraits also have a soft near-white "floor shadow" ellipse under the character's feet
 * that isn't connected to the border (the character's legs/base separate it from the edge), so
 * the border flood-fill above leaves it behind — and once the surrounding backdrop goes
 * transparent, that blob reads as a stray floating patch. This second pass finds near-white
 * connected components anywhere in the image and removes the ones shaped like a shadow: not
 * touching the border, sitting in the lower half, and a plausible shadow size (small isolated
 * white flecks like teeth/eye highlights are far smaller; big white gear/cloth is far bigger).
 */
const SHADOW_MIN_AREA = 250;
const SHADOW_MAX_AREA = 20000;
const SHADOW_MIN_Y_FRACTION = 0.4;

function removeFloorShadowBlobs(data, width, height) {
  const visited = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (visited[i]) continue;
      const p = i * 4;
      if (data[p + 3] === 0 || !isNearWhite(data[p], data[p + 1], data[p + 2])) {
        visited[i] = 1;
        continue;
      }

      // Flood-fill this near-white component, tracking whether it touches the border.
      const component = [i];
      visited[i] = 1;
      let touchesBorder = false;
      let minY = y;
      let maxY = y;
      let cursor = 0;
      while (cursor < component.length) {
        const idx = component[cursor++];
        const cx = idx % width;
        const cy = (idx / width) | 0;
        if (cx === 0 || cx === width - 1 || cy === 0 || cy === height - 1) touchesBorder = true;
        minY = Math.min(minY, cy);
        maxY = Math.max(maxY, cy);
        for (const [nx, ny] of [
          [cx - 1, cy],
          [cx + 1, cy],
          [cx, cy - 1],
          [cx, cy + 1],
        ]) {
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const ni = ny * width + nx;
          if (visited[ni]) continue;
          visited[ni] = 1;
          const np = ni * 4;
          if (data[np + 3] !== 0 && isNearWhite(data[np], data[np + 1], data[np + 2])) {
            component.push(ni);
          }
        }
      }

      const area = component.length;
      const centerYFraction = (minY + maxY) / 2 / height;
      if (!touchesBorder && area >= SHADOW_MIN_AREA && area <= SHADOW_MAX_AREA && centerYFraction >= SHADOW_MIN_Y_FRACTION) {
        for (const idx of component) data[idx * 4 + 3] = 0;
      }
    }
  }
}

/** Fraction of border-touching pixels the flood fill must clear before we trust it found a real background to cut out. */
const MIN_REMOVED_FRACTION = 0.02;
/** Elliptical distance (0 = center, 1 = edge midpoint, ~1.41 = corner) where the vignette fallback starts/finishes fading to transparent. */
const VIGNETTE_INNER = 0.82;
const VIGNETTE_OUTER = 1.3;

/** Fallback for images whose backdrop isn't near-white (colored/gradient scenes) — fades the far corners to transparent instead of leaving a hard-edged box, without touching the subject itself. */
function applyCornerVignette(data, width, height) {
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  for (let y = 0; y < height; y++) {
    const dy = (y - cy) / cy;
    for (let x = 0; x < width; x++) {
      const dx = (x - cx) / cx;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= VIGNETTE_INNER) continue;
      const factor = Math.max(0, 1 - (d - VIGNETTE_INNER) / (VIGNETTE_OUTER - VIGNETTE_INNER));
      const i = (y * width + x) * 4 + 3;
      data[i] = Math.round(data[i] * factor);
    }
  }
}

async function removeBackgroundFrom(filePath) {
  const image = sharp(filePath).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  const mask = floodFillBackgroundMask(data, width, height);
  let removedCount = 0;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) {
      data[i * 4 + 3] = 0;
      removedCount++;
    }
  }
  const foundRealBackground = removedCount / mask.length >= MIN_REMOVED_FRACTION;
  if (!foundRealBackground) {
    applyCornerVignette(data, width, height);
  }
  removeFloorShadowBlobs(data, width, height);

  // Blur just the alpha channel a touch to soften the hard cutout edge (feathering), keep RGB crisp.
  const alphaOnly = await sharp(data, { raw: { width, height, channels: 4 } })
    .extractChannel('alpha')
    .blur(FEATHER_BLUR_SIGMA)
    .raw()
    .toBuffer();

  const rgb = await sharp(data, { raw: { width, height, channels: 4 } }).removeAlpha().raw().toBuffer();
  const final = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    final[i * 4] = rgb[i * 3];
    final[i * 4 + 1] = rgb[i * 3 + 1];
    final[i * 4 + 2] = rgb[i * 3 + 2];
    final[i * 4 + 3] = alphaOnly[i];
  }

  let pipeline = sharp(final, { raw: { width, height, channels: 4 } });
  if (foundRealBackground) {
    // Crop the now-transparent margins so the subject fills its bounding box (source canvases have a lot of
    // empty padding around the subject, which read as "small/off-proportion" once composited into a UI card).
    pipeline = pipeline.trim({ threshold: 10 });
  }
  await pipeline.png().toFile(filePath);
}

async function main() {
  const args = process.argv.slice(2);
  const onlyArg = args.find((a) => a.startsWith('--only='));
  const only = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',')) : null;
  const dirs = args.filter((a) => !a.startsWith('--'));
  const targetDirs = dirs.length > 0 ? dirs : ['hero', 'monsters', 'companions'];

  for (const dir of targetDirs) {
    const full = path.join(ROOT, dir);
    let entries;
    try {
      entries = await readdir(full);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.endsWith('.png')) continue;
      const id = entry.replace(/\.png$/, '');
      if (only && !only.has(id)) continue;
      const filePath = path.join(full, entry);
      process.stdout.write(`processing ${dir}/${entry}... `);
      try {
        await removeBackgroundFrom(filePath);
        console.log('done');
      } catch (err) {
        console.log(`FAILED: ${err.message}`);
      }
    }
  }
}

main();
