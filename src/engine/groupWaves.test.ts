import { describe, expect, it } from 'vitest';
import { CombatEngine, primaryMonster } from './CombatEngine';
import { WaveManager, DEFAULT_META_BONUSES } from './WaveManager';
import { knight } from '../data/hero';
import type { Combatant } from './types';

function unit(overrides: Partial<Combatant> = {}): Combatant {
  return { id: 'hero', name: 'Hero', maxHp: 5000, hp: 5000, attack: 25, attackIntervalMs: 500, nextAttackAt: 500, ...overrides };
}

function foe(id: string, overrides: Partial<Combatant> = {}): Combatant {
  return unit({ id, name: id, maxHp: 100, hp: 100, attack: 4, attackIntervalMs: 800, nextAttackAt: 800, ...overrides });
}

/** Runs a fight to completion, returning every event emitted. */
function runToEnd(engine: CombatEngine, maxTicks = 4000): ReturnType<CombatEngine['tick']> {
  const events = [];
  for (let i = 0; i < maxTicks && !engine.getState().isOver; i++) {
    events.push(...engine.tick(100));
  }
  return events;
}

describe('multi-enemy waves — engine', () => {
  it('accepts a bare combatant as a group of one, unchanged', () => {
    const engine = new CombatEngine(unit(), foe('solo'));
    expect(engine.getState().monsters).toHaveLength(1);
    expect(primaryMonster(engine.getState())?.id).toBe('solo');
  });

  it('focuses the front-most survivor and clears the pack front to back', () => {
    const engine = new CombatEngine(unit(), [foe('a'), foe('b'), foe('c')]);
    const killOrder: string[] = [];

    for (let i = 0; i < 400 && !engine.getState().isOver; i++) {
      for (const event of engine.tick(100)) {
        if (event.type === 'death' && event.combatantId !== 'hero') killOrder.push(event.combatantId);
      }
    }

    expect(killOrder).toEqual(['a', 'b', 'c']);
  });

  it('only ends the fight once every enemy is down', () => {
    const engine = new CombatEngine(unit(), [foe('a'), foe('b')]);

    // Enough ticks to kill the first but not both.
    let firstDeathSeen = false;
    for (let i = 0; i < 400 && !firstDeathSeen; i++) {
      firstDeathSeen = engine.tick(100).some((e) => e.type === 'death');
    }

    expect(firstDeathSeen).toBe(true);
    expect(engine.getState().isOver).toBe(false);

    runToEnd(engine);
    expect(engine.getState().isOver).toBe(true);
    expect(engine.getState().winnerId).toBe('hero');
  });

  it('emits exactly one death event per enemy', () => {
    const engine = new CombatEngine(unit(), [foe('a'), foe('b'), foe('c')]);
    const deaths = runToEnd(engine).filter((e) => e.type === 'death');
    expect(deaths).toHaveLength(3);
  });

  it('gives each enemy its own attack timer, so a pack out-actions a lone monster', () => {
    // Same total enemy health either way; the group simply gets more swings in per second.
    const solo = new CombatEngine(unit({ attackIntervalMs: 100_000, nextAttackAt: 100_000 }), foe('solo', { maxHp: 300, hp: 300 }));
    const pack = new CombatEngine(unit({ attackIntervalMs: 100_000, nextAttackAt: 100_000 }), [
      foe('a', { nextAttackAt: 800 }),
      foe('b', { nextAttackAt: 800 }),
      foe('c', { nextAttackAt: 800 }),
    ]);

    solo.tick(5000);
    pack.tick(5000);
    expect(pack.getState().hero.hp).toBeLessThan(solo.getState().hero.hp);
  });

  it('splashes the Brave Burst across every living enemy', () => {
    const engine = new CombatEngine(unit(), [foe('a', { maxHp: 100_000, hp: 100_000 }), foe('b', { maxHp: 100_000, hp: 100_000 })]);
    for (let i = 0; i < 300 && !engine.getState().burstArmed; i++) engine.tick(100);

    const before = engine.getState().monsters.map((m) => m.hp);
    engine.triggerBurst();
    const after = engine.getState().monsters.map((m) => m.hp);

    // The rear enemy is never the focus target, so only a splashing burst can have hurt it.
    expect(after[0]).toBeLessThan(before[0] as number);
    expect(after[1]).toBeLessThan(before[1] as number);
  });

  it('lets a summoner re-target its second strike instead of wasting it on a corpse', () => {
    const engine = new CombatEngine(unit({ attackIntervalMs: 100_000, nextAttackAt: 100_000 }), [foe('a', { maxHp: 1, hp: 1 }), foe('b')], 1, undefined, [
      {
        combatant: unit({ id: 'summoner', attack: 50, attackIntervalMs: 500, nextAttackAt: 500 }),
        role: 'summoner',
        actsIndependently: true,
        tauntWeight: 1,
        healAmount: 0,
        doubleStrikeChance: 1,
      },
    ]);

    engine.tick(600);
    expect(engine.getState().monsters[0]?.hp).toBe(0);
    // The follow-up rolled onto the survivor rather than hitting the one already dead.
    expect(engine.getState().monsters[1]?.hp).toBeLessThan(100);
  });

  it('regenerates every enemy in a regenerating group, not just the front one', () => {
    const engine = new CombatEngine(
      unit({ attackIntervalMs: 100_000, nextAttackAt: 100_000 }),
      [foe('a', { hp: 50, attackIntervalMs: 100_000, nextAttackAt: 100_000 }), foe('b', { hp: 50, attackIntervalMs: 100_000, nextAttackAt: 100_000 })],
      1,
      undefined,
      [],
      [],
      [],
      undefined,
      { regenPerSecondFraction: 0.1 },
    );

    engine.tick(1000);
    expect(engine.getState().monsters[0]?.hp).toBeGreaterThan(50);
    expect(engine.getState().monsters[1]?.hp).toBeGreaterThan(50);
  });
});

