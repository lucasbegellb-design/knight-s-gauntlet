import { Rng } from './rng';
import { RARITY_DROP_WEIGHTS, RARITY_ORDER, type Rarity } from '../data/rarity';
import { allRelics } from '../data/relics';
import { allEquipment } from '../data/equipment';
import { allCompanions } from '../data/companions';
import { allActiveSpells, allPassiveSpells } from '../data/spells';
import type { RelicDefinition } from '../data/relic.types';
import type { EquipmentDefinition } from '../data/equipment.types';
import type { CompanionDefinition } from '../data/companion.types';
import type { SpellDefinition } from '../data/spell.types';

export type LootOption =
  | { kind: 'relic'; rarity: Rarity; relic: RelicDefinition }
  | { kind: 'equipment'; rarity: Rarity; equipment: EquipmentDefinition }
  | { kind: 'companion'; rarity: Rarity; companion: CompanionDefinition }
  | { kind: 'spell'; rarity: Rarity; spell: SpellDefinition }
  | { kind: 'gold'; amount: number };

export interface LootContext {
  ownedRelicIds: Map<string, number>;
  ownedCompanionIds: Set<string>;
  /** Companions unlocked via the Gacha (see src/engine/gacha.ts) — only these can appear as loot. */
  unlockedCompanionIds: Set<string>;
  companionRosterFull: boolean;
  ownedActiveSpellIds: Set<string>;
  activeSpellSlotsFull: boolean;
  ownedPassiveSpellIds: Map<string, number>;
  waveNumber: number;
  goldMultiplier: number;
  /** Permanent meta-progression bonus (from talents) shifting rarity odds away from common, toward rarer tiers. */
  luckBonus: number;
  /** Extra options beyond the base offering, bought with prestige Sigils. */
  extraOptions?: number;
}

const LOOT_OPTIONS_PER_OFFERING = 3;
const CATEGORY_WEIGHTS: { kind: 'relic' | 'equipment' | 'companion' | 'spell' | 'gold'; weight: number }[] = [
  { kind: 'relic', weight: 30 },
  { kind: 'equipment', weight: 20 },
  { kind: 'companion', weight: 20 },
  { kind: 'spell', weight: 20 },
  { kind: 'gold', weight: 10 },
];

const MIN_COMMON_WEIGHT = 5;

/**
 * Rolls a rarity from the drop-weight table. `luckBonus` (a 0-1 fraction,
 * e.g. from Fortune's Favor talent ranks) shifts weight away from common
 * and toward rare+ tiers proportionally to their base share, floored so
 * common never drops below MIN_COMMON_WEIGHT.
 */
export function pickRarity(rng: Rng, luckBonus = 0): Rarity {
  const shift = Math.max(0, Math.min(RARITY_DROP_WEIGHTS.common - MIN_COMMON_WEIGHT, luckBonus * 100));
  const nonCommonBase = 100 - RARITY_DROP_WEIGHTS.common;
  const weights: Record<Rarity, number> = { ...RARITY_DROP_WEIGHTS };

  if (shift > 0 && nonCommonBase > 0) {
    weights.common -= shift;
    for (const rarity of RARITY_ORDER) {
      if (rarity === 'common') continue;
      weights[rarity] += shift * (RARITY_DROP_WEIGHTS[rarity] / nonCommonBase);
    }
  }

  const roll = rng.next() * 100;
  let cumulative = 0;
  for (const rarity of RARITY_ORDER) {
    cumulative += weights[rarity];
    if (roll < cumulative) return rarity;
  }
  return RARITY_ORDER[RARITY_ORDER.length - 1] ?? 'common';
}

function pickWeighted<T extends { weight: number }>(rng: Rng, entries: T[]): T {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng.next() * totalWeight;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll < 0) return entry;
  }
  return entries[entries.length - 1] as T;
}

function pickFromRarityPool<T extends { rarity: Rarity }>(rng: Rng, candidates: T[], luckBonus: number): T | undefined {
  if (candidates.length === 0) return undefined;
  const preferredRarity = pickRarity(rng, luckBonus);
  let pool = candidates.filter((c) => c.rarity === preferredRarity);
  if (pool.length === 0) pool = candidates;
  const index = Math.floor(rng.next() * pool.length);
  return pool[Math.min(index, pool.length - 1)];
}

