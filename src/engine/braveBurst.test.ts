import { describe, expect, it } from 'vitest';
import { CombatEngine } from './CombatEngine';
import { WaveManager, DEFAULT_META_BONUSES } from './WaveManager';
import { knight } from '../data/hero';
import type { AllyUnit, Combatant, CombatEvent } from './types';

function unit(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: 'hero',
    name: 'Hero',
    maxHp: 1000,
    hp: 1000,
    attack: 10,
    attackIntervalMs: 500,
    nextAttackAt: 500,
    ...overrides,
  };
}

function punchingBag(): Combatant {
  // Huge HP and a very slow attack so the fight never ends while the gauge charges.
  return unit({ id: 'dummy', name: 'Dummy', maxHp: 1_000_000, hp: 1_000_000, attack: 1, attackIntervalMs: 1_000_000, nextAttackAt: 1_000_000 });
}

/** Ticks until the burst arms, returning the events seen along the way. */
function tickUntilArmed(engine: CombatEngine, maxTicks = 200): CombatEvent[] {
  const seen: CombatEvent[] = [];
  for (let i = 0; i < maxTicks && !engine.getState().burstArmed; i++) {
    seen.push(...engine.tick(100));
  }
  return seen;
}

describe('Brave Burst gauge', () => {
  it('starts empty and unarmed', () => {
    const engine = new CombatEngine(unit(), punchingBag());
    expect(engine.getState().burstGauge).toBe(0);
    expect(engine.getState().burstArmed).toBe(false);
  });

  it('charges from the party landing hits and arms once full', () => {
    const engine = new CombatEngine(unit(), punchingBag());
    const events = tickUntilArmed(engine);

    expect(engine.getState().burstArmed).toBe(true);
    expect(engine.getState().burstGauge).toBe(1);
    expect(events.filter((e) => e.type === 'burstReady')).toHaveLength(1);
  });

  it('does nothing when triggered before the gauge is armed', () => {
    const engine = new CombatEngine(unit(), punchingBag());
    engine.tick(600); // one hero attack — enough to charge the gauge, nowhere near arming it.
    expect(engine.triggerBurst()).toEqual([]);
    expect(engine.getState().burstGauge).toBeGreaterThan(0);
  });

  it('fires on manual trigger, resetting the gauge and damaging the monster', () => {
    const engine = new CombatEngine(unit(), punchingBag());
    tickUntilArmed(engine);
    const hpBefore = engine.getState().monsters[0]!.hp;

    const events = engine.triggerBurst();
    const burst = events.find((e) => e.type === 'braveBurst');

    expect(burst).toBeDefined();
    expect(burst?.type === 'braveBurst' && burst.manual).toBe(true);
    expect(engine.getState().monsters[0]!.hp).toBeLessThan(hpBefore);
    expect(engine.getState().burstGauge).toBe(0);
    expect(engine.getState().burstArmed).toBe(false);
  });

  it('auto-fires at base power once the manual window lapses', () => {
    const engine = new CombatEngine(unit(), punchingBag());
    tickUntilArmed(engine);

    // Well past BURST_MANUAL_WINDOW_MS.
    const events = engine.tick(4000);
    const burst = events.find((e) => e.type === 'braveBurst');

    expect(burst?.type === 'braveBurst' && burst.manual).toBe(false);
    expect(engine.getState().burstArmed).toBe(false);
  });

  it('rewards a manual burst with strictly more damage than the auto-fire', () => {
    const manual = new CombatEngine(unit(), punchingBag(), 7);
    tickUntilArmed(manual);
    const manualEvents = manual.triggerBurst();
    const manualDamage = manualEvents.find((e) => e.type === 'braveBurst');

    const auto = new CombatEngine(unit(), punchingBag(), 7);
    tickUntilArmed(auto);
    const autoEvents = auto.tick(4000);
    const autoDamage = autoEvents.find((e) => e.type === 'braveBurst');

    const manualValue = manualDamage?.type === 'braveBurst' ? manualDamage.damage : 0;
    const autoValue = autoDamage?.type === 'braveBurst' ? autoDamage.damage : 0;
    expect(manualValue).toBeGreaterThan(autoValue);
  });

  it('has every living squad member contribute, with healers healing instead of striking', () => {
    const healer: AllyUnit = {
      combatant: unit({ id: 'healer', name: 'Healer', attack: 1, attackIntervalMs: 100_000, nextAttackAt: 100_000 }),
      role: 'healer',
      actsIndependently: true,
      tauntWeight: 1,
      healAmount: 40,
      doubleStrikeChance: 0,
    };
    const dps: AllyUnit = {
      combatant: unit({ id: 'dps', name: 'Dps', attack: 8 }),
      role: 'dps',
      actsIndependently: true,
      tauntWeight: 1,
      healAmount: 0,
      doubleStrikeChance: 0,
    };

    const hero = unit({ hp: 500 });
    const engine = new CombatEngine(hero, punchingBag(), 1, undefined, [healer, dps]);
    tickUntilArmed(engine);

    const events = engine.triggerBurst();
    const burst = events.find((e) => e.type === 'braveBurst');
    if (burst?.type !== 'braveBurst') throw new Error('expected a braveBurst event');

    expect(burst.contributors).toEqual(expect.arrayContaining(['hero', 'healer', 'dps']));
    expect(burst.healed).toBeGreaterThan(0);
  });

  it('does not charge further while already armed', () => {
    const engine = new CombatEngine(unit(), punchingBag());
    tickUntilArmed(engine);
    const gauge = engine.getState().burstGauge;
    engine.tick(200);
    expect(engine.getState().burstGauge).toBe(gauge);
  });
});

