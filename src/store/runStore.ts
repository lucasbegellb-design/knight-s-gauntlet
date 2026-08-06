import { create } from 'zustand';
import type { MonsterTier } from '../data/monster.types';
import type { EquipmentSlot } from '../data/equipment.types';
import type { CompanionRole } from '../data/companion.types';
import type { Rarity } from '../data/rarity';
import type { LootOption } from '../engine/loot';

export type CombatSpeed = 1 | 2 | 4;

export interface OwnedRelicDisplay {
  id: string;
  name: string;
  rarity: Rarity;
  count: number;
}

export type EquippedDisplay = Record<EquipmentSlot, { name: string; rarity: Rarity } | null>;

export interface CompanionDisplay {
  id: string;
  name: string;
  role: CompanionRole;
  hp: number;
  maxHp: number;
}

export interface OwnedSpellDisplay {
  id: string;
  name: string;
  rarity: Rarity;
  count: number;
}

export interface RunSnapshot {
  waveNumber: number;
  zoneName: string;
  heroClassName: string;
  monsterName: string;
  monsterTier: MonsterTier;
  /** True when the current wave's monster is an Echo of the hero's own stats — see WaveManager. */
  isEcho: boolean;
  monsterHp: number;
  monsterMaxHp: number;
  heroLevel: number;
  heroXp: number;
  heroXpToNext: number;
  heroHp: number;
  heroMaxHp: number;
  isGameOver: boolean;
  /** Why the run ended — distinguishes a voluntary flee from a death, for the game-over overlay copy. */
  endReason: 'death' | 'abandoned';
  gold: number;
  brokenParts: number;
  ownedRelics: OwnedRelicDisplay[];
  equipped: EquippedDisplay;
  companions: CompanionDisplay[];
  activeSpells: OwnedSpellDisplay[];
  passiveSpells: OwnedSpellDisplay[];
  isChoosingLoot: boolean;
  lootOptions: LootOption[];
}

interface RunStore extends RunSnapshot {
  speed: CombatSpeed;
  /** Bumped whenever the player picks a loot option; the scene watches this to apply the pick. */
  lootChoiceRequest: { token: number; index: number } | null;
  /** Bumped whenever the player chooses to flee a run in progress; the scene watches this to end it. */
  abandonRunRequest: { token: number } | null;
  setSnapshot: (snapshot: RunSnapshot) => void;
  setSpeed: (speed: CombatSpeed) => void;
  requestLootChoice: (index: number) => void;
  requestAbandonRun: () => void;
}

const initialSnapshot: RunSnapshot = {
  waveNumber: 1,
  zoneName: '',
  heroClassName: 'Knight',
  monsterName: '',
  monsterTier: 'normal',
  isEcho: false,
  monsterHp: 0,
  monsterMaxHp: 0,
  heroLevel: 1,
  heroXp: 0,
  heroXpToNext: 0,
  heroHp: 0,
  heroMaxHp: 0,
  isGameOver: false,
  endReason: 'death',
  gold: 0,
  brokenParts: 0,
  ownedRelics: [],
  equipped: { weapon: null, armor: null, accessory: null },
  companions: [],
  activeSpells: [],
  passiveSpells: [],
  isChoosingLoot: false,
  lootOptions: [],
};

export const useRunStore = create<RunStore>((set) => ({
  ...initialSnapshot,
  speed: 1,
  lootChoiceRequest: null,
  abandonRunRequest: null,
  setSnapshot: (snapshot) => set(snapshot),
  setSpeed: (speed) => set({ speed }),
  requestLootChoice: (index) =>
    set((state) => ({ lootChoiceRequest: { token: (state.lootChoiceRequest?.token ?? 0) + 1, index } })),
  requestAbandonRun: () => set((state) => ({ abandonRunRequest: { token: (state.abandonRunRequest?.token ?? 0) + 1 } })),
}));
