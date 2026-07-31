import type { RelicModifier } from '../data/relic.types';
import { talentRegistry } from '../data/talents';

/** Cost to purchase the rank after `currentRank` (0-indexed: currentRank=0 means not yet purchased). */
export function costForRank(baseCost: number, currentRank: number): number {
  return Math.round(baseCost * (currentRank + 1) ** 1.5);
}

/** Expands owned talent ranks into a flat list of already-rank-scaled RelicModifiers. */
export function resolveTalentModifiers(talentRanks: Record<string, number>): RelicModifier[] {
  const modifiers: RelicModifier[] = [];
  for (const [talentId, rank] of Object.entries(talentRanks)) {
    if (rank <= 0) continue;
    const def = talentRegistry.tryGet(talentId);
    if (!def || def.effect.kind !== 'modifier') continue;
    modifiers.push({ kind: def.effect.modifier.kind, value: def.effect.modifier.value * rank });
  }
  return modifiers;
}

/** Sums every owned lootLuck-effect talent's rank contribution into one bonus fraction. */
export function resolveLootLuckBonus(talentRanks: Record<string, number>): number {
  let bonus = 0;
  for (const [talentId, rank] of Object.entries(talentRanks)) {
    if (rank <= 0) continue;
    const def = talentRegistry.tryGet(talentId);
    if (!def || def.effect.kind !== 'lootLuck') continue;
    bonus += def.effect.valuePerRank * rank;
  }
  return bonus;
}
