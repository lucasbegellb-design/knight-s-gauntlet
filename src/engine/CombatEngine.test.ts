import { describe, expect, it } from 'vitest';
import { CombatEngine } from './CombatEngine';
import { NEUTRAL_MODIFIERS, type AggregatedModifiers } from './modifiers';
import type { AllyUnit, Combatant, SpellCaster } from './types';

function makeModifiers(overrides: Partial<AggregatedModifiers>): AggregatedModifiers {
  return { ...NEUTRAL_MODIFIERS, ...overrides };
}

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

describe('CombatEngine with hero modifiers', () => {
  it('never crits or burns when hero modifiers are neutral (baseline stays deterministic)', () => {
    const engine = new CombatEngine(makeHero(), makeMonster(), 1, NEUTRAL_MODIFIERS);
    const events = engine.tick(1000);

    expect(events).toEqual([
      { type: 'attack', attackerId: 'hero', targetId: 'goblin_grunt', damage: 5, targetHpAfter: 25 },
    ]);
  });

  it('always crits when critChance is 1, applying the crit multiplier and a critHit event', () => {
    const mods = makeModifiers({ critChanceSum: 1 });
    const engine = new CombatEngine(makeHero({ attack: 10 }), makeMonster({ maxHp: 100 }), 1, mods);

    const events = engine.tick(1000);

    expect(events.some((e) => e.type === 'critHit')).toBe(true);
    const attackEvent = events.find((e) => e.type === 'attack');
    expect(attackEvent).toMatchObject({ damage: 15 }); // 10 * BASE_CRIT_MULTIPLIER (1.5)
  });

  it('procs burn for bonus damage and emits a statusProc event when burnChance is 1', () => {
    const mods = makeModifiers({ burnChanceSum: 1 });
    const engine = new CombatEngine(makeHero({ attack: 10 }), makeMonster({ maxHp: 100 }), 1, mods);

    const events = engine.tick(1000);

    const burnEvent = events.find((e) => e.type === 'statusProc');
    expect(burnEvent).toMatchObject({ type: 'statusProc', kind: 'burn', damage: 4 }); // 10 * BASE_BURN_RATIO (0.4)
    const attackEvent = events.find((e) => e.type === 'attack');
    expect(attackEvent).toMatchObject({ damage: 14 }); // base 10 + burn 4
  });

  it('heals the hero via lifesteal proportional to damage dealt', () => {
    const mods = makeModifiers({ lifestealPercentSum: 0.5 });
    const engine = new CombatEngine(makeHero({ attack: 10, hp: 10, maxHp: 20 }), makeMonster({ maxHp: 100 }), 1, mods);

    const events = engine.tick(1000);

    expect(events.some((e) => e.type === 'lifesteal')).toBe(true);
    expect(engine.getState().hero.hp).toBe(15); // healed by 50% of 10 damage dealt
  });

  it('executes enemies below the hp threshold instantly', () => {
    const mods = makeModifiers({ executeThresholdSum: 0.5 });
    const engine = new CombatEngine(makeHero({ attack: 1 }), makeMonster({ maxHp: 100, hp: 40 }), 1, mods);

    const events = engine.tick(1000);

    expect(events.some((e) => e.type === 'execute')).toBe(true);
    expect(engine.getState().monster.hp).toBe(0);
    expect(engine.getState().isOver).toBe(true);
    expect(engine.getState().winnerId).toBe('hero');
  });

  it('reflects damage back at the monster when the hero has reflect and the monster attacks', () => {
    const mods = makeModifiers({ reflectDamagePercentSum: 0.5 });
    const engine = new CombatEngine(
      makeHero({ nextAttackAt: 999_999 }),
      makeMonster({ attack: 10, maxHp: 100, hp: 100 }),
      1,
      mods,
    );

    const events = engine.tick(1200);

    const reflectEvent = events.find((e) => e.type === 'reflect');
    expect(reflectEvent).toMatchObject({ damagedId: 'goblin_grunt', damage: 5 });
    expect(engine.getState().monster.hp).toBe(95);
  });
});

