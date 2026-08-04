import { Rng } from './rng';
import { RARITY_ORDER, type Rarity } from '../data/rarity';
import type { CompanionDefinition } from '../data/companion.types';

/** Pull odds for the Gacha screen — deliberately a bit more generous toward rare+ tiers than in-run loot (RARITY_DROP_WEIGHTS), since a pull spends real currency and should feel like a purposeful gamble. Must sum to 100. */
export const GACHA_RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 50,
  rare: 30,
  epic: 14,
  legendary: 4.5,
  mythic: 1.5,
};

export interface GachaPullResult {
  companion: CompanionDefinition;
  /** False if the puller already had this companion unlocked before this pull (a "duplicate"). */
  isNew: boolean;
}

function rollGachaRarity(rng: Rng): Rarity {
  const roll = rng.next() * 100;
  let cumulative = 0;
  for (const rarity of RARITY_ORDER) {
    cumulative += GACHA_RARITY_WEIGHTS[rarity];
    if (roll < cumulative) return rarity;
  }
  return RARITY_ORDER[RARITY_ORDER.length - 1] as Rarity;
}

/** Rolls one gacha pull from the candidate pool. Falls back to the full pool if the rolled rarity has no candidates in it. */
export function pullGacha(rng: Rng, candidates: CompanionDefinition[], ownedIds: ReadonlySet<string>): GachaPullResult {
  if (candidates.length === 0) {
    throw new Error('pullGacha called with an empty candidate pool');
  }
  const rarity = rollGachaRarity(rng);
  let pool = candidates.filter((c) => c.rarity === rarity);
  if (pool.length === 0) pool = candidates;
  const index = Math.floor(rng.next() * pool.length);
  const companion = pool[Math.min(index, pool.length - 1)] as CompanionDefinition;
  return { companion, isNew: !ownedIds.has(companion.id) };
}

/** Rolls `count` pulls in sequence, tracking newly-seen ids within the batch so a duplicate pulled twice in the same x10 is correctly flagged both times. */
export function pullGachaMulti(
  rng: Rng,
  candidates: CompanionDefinition[],
  ownedIds: ReadonlySet<string>,
  count: number,
): GachaPullResult[] {
  const seen = new Set(ownedIds);
  const results: GachaPullResult[] = [];
  for (let i = 0; i < count; i++) {
    const result = pullGacha(rng, candidates, seen);
    seen.add(result.companion.id);
    results.push(result);
  }
  return results;
}
