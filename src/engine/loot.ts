import { Rng } from './rng';
import { RARITY_DROP_WEIGHTS, RARITY_ORDER, type Rarity } from '../data/rarity';
import { allRelics } from '../data/relics';
import { allEquipment } from '../data/equipment';
import type { RelicDefinition } from '../data/relic.types';
import type { EquipmentDefinition } from '../data/equipment.types';

export type LootOption =
  | { kind: 'relic'; rarity: Rarity; relic: RelicDefinition }
  | { kind: 'equipment'; rarity: Rarity; equipment: EquipmentDefinition }
  | { kind: 'gold'; amount: number };

const LOOT_OPTIONS_PER_OFFERING = 3;
const CATEGORY_WEIGHTS: { kind: 'relic' | 'equipment' | 'gold'; weight: number }[] = [
  { kind: 'relic', weight: 45 },
  { kind: 'equipment', weight: 35 },
  { kind: 'gold', weight: 20 },
];

export function pickRarity(rng: Rng): Rarity {
  const roll = rng.next() * 100;
  let cumulative = 0;
  for (const rarity of RARITY_ORDER) {
    cumulative += RARITY_DROP_WEIGHTS[rarity];
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

function pickRelicOption(rng: Rng, ownedRelicIds: Map<string, number>, excludeIds: Set<string>): RelicDefinition | undefined {
  const eligible = (rarity: Rarity | null) =>
    allRelics.filter(
      (relic) =>
        !excludeIds.has(relic.id) &&
        (relic.stacking === 'stackable' || !ownedRelicIds.has(relic.id)) &&
        (rarity === null || relic.rarity === rarity),
    );

  const preferredRarity = pickRarity(rng);
  let candidates = eligible(preferredRarity);
  if (candidates.length === 0) candidates = eligible(null);
  if (candidates.length === 0) return undefined;

  const index = Math.floor(rng.next() * candidates.length);
  return candidates[Math.min(index, candidates.length - 1)];
}

function pickEquipmentOption(rng: Rng, excludeIds: Set<string>): EquipmentDefinition | undefined {
  const candidates = allEquipment.filter((equipment) => !excludeIds.has(equipment.id));
  if (candidates.length === 0) return undefined;
  const index = Math.floor(rng.next() * candidates.length);
  return candidates[Math.min(index, candidates.length - 1)];
}

function makeGoldOption(rng: Rng, waveNumber: number, goldMultiplier: number): LootOption {
  const base = 15 + waveNumber * 4;
  const variance = 0.85 + rng.next() * 0.3;
  return { kind: 'gold', amount: Math.round(base * variance * (1 + goldMultiplier)) };
}

/** Generates 2-4 (fixed at 3 for now) loot choices, never repeating an item within the same offering. */
export function generateLootOptions(
  rng: Rng,
  ownedRelicIds: Map<string, number>,
  waveNumber: number,
  goldMultiplier: number,
): LootOption[] {
  const options: LootOption[] = [];
  const usedRelicIds = new Set<string>();
  const usedEquipmentIds = new Set<string>();

  while (options.length < LOOT_OPTIONS_PER_OFFERING) {
    const category = pickWeighted(rng, CATEGORY_WEIGHTS).kind;

    if (category === 'relic') {
      const relic = pickRelicOption(rng, ownedRelicIds, usedRelicIds);
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
        options.push({ kind: 'equipment', rarity: pickRarity(rng), equipment });
        continue;
      }
    }

    options.push(makeGoldOption(rng, waveNumber, goldMultiplier));
  }

  return options;
}