describe('squad selection and leader skills', () => {
  it('starts the run with the chosen squad, leader first', () => {
    const manager = new WaveManager(knight, 1, DEFAULT_META_BONUSES, {}, ['camp_bard', 'iron_vanguard'], [
      'iron_vanguard',
      'camp_bard',
    ]);

    expect(manager.getRunState().companions.map((c) => c.id)).toEqual(['iron_vanguard', 'camp_bard']);
    expect(manager.getLeaderCompanionId()).toBe('iron_vanguard');
  });

  it('ignores companions that have not been unlocked', () => {
    const manager = new WaveManager(knight, 1, DEFAULT_META_BONUSES, {}, ['camp_bard'], ['astral_seraph', 'camp_bard']);
    expect(manager.getRunState().companions.map((c) => c.id)).toEqual(['camp_bard']);
  });

  it('caps the squad at the active-companion limit', () => {
    const roster = ['camp_bard', 'iron_vanguard', 'ember_wisp', 'hearthkeeper'];
    const manager = new WaveManager(knight, 1, DEFAULT_META_BONUSES, {}, roster, roster);
    expect(manager.getRunState().companions).toHaveLength(3);
  });

  it("applies the leader's skill to the party, and only when it leads", () => {
    // Iron Vanguard's Bulwark Doctrine is +20% maxHp; leading should raise the hero's own max HP.
    const led = new WaveManager(knight, 1, DEFAULT_META_BONUSES, {}, ['iron_vanguard', 'camp_bard'], [
      'iron_vanguard',
      'camp_bard',
    ]);
    const following = new WaveManager(knight, 1, DEFAULT_META_BONUSES, {}, ['iron_vanguard', 'camp_bard'], [
      'camp_bard',
      'iron_vanguard',
    ]);

    expect(led.getCombatState().hero.maxHp).toBeGreaterThan(following.getCombatState().hero.maxHp);
  });

  it('leaves the roster empty when no squad was chosen, preserving loot-only play', () => {
    const manager = new WaveManager(knight, 1, DEFAULT_META_BONUSES);
    expect(manager.getRunState().companions).toEqual([]);
    expect(manager.getLeaderCompanionId()).toBeNull();
  });
});
