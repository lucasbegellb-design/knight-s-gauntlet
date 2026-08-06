import { describe, expect, it } from 'vitest';
import { AFFIX_MIN_WAVE, affixChance, eligibleAffixes, rollWaveAffix } from './affixes';
import { CombatEngine } from './CombatEngine';
import { Rng } from './rng';
import { allAffixes } from '../data/affixes';
import type { Combatant } from './types';

function unit(overrides: Partial<Combatant> = {}): Combatant {
  return { id: 'hero', name: 'Hero', maxHp: 200, hp: 200, attack: 20, attackIntervalMs: 500, nextAttackAt: 500, ...overrides };
}
function monster(overrides: Partial<Combatant> = {}): Combatant {
  return unit({ id: 'monster', name: 'Monster', maxHp: 10_000, hp: 10_000, attack: 10, attackIntervalMs: 400, nextAttackAt: 400, ...overrides });
}

describe('affix rolling', () => {
  it('never rolls an affix during the opening waves', () => {
    for (let wave = 1; wave < AFFIX_MIN_WAVE; wave++) {
      expect(affixChance(wave, 'normal')).toBe(0);
      expect(rollWaveAffix(wave, 'normal', new Rng(1))).toBeNull();
    }
  });

  it('raises the chance with depth and with tier', () => {
    expect(affixChance(30, 'normal')).toBeGreaterThan(affixChance(5, 'normal'));
    expect(affixChance(20, 'boss')).toBeGreaterThan(affixChance(20, 'normal'));
    expect(affixChance(20, 'megaboss')).toBeGreaterThan(affixChance(20, 'boss'));
  });

  it('caps the chance so no wave is guaranteed to be modified', () => {
    expect(affixChance(100_000, 'ultraboss')).toBeLessThan(1);
  });

  it('gates the nastier affixes behind their own minimum wave', () => {
    const early = eligibleAffixes(AFFIX_MIN_WAVE).map((a) => a.id);
    const late = eligibleAffixes(1000).map((a) => a.id);
    expect(late.length).toBeGreaterThan(early.length);
    expect(early).not.toContain('colossal');
    expect(late).toContain('colossal');
  });

  it('only ever returns an affix legal for that wave', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const wave = 5;
      const affix = rollWaveAffix(wave, 'boss', new Rng(seed));
      if (affix) expect(affix.minWave).toBeLessThanOrEqual(wave);
    }
  });

  it('consumes the same number of rng draws whether or not it rolls one', () => {
    // Keeps seeded expectations elsewhere stable regardless of which branch a wave takes.
    const rngA = new Rng(3);
    rollWaveAffix(50, 'boss', rngA);
    const rngB = new Rng(3);
    rngB.next();
    rngB.next();
    expect(rngA.next()).toBe(rngB.next());
  });

  it('eventually produces every affix given enough waves', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 4000; seed++) {
      const affix = rollWaveAffix(500, 'boss', new Rng(seed));
      if (affix) seen.add(affix.id);
    }
    expect(seen.size).toBe(allAffixes.length);
  });
});

describe('monster traits in combat', () => {
  it('reduces incoming damage for an armored monster', () => {
    const plain = new CombatEngine(unit(), monster(), 1);
    const armored = new CombatEngine(unit(), monster(), 1, undefined, [], [], [], undefined, { damageReduction: 0.25 });

    // The monster swings first at this interval, so filter to the hero's own hit explicitly.
    const plainHit = plain.tick(600).find((e) => e.type === 'attack' && e.attackerId === 'hero');
    const armoredHit = armored.tick(600).find((e) => e.type === 'attack' && e.attackerId === 'hero');
    const plainDamage = plainHit?.type === 'attack' ? plainHit.damage : 0;
    const armoredDamage = armoredHit?.type === 'attack' ? armoredHit.damage : 0;

    expect(armoredDamage).toBe(Math.round(plainDamage * 0.75));
  });

  it('returns damage to the attacker for a thorned monster', () => {
    const engine = new CombatEngine(unit(), monster(), 1, undefined, [], [], [], undefined, { thornsPercent: 0.2 });
    const events = engine.tick(600);
    const thorns = events.find((e) => e.type === 'thorns');

    expect(thorns).toBeDefined();
    expect(engine.getState().hero.hp).toBeLessThan(200);
  });

  it('heals a vampiric monster for a fraction of the damage it deals', () => {
    const wounded = monster({ hp: 5000 });
    const engine = new CombatEngine(unit(), wounded, 1, undefined, [], [], [], undefined, { lifestealPercent: 0.5 });
    const events = engine.tick(1200);
    expect(events.some((e) => e.type === 'monsterHeal' && e.reason === 'lifesteal')).toBe(true);
  });

  it('regenerates a fraction of max HP per second', () => {
    const wounded = monster({ hp: 5000, attackIntervalMs: 10_000_000, nextAttackAt: 10_000_000 });
    const engine = new CombatEngine(unit({ attackIntervalMs: 10_000_000, nextAttackAt: 10_000_000 }), wounded, 1, undefined, [], [], [], undefined, {
      regenPerSecondFraction: 0.01,
    });
    const events = engine.tick(1000);
    const heal = events.find((e) => e.type === 'monsterHeal');

    expect(heal?.type === 'monsterHeal' && heal.reason).toBe('regen');
    expect(engine.getState().monster.hp).toBe(5100);
  });

  it('doubles a frenzied monster’s attack only once it is wounded', () => {
    const healthy = new CombatEngine(unit(), monster({ hp: 10_000 }), 1, undefined, [], [], [], undefined, {
      enrageThreshold: 0.5,
      enrageAttackMultiplier: 2,
    });
    const enraged = new CombatEngine(unit(), monster({ hp: 2000 }), 1, undefined, [], [], [], undefined, {
      enrageThreshold: 0.5,
      enrageAttackMultiplier: 2,
    });

    const healthyHit = healthy.tick(500).filter((e) => e.type === 'attack').find((e) => e.type === 'attack' && e.attackerId === 'monster');
    const enragedHit = enraged.tick(500).filter((e) => e.type === 'attack').find((e) => e.type === 'attack' && e.attackerId === 'monster');

    const healthyDamage = healthyHit?.type === 'attack' ? healthyHit.damage : 0;
    const enragedDamage = enragedHit?.type === 'attack' ? enragedHit.damage : 0;
    expect(enragedDamage).toBe(healthyDamage * 2);
  });

  it('slows the Brave Burst gauge for a stifling monster', () => {
    const plain = new CombatEngine(unit(), monster(), 1);
    const stifled = new CombatEngine(unit(), monster(), 1, undefined, [], [], [], undefined, { burstFillMultiplier: 0.35 });

    plain.tick(600);
    stifled.tick(600);
    expect(stifled.getState().burstGauge).toBeLessThan(plain.getState().burstGauge);
    expect(stifled.getState().burstGauge).toBeGreaterThan(0);
  });

  it('leaves combat untouched when no traits are supplied', () => {
    const a = new CombatEngine(unit(), monster(), 5);
    const b = new CombatEngine(unit(), monster(), 5, undefined, [], [], [], undefined, {});
    expect(a.tick(3000).length).toBe(b.tick(3000).length);
  });
});
