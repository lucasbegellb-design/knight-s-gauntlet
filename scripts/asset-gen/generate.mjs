#!/usr/bin/env node
// Asset generation pipeline: AI Horde (primary, community SD cluster, anonymous
// key "0000000000") with fallback to Pollinations.ai (fast, synchronous, no
// polling). Resumable: skips any id already on disk. Never blocks the game —
// missing files just mean the UI keeps using its placeholder rendering.
import { writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { manifest } from './manifest.mjs';

const STYLE_SUFFIX =
  ', JRPG sprite, Final Fantasy Brave Exvius style, semi-realistic chibi, clean pixel art, transparent background, game asset';
const OUTPUT_ROOT = path.resolve(process.cwd(), 'public/game-assets');
const FAILURE_LOG = path.resolve(process.cwd(), 'scripts/asset-gen/failures.json');
const HORDE_BASE = 'https://aihorde.net/api/v2';
const HORDE_API_KEY = '0000000000';
const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt';
const POLLINATIONS_DELAY_MS = 15000;

function buildPrompt(entry) {
  return `${entry.prompt}${STYLE_SUFFIX}`;
}

function outputPath(entry) {
  return path.join(OUTPUT_ROOT, entry.category, `${entry.id}.png`);
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
  const submitRes = await fetch(`${HORDE_BASE}/generate/async`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: HORDE_API_KEY, 'Client-Agent': 'knights-gauntlet:1.0:asset-gen' },
    body: JSON.stringify({
      prompt,
      params: { width: 512, height: 512, steps: 20, sampler_name: 'k_euler', cfg_scale: 7 },
      models: ['stable_diffusion'],
      nsfw: false,
    }),
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
  if (await fileExists(dest)) {
    console.log(`skip (exists): ${entry.category}/${entry.id}`);
    return { entry, status: 'skipped' };
  }

  const prompt = buildPrompt(entry);
  await mkdir(path.dirname(dest), { recursive: true });

  if (!skipHorde) {
    try {
      const buffer = await generateViaAiHorde(prompt);
      await writeFile(dest, buffer);
      console.log(`generated via AI Horde: ${entry.category}/${entry.id}`);
      return { entry, status: 'ok', provider: 'ai-horde' };
    } catch (err) {
      console.warn(`AI Horde failed for ${entry.id} (${err.message}); falling back to Pollinations`);
    }
  }

  try {
    const buffer = await generateViaPollinations(prompt);
    await writeFile(dest, buffer);
    console.log(`generated via Pollinations: ${entry.category}/${entry.id}`);
    return { entry, status: 'ok', provider: 'pollinations' };
  } catch (err) {
    console.error(`FAILED: ${entry.id}: ${err.message}`);
    return { entry, status: 'failed', error: err.message };
  }
}

async function main() {
  const skipHorde = process.argv.includes('--skip-horde');
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const onlyIds = onlyArg ? onlyArg.slice('--only='.length).split(',') : null;
  const targets = onlyIds ? manifest.filter((e) => onlyIds.includes(e.id)) : manifest;

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
