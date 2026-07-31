import type { Rarity } from './rarity';
import type { RelicModifier } from './relic.types';

export type CompanionRole = 'tank' | 'dps' | 'healer' | 'support' | 'summoner';

export interface CompanionDefinition {
  id: string;
  name: string;
  rarity: Rarity;
  role: CompanionRole;
  description: string;
  maxHp: number;
  attack: number;
  attackIntervalMs: number;
  /** healer only: flat HP restored to the lowest-HP ally each cast. */
  healAmount?: number;
  /** summoner only: chance to strike the monster a second time in the same turn. */
  doubleStrikeChance?: number;
  /** support only: a passive aura applied to the whole party's combat modifiers while this companion is alive. */
  auraModifier?: RelicModifier;
}
