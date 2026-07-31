import { describe, expect, it } from 'vitest';
import { CombatEngine } from './CombatEngine';
import type { Combatant } from './types';

function makeHero(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: 'hero',
    name: 'Hero',
    maxHp: 20,
    hp: 20,
    attack: 5,
    attackIntervalMs: 1000,
    nextAttackAt: 1000,
    ...overrides,
  };
}

function makeMonster(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: 'goblin_grunt',
    name: 'Goblin Grunt',
    maxHp: 30,
    hp: 30,
    attack: 4,
    attackIntervalMs: 1200,
    nextAttackAt: 1200,
    ...overrides,
  };
}

describe('CombatEngine', () => {
  it('starts with the initial hp/maxHp for both combatants and is not over', () => {
    const engine = new CombatEngine(makeHero(), makeMonster());
    const state = engine.getState();

    expect(state.hero.hp).toBe(20);
    expect(state.monster.hp).toBe(30);
    expect(state.isOver).toBe(false);
    expect(state.winnerId).toBeNull();
  });

  it('emits an attack event once a combatant crosses its attack interval', () => {
    const engine = new CombatEngine(makeHero(), makeMonster());

    const events = engine.tick(1000);

    expect(events).toEqual([
      { type: 'attack', attackerId: 'hero', targetId: 'goblin_grunt', damage: 5, targetHpAfter: 25 },
    ]);
    expect(engine.getState().monster.hp).toBe(25);
  });

  it('drains the monster to 0 hp and declares the hero the winner', () => {
    const engine = new CombatEngine(makeHero({ attack: 100 }), makeMonster());

    const events = engine.tick(1000);

    expect(events.map((e) => e.type)).toEqual(['attack', 'death', 'combatEnd']);
    expect(engine.getState().monster.hp).toBe(0);
    expect(engine.getState().isOver).toBe(true);
    expect(engine.getState().winnerId).toBe('hero');
  });

  it('drains the hero to 0 hp and declares the monster the winner', () => {
    const engine = new CombatEngine(
      makeHero({ maxHp: 10, hp: 10, nextAttackAt: 999_999 }),
      makeMonster({ attack: 100 }),
    );

    const events = engine.tick(1200);

    expect(events.map((e) => e.type)).toEqual(['attack', 'death', 'combatEnd']);
    expect(engine.getState().hero.hp).toBe(0);
    expect(engine.getState().isOver).toBe(true);
    expect(engine.getState().winnerId).toBe('goblin_grunt');
  });

  it('exposes a deterministic RNG stream via roll()', () => {
    const a = new CombatEngine(makeHero(), makeMonster(), 7);
    const b = new CombatEngine(makeHero(), makeMonster(), 7);

    expect(a.roll()).toBe(b.roll());
  });

  it('is a no-op once combat has ended', () => {
    const engine = new CombatEngine(makeHero({ attack: 100 }), makeMonster());
    engine.tick(1000);
    const snapshotAfterEnd = structuredClone(engine.getState());

    const events = engine.tick(5000);

    expect(events).toEqual([]);
    expect(engine.getState()).toEqual(snapshotAfterEnd);
  });
});
