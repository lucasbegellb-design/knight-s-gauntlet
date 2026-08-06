import type { Rarity } from './rarity';
import type { RelicModifier } from './relic.types';
import type { Element } from '../engine/elements';

export type CompanionRole = 'tank' | 'dps' | 'healer' | 'support' | 'summoner';

/**
 * A party-wide bonus granted only while this companion is the squad's designated leader.
 * Straight out of Brave Frontier: the leader slot is the single highest-leverage decision in
 * squad building, because it rewrites how the whole party fights rather than adding one more
 * body. Reuses the existing `RelicModifier` vocabulary, so the engine needed no new plumbing —
 * WaveManager folds it in alongside talents/class/forge modifiers.
 */
export interface LeaderSkill {
  name: string;
  description: string;
  modifiers: RelicModifier[];
}

export interface CompanionDefinition {
  id: string;
  name: string;
  rarity: Rarity;
  role: CompanionRole;
  /** Elemental affinity — drives squad-vs-zone matchups. */
  element: Element;
  description: string;
  maxHp: number;
  attack: number;
  attackIntervalMs: number;
  /** healer only: flat HP restored to the lowest-HP ally each cast. */
  healAmount?: number;
  /** summoner only: chance to strike the monster a second time in the same turn. */
  doubleStrikeChance?: number;
  /** Party-wide bonus, active only while this companion leads the squad (see `LeaderSkill`). */
  leaderSkill?: LeaderSkill;
  /** support only: a passive aura applied to the whole party's combat modifiers while this companion is alive. */
  auraModifier?: RelicModifier;
}
