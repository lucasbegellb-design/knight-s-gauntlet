import { allAffixes, type WaveAffix } from '../data/affixes';
import type { MonsterTier } from '../data/monster.types';
import type { Rng } from './rng';

/** No affixes at all for the opening waves — the game should teach its baseline before varying it. */
export const AFFIX_MIN_WAVE = 3;

/**
 * Base chance a wave rolls an affix, climbing with depth so late waves feel materially different
 * from early ones without a second difficulty system.
 */
const AFFIX_BASE_CHANCE = 0.16;
const AFFIX_CHANCE_PER_WAVE = 0.006;
/** Caps the depth-driven portion only; the tier bonus is added on top, then clamped once. */
const AFFIX_MAX_DEPTH_CHANCE = 0.4;
const AFFIX_HARD_CAP = 0.92;

/** Boss-tier waves are far likelier to be modified — a boss should be the fight you remember. */
const BOSS_TIER_CHANCE_BONUS: Record<MonsterTier, number> = {
  normal: 0,
  miniboss: 0.15,
  boss: 0.3,
  megaboss: 0.45,
  ultraboss: 0.6,
};

/** Probability that `wave` of `tier` carries an affix. Exposed for tests and tuning. */
export function affixChance(wave: number, tier: MonsterTier): number {
  if (wave < AFFIX_MIN_WAVE) return 0;
  const depth = Math.min(AFFIX_MAX_DEPTH_CHANCE, AFFIX_BASE_CHANCE + (wave - AFFIX_MIN_WAVE) * AFFIX_CHANCE_PER_WAVE);
  return Math.min(AFFIX_HARD_CAP, depth + BOSS_TIER_CHANCE_BONUS[tier]);
}

/** Affixes legal at this wave, i.e. past their own `minWave` gate. */
export function eligibleAffixes(wave: number): WaveAffix[] {
  return allAffixes.filter((affix) => wave >= affix.minWave);
}

/**
 * Rolls this wave's affix, or null. Consumes exactly two numbers from `rng` whenever the wave is
 * eligible — one for the gate, one for the weighted pick — so the stream stays predictable for
 * seeded tests regardless of which branch is taken.
 */
export function rollWaveAffix(wave: number, tier: MonsterTier, rng: Rng): WaveAffix | null {
  const eligible = eligibleAffixes(wave);
  if (eligible.length === 0) return null;

  const gate = rng.next();
  const pick = rng.next();
  if (gate >= affixChance(wave, tier)) return null;

  const totalWeight = eligible.reduce((sum, affix) => sum + affix.weight, 0);
  let roll = pick * totalWeight;
  for (const affix of eligible) {
    roll -= affix.weight;
    if (roll < 0) return affix;
  }
  return eligible[eligible.length - 1] as WaveAffix;
}
