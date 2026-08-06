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
  /**
   * Set by the engine once this unit's `death` event has been emitted. A single burst or execute
   * chain can drop several enemies at once, and each still owes the renderer exactly one death
   * event — no more, no fewer.
   */
  deathReported?: boolean;
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
  | { type: 'affinity'; attackerId: string; targetId: string; affinity: 'strong' | 'weak' }
  /** The party gauge just filled: the burst is armed and awaiting either a manual trigger or the auto-fire timeout. */
  | { type: 'burstReady' }
  /** The whole squad fired. `manual` distinguishes a player-timed burst (bonus damage) from the auto-fire fallback. */
  | { type: 'braveBurst'; manual: boolean; damage: number; healed: number; contributors: string[] }
  /** A Thorned monster returned part of a hit to whoever landed it. */
  | { type: 'thorns'; attackerId: string; damage: number }
  /** A monster healed itself — from an affix's lifesteal or its per-second regeneration. */
  | { type: 'monsterHeal'; amount: number; reason: 'lifesteal' | 'regen' };

export interface CombatState {
  hero: Combatant;
  /**
   * Every enemy in the wave, in spawn order. The party focuses the front-most survivor (see
   * `primaryMonster`), so a pack is cleared front to back. Single-enemy waves are simply a group
   * of one, which is why most of the engine and its tests did not have to change shape.
   */
  monsters: Combatant[];
  allies: AllyUnit[];
  elapsedMs: number;
  isOver: boolean;
  winnerId: string | null;
  /** Party Brave Burst charge, 0..1. Fills from damage dealt and taken — see CombatEngine. */
  burstGauge: number;
  /** True once the gauge filled and the burst is waiting to fire. */
  burstArmed: boolean;
}