describe('multi-enemy waves — composition', () => {
  it('never groups the opening waves', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const manager = new WaveManager(knight, seed, DEFAULT_META_BONUSES);
      expect(manager.getCombatState().monsters.length).toBe(1);
      expect(manager.getRunState().monsterGroupSize).toBe(1);
    }
  });

  it('produces groups on later normal waves', () => {
    let sawGroup = false;
    for (let seed = 1; seed <= 60 && !sawGroup; seed++) {
      const manager = new WaveManager(knight, seed, DEFAULT_META_BONUSES);
      for (let i = 0; i < 8000 && !sawGroup; i++) {
        const state = manager.getRunState();
        if (state.isGameOver) break;
        if (state.isChoosingLoot) manager.chooseLoot(0);
        else manager.tick(200);
        if (manager.getRunState().monsterGroupSize > 1) sawGroup = true;
      }
    }
    expect(sawGroup).toBe(true);
  });

  it('keeps boss, miniboss and Echo waves solo', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const manager = new WaveManager(knight, seed, DEFAULT_META_BONUSES);
      for (let i = 0; i < 8000; i++) {
        const state = manager.getRunState();
        if (state.isGameOver) break;
        if (state.monsterTier !== 'normal' || state.isEcho) {
          expect(state.monsterGroupSize, `wave ${state.waveNumber} (${state.monsterTier}) grouped`).toBe(1);
        }
        if (state.isChoosingLoot) manager.chooseLoot(0);
        else manager.tick(200);
      }
    }
  });

  it('gives every group member a unique combat id', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const manager = new WaveManager(knight, seed, DEFAULT_META_BONUSES);
      for (let i = 0; i < 6000; i++) {
        const state = manager.getRunState();
        if (state.isGameOver) break;
        const ids = manager.getCombatState().monsters.map((m) => m.id);
        expect(new Set(ids).size, `duplicate combat ids on wave ${state.waveNumber}`).toBe(ids.length);
        if (state.isChoosingLoot) manager.chooseLoot(0);
        else manager.tick(200);
      }
    }
  });

  it('pays XP for every enemy in the wave', () => {
    // Overwhelming hero so waves resolve quickly and reliably.
    const strong = { ...knight, base: { ...knight.base, maxHp: 500_000, attack: 20_000, attackIntervalMs: 150 } };
    let soloXp = 0;
    let groupXp = 0;

    const manager = new WaveManager(strong, 7, DEFAULT_META_BONUSES);
    for (let i = 0; i < 20_000 && (soloXp === 0 || groupXp === 0); i++) {
      const state = manager.getRunState();
      if (state.isGameOver) break;
      const size = state.monsterGroupSize;
      const tier = state.monsterTier;
      const events = state.isChoosingLoot ? manager.chooseLoot(0) : manager.tick(200);
      const cleared = events.find((e) => e.type === 'waveCleared');
      if (cleared?.type !== 'waveCleared' || tier !== 'normal') continue;
      if (size === 1 && soloXp === 0) soloXp = cleared.xpGained;
      if (size > 1 && groupXp === 0) groupXp = cleared.xpGained;
    }

    expect(soloXp).toBeGreaterThan(0);
    expect(groupXp).toBeGreaterThan(soloXp);
  });
});
