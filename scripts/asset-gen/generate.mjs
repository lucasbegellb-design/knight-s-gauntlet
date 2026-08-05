#!/usr/bin/env node
// Asset generation pipeline: AI Horde (primary, community SD cluster, anonymous
// key "0000000000") with fallback to Pollinations.ai (fast, synchronous, no
// polling). Resumable: skips any id already on disk. Never blocks the game —
// missing files just mean the UI keeps using its placeholder rendering.
import { writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fullManifest } from './manifest.mjs';

/** Default style for hero/monster/icon entries (no `style` field) — Brave Frontier's actual look: saturated anime-chibi proportions, bold clean line art, dramatic rim lighting, not a generic "JRPG sprite" wash. */
const CHIBI_STYLE =
  ', Brave Frontier gacha JRPG chibi sprite, saturated anime color palette, bold clean line art, oversized expressive head-to-body ratio, dramatic rim lighting, sharp clean edges, high detail, transparent background, game asset';
/** Gacha character menu splash art — a nicer, more detailed illustration than the in-game chibi style. */
const ILLUSTRATION_STYLE =
  ', beautiful gacha character splash art, Brave Frontier style illustration, saturated anime colors, bold dynamic line art, dramatic rim lighting and glow effects, detailed fantasy character portrait, dynamic heroic pose, high quality game art, clean simple background';
/** Gacha character combat sprite — deliberately distinct from the illustration: a retro pixel-art battle sprite. */
const PIXEL_ART_STYLE =
  ', 16-bit pixel art sprite, retro SNES-era JRPG battle sprite, saturated anime-inspired color palette, limited color palette, crisp pixelated edges, no anti-aliasing, game sprite, transparent background';
/** Kingdom territories/zone backdrops — painted environment/banner art, not a character portrait. */
const LANDSCAPE_STYLE =
  ', Brave Frontier style painted fantasy environment art, world map location banner, saturated dramatic lighting, detailed matte painting, no characters in foreground, high quality game art';
const STYLE_BY_NAME = { illustration: ILLUSTRATION_STYLE, pixelArt: PIXEL_ART_STYLE, landscape: LANDSCAPE_STYLE };
/**
 * Appended to an attack-frame entry's prompt, before its style suffix. img2img (source_image +
 * source_processing, anchoring the attack frame to its idle portrait) was tried first as the fix
 * for frame-to-frame character consistency, and rejected after empirical testing: at
 * denoising_strength 0.55/0.8/0.95 the anonymous AI Horde tier consistently returned a
 * near-pixel-identical copy of the source pose regardless of the value sent — the anonymous/free
 * queue doesn't appear to honor it. Plain txt2img (used here) at least reliably delivers a real,
 * visibly different pose, which is the actual point of a second frame; character consistency
 * across the two frames is "close, not exact" — the same tradeoff already shipped and accepted
 * for companions' two independently-generated illustration/pixelArt art styles.
 */
const ATTACK_POSE_FRAGMENT = ', dynamic mid-attack action pose, weapon or fists thrust forward, motion lines, same character design';
const OUTPUT_ROOT = path.resolve(process.cwd(), 'public/game-assets');
const FAILURE_LOG = path.resolve(process.cwd(), 'scripts/asset-gen/failures.json');
const HORDE_BASE = 'https://aihorde.net/api/v2';
const HORDE_API_KEY = '0000000000';
const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt';
const POLLINATIONS_DELAY_MS = 25000;

function buildPrompt(entry) {
  const suffix = (entry.style && STYLE_BY_NAME[entry.style]) || CHIBI_STYLE;
  const poseFragment = entry.frame === 'attack' ? ATTACK_POSE_FRAGMENT : '';
  return `${entry.prompt}${poseFragment}${suffix}`;
}

