import type { MonsterDefinition, MonsterTier } from '../data/monster.types';
import type { ZoneDefinition } from '../data/zone.types';
import { allZones } from '../data/zones';

/** Every Nth wave is a mini-boss; every Mth wave (a multiple of the mini-boss interval) is a boss. */
export const MINIBOSS_WAVE_INTERVAL = 5;
export const BOSS_WAVE_INTERVAL = 10;
/** Milestone walls for very long runs — a megaboss every 100 waves, a rarer ultraboss every 1000. */
export const MEGABOSS_WAVE_INTERVAL = 100;
export const ULTRABOSS_WAVE_INTERVAL = 1000;

export function tierForWave(wave: number): MonsterTier {
  // Checked in descending interval order: 1000 is also a multiple of 100/10/5, so the biggest
  // milestone must win first, or wave 1000 would resolve to 'megaboss' instead of 'ultraboss'.
  if (wave % ULTRABOSS_WAVE_INTERVAL === 0) return 'ultraboss';
  if (wave % MEGABOSS_WAVE_INTERVAL === 0) return 'megaboss';
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

/**
 * Every 100 waves past wave 100, monster stats get an extra compounding "era" multiplier on top
 * of the base linear curve — inert for waves 1-99 (era 0 → ×1, a total no-op), so the early-game
 * curve tuned via balanceSim.test.ts is completely unaffected. Hero power growth (level curve,
 * capped Forge level, capped relic magnitudes) is much closer to linear/flat than compounding, so
 * this guarantees any run eventually hits a wall instead of scaling forever — the point being to
 * force runs left running indefinitely to actually end, not just make the game harder overall.
 */
const ESCALATION_INTERVAL = 100;
const ESCALATION_HP_MULT = 1.12;
const ESCALATION_ATTACK_MULT = 1.08;

/**
 * Per-wave growth coefficients, split by tier.
 *
 * These were a single pair (0.10 hp / 0.06 attack) for every tier, which produced a hard wall:
 * balanceSim's death-wave distribution clustered on wave 20 for every class and every build,
 * solo or squadded. The cause is that a boss's base stats already encode its tier jump (~9x a
 * normal monster's attack), so applying the same linear coefficient widens the absolute gap
 * between a normal wave and a boss wave every ten waves, faster than the hero's level curve
 * closes it. Bosses therefore grow more slowly per wave than trash does.
 *
 * `normal` deliberately keeps the original 0.10/0.06 — the early-game curve tuned through this
 * harness is left bit-for-bit intact, and only the tier spikes are softened.
 */
const TIER_SCALING: Record<MonsterTier, { hp: number; attack: number }> = {
  normal: { hp: 0.1, attack: 0.06 },
  miniboss: { hp: 0.085, attack: 0.045 },
  boss: { hp: 0.075, attack: 0.038 },
  megaboss: { hp: 0.07, attack: 0.032 },
  ultraboss: { hp: 0.065, attack: 0.03 },
};

/** Controlled, mildly compounding difficulty curve applied on top of a monster's base stats. */
export function scaledMonsterStats(def: MonsterDefinition, wave: number): { maxHp: number; attack: number } {
  const scaling = TIER_SCALING[def.tier];
  const hpMultiplier = 1 + wave * scaling.hp;
  const attackMultiplier = 1 + wave * scaling.attack;
  const era = Math.floor(wave / ESCALATION_INTERVAL);
  const escalationHp = ESCALATION_HP_MULT ** era;
  const escalationAttack = ESCALATION_ATTACK_MULT ** era;

  return {
    maxHp: Math.round(def.maxHp * hpMultiplier * escalationHp),
    attack: Math.round(def.attack * attackMultiplier * escalationAttack),
  };
}
