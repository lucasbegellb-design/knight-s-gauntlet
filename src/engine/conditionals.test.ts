import { describe, expect, it } from 'vitest';
import { NEUTRAL_CONDITIONALS, collectConditionals, conditionStacks, resolveConditionals, type ConditionContext } from './conditionals';
import { CombatEngine } from './CombatEngine';
import { relicRegistry } from '../data/relics';
import type { Combatant } from './types';
import type { ConditionalModifier } from '../data/relic.types';
import type { RunConditionContext } from './CombatEngine';

const BASE_CONTEXT: ConditionContext = {
  attackerHpFraction: 1,
  targetHpFraction: 1,
  affinity: 'neutral',
  targetElement: undefined,
  relicCount: 0,
  wavesCleared: 0,
  squadElements: [],
};

function ctx(overrides: Partial<ConditionContext> = {}): ConditionContext {
  return { ...BASE_CONTEXT, ...overrides };
}

describe('conditionStacks', () => {
  it('treats `always` as met exactly once', () => {
    expect(conditionStacks({ kind: 'always' }, ctx())).toBe(1);
  });

  it('gates on attacker and target health', () => {
    expect(conditionStacks({ kind: 'attackerBelowHalfHp' }, ctx({ attackerHpFraction: 0.4 }))).toBe(1);
    expect(conditionStacks({ kind: 'attackerBelowHalfHp' }, ctx({ attackerHpFraction: 0.6 }))).toBe(0);
    expect(conditionStacks({ kind: 'targetBelowHalfHp' }, ctx({ targetHpFraction: 0.2 }))).toBe(1);
    expect(conditionStacks({ kind: 'targetAboveHalfHp' }, ctx({ targetHpFraction: 0.2 }))).toBe(0);
    expect(conditionStacks({ kind: 'attackerAboveThreeQuarterHp' }, ctx({ attackerHpFraction: 0.8 }))).toBe(1);
  });

  it('gates on the elemental matchup', () => {
    expect(conditionStacks({ kind: 'elementAdvantage' }, ctx({ affinity: 'strong' }))).toBe(1);
    expect(conditionStacks({ kind: 'elementAdvantage' }, ctx({ affinity: 'weak' }))).toBe(0);
    expect(conditionStacks({ kind: 'elementDisadvantage' }, ctx({ affinity: 'weak' }))).toBe(1);
    expect(conditionStacks({ kind: 'vsElement', element: 'dark' }, ctx({ targetElement: 'dark' }))).toBe(1);
    expect(conditionStacks({ kind: 'vsElement', element: 'dark' }, ctx({ targetElement: 'fire' }))).toBe(0);
  });

  it('counts rather than gates for the `per*` kinds', () => {
    expect(conditionStacks({ kind: 'perRelicOwned' }, ctx({ relicCount: 7 }))).toBe(7);
    expect(conditionStacks({ kind: 'perWaveCleared' }, ctx({ wavesCleared: 12 }))).toBe(12);
    expect(conditionStacks({ kind: 'perMissingHpTenth' }, ctx({ attackerHpFraction: 0.35 }))).toBe(6);
    expect(conditionStacks({ kind: 'perSquadElement', element: 'fire' }, ctx({ squadElements: ['fire', 'water', 'fire'] }))).toBe(2);
    expect(conditionStacks({ kind: 'perDistinctSquadElement' }, ctx({ squadElements: ['fire', 'water', 'fire'] }))).toBe(2);
  });
});

