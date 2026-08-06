export type MonsterTier = 'normal' | 'miniboss' | 'boss' | 'megaboss' | 'ultraboss';

import type { Element } from '../engine/elements';

export interface MonsterDefinition {
  id: string;
  name: string;
  tier: MonsterTier;
  /** Elemental affinity used by the damage pipeline — see `src/engine/elements.ts`. */
  element: Element;
  maxHp: number;
  attack: number;
  attackIntervalMs: number;
  /** One line of voice, shown on the bestiary/Grimoire entry. Purely presentational. */
  flavor?: string;
  /** Base XP awarded to the hero on kill, before any wave scaling. */
  xpReward: number;
  spriteKey?: string;
}
