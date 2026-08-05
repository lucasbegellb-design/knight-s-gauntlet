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

/** Tracks a dry spell so unlucky streaks are eventually guaranteed a better pull — see RARE_PITY_THRESHOLD/LEGENDARY_PITY_THRESHOLD. */
export interface GachaPityState {
  pullsSinceRare: number;
  pullsSinceLegendary: number;
}

export const DEFAULT_PITY_STATE: GachaPityState = { pullsSinceRare: 0, pullsSinceLegendary: 0 };

/** A pull that would otherwise be the Nth in a row without a rare+/legendary+ is forced up to that floor instead. */
export const RARE_PITY_THRESHOLD = 10;
export const LEGENDARY_PITY_THRESHOLD = 50;

const RARE_PLUS: Rarity[] = RARITY_ORDER.filter((r) => r !== 'common');
const LEGENDARY_PLUS: Rarity[] = ['legendary', 'mythic'];

function weightedPick(rng: Rng, rarities: readonly Rarity[]): Rarity {
  const total = rarities.reduce((sum, r) => sum + GACHA_RARITY_WEIGHTS[r], 0);
  let roll = rng.next() * total;
  for (const rarity of rarities) {
    roll -= GACHA_RARITY_WEIGHTS[rarity];
    if (roll < 0) return rarity;
  }
  return rarities[rarities.length - 1] as Rarity;
}

function rollGachaRarity(rng: Rng, pity: GachaPityState): Rarity {
  if (pity.pullsSinceLegendary >= LEGENDARY_PITY_THRESHOLD - 1) return weightedPick(rng, LEGENDARY_PLUS);
  if (pity.pullsSinceRare >= RARE_PITY_THRESHOLD - 1) return weightedPick(rng, RARE_PLUS);
  return weightedPick(rng, RARITY_ORDER);
}

/** Folds the rarity actually received into the next pity state — the companion's real rarity, not the (possibly pity-forced) roll, so a forced-rare roll that fell back to a common-only pool correctly does NOT reset the counter. */
export function nextPityState(pity: GachaPityState, rarity: Rarity): GachaPityState {
  return {
    pullsSinceRare: rarity === 'common' ? pity.pullsSinceRare + 1 : 0,
    pullsSinceLegendary: rarity === 'legendary' || rarity === 'mythic' ? 0 : pity.pullsSinceLegendary + 1,
  };
}

/** Rolls one gacha pull from the candidate pool. Falls back to the full pool if the rolled rarity has no candidates in it. `pity` defaults to a fresh streak (no forcing) when omitted. */
export function pullGacha(
  rng: Rng,
  candidates: CompanionDefinition[],
  ownedIds: ReadonlySet<string>,
  pity: GachaPityState = DEFAULT_PITY_STATE,
): GachaPullResult {
  if (candidates.length === 0) {
    throw new Error('pullGacha called with an empty candidate pool');
  }
  const rarity = rollGachaRarity(rng, pity);
  let pool = candidates.filter((c) => c.rarity === rarity);
  if (pool.length === 0) pool = candidates;
  const index = Math.floor(rng.next() * pool.length);
  const companion = pool[Math.min(index, pool.length - 1)] as CompanionDefinition;
  return { companion, isNew: !ownedIds.has(companion.id) };
}

/** Rolls `count` pulls in sequence, tracking newly-seen ids within the batch so a duplicate pulled twice in the same x10 is correctly flagged both times, and threading `pity` across the batch so a hot streak within one x10 can still hit its own pity floor. */
export function pullGachaMulti(
  rng: Rng,
  candidates: CompanionDefinition[],
  ownedIds: ReadonlySet<string>,
  count: number,
  pity: GachaPityState = DEFAULT_PITY_STATE,
): GachaPullResult[] {
  const seen = new Set(ownedIds);
  const results: GachaPullResult[] = [];
  let currentPity = pity;
  for (let i = 0; i < count; i++) {
    const result = pullGacha(rng, candidates, seen, currentPity);
    seen.add(result.companion.id);
    currentPity = nextPityState(currentPity, result.companion.rarity);
    results.push(result);
  }
  return results;
}
