import { Registry } from './registry';

/**
 * Traits a monster can carry into a fight.
 *
 * Until now a monster was three numbers — hp, attack, interval — so a boss was a big trash mob
 * and every fight played identically. These are the first monster-side rules in the game, and
 * they deliberately break the Phase 3 boundary that "monsters never consult modifiers": that rule
 * existed to keep the party's modifier pipeline from leaking into enemy stats, and it still holds.
 * Traits are a separate, monster-owned vocabulary — the engine reads them directly and they never
 * touch `AggregatedModifiers`.
 *
 * Every field is optional and absent means inert, so untagged content behaves exactly as before.
 */
export interface MonsterTraits {
  /** HP fraction at or below which the monster enrages. */
  enrageThreshold?: number;
  /** Attack multiplier once enraged. */
  enrageAttackMultiplier?: number;
  /** Fraction of incoming party damage ignored. */
  damageReduction?: number;
  /** Fraction of damage dealt that the monster heals back. */
  lifestealPercent?: number;
  /** Fraction of incoming damage returned to the attacker. */
  thornsPercent?: number;
  /** Scales how fast the party's Brave Burst gauge fills. 0 locks the burst entirely. */
  burstFillMultiplier?: number;
  /** Fraction of max HP regenerated per second of combat. */
  regenPerSecondFraction?: number;
}

/**
 * A modifier rolled onto a wave, in the spirit of Gungeon/Diablo enemy prefixes: a cheap content
 * multiplier over a fixed bestiary. Nineteen monsters times a handful of affixes reads as far more
 * variety than nineteen monsters, for a fraction of the authoring cost — and unlike new stat
 * blocks, an affix changes how a fight has to be *played*, not just how long it takes.
 */
export interface WaveAffix {
  id: string;
  name: string;
  description: string;
  /** Accent color for the HUD badge. */
  color: string;
  /** Stat scalars applied on top of the wave's normal scaling. */
  hpMultiplier?: number;
  attackMultiplier?: number;
  /** <1 makes the monster attack faster. */
  attackIntervalMultiplier?: number;
  traits?: MonsterTraits;
  /** Relative roll weight against the other affixes. */
  weight: number;
  /** Earliest wave this affix can appear — the nastier ones stay out of the tutorial. */
  minWave: number;
}

export const affixRegistry = new Registry<WaveAffix>();

affixRegistry.registerAll([
  {
    id: 'armored',
    name: 'Armored',
    description: 'Ignores a quarter of all incoming damage.',
    color: '#9fb4c9',
    hpMultiplier: 1.15,
    traits: { damageReduction: 0.25 },
    weight: 10,
    minWave: 3,
  },
  {
    id: 'swift',
    name: 'Swift',
    description: 'Attacks far more often, but is frailer for it.',
    color: '#7fe3ff',
    hpMultiplier: 0.8,
    attackIntervalMultiplier: 0.62,
    weight: 10,
    minWave: 3,
  },
  {
    id: 'vampiric',
    name: 'Vampiric',
    description: 'Heals for a third of the damage it deals. Long fights favour it.',
    color: '#ff7b9c',
    traits: { lifestealPercent: 0.33 },
    weight: 8,
    minWave: 6,
  },
  {
    id: 'thorned',
    name: 'Thorned',
    description: 'Returns a fifth of every hit it takes. Punishes fast attackers.',
    color: '#9be07b',
    traits: { thornsPercent: 0.2 },
    weight: 8,
    minWave: 6,
  },
  {
    id: 'frenzied',
    name: 'Frenzied',
    description: 'Doubles its attack once wounded below half health.',
    color: '#ff8f4d',
    attackMultiplier: 0.85,
    traits: { enrageThreshold: 0.5, enrageAttackMultiplier: 2 },
    weight: 8,
    minWave: 8,
  },
  {
    id: 'regenerating',
    name: 'Regenerating',
    description: 'Knits itself back together every second. Out-damage it or lose.',
    color: '#7bffc4',
    traits: { regenPerSecondFraction: 0.012 },
    weight: 6,
    minWave: 10,
  },
  {
    id: 'stifling',
    name: 'Stifling',
    description: 'Smothers your Brave Burst — the gauge crawls.',
    color: '#b07bff',
    traits: { burstFillMultiplier: 0.35 },
    weight: 6,
    minWave: 12,
  },
  {
    id: 'colossal',
    name: 'Colossal',
    description: 'Vastly more health and a heavier swing, but slow with it.',
    color: '#e0c060',
    hpMultiplier: 1.8,
    attackMultiplier: 1.25,
    attackIntervalMultiplier: 1.35,
    weight: 5,
    minWave: 15,
  },
]);

export const allAffixes = affixRegistry.all();
