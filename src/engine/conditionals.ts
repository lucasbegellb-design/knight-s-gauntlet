import type { Affinity, Element } from './elements';
import type { ConditionalModifier, ModifierCondition } from '../data/relic.types';

/**
 * Conditional, multiplicative modifiers — the combo layer.
 *
 * The original `RelicModifier` vocabulary is a flat additive sum: every relic in the game
 * collapses into one of fifteen `${kind}Sum` numbers. That is easy to reason about and it is
 * exactly why sixty-one relics never produced a single interesting build — nothing a relic does
 * can depend on what any other relic did, and everything lands in the same `+`.
 *
 * This module adds the missing half without touching the first one. A conditional carries a
 * predicate over the live fight (`ModifierCondition`) and contributes a *multiplier* on the
 * final damage of a hit. Multipliers from separate relics compose as a product, so two relics
 * that each look modest become genuinely large together — which is the entire pleasure of a
 * Balatro-style build and the thing flat sums structurally cannot express.
 *
 * Pure and framework-free like the rest of `src/engine`: `CombatEngine` hands it a snapshot of
 * the fight and gets back three numbers.
 */
export interface ConditionContext {
  /** Attacker's current HP as a fraction of max. */
  attackerHpFraction: number;
  /** Defender's current HP as a fraction of max. */
  targetHpFraction: number;
  /** Elemental matchup of this specific hit. */
  affinity: Affinity;
  /** Defender's element, for conditions that name one. */
  targetElement?: Element;
  /** Distinct relics owned this run — the "the more you hoard, the harder you hit" axis. */
  relicCount: number;
  /** Waves cleared so far, for conditionals that grow across a run. */
  wavesCleared: number;
  /** Elements present in the living squad, for composition-reward conditionals. */
  squadElements: Element[];
}

export interface ResolvedConditionals {
  /** Multiplier applied to the hit's damage before the crit roll. Product of every met condition. */
  damageMultiplier: number;
  /** Flat damage added before multipliers. */
  flatDamage: number;
  /** Crit chance contributed on top of the flat modifier pipeline's own. */
  critChance: number;
  /** Extra multiplier applied only if the hit crits — kept separate so one pass covers both cases. */
  onCritMultiplier: number;
}

export const NEUTRAL_CONDITIONALS: ResolvedConditionals = {
  damageMultiplier: 1,
  flatDamage: 0,
  critChance: 0,
  onCritMultiplier: 1,
};

/**
 * How many times a condition is met: 0 for an unmet gate, 1 for a met gate, or a count for the
 * `per*` conditions that scale. Returning a number rather than a boolean is what lets a single
 * relic read "+8% damage per relic you own" without a second vocabulary.
 */
export function conditionStacks(condition: ModifierCondition, ctx: ConditionContext): number {
  switch (condition.kind) {
    case 'always':
      return 1;
    case 'attackerBelowHalfHp':
      return ctx.attackerHpFraction <= 0.5 ? 1 : 0;
    case 'attackerAboveThreeQuarterHp':
      return ctx.attackerHpFraction >= 0.75 ? 1 : 0;
    case 'targetBelowHalfHp':
      return ctx.targetHpFraction <= 0.5 ? 1 : 0;
    case 'targetAboveHalfHp':
      return ctx.targetHpFraction > 0.5 ? 1 : 0;
    case 'elementAdvantage':
      return ctx.affinity === 'strong' ? 1 : 0;
    case 'elementDisadvantage':
      return ctx.affinity === 'weak' ? 1 : 0;
    case 'vsElement':
      return ctx.targetElement === condition.element ? 1 : 0;
    case 'onCrit':
      // Gated by the caller, which routes these into `onCritMultiplier` rather than the base one.
      return 1;
    case 'perRelicOwned':
      return ctx.relicCount;
    case 'perWaveCleared':
      return ctx.wavesCleared;
    case 'perMissingHpTenth':
      return Math.floor((1 - ctx.attackerHpFraction) * 10);
    case 'perSquadElement':
      return ctx.squadElements.filter((element) => element === condition.element).length;
    case 'perDistinctSquadElement':
      return new Set(ctx.squadElements).size;
    default: {
      // Exhaustiveness guard: adding a condition kind without handling it is a compile error.
      const never: never = condition;
      return never;
    }
  }
}

/** Folds every conditional into the three numbers `CombatEngine` needs for one hit. */
export function resolveConditionals(modifiers: ConditionalModifier[], ctx: ConditionContext): ResolvedConditionals {
  if (modifiers.length === 0) return NEUTRAL_CONDITIONALS;

  const resolved: ResolvedConditionals = { damageMultiplier: 1, flatDamage: 0, critChance: 0, onCritMultiplier: 1 };

  for (const modifier of modifiers) {
    const stacks = conditionStacks(modifier.condition, ctx);
    if (stacks <= 0) continue;

    const isCritGated = modifier.condition.kind === 'onCrit';
    if (modifier.damageMultiplier) {
      // Per-stack growth is additive inside one relic (n stacks of +8% is +8n%), but the result
      // multiplies across relics — that product is where builds get their spikes.
      const factor = 1 + modifier.damageMultiplier * stacks;
      if (isCritGated) resolved.onCritMultiplier *= factor;
      else resolved.damageMultiplier *= factor;
    }
    if (modifier.flatDamage) resolved.flatDamage += modifier.flatDamage * stacks;
    if (modifier.critChance) resolved.critChance += modifier.critChance * stacks;
  }

  return resolved;
}

/** Pulls every conditional out of a list of relic-shaped sources, honouring stack counts. */
export function collectConditionals(sources: { conditionals?: ConditionalModifier[]; count: number }[]): ConditionalModifier[] {
  const collected: ConditionalModifier[] = [];
  for (const source of sources) {
    if (!source.conditionals) continue;
    for (let i = 0; i < source.count; i++) collected.push(...source.conditionals);
  }
  return collected;
}
