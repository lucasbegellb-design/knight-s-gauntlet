import type { MonsterDefinition, MonsterTier } from '../data/monster.types';

/** Every Nth wave is a mini-boss; every Mth wave (a multiple of the mini-boss interval) is a boss. */
export const MINIBOSS_WAVE_INTERVAL = 5;
export const BOSS_WAVE_INTERVAL = 10;

export function tierForWave(wave: number): MonsterTier {
  if (wave % BOSS_WAVE_INTERVAL === 0) return 'boss';
  if (wave % MINIBOSS_WAVE_INTERVAL === 0) return 'miniboss';
  return 'normal';
}

/** Controlled, mildly compounding difficulty curve applied on top of a monster's base stats. */
export function scaledMonsterStats(def: MonsterDefinition, wave: number): { maxHp: number; attack: number } {
  const hpMultiplier = 1 + wave * 0.1;
  const attackMultiplier = 1 + wave * 0.06;

  return {
    maxHp: Math.round(def.maxHp * hpMultiplier),
    attack: Math.round(def.attack * attackMultiplier),
  };
}
