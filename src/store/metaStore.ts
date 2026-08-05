import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { talentRegistry } from '../data/talents';
import { costForRank } from '../engine/talents';
import { classRegistry } from '../data/classes';
import { Rng } from '../engine/rng';
import type { Rarity } from '../data/rarity';
import { forgeWeaponUpgradeCost, MAX_FORGE_WEAPON_LEVEL } from '../data/forgeWeapon';
import { allCompanions, STARTER_COMPANION_IDS } from '../data/companions';
import { pullGacha, pullGachaMulti, nextPityState, DEFAULT_PITY_STATE, type GachaPullResult, type GachaPityState } from '../engine/gacha';
import { pendingIdleEssence } from '../engine/idleEssence';
import { territoryRegistry, lordRegistry } from '../data/kingdom';
import { MAX_TREASURY_LEVEL, treasuryUpgradeCost } from '../engine/kingdom';

const STORAGE_KEY = 'knights-gauntlet-meta-v1';
const MAX_FORGE_LEVEL = 20;
const FORGE_BASE_COST = 25;
const MAX_COMPANION_UPGRADE_RANK = 5;
const COMPANION_UPGRADE_BASE_COST = 30;
export const MAX_ASCENSION_LEVEL = 20;
const ASCENSION_SHARD_BASE_COST = 3;
/** Ascension Shards granted per duplicate pull, scaled by the companion's rarity — a legendary duplicate is a real windfall, not just noise. */
const ASCENSION_SHARD_YIELD: Record<Rarity, number> = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 5,
  mythic: 8,
};
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
  /** Un-spent Ascension Shards per companion, earned from gacha duplicates — see ascendCompanion. */
  companionShards: Record<string, number>;
  /** Ascension level per companion — each level raises that companion's rank cap by +1 beyond the base MAX_COMPANION_UPGRADE_RANK. */
  companionAscension: Record<string, number>;
  forgeLevel: number;
  /** Salvage material for the Forge Weapon, dropped by monsters during runs (see src/engine/brokenParts.ts). */
  brokenParts: number;
  forgeWeaponLevel: number;
  /** Companions unlocked via the Gacha (src/ui/Gacha.tsx) — only these can appear in an in-run loot pool. */
  unlockedCompanionIds: string[];
  /** Pity streak counters carried across every pull (single and x10 alike) — see engine/gacha.ts. */
  gachaPity: GachaPityState;
  /** Kingdom territories conquered / lords recruited (see src/data/kingdom, src/engine/kingdom.ts) — a post-max-level essence sink. */
  conqueredTerritoryIds: string[];
  recruitedLordIds: string[];
  treasuryLevel: number;
  /** Timestamp (epoch ms) essence was last collected — the difference from "now" is how idle essence accrual is computed (see src/engine/idleEssence.ts). */
  lastEssenceCollectionAt: number;
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
  companionShards: {},
  companionAscension: {},
  forgeLevel: 0,
  brokenParts: 0,
  forgeWeaponLevel: 0,
  unlockedCompanionIds: [...STARTER_COMPANION_IDS],
  gachaPity: { ...DEFAULT_PITY_STATE },
  conqueredTerritoryIds: [],
  recruitedLordIds: [],
  treasuryLevel: 0,
  lastEssenceCollectionAt: Date.now(),
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
  ascendCompanion: (companionId: string) => void;
  upgradeForge: () => void;
  upgradeForgeWeapon: () => void;
  conquerTerritory: (territoryId: string) => void;
  recruitLord: (lordId: string) => void;
  upgradeTreasury: () => void;
  discover: (kind: DiscoveryKind, id: string) => void;
  /** Results of the most recent Gacha pull, shown by the reveal overlay; cleared once acknowledged. */
  lastGachaResults: GachaPullResult[] | null;
  pullGachaSingle: () => void;
  pullGachaMulti: () => void;
  clearGachaResults: () => void;
  /** Deposits whatever idle essence has accrued since lastEssenceCollectionAt and resets the timer. */
  collectIdleEssence: () => void;
}