describe('resolveConditionals', () => {
  it('is neutral with no modifiers', () => {
    expect(resolveConditionals([], ctx())).toBe(NEUTRAL_CONDITIONALS);
  });

  it('skips modifiers whose condition is unmet', () => {
    const mods: ConditionalModifier[] = [{ condition: { kind: 'attackerBelowHalfHp' }, damageMultiplier: 1 }];
    expect(resolveConditionals(mods, ctx({ attackerHpFraction: 1 })).damageMultiplier).toBe(1);
  });

  it('composes multipliers from separate relics as a product, not a sum', () => {
    const mods: ConditionalModifier[] = [
      { condition: { kind: 'always' }, damageMultiplier: 0.5 },
      { condition: { kind: 'always' }, damageMultiplier: 0.5 },
    ];
    // The whole point of the layer: 1.5 * 1.5 = 2.25, not 1 + 0.5 + 0.5 = 2.
    expect(resolveConditionals(mods, ctx()).damageMultiplier).toBeCloseTo(2.25);
  });

  it('grows a `per*` modifier additively within one relic', () => {
    const mods: ConditionalModifier[] = [{ condition: { kind: 'perRelicOwned' }, damageMultiplier: 0.1 }];
    expect(resolveConditionals(mods, ctx({ relicCount: 5 })).damageMultiplier).toBeCloseTo(1.5);
  });

  it('routes onCrit modifiers away from the base multiplier', () => {
    const mods: ConditionalModifier[] = [{ condition: { kind: 'onCrit' }, damageMultiplier: 0.6 }];
    const resolved = resolveConditionals(mods, ctx());
    expect(resolved.damageMultiplier).toBe(1);
    expect(resolved.onCritMultiplier).toBeCloseTo(1.6);
  });

  it('sums flat damage and crit chance across stacks', () => {
    const mods: ConditionalModifier[] = [
      { condition: { kind: 'perRelicOwned' }, critChance: 0.02, flatDamage: 3 },
      { condition: { kind: 'always' }, critChance: 0.1 },
    ];
    const resolved = resolveConditionals(mods, ctx({ relicCount: 4 }));
    expect(resolved.critChance).toBeCloseTo(0.18);
    expect(resolved.flatDamage).toBe(12);
  });
});

describe('collectConditionals', () => {
  it('repeats a source once per owned stack and ignores sources with none', () => {
    const conditionals: ConditionalModifier[] = [{ condition: { kind: 'always' }, damageMultiplier: 0.1 }];
    expect(collectConditionals([{ conditionals, count: 3 }, { count: 5 }])).toHaveLength(3);
  });
});

describe('CombatEngine integration', () => {
  function unit(overrides: Partial<Combatant> = {}): Combatant {
    return { id: 'hero', name: 'Hero', maxHp: 100, hp: 100, attack: 20, attackIntervalMs: 500, nextAttackAt: 500, ...overrides };
  }
  function dummy(): Combatant {
    return unit({ id: 'dummy', name: 'Dummy', maxHp: 100_000, hp: 100_000, attack: 1, attackIntervalMs: 10_000_000, nextAttackAt: 10_000_000 });
  }

  function damageOfFirstHit(conditionals: ConditionalModifier[], runContext?: RunConditionContext): number {
    const engine = new CombatEngine(unit(), dummy(), 1, undefined, [], [], conditionals, runContext);
    const events = engine.tick(600);
    const attack = events.find((e) => e.type === 'attack');
    return attack?.type === 'attack' ? attack.damage : 0;
  }

  it('leaves damage unchanged when no conditionals are supplied', () => {
    expect(damageOfFirstHit([])).toBe(20);
  });

  it('applies a met conditional to the hit', () => {
    expect(damageOfFirstHit([{ condition: { kind: 'always' }, damageMultiplier: 0.5 }])).toBe(30);
  });

  it('reads run-level context supplied by WaveManager', () => {
    const mods: ConditionalModifier[] = [{ condition: { kind: 'perRelicOwned' }, damageMultiplier: 0.1 }];
    expect(damageOfFirstHit(mods, { relicCount: 5, wavesCleared: 0, squadElements: [] })).toBe(30);
  });

  it('ignores a conditional whose condition the fight does not meet', () => {
    expect(damageOfFirstHit([{ condition: { kind: 'attackerBelowHalfHp' }, damageMultiplier: 5 }])).toBe(20);
  });
});

describe('combo pack content', () => {
  const comboIds = [
    'hoarders_ledger',
    'curators_seal',
    'last_stand',
    'bloodletters_pact',
    'cracked_hourglass',
    'executioners_tally',
    'opening_gambit',
    'elementalists_focus',
    'prism_core',
    'stubborn_grudge',
    'compounding_interest',
    'headsmans_follow_through',
    'zealots_brand',
    'gravekeepers_lantern',
    'unbroken_guard',
  ];

  it('registers every combo relic with at least one conditional', () => {
    for (const id of comboIds) {
      const def = relicRegistry.get(id);
      expect(def.conditionals?.length, `${id} should carry a conditional`).toBeGreaterThan(0);
    }
  });

  it('keeps every multiplicative relic unique — stacking one compounds too fast to tune', () => {
    for (const id of comboIds) {
      expect(relicRegistry.get(id).stacking, `${id} must be unique`).toBe('unique');
    }
  });
});