function pickRelicOption(rng: Rng, context: LootContext, excludeIds: Set<string>): RelicDefinition | undefined {
  const candidates = allRelics.filter(
    (relic) => !excludeIds.has(relic.id) && (relic.stacking === 'stackable' || !context.ownedRelicIds.has(relic.id)),
  );
  return pickFromRarityPool(rng, candidates, context.luckBonus);
}

function pickEquipmentOption(rng: Rng, excludeIds: Set<string>): EquipmentDefinition | undefined {
  // Equipment templates have no inherent rarity (it's rolled at drop time), so pick uniformly.
  const candidates = allEquipment.filter((equipment) => !excludeIds.has(equipment.id));
  if (candidates.length === 0) return undefined;
  const index = Math.floor(rng.next() * candidates.length);
  return candidates[Math.min(index, candidates.length - 1)];
}

function pickCompanionOption(rng: Rng, context: LootContext, excludeIds: Set<string>): CompanionDefinition | undefined {
  if (context.companionRosterFull) return undefined;
  const candidates = allCompanions.filter(
    (c) => context.unlockedCompanionIds.has(c.id) && !context.ownedCompanionIds.has(c.id) && !excludeIds.has(c.id),
  );
  return pickFromRarityPool(rng, candidates, context.luckBonus);
}

function pickSpellOption(rng: Rng, context: LootContext, excludeIds: Set<string>): SpellDefinition | undefined {
  const activeCandidates = context.activeSpellSlotsFull
    ? []
    : allActiveSpells.filter((s) => !context.ownedActiveSpellIds.has(s.id) && !excludeIds.has(s.id));
  const passiveCandidates = allPassiveSpells.filter(
    (s) => !excludeIds.has(s.id) && (s.stacking === 'stackable' || !context.ownedPassiveSpellIds.has(s.id)),
  );
  return pickFromRarityPool(rng, [...activeCandidates, ...passiveCandidates], context.luckBonus);
}

function makeGoldOption(rng: Rng, waveNumber: number, goldMultiplier: number): LootOption {
  const base = 15 + waveNumber * 4;
  const variance = 0.85 + rng.next() * 0.3;
  return { kind: 'gold', amount: Math.round(base * variance * (1 + goldMultiplier)) };
}

/** Generates 2-4 (fixed at 3 for now) loot choices, never repeating an item within the same offering. */
export function generateLootOptions(rng: Rng, context: LootContext): LootOption[] {
  const options: LootOption[] = [];
  const usedRelicIds = new Set<string>();
  const usedEquipmentIds = new Set<string>();
  const usedCompanionIds = new Set<string>();
  const usedSpellIds = new Set<string>();

  const targetCount = LOOT_OPTIONS_PER_OFFERING + Math.max(0, context.extraOptions ?? 0);

  while (options.length < targetCount) {
    const category = pickWeighted(rng, CATEGORY_WEIGHTS).kind;

    if (category === 'relic') {
      const relic = pickRelicOption(rng, context, usedRelicIds);
      if (relic) {
        usedRelicIds.add(relic.id);
        options.push({ kind: 'relic', rarity: relic.rarity, relic });
        continue;
      }
    }

    if (category === 'equipment') {
      const equipment = pickEquipmentOption(rng, usedEquipmentIds);
      if (equipment) {
        usedEquipmentIds.add(equipment.id);
        options.push({ kind: 'equipment', rarity: pickRarity(rng, context.luckBonus), equipment });
        continue;
      }
    }

    if (category === 'companion') {
      const companion = pickCompanionOption(rng, context, usedCompanionIds);
      if (companion) {
        usedCompanionIds.add(companion.id);
        options.push({ kind: 'companion', rarity: companion.rarity, companion });
        continue;
      }
    }

    if (category === 'spell') {
      const spell = pickSpellOption(rng, context, usedSpellIds);
      if (spell) {
        usedSpellIds.add(spell.id);
        options.push({ kind: 'spell', rarity: spell.rarity, spell });
        continue;
      }
    }

    options.push(makeGoldOption(rng, context.waveNumber, context.goldMultiplier));
  }

  return options;
}
