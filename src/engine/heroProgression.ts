import type { HeroBaseStats, HeroDefinition } from '../data/hero.types';
import type { Element } from './elements';

export interface HeroProgress {
  level: number;
  /** XP accumulated toward the next level (resets to 0 on level-up). */
  xp: number;
}

export interface XpGainResult {
  progress: HeroProgress;
  levelsGained: number;
}

/** XP required to advance from `level` to `level + 1`. */
export function xpForNextLevel(level: number): number {
  return Math.round(15 * level ** 1.6);
}

/** Per-stat scale factors a class applies to a hero's base stats and growth curve. */
export interface HeroStatMultiplier {
  maxHp: number;
  attack: number;
  attackIntervalMs: number;
}

/** Produces a new HeroDefinition with base+growth scaled by a class's stat multipliers. Pure — the original is untouched. */
export function scaleHeroDefinition(def: HeroDefinition, multiplier: HeroStatMultiplier, element?: Element): HeroDefinition {
  return {
    ...def,
    element: element ?? def.element,
    base: {
      maxHp: Math.round(def.base.maxHp * multiplier.maxHp),
      attack: Math.round(def.base.attack * multiplier.attack),
      attackIntervalMs: Math.round(def.base.attackIntervalMs * multiplier.attackIntervalMs),
    },
    growth: {
      maxHpPerLevel: Math.round(def.growth.maxHpPerLevel * multiplier.maxHp),
      attackPerLevel: Math.round(def.growth.attackPerLevel * multiplier.attack),
    },
  };
}

/** Hero stats at a given level, derived from the definition's base + per-level growth. */
export function statsForLevel(def: HeroDefinition, level: number): HeroBaseStats {
  const levelsAboveBase = level - 1;
  return {
    maxHp: def.base.maxHp + def.growth.maxHpPerLevel * levelsAboveBase,
    attack: def.base.attack + def.growth.attackPerLevel * levelsAboveBase,
    attackIntervalMs: def.base.attackIntervalMs,
  };
}

/** Applies an XP gain, rolling over as many level-ups as the gain covers. */
export function applyXpGain(progress: HeroProgress, xpGained: number): XpGainResult {
  let { level, xp } = progress;
  xp += xpGained;

  let levelsGained = 0;
  while (xp >= xpForNextLevel(level)) {
    xp -= xpForNextLevel(level);
    level += 1;
    levelsGained += 1;
  }

  return { progress: { level, xp }, levelsGained };
}