function makeAlly(overrides: Partial<AllyUnit> = {}): AllyUnit {
  return {
    combatant: { id: 'ally', name: 'Ally', maxHp: 20, hp: 20, attack: 3, attackIntervalMs: 1000, nextAttackAt: 1000 },
    role: 'dps',
    actsIndependently: true,
    tauntWeight: 1,
    healAmount: 0,
    doubleStrikeChance: 0,
    ...overrides,
  };
}

function makeSpell(overrides: Partial<SpellCaster> = {}): SpellCaster {
  return { id: 'spell', name: 'Spell', cooldownMs: 1000, nextCastAt: 1000, effect: 'damage', power: 5, ...overrides };
}

describe('CombatEngine with allies', () => {
  it('lets a dps ally attack the monster on its own timer', () => {
    const ally = makeAlly();
    const engine = new CombatEngine(
      makeHero({ nextAttackAt: 999_999 }),
      makeMonster({ maxHp: 100, hp: 100 }),
      1,
      NEUTRAL_MODIFIERS,
      [ally],
    );

    const events = engine.tick(1000);

    const allyAttack = events.find((e) => e.type === 'attack' && e.attackerId === 'ally');
    expect(allyAttack).toMatchObject({ damage: 3 });
    expect(engine.getState().monster.hp).toBe(97);
  });

  it('lets a healer ally heal the lowest-hp ally instead of attacking the monster', () => {
    const healer = makeAlly({
      role: 'healer',
      healAmount: 10,
      combatant: { id: 'healer', name: 'Healer', maxHp: 20, hp: 20, attack: 0, attackIntervalMs: 1000, nextAttackAt: 1000 },
    });
    const engine = new CombatEngine(
      makeHero({ hp: 5, maxHp: 20, nextAttackAt: 999_999 }),
      makeMonster({ nextAttackAt: 999_999 }),
      1,
      NEUTRAL_MODIFIERS,
      [healer],
    );

    const events = engine.tick(1000);

    expect(events.some((e) => e.type === 'companionHeal' && e.targetId === 'hero')).toBe(true);
    expect(engine.getState().hero.hp).toBe(15);
    expect(engine.getState().monster.hp).toBe(30);
  });

  it('never lets a support-flagged ally take a turn even if its timer would fire', () => {
    const support = makeAlly({
      role: 'support',
      actsIndependently: false,
      combatant: { id: 'support', name: 'Bard', maxHp: 20, hp: 20, attack: 99, attackIntervalMs: 1, nextAttackAt: 1 },
    });
    const engine = new CombatEngine(
      makeHero({ nextAttackAt: 999_999 }),
      makeMonster({ maxHp: 100, hp: 100, nextAttackAt: 999_999 }),
      1,
      NEUTRAL_MODIFIERS,
      [support],
    );

    const events = engine.tick(5000);

    expect(events.filter((e) => e.type === 'attack' && e.attackerId === 'support')).toHaveLength(0);
    expect(engine.getState().monster.hp).toBe(100);
  });

  it('does not end combat when a companion dies, only when hero or monster dies', () => {
    const fragileAlly = makeAlly({
      tauntWeight: 1000,
      combatant: { id: 'fragile', name: 'Fragile', maxHp: 5, hp: 5, attack: 1, attackIntervalMs: 999_999, nextAttackAt: 999_999 },
    });
    const engine = new CombatEngine(
      makeHero({ nextAttackAt: 999_999 }),
      makeMonster({ attack: 50, nextAttackAt: 1000 }),
      1,
      NEUTRAL_MODIFIERS,
      [fragileAlly],
    );

    const events = engine.tick(1000);

    expect(events.some((e) => e.type === 'death' && e.combatantId === 'fragile')).toBe(true);
    expect(events.some((e) => e.type === 'combatEnd')).toBe(false);
    expect(engine.getState().isOver).toBe(false);
  });

  it('lets the monster kill the hero even with allies present, ending combat in its favor', () => {
    const ally = makeAlly({
      tauntWeight: 0,
      combatant: { id: 'ally', name: 'Ally', maxHp: 100, hp: 100, attack: 0, attackIntervalMs: 999_999, nextAttackAt: 999_999 },
    });
    const engine = new CombatEngine(
      makeHero({ hp: 1, maxHp: 1, nextAttackAt: 999_999 }),
      makeMonster({ attack: 50, nextAttackAt: 1000 }),
      1,
      NEUTRAL_MODIFIERS,
      [ally],
    );

    const events = engine.tick(1000);

    expect(events.map((e) => e.type)).toEqual(['attack', 'death', 'combatEnd']);
    expect(engine.getState().winnerId).toBe('goblin_grunt');
  });

  it('favors high taunt-weight allies (e.g. tanks) over the hero across many seeds', () => {
    let heroHits = 0;
    let tankHits = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const tank = makeAlly({
        tauntWeight: 4,
        combatant: { id: 'tank', name: 'Tank', maxHp: 1000, hp: 1000, attack: 0, attackIntervalMs: 999_999, nextAttackAt: 999_999 },
      });
      const engine = new CombatEngine(
        makeHero({ hp: 1000, maxHp: 1000, nextAttackAt: 999_999 }),
        makeMonster({ attack: 1, nextAttackAt: 1000 }),
        seed,
        NEUTRAL_MODIFIERS,
        [tank],
      );
      const events = engine.tick(1000);
      const atk = events.find((e) => e.type === 'attack');
      if (atk && atk.type === 'attack') {
        if (atk.targetId === 'hero') heroHits++;
        if (atk.targetId === 'tank') tankHits++;
      }
    }
    expect(tankHits).toBeGreaterThan(heroHits);
  });
});

