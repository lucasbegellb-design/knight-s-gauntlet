import type { HeroBaseStats, HeroDefinition } from '../data/hero.types';

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
