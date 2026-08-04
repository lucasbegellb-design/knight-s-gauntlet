import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { talentRegistry } from '../data/talents';
import { costForRank } from '../engine/talents';
import { classRegistry } from '../data/classes';
import { Rng } from '../engine/rng';
import type { Rarity } from '../data/rarity';
import { forgeWeaponUpgradeCost, MAX_FORGE_WEAPON_LEVEL } from '../data/forgeWeapon';
import { allCompanions, STARTER_COMPANION_IDS } from '../data/companions';
import { pullGacha, pullGachaMulti, type GachaPullResult } from '../engine/gacha';

const STORAGE_KEY = 'knights-gauntlet-meta-v1';
const MAX_FORGE_LEVEL = 20;
const FORGE_BASE_COST = 25;
const MAX_COMPANION_UPGRADE_RANK = 5;
const COMPANION_UPGRADE_BASE_COST = 30;
export const GACHA_SINGLE_PULL_COST = 120;
export const GACHA_MULTI_PULL_COUNT = 10;
export const GACHA_MULTI_PULL_COST = 1000;
/** Fraction of a single pull's cost refunded as essence when a pull rolls a companion already unlocked. */
const GACHA_DUPLICATE_REFUND_FRACTION = 0.3;

export type DiscoveryKind = 'relic' | 'spell' | 'equipment' | 'monster' | 'companion';

interface PersistedMeta {
  currency: number;
  talentRanks: Record<string, number>;
  companionUpgrades: Record<string, number>;
  forgeLevel: number;
  /** Salvage material for the Forge Weapon, dropped by monsters during runs (see src/engine/brokenParts.ts). */
  brokenParts: number;
  forgeWeaponLevel: number;
  /** Companions unlocked via the Gacha (src/ui/Gacha.tsx) — only these can appear in an in-run loot pool. */
  unlockedCompanionIds: string[];
  discoveredRelicIds: string[];
  discoveredSpellIds: string[];
  discoveredEquipmentIds: string[];
  discoveredMonsterIds: string[];
  discoveredCompanionIds: string[];
}

const DISCOVERY_KEY: Record<DiscoveryKind, keyof PersistedMeta> = {
  relic: 'discoveredRelicIds',
  spell: 'discoveredSpellIds',
  equipment: 'discoveredEquipmentIds',
  monster: 'discoveredMonsterIds',
  companion: 'discoveredCompanionIds',
};

const DEFAULT_PERSISTED: PersistedMeta = {
  currency: 0,
  talentRanks: {},
  companionUpgrades: {},
  forgeLevel: 0,
  brokenParts: 0,
  forgeWeaponLevel: 0,
  unlockedCompanionIds: [...STARTER_COMPANION_IDS],
  discoveredRelicIds: [],
  discoveredSpellIds: [],
  discoveredEquipmentIds: [],
  discoveredMonsterIds: [],
  discoveredCompanionIds: [],
};

export type Screen = 'hub' | 'classSelect' | 'run';

export interface StartingWeapon {
  defId: string;
  rarity: Rarity;
}

/** Starting-weapon rarity is capped modest (common/rare only) — the loot table is where big rolls belong. */
const STARTING_WEAPON_RARITY_WEIGHTS: { rarity: Rarity; weight: number }[] = [
  { rarity: 'common', weight: 70 },
  { rarity: 'rare', weight: 30 },
];

function rollStartingWeaponRarity(rng: Rng): Rarity {
  const total = STARTING_WEAPON_RARITY_WEIGHTS.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng.next() * total;
  for (const entry of STARTING_WEAPON_RARITY_WEIGHTS) {
    roll -= entry.weight;
    if (roll < 0) return entry.rarity;
  }
  return 'common';
}

interface MetaStore extends PersistedMeta {
  screen: Screen;
  hydrated: boolean;
  /** Chosen at the start of a run on the class-select screen; cleared once a fresh run's WaveManager is built. */
  selectedClassId: string | null;
  startingWeapon: StartingWeapon | null;
  setScreen: (screen: Screen) => void;
  chooseClass: (classId: string) => void;
  depositCurrency: (amount: number) => void;
  depositBrokenParts: (amount: number) => void;
  purchaseTalentRank: (talentId: string) => void;
  upgradeCompanion: (companionId: string) => void;
  upgradeForge: () => void;
  upgradeForgeWeapon: () => void;
  discover: (kind: DiscoveryKind, id: string) => void;
  /** Results of the most recent Gacha pull, shown by the reveal overlay; cleared once acknowledged. */
  lastGachaResults: GachaPullResult[] | null;
  pullGachaSingle: () => void;
  pullGachaMulti: () => void;
  clearGachaResults: () => void;
}

function persistedSlice(state: MetaStore): PersistedMeta {
  return {
    currency: state.currency,
    talentRanks: state.talentRanks,
    companionUpgrades: state.companionUpgrades,
    forgeLevel: state.forgeLevel,
    brokenParts: state.brokenParts,
    forgeWeaponLevel: state.forgeWeaponLevel,
    unlockedCompanionIds: state.unlockedCompanionIds,
    discoveredRelicIds: state.discoveredRelicIds,
    discoveredSpellIds: state.discoveredSpellIds,
    discoveredEquipmentIds: state.discoveredEquipmentIds,
    discoveredMonsterIds: state.discoveredMonsterIds,
    discoveredCompanionIds: state.discoveredCompanionIds,
  };
}

export function forgeUpgradeCost(currentLevel: number): number {
  return costForRank(FORGE_BASE_COST, currentLevel);
}