describe('CombatEngine with active spell casters', () => {
  it('lets an active damage spell hit the monster on its own cooldown', () => {
    const spell = makeSpell({ effect: 'damage', power: 7 });
    const engine = new CombatEngine(makeHero({ nextAttackAt: 999_999 }), makeMonster({ maxHp: 100, hp: 100 }), 1, NEUTRAL_MODIFIERS, [], [
      spell,
    ]);

    const events = engine.tick(1000);

    const cast = events.find((e) => e.type === 'spellCast');
    expect(cast).toMatchObject({ spellId: 'spell', effect: 'damage', amount: 7 });
    expect(engine.getState().monster.hp).toBe(93);
  });

  it('lets an active heal spell restore the hero without touching the monster', () => {
    const spell = makeSpell({ effect: 'heal', power: 8 });
    const engine = new CombatEngine(
      makeHero({ hp: 5, maxHp: 20, nextAttackAt: 999_999 }),
      makeMonster({ nextAttackAt: 999_999 }),
      1,
      NEUTRAL_MODIFIERS,
      [],
      [spell],
    );

    const events = engine.tick(1000);

    expect(events.some((e) => e.type === 'spellCast' && e.effect === 'heal')).toBe(true);
    expect(engine.getState().hero.hp).toBe(13);
    expect(engine.getState().monster.hp).toBe(30);
  });

  it('ends combat in the heros favor if a spell lands the killing blow', () => {
    const spell = makeSpell({ effect: 'damage', power: 100 });
    const engine = new CombatEngine(makeHero({ nextAttackAt: 999_999 }), makeMonster({ maxHp: 30, hp: 30 }), 1, NEUTRAL_MODIFIERS, [], [
      spell,
    ]);

    const events = engine.tick(1000);

    expect(events.map((e) => e.type)).toEqual(['spellCast', 'death', 'combatEnd']);
    expect(engine.getState().winnerId).toBe('hero');
  });
});
