import type { Rng } from './rng';
import type { MonsterTier } from '../data/monster.types';

/** Drop odds and yield per monster tier for the Forge Weapon's upgrade material. Bosses always drop a meaningful chunk; normal mobs are a small, non-guaranteed trickle. Milestone bosses (megaboss/ultraboss) are a deliberate payoff — an ultraboss kill alone can nearly max Broken Blade's run-scaling cap. */
const BROKEN_PART_DROP_TABLE: Record<MonsterTier, { chance: number; min: number; max: number }> = {
  normal: { chance: 0.35, min: 1, max: 2 },
  miniboss: { chance: 0.75, min: 2, max: 4 },
  boss: { chance: 1, min: 3, max: 6 },
  megaboss: { chance: 1, min: 6, max: 10 },
  ultraboss: { chance: 1, min: 15, max: 25 },
};

/** Rolls how many Broken Parts (if any) the just-cleared wave's monster drops. */
export function rollBrokenParts(tier: MonsterTier, rng: Rng): number {
  const { chance, min, max } = BROKEN_PART_DROP_TABLE[tier];
  if (rng.next() >= chance) return 0;
  return min + Math.floor(rng.next() * (max - min + 1));
}
