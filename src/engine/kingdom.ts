import type { RelicModifier } from '../data/relic.types';
import { territoryRegistry, lordRegistry } from '../data/kingdom';
import { costForRank } from './talents';

/** Essence cost curve base for Royal Treasury ranks (same cost-curve shape as talents/forge/companion ranks). */
const TREASURY_BASE_COST = 200;
export const MAX_TREASURY_LEVEL = 50;
/** goldMultiplier/xpMultiplier granted per Royal Treasury rank. */
const TREASURY_BONUS_PER_LEVEL = 0.005;

/** Cost to upgrade the Royal Treasury from `currentLevel` to `currentLevel + 1`. */
export function treasuryUpgradeCost(currentLevel: number): number {
  return costForRank(TREASURY_BASE_COST, currentLevel);
}

export interface KingdomState {
  conqueredTerritoryIds: string[];
  recruitedLordIds: string[];
  treasuryLevel: number;
}

/** Flattens owned territories/lords/treasury rank into one modifier list — the Kingdom system's contribution to a run's MetaBonuses. */
export function resolveKingdomModifiers(state: KingdomState): RelicModifier[] {
  const modifiers: RelicModifier[] = [];

  for (const id of state.conqueredTerritoryIds) {
    const def = territoryRegistry.tryGet(id);
    if (def) modifiers.push(...def.modifiers);
  }

  for (const id of state.recruitedLordIds) {
    const def = lordRegistry.tryGet(id);
    if (def) modifiers.push(...def.modifiers);
  }

  if (state.treasuryLevel > 0) {
    const bonus = state.treasuryLevel * TREASURY_BONUS_PER_LEVEL;
    modifiers.push({ kind: 'goldMultiplier', value: bonus }, { kind: 'xpMultiplier', value: bonus });
  }

  return modifiers;
}
