import { create } from 'zustand';
import type { MonsterTier } from '../data/monster.types';

export type CombatSpeed = 1 | 2 | 4;

export interface RunSnapshot {
  waveNumber: number;
  monsterName: string;
  monsterTier: MonsterTier;
  monsterHp: number;
  monsterMaxHp: number;
  heroLevel: number;
  heroXp: number;
  heroXpToNext: number;
  heroHp: number;
  heroMaxHp: number;
  isGameOver: boolean;
}

interface RunStore extends RunSnapshot {
  speed: CombatSpeed;
  /** Bumped whenever the player asks for a fresh run; the scene watches this to reset itself. */
  restartToken: number;
  setSnapshot: (snapshot: RunSnapshot) => void;
  setSpeed: (speed: CombatSpeed) => void;
  requestRestart: () => void;
}

const initialSnapshot: RunSnapshot = {
  waveNumber: 1,
  monsterName: '',
  monsterTier: 'normal',
  monsterHp: 0,
  monsterMaxHp: 0,
  heroLevel: 1,
  heroXp: 0,
  heroXpToNext: 0,
  heroHp: 0,
  heroMaxHp: 0,
  isGameOver: false,
};

export const useRunStore = create<RunStore>((set) => ({
  ...initialSnapshot,
  speed: 1,
  restartToken: 0,
  setSnapshot: (snapshot) => set(snapshot),
  setSpeed: (speed) => set({ speed }),
  requestRestart: () => set((state) => ({ restartToken: state.restartToken + 1 })),
}));