export function companionUpgradeCost(currentRank: number): number {
  return costForRank(COMPANION_UPGRADE_BASE_COST, currentRank);
}

export const useMetaStore = create<MetaStore>((set) => ({
  ...DEFAULT_PERSISTED,
  screen: 'hub',
  hydrated: false,
  selectedClassId: null,
  startingWeapon: null,
  setScreen: (screen) => set({ screen }),
  chooseClass: (classId) =>
    set(() => {
      const classDef = classRegistry.get(classId);
      const rng = new Rng(Date.now());
      const weaponId = classDef.weaponPool[Math.floor(rng.next() * classDef.weaponPool.length)] ?? classDef.weaponPool[0];
      const startingWeapon: StartingWeapon | null = weaponId ? { defId: weaponId, rarity: rollStartingWeaponRarity(rng) } : null;
      return { selectedClassId: classId, startingWeapon, screen: 'run' };
    }),
  depositCurrency: (amount) => set((state) => ({ currency: state.currency + Math.max(0, amount) })),
  depositBrokenParts: (amount) => set((state) => ({ brokenParts: state.brokenParts + Math.max(0, amount) })),
  purchaseTalentRank: (talentId) =>
    set((state) => {
      const def = talentRegistry.tryGet(talentId);
      if (!def) return state;
      const currentRank = state.talentRanks[talentId] ?? 0;
      if (currentRank >= def.maxRank) return state;
      const cost = costForRank(def.baseCost, currentRank);
      if (state.currency < cost) return state;
      return { currency: state.currency - cost, talentRanks: { ...state.talentRanks, [talentId]: currentRank + 1 } };
    }),
  upgradeCompanion: (companionId) =>
    set((state) => {
      const currentRank = state.companionUpgrades[companionId] ?? 0;
      if (currentRank >= MAX_COMPANION_UPGRADE_RANK) return state;
      const cost = companionUpgradeCost(currentRank);
      if (state.currency < cost) return state;
      return {
        currency: state.currency - cost,
        companionUpgrades: { ...state.companionUpgrades, [companionId]: currentRank + 1 },
      };
    }),
  upgradeForge: () =>
    set((state) => {
      if (state.forgeLevel >= MAX_FORGE_LEVEL) return state;
      const cost = forgeUpgradeCost(state.forgeLevel);
      if (state.currency < cost) return state;
      return { currency: state.currency - cost, forgeLevel: state.forgeLevel + 1 };
    }),
  upgradeForgeWeapon: () =>
    set((state) => {
      if (state.forgeWeaponLevel >= MAX_FORGE_WEAPON_LEVEL) return state;
      const cost = forgeWeaponUpgradeCost(state.forgeWeaponLevel);
      if (state.brokenParts < cost) return state;
      return { brokenParts: state.brokenParts - cost, forgeWeaponLevel: state.forgeWeaponLevel + 1 };
    }),
  discover: (kind, id) =>
    set((state) => {
      const key = DISCOVERY_KEY[kind];
      const existing = state[key] as string[];
      if (existing.includes(id)) return state;
      return { [key]: [...existing, id] } as Partial<MetaStore>;
    }),
  lastGachaResults: null,
  pullGachaSingle: () =>
    set((state) => {
      if (state.currency < GACHA_SINGLE_PULL_COST) return state;
      const owned = new Set(state.unlockedCompanionIds);
      const result = pullGacha(new Rng(Date.now()), allCompanions, owned);
      return applyGachaResults(state, [result], GACHA_SINGLE_PULL_COST);
    }),
  pullGachaMulti: () =>
    set((state) => {
      if (state.currency < GACHA_MULTI_PULL_COST) return state;
      const owned = new Set(state.unlockedCompanionIds);
      const results = pullGachaMulti(new Rng(Date.now()), allCompanions, owned, GACHA_MULTI_PULL_COUNT);
      return applyGachaResults(state, results, GACHA_MULTI_PULL_COST);
    }),
  clearGachaResults: () => set({ lastGachaResults: null }),
}));

/** Shared by pullGachaSingle/pullGachaMulti: deducts the pull cost, unlocks any new companions, refunds essence for duplicates, and stashes the results for the reveal overlay. */
function applyGachaResults(state: MetaStore, results: GachaPullResult[], totalCost: number): Partial<MetaStore> {
  const unlocked = new Set(state.unlockedCompanionIds);
  const discoveredCompanionIds = new Set(state.discoveredCompanionIds);
  let refund = 0;

  for (const result of results) {
    discoveredCompanionIds.add(result.companion.id);
    if (result.isNew) {
      unlocked.add(result.companion.id);
    } else {
      refund += Math.round(GACHA_SINGLE_PULL_COST * GACHA_DUPLICATE_REFUND_FRACTION);
    }
  }

  return {
    currency: state.currency - totalCost + refund,
    unlockedCompanionIds: [...unlocked],
    discoveredCompanionIds: [...discoveredCompanionIds],
    lastGachaResults: results,
  };
}

export { MAX_FORGE_LEVEL, MAX_COMPANION_UPGRADE_RANK, MAX_FORGE_WEAPON_LEVEL };

// Hydrate from IndexedDB once, then persist on every subsequent change.
void (async () => {
  try {
    const saved = await idbGet<PersistedMeta>(STORAGE_KEY);
    if (saved) useMetaStore.setState(saved);
  } finally {
    useMetaStore.setState({ hydrated: true });
    useMetaStore.subscribe((state) => {
      void idbSet(STORAGE_KEY, persistedSlice(state));
    });
  }
})();