function outputPath(entry) {
  const frameSuffix = entry.frame === 'attack' ? '_attack' : '';
  return path.join(OUTPUT_ROOT, entry.category, `${entry.id}${frameSuffix}.png`);
}

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function generateViaPollinations(prompt, { retries = 3, backoffMs = 20000 } = {}) {
  const url = `${POLLINATIONS_BASE}/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url);
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status === 429 && attempt < retries) {
      console.warn(`Pollinations 429, backing off ${backoffMs}ms (attempt ${attempt + 1}/${retries})`);
      await new Promise((r) => setTimeout(r, backoffMs));
      continue;
    }
    throw new Error(`Pollinations HTTP ${res.status}`);
  }
  throw new Error('Pollinations retries exhausted');
}

async function generateViaAiHorde(prompt, { pollIntervalMs = 4000, timeoutMs = 90000 } = {}) {
  const params = { width: 512, height: 512, steps: 20, sampler_name: 'k_euler', cfg_scale: 7 };
  const body = { prompt, params, models: ['stable_diffusion'], nsfw: false };
  const submitRes = await fetch(`${HORDE_BASE}/generate/async`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: HORDE_API_KEY, 'Client-Agent': 'knights-gauntlet:1.0:asset-gen' },
    body: JSON.stringify(body),
  });
  if (!submitRes.ok) throw new Error(`AI Horde submit HTTP ${submitRes.status}`);
  const { id } = await submitRes.json();
  if (!id) throw new Error('AI Horde did not return a job id');

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));
    const statusRes = await fetch(`${HORDE_BASE}/generate/status/${id}`);
    if (!statusRes.ok) continue;
    const status = await statusRes.json();
    if (status.done && status.generations?.length) {
      const imgUrl = status.generations[0].img;
      const imgRes = await fetch(imgUrl);
      if (!imgRes.ok) throw new Error(`AI Horde image fetch HTTP ${imgRes.status}`);
      return Buffer.from(await imgRes.arrayBuffer());
    }
    if (status.faulted) throw new Error('AI Horde job faulted');
  }
  throw new Error('AI Horde job timed out');
}

async function generateAsset(entry, { skipHorde = false } = {}) {
  const dest = outputPath(entry);
  const label = `${entry.category}/${path.basename(dest, '.png')}`;
  if (await fileExists(dest)) {
    console.log(`skip (exists): ${label}`);
    return { entry, status: 'skipped' };
  }

  const prompt = buildPrompt(entry);
  await mkdir(path.dirname(dest), { recursive: true });

  if (!skipHorde) {
    try {
      const buffer = await generateViaAiHorde(prompt);
      await writeFile(dest, buffer);
      console.log(`generated via AI Horde: ${label}`);
      return { entry, status: 'ok', provider: 'ai-horde' };
    } catch (err) {
      console.warn(`AI Horde failed for ${label} (${err.message}); falling back to Pollinations`);
    }
  }

  try {
    const buffer = await generateViaPollinations(prompt);
    await writeFile(dest, buffer);
    console.log(`generated via Pollinations: ${label}`);
    return { entry, status: 'ok', provider: 'pollinations' };
  } catch (err) {
    console.error(`FAILED: ${label}: ${err.message}`);
    return { entry, status: 'failed', error: err.message };
  }
}

async function main() {
  const skipHorde = process.argv.includes('--skip-horde');
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const onlyIds = onlyArg ? onlyArg.slice('--only='.length).split(',') : null;
  const targets = onlyIds ? fullManifest.filter((e) => onlyIds.includes(e.id)) : fullManifest;

  const results = [];
  for (const entry of targets) {
    const result = await generateAsset(entry, { skipHorde });
    results.push(result);
    // Always pace requests (even after failures) to respect Pollinations' anonymous rate limit.
    await new Promise((r) => setTimeout(r, POLLINATIONS_DELAY_MS));
  }

  const failures = results.filter((r) => r.status === 'failed').map((r) => r.entry);
  await writeFile(FAILURE_LOG, JSON.stringify(failures, null, 2));
  const summary = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  console.log('Summary:', summary);
}

main();