function persistedSlice(state: MetaStore): PersistedMeta {
  return {
    currency: state.currency,
    talentRanks: state.talentRanks,
    companionUpgrades: state.companionUpgrades,
    companionShards: state.companionShards,
    companionAscension: state.companionAscension,
    forgeLevel: state.forgeLevel,
    brokenParts: state.brokenParts,
    forgeWeaponLevel: state.forgeWeaponLevel,
    unlockedCompanionIds: state.unlockedCompanionIds,
    gachaPity: state.gachaPity,
    conqueredTerritoryIds: state.conqueredTerritoryIds,
    recruitedLordIds: state.recruitedLordIds,
    treasuryLevel: state.treasuryLevel,
    lastEssenceCollectionAt: state.lastEssenceCollectionAt,
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

export function ascensionShardCost(currentAscensionLevel: number): number {
  return costForRank(ASCENSION_SHARD_BASE_COST, currentAscensionLevel);
}

/** A companion's rank cap grows with ascension level — the mechanism that lets gacha duplicates fuel permanent power past the old fixed rank-5 ceiling. */
export function companionMaxRank(ascensionLevel: number): number {
  return MAX_COMPANION_UPGRADE_RANK + ascensionLevel;
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
      const maxRank = companionMaxRank(state.companionAscension[companionId] ?? 0);
      if (currentRank >= maxRank) return state;
      const cost = companionUpgradeCost(currentRank);
      if (state.currency < cost) return state;
      return {
        currency: state.currency - cost,
        companionUpgrades: { ...state.companionUpgrades, [companionId]: currentRank + 1 },
      };
    }),
  ascendCompanion: (companionId) =>
    set((state) => {
      const currentLevel = state.companionAscension[companionId] ?? 0;
      if (currentLevel >= MAX_ASCENSION_LEVEL) return state;
      const cost = ascensionShardCost(currentLevel);
      const shards = state.companionShards[companionId] ?? 0;
      if (shards < cost) return state;
      return {
        companionShards: { ...state.companionShards, [companionId]: shards - cost },
        companionAscension: { ...state.companionAscension, [companionId]: currentLevel + 1 },
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
  conquerTerritory: (territoryId) =>
    set((state) => {
      if (state.conqueredTerritoryIds.includes(territoryId)) return state;
      const def = territoryRegistry.tryGet(territoryId);
      if (!def || state.currency < def.cost) return state;
      return { currency: state.currency - def.cost, conqueredTerritoryIds: [...state.conqueredTerritoryIds, territoryId] };
    }),
  recruitLord: (lordId) =>
    set((state) => {
      if (state.recruitedLordIds.includes(lordId)) return state;
      const def = lordRegistry.tryGet(lordId);
      if (!def || state.currency < def.cost) return state;
      return { currency: state.currency - def.cost, recruitedLordIds: [...state.recruitedLordIds, lordId] };
    }),
  upgradeTreasury: () =>
    set((state) => {
      if (state.treasuryLevel >= MAX_TREASURY_LEVEL) return state;
      const cost = treasuryUpgradeCost(state.treasuryLevel);
      if (state.currency < cost) return state;
      return { currency: state.currency - cost, treasuryLevel: state.treasuryLevel + 1 };
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
      const result = pullGacha(new Rng(Date.now()), allCompanions, owned, state.gachaPity);
      const pity = nextPityState(state.gachaPity, result.companion.rarity);
      return applyGachaResults(state, [result], GACHA_SINGLE_PULL_COST, pity);
    }),
  pullGachaMulti: () =>
    set((state) => {
      if (state.currency < GACHA_MULTI_PULL_COST) return state;
      const owned = new Set(state.unlockedCompanionIds);
      const results = pullGachaMulti(new Rng(Date.now()), allCompanions, owned, GACHA_MULTI_PULL_COUNT, state.gachaPity);
      const pity = results.reduce((acc, r) => nextPityState(acc, r.companion.rarity), state.gachaPity);
      return applyGachaResults(state, results, GACHA_MULTI_PULL_COST, pity);
    }),
  clearGachaResults: () => set({ lastGachaResults: null }),
  collectIdleEssence: () =>
    set((state) => {
      const now = Date.now();
      const pending = pendingIdleEssence(state.lastEssenceCollectionAt, now);
      if (pending <= 0) return { lastEssenceCollectionAt: now };
      return { currency: state.currency + pending, lastEssenceCollectionAt: now };
    }),
}));

/** Shared by pullGachaSingle/pullGachaMulti: deducts the pull cost, unlocks any new companions, refunds essence + grants Ascension Shards for duplicates, advances the pity streak, and stashes the results for the reveal overlay. */
function applyGachaResults(state: MetaStore, results: GachaPullResult[], totalCost: number, pity: GachaPityState): Partial<MetaStore> {
  const unlocked = new Set(state.unlockedCompanionIds);
  const discoveredCompanionIds = new Set(state.discoveredCompanionIds);
  const companionShards = { ...state.companionShards };
  let refund = 0;

  for (const result of results) {
    discoveredCompanionIds.add(result.companion.id);
    if (result.isNew) {
      unlocked.add(result.companion.id);
    } else {
      refund += Math.round(GACHA_SINGLE_PULL_COST * GACHA_DUPLICATE_REFUND_FRACTION);
      const id = result.companion.id;
      companionShards[id] = (companionShards[id] ?? 0) + ASCENSION_SHARD_YIELD[result.companion.rarity];
    }
  }

  return {
    currency: state.currency - totalCost + refund,
    unlockedCompanionIds: [...unlocked],
    discoveredCompanionIds: [...discoveredCompanionIds],
    companionShards,
    gachaPity: pity,
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
