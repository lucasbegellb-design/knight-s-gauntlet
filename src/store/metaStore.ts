import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { talentRegistry } from '../data/talents';
import { costForRank } from '../engine/talents';

const STORAGE_KEY = 'knights-gauntlet-meta-v1';
const MAX_FORGE_LEVEL = 20;
const FORGE_BASE_COST = 25;
const MAX_COMPANION_UPGRADE_RANK = 5;
const COMPANION_UPGRADE_BASE_COST = 30;

export type DiscoveryKind = 'relic' | 'spell' | 'equipment' | 'monster' | 'companion';

interface PersistedMeta {
  currency: number;
  talentRanks: Record<string, number>;
  companionUpgrades: Record<string, number>;
  forgeLevel: number;
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
  discoveredRelicIds: [],
  discoveredSpellIds: [],
  discoveredEquipmentIds: [],
  discoveredMonsterIds: [],
  discoveredCompanionIds: [],
};

export type Screen = 'hub' | 'run';

interface MetaStore extends PersistedMeta {
  screen: Screen;
  hydrated: boolean;
  setScreen: (screen: Screen) => void;
  depositCurrency: (amount: number) => void;
  purchaseTalentRank: (talentId: string) => void;
  upgradeCompanion: (companionId: string) => void;
  upgradeForge: () => void;
  discover: (kind: DiscoveryKind, id: string) => void;
}

function persistedSlice(state: MetaStore): PersistedMeta {
  return {
    currency: state.currency,
    talentRanks: state.talentRanks,
    companionUpgrades: state.companionUpgrades,
    forgeLevel: state.forgeLevel,
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
  setScreen: (screen) => set({ screen }),
  depositCurrency: (amount) => set((state) => ({ currency: state.currency + Math.max(0, amount) })),
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
  discover: (kind, id) =>
    set((state) => {
      const key = DISCOVERY_KEY[kind];
      const existing = state[key] as string[];
      if (existing.includes(id)) return state;
      return { [key]: [...existing, id] } as Partial<MetaStore>;
    }),
}));

export { MAX_FORGE_LEVEL, MAX_COMPANION_UPGRADE_RANK };

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
