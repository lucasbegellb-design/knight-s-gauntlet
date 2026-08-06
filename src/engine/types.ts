import type { CompanionRole } from '../data/companion.types';
import type { SpellEffect } from '../data/spell.types';
import type { Element } from './elements';

export interface Combatant {
  id: string;
  name: string;
  maxHp: number;
  hp: number;
  attack: number;
  attackIntervalMs: number;
  nextAttackAt: number;
  /** Elemental affinity. Undefined is neutral both ways — see `elements.ts`. */
  element?: Element;
}

/**
 * A companion's combat behavior wrapper. `combatant` is the generic engine
 * unit (hp/attack/timer); `role` and the role-specific fields below drive
 * what happens on its turn. Support companions have `actsIndependently:
 * false` — their effect is folded into `heroModifiers` at construction
 * time instead of taking a turn, but they still occupy a Combatant slot
 * so they're on-screen and can be targeted by the monster.
 */
export interface AllyUnit {
  combatant: Combatant;
  role: CompanionRole;
  actsIndependently: boolean;
  /** Relative chance the monster targets this ally instead of the hero (tanks are higher). */
  tauntWeight: number;
  /** healer only: flat HP restored to the lowest-HP ally per cast. */
  healAmount: number;
  /** summoner only: chance to strike a second time in the same turn. */
  doubleStrikeChance: number;
}

/** An automatically-cast active spell: another independent timer alongside the hero's own attacks. */
export interface SpellCaster {
  id: string;
  name: string;
  cooldownMs: number;
  nextCastAt: number;
  effect: SpellEffect;
  power: number;
}

export type CombatEvent =
  | { type: 'attack'; attackerId: string; targetId: string; damage: number; targetHpAfter: number }
  | { type: 'death'; combatantId: string }
  | { type: 'combatEnd'; winnerId: string | null }
  | { type: 'critHit'; targetId: string }
  | { type: 'statusProc'; kind: 'burn'; targetId: string; damage: number }
  | { type: 'lifesteal'; healerId: string; amount: number }
  | { type: 'execute'; targetId: string }
  | { type: 'reflect'; damagedId: string; damage: number }
  | { type: 'companionHeal'; healerId: string; targetId: string; amount: number }
  | { type: 'spellCast'; spellId: string; targetId: string; effect: SpellEffect; amount: number }
  /** Emitted alongside an `attack` whenever the elemental matchup wasn't neutral, so the UI can call it out. */
  | { type: 'affinity'; attackerId: string; targetId: string; affinity: 'strong' | 'weak' };

export interface CombatState {
  hero: Combatant;
  monster: Combatant;
  allies: AllyUnit[];
  elapsedMs: number;
  isOver: boolean;
  winnerId: string | null;
}
