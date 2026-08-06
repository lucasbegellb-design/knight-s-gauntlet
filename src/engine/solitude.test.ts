import { describe, expect, it } from 'vitest';
import { SOLITUDE_PER_EMPTY_SLOT, partyStrength, resolveSolitudeModifiers } from './solitude';
import { WaveManager, DEFAULT_META_BONUSES, MAX_ACTIVE_COMPANIONS } from './WaveManager';
import { knight } from '../data/hero';

describe('resolveSolitudeModifiers', () => {
  it('grants nothing to a full party', () => {
    expect(resolveSolitudeModifiers(MAX_ACTIVE_COMPANIONS, MAX_ACTIVE_COMPANIONS)).toEqual([]);
  });

  it('scales continuously with empty slots rather than switching on at zero companions', () => {
    const one = resolveSolitudeModifiers(2, 3);
    const three = resolveSolitudeModifiers(0, 3);

    const damageOf = (mods: ReturnType<typeof resolveSolitudeModifiers>) =>
      mods.find((m) => m.kind === 'damageMultiplier')?.value ?? 0;

    expect(damageOf(one)).toBeCloseTo(SOLITUDE_PER_EMPTY_SLOT.damageMultiplier as number);
    expect(damageOf(three)).toBeCloseTo((SOLITUDE_PER_EMPTY_SLOT.damageMultiplier as number) * 3);
  });

  it('compensates the action-economy gap, not only raw power', () => {
    // Attack speed is the deficit a solo hero actually has (one timer against four), so it must
    // be present — a version of this that only granted damage would miss the point.
    const kinds = resolveSolitudeModifiers(0, 3).map((m) => m.kind);
    expect(kinds).toContain('attackSpeedMultiplier');
    expect(kinds).toContain('damageMultiplier');
    expect(kinds).toContain('maxHpBonusPercent');
    expect(kinds).toContain('lifestealPercent');
  });

  it('clamps rather than inverting when the party somehow exceeds its cap', () => {
    expect(resolveSolitudeModifiers(9, 3)).toEqual([]);
  });

  it('reports party strength as a fraction', () => {
    expect(partyStrength(0, 3)).toBe(0);
    expect(partyStrength(3, 3)).toBe(1);
    expect(partyStrength(9, 3)).toBe(1);
  });
});

describe('the Solitary Trial in a run', () => {
  /**
   * Led by Roguish Blade on purpose. Comparing against a squad led by, say, Iron Vanguard would
   * measure that leader's +20% maxHp rather than this system — Cut Purse grants only gold and crit,
   * so neither of the stats under test here is touched by the leader skill.
   */
  const NEUTRAL_LED_SQUAD = ['roguish_blade', 'stalwart_guardian', 'iron_vanguard'];

  it('gives a solo hero more max HP than the same hero in a full squad', () => {
    const alone = new WaveManager(knight, 1, DEFAULT_META_BONUSES);
    const led = new WaveManager(knight, 1, DEFAULT_META_BONUSES, {}, NEUTRAL_LED_SQUAD, NEUTRAL_LED_SQUAD);

    expect(alone.getCombatState().hero.maxHp).toBeGreaterThan(led.getCombatState().hero.maxHp);
  });

  it('attacks faster alone than at full strength', () => {
    const alone = new WaveManager(knight, 1, DEFAULT_META_BONUSES);
    const led = new WaveManager(knight, 1, DEFAULT_META_BONUSES, {}, NEUTRAL_LED_SQUAD, NEUTRAL_LED_SQUAD);

    // Lower interval is faster.
    expect(alone.getCombatState().hero.attackIntervalMs).toBeLessThan(led.getCombatState().hero.attackIntervalMs);
  });

  it('leaves a full squad bit-for-bit unaffected', () => {
    // A party at full strength must fight exactly as it did before this system existed.
    const squad = ['iron_vanguard', 'stalwart_guardian', 'roguish_blade'];
    const manager = new WaveManager(knight, 5, DEFAULT_META_BONUSES, {}, squad, squad);
    const living = manager.getRunState().companions.filter((c) => c.hp > 0).length;

    expect(living).toBe(MAX_ACTIVE_COMPANIONS);
    expect(resolveSolitudeModifiers(living, MAX_ACTIVE_COMPANIONS)).toEqual([]);
  });

  it('ramps as companions fall, giving a collapsing run a last stand', () => {
    const manager = new WaveManager(knight, 1, DEFAULT_META_BONUSES, {}, NEUTRAL_LED_SQUAD, NEUTRAL_LED_SQUAD);
    const before = manager.getCombatState().hero.maxHp;

    // Wipe the party, then force the next wave to rebuild the hero from live companion counts.
    // The leader is Roguish Blade precisely so that losing it does not also remove a maxHp leader
    // skill, which would confound the measurement with an unrelated loss.
    for (const companion of manager.getRunState().companions) companion.hp = 0;
    const rebuilt = (
      manager as unknown as { buildWaveEngine: (wave: number) => { getState(): { hero: { maxHp: number } } } }
    ).buildWaveEngine(2);

    expect(rebuilt.getState().hero.maxHp).toBeGreaterThan(before);
  });
});
