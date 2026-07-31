import type { MonsterDefinition, MonsterTier } from '../data/monster.types';
import type { ZoneDefinition } from '../data/zone.types';
import { allZones } from '../data/zones';

/** Every Nth wave is a mini-boss; every Mth wave (a multiple of the mini-boss interval) is a boss. */
export const MINIBOSS_WAVE_INTERVAL = 5;
export const BOSS_WAVE_INTERVAL = 10;

export function tierForWave(wave: number): MonsterTier {
  if (wave % BOSS_WAVE_INTERVAL === 0) return 'boss';
  if (wave % MINIBOSS_WAVE_INTERVAL === 0) return 'miniboss';
  return 'normal';
}

/** The zone active for a given wave. Waves past the last zone's waveStart stay in that zone forever (endless). */
export function zoneForWave(wave: number): ZoneDefinition {
  let active = allZones[0] as ZoneDefinition;
  for (const zone of allZones) {
    if (zone.waveStart > wave) break;
    active = zone;
  }
  return active;
}

/** Narrows a tier's full monster pool down to the ones this wave's zone allows, falling back to the full pool if empty. */
export function monsterPoolForWave(wave: number, tierPool: MonsterDefinition[]): MonsterDefinition[] {
  const zone = zoneForWave(wave);
  const narrowed = tierPool.filter((m) => zone.monsterIds.includes(m.id));
  return narrowed.length > 0 ? narrowed : tierPool;
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
