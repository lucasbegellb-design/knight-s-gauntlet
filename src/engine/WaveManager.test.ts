import { describe, expect, it } from 'vitest';
import { WaveManager, type MetaBonuses, type RunState } from './WaveManager';
import type { CombatEngine } from './CombatEngine';
import type { HeroDefinition } from '../data/hero.types';
import { BOSS_WAVE_INTERVAL, MINIBOSS_WAVE_INTERVAL } from './waveScaling';
import { relicRegistry } from '../data/relics';

function stateOf(manager: WaveManager): RunState {
  return (manager as unknown as { state: RunState }).state;
}

function rebuildEngine(manager: WaveManager): void {
  const casted = manager as unknown as { buildWaveEngine: (wave: number) => CombatEngine; engine: CombatEngine };
  casted.engine = casted.buildWaveEngine(manager.getRunState().waveNumber);
}

function makeMetaBonuses(overrides: Partial<MetaBonuses> = {}): MetaBonuses {
  return { talentModifiers: [], lootLuckBonus: 0, forgeLevel: 0, companionUpgrades: {}, classModifiers: [], ...overrides };
}

const testHero: HeroDefinition = {
  id: 'hero',
  name: 'Hero',
  base: { maxHp: 10_000, attack: 10_000, attackIntervalMs: 100 },
  growth: { maxHpPerLevel: 10, attackPerLevel: 1 },
};

/**
 * Ticks until the wave clears, then immediately takes the first loot option
 * (to keep the run moving) unless it ends instead. Avoids depending on exact timing.
 */
function advanceOneWave(manager: WaveManager, stepMs = 200, maxSteps = 500) {
  const startingWave = manager.getRunState().waveNumber;
  const allEvents = [];
  for (let i = 0; i < maxSteps; i++) {
    if (manager.getRunState().isChoosingLoot) {
      allEvents.push(...manager.chooseLoot(0));
    } else {
      allEvents.push(...manager.tick(stepMs));
    }
    if (manager.getRunState().waveNumber !== startingWave || manager.getRunState().isGameOver) {
      break;
    }
  }
  return allEvents;
}

describe('WaveManager', () => {
  it('starts at wave 1 with a normal-tier monster, level 1, and no loot pending', () => {
    const manager = new WaveManager(testHero, 1);
    const state = manager.getRunState();

    expect(state.waveNumber).toBe(1);
    expect(state.monsterTier).toBe('normal');
    expect(state.heroProgress).toEqual({ level: 1, xp: 0 });
    expect(state.isGameOver).toBe(false);
    expect(state.isChoosingLoot).toBe(false);
    expect(state.gold).toBe(0);
    expect(state.ownedRelics).toEqual([]);
  });

  it('pauses for a loot choice after clearing a wave, offering 3 options', () => {
    const manager = new WaveManager(testHero, 1);
    const events = [];
    for (let i = 0; i < 50 && !manager.getRunState().isChoosingLoot; i++) {
      events.push(...manager.tick(200));
    }

    expect(manager.getRunState().isChoosingLoot).toBe(true);
    expect(manager.getRunState().lootOptions).toHaveLength(3);
    expect(events.some((e) => e.type === 'lootOffered')).toBe(true);
    // combat should not advance further while awaiting a choice
    const frozenState = structuredClone(manager.getCombatState());
    manager.tick(5000);
    expect(manager.getCombatState()).toEqual(frozenState);
  });

  it('advances the wave number and awards xp after a loot choice is made', () => {
    const manager = new WaveManager(testHero, 1);
    const events = advanceOneWave(manager);

    expect(manager.getRunState().waveNumber).toBe(2);
    expect(events.some((e) => e.type === 'waveCleared')).toBe(true);
    expect(events.some((e) => e.type === 'lootChosen')).toBe(true);
    expect(events.some((e) => e.type === 'waveStarted')).toBe(true);
    expect(manager.getRunState().heroProgress.xp).toBeGreaterThan(0);
  });

  it('adds a relic to ownedRelics when a relic loot option is chosen', () => {
    const manager = new WaveManager(testHero, 1);
    for (let i = 0; i < 50 && !manager.getRunState().isChoosingLoot; i++) {
      manager.tick(200);
    }
    const options = manager.getRunState().lootOptions;
    const relicIndex = options.findIndex((o) => o.kind === 'relic');
    expect(relicIndex).toBeGreaterThanOrEqual(0);

    const chosen = options[relicIndex];
    manager.chooseLoot(relicIndex);

    expect(chosen?.kind).toBe('relic');
    if (chosen?.kind === 'relic') {
      expect(manager.getRunState().ownedRelics).toEqual([{ id: chosen.relic.id, count: 1 }]);
    }
  });

  it('equips gear into the correct slot when an equipment loot option is chosen', () => {
    const manager = new WaveManager(testHero, 2);
    for (let i = 0; i < 50 && !manager.getRunState().isChoosingLoot; i++) {
      manager.tick(200);
    }
    const options = manager.getRunState().lootOptions;
    const equipIndex = options.findIndex((o) => o.kind === 'equipment');
    expect(equipIndex).toBeGreaterThanOrEqual(0);

    const chosen = options[equipIndex];
    manager.chooseLoot(equipIndex);

    if (chosen?.kind === 'equipment') {
      expect(manager.getRunState().equipped[chosen.equipment.slot]).toEqual({
        defId: chosen.equipment.id,
        rarity: chosen.rarity,
      });
    }
  });

  it('adds gold when a gold loot option is chosen', () => {
    const manager = new WaveManager(testHero, 4);
    for (let i = 0; i < 50 && !manager.getRunState().isChoosingLoot; i++) {
      manager.tick(200);
    }
    const options = manager.getRunState().lootOptions;
    const goldIndex = options.findIndex((o) => o.kind === 'gold');
    expect(goldIndex).toBeGreaterThanOrEqual(0);

    const chosen = options[goldIndex];
    manager.chooseLoot(goldIndex);

    if (chosen?.kind === 'gold') {
      expect(manager.getRunState().gold).toBe(chosen.amount);
    }
  });

  it('reaches a miniboss-tier wave at the configured interval', () => {
    const manager = new WaveManager(testHero, 2);

    while (manager.getRunState().waveNumber < MINIBOSS_WAVE_INTERVAL && !manager.getRunState().isGameOver) {
      advanceOneWave(manager);
    }

    expect(manager.getRunState().waveNumber).toBe(MINIBOSS_WAVE_INTERVAL);
    expect(manager.getRunState().monsterTier).toBe('miniboss');
  });

  it('reaches a boss-tier wave at the configured interval', () => {
    const manager = new WaveManager(testHero, 3);

    while (manager.getRunState().waveNumber < BOSS_WAVE_INTERVAL && !manager.getRunState().isGameOver) {
      advanceOneWave(manager);
    }

    expect(manager.getRunState().waveNumber).toBe(BOSS_WAVE_INTERVAL);
    expect(manager.getRunState().monsterTier).toBe('boss');
  });

  it('ends the run and stops ticking once the hero dies (without Phoenix Heart)', () => {
    const weakHero: HeroDefinition = {
      id: 'hero',
      name: 'Hero',
      base: { maxHp: 1, attack: 0, attackIntervalMs: 100_000 },
      growth: { maxHpPerLevel: 0, attackPerLevel: 0 },
    };
    const manager = new WaveManager(weakHero, 1);

    const events = manager.tick(5000);

    expect(events.some((e) => e.type === 'runOver')).toBe(true);
    expect(manager.getRunState().isGameOver).toBe(true);

    const snapshot = structuredClone(manager.getRunState());
    const laterEvents = manager.tick(10_000);
    expect(laterEvents).toEqual([]);
    expect(manager.getRunState()).toEqual(snapshot);
  });

  it('revives once via Phoenix Heart instead of ending the run, then dies normally on the second lethal hit', () => {
    const weakHero: HeroDefinition = {
      id: 'hero',
      name: 'Hero',
      base: { maxHp: 100, attack: 0, attackIntervalMs: 100_000 },
      growth: { maxHpPerLevel: 0, attackPerLevel: 0 },
    };
    const manager = new WaveManager(weakHero, 1);
    // Grant Phoenix Heart directly for the test rather than relying on RNG loot luck.
    stateOf(manager).ownedRelics = [{ id: 'phoenix_heart', count: 1 }];
    expect(relicRegistry.get('phoenix_heart').special).toBe('phoenixRevive');

    const firstDeath = manager.tick(200_000);
    expect(firstDeath.some((e) => e.type === 'revived')).toBe(true);
    expect(manager.getRunState().isGameOver).toBe(false);
    expect(manager.getRunState().hasUsedPhoenixRevive).toBe(true);
    expect(manager.getCombatState().hero.hp).toBeGreaterThan(0);

    const secondDeath = manager.tick(200_000);
    expect(secondDeath.some((e) => e.type === 'runOver')).toBe(true);
    expect(manager.getRunState().isGameOver).toBe(true);
  });

  it('recruits a companion into the roster and fields it as an ally in combat', () => {
    const manager = new WaveManager(testHero, 1);
    let recruited = false;

    for (let attempt = 0; attempt < 40 && !recruited; attempt++) {
      for (let i = 0; i < 50 && !manager.getRunState().isChoosingLoot; i++) manager.tick(200);
      const options = manager.getRunState().lootOptions;
      const index = options.findIndex((o) => o.kind === 'companion');
      if (index >= 0) {
        manager.chooseLoot(index);
        recruited = true;
      } else {
        manager.chooseLoot(0);
      }
    }

    expect(recruited).toBe(true);
    expect(manager.getRunState().companions).toHaveLength(1);
    expect(manager.getCombatState().allies).toHaveLength(1);
  });

  it('keeps a companion that reaches 0 hp out of combat for the rest of the run', () => {
    const manager = new WaveManager(testHero, 1);
    stateOf(manager).companions = [{ id: 'stalwart_guardian', hp: 0 }];

    advanceOneWave(manager);

    expect(manager.getRunState().companions).toEqual([{ id: 'stalwart_guardian', hp: 0 }]);
    expect(manager.getCombatState().allies.some((a) => a.combatant.id === 'stalwart_guardian')).toBe(false);
  });

  it('adds a passive spell to passiveSpells when chosen from loot', () => {
    const manager = new WaveManager(testHero, 6);
    let learned = false;

    for (let attempt = 0; attempt < 40 && !learned; attempt++) {
      for (let i = 0; i < 50 && !manager.getRunState().isChoosingLoot; i++) manager.tick(200);
      const options = manager.getRunState().lootOptions;
      const index = options.findIndex((o) => o.kind === 'spell' && o.spell.kind === 'passive');
      if (index >= 0) {
        manager.chooseLoot(index);
        learned = true;
      } else {
        manager.chooseLoot(0);
      }
    }

    expect(learned).toBe(true);
    expect(manager.getRunState().passiveSpells.length).toBeGreaterThan(0);
  });

  it('casts an owned active spell automatically once recruited', () => {
    const spellHero: HeroDefinition = {
      id: 'hero',
      name: 'Hero',
      base: { maxHp: 10_000, attack: 50, attackIntervalMs: 5000 },
      growth: { maxHpPerLevel: 0, attackPerLevel: 0 },
    };
    const manager = new WaveManager(spellHero, 21);
    let recruitedActiveSpellId: string | null = null;

    for (let attempt = 0; attempt < 40 && !recruitedActiveSpellId; attempt++) {
      for (let i = 0; i < 50 && !manager.getRunState().isChoosingLoot; i++) manager.tick(200);
      if (!manager.getRunState().isChoosingLoot) break;
      const options = manager.getRunState().lootOptions;
      const index = options.findIndex((o) => o.kind === 'spell' && o.spell.kind === 'active');
      if (index >= 0) {
        const option = options[index];
        manager.chooseLoot(index);
        if (option?.kind === 'spell') recruitedActiveSpellId = option.spell.id;
      } else {
        manager.chooseLoot(0);
      }
    }

    expect(recruitedActiveSpellId).not.toBeNull();
    expect(manager.getRunState().activeSpells.map((s) => s.id)).toContain(recruitedActiveSpellId);

    let sawSpellCast = false;
    for (let i = 0; i < 50 && !sawSpellCast; i++) {
      const events = manager.getRunState().isChoosingLoot ? manager.chooseLoot(0) : manager.tick(200);
      if (events.some((e) => e.type === 'combat' && e.event.type === 'spellCast')) sawSpellCast = true;
    }
    expect(sawSpellCast).toBe(true);
  });

  it('applies meta talent modifiers to the heros combat damage', () => {
    const weakHero: HeroDefinition = {
      id: 'hero',
      name: 'Hero',
      base: { maxHp: 1000, attack: 1, attackIntervalMs: 500 },
      growth: { maxHpPerLevel: 0, attackPerLevel: 0 },
    };
    const manager = new WaveManager(weakHero, 1, makeMetaBonuses({ talentModifiers: [{ kind: 'flatDamageBonus', value: 50 }] }));

    const events = manager.tick(500);

    const attackEvent = events.find((e) => e.type === 'combat' && e.event.type === 'attack' && e.event.attackerId === 'hero');
    expect(attackEvent && attackEvent.type === 'combat' && attackEvent.event.type === 'attack' ? attackEvent.event.damage : null).toBe(
      51,
    );
  });

  it('seeds a starting weapon into the equipped slot from the constructor', () => {
    const manager = new WaveManager(testHero, 1, makeMetaBonuses(), { weapon: { defId: 'knights_blade', rarity: 'rare' } });
    expect(manager.getRunState().equipped.weapon).toEqual({ defId: 'knights_blade', rarity: 'rare' });
  });

  it('applies class innate modifiers to the heros combat damage', () => {
    const weakHero: HeroDefinition = {
      id: 'hero',
      name: 'Hero',
      base: { maxHp: 1000, attack: 1, attackIntervalMs: 500 },
      growth: { maxHpPerLevel: 0, attackPerLevel: 0 },
    };
    const manager = new WaveManager(weakHero, 1, makeMetaBonuses({ classModifiers: [{ kind: 'flatDamageBonus', value: 25 }] }));

    const events = manager.tick(500);

    const attackEvent = events.find((e) => e.type === 'combat' && e.event.type === 'attack' && e.event.attackerId === 'hero');
    expect(attackEvent && attackEvent.type === 'combat' && attackEvent.event.type === 'attack' ? attackEvent.event.damage : null).toBe(
      26,
    );
  });

  it('scales an equipped items modifier by forge level', () => {
    const weakHero: HeroDefinition = {
      id: 'hero',
      name: 'Hero',
      base: { maxHp: 1000, attack: 0, attackIntervalMs: 500 },
      growth: { maxHpPerLevel: 0, attackPerLevel: 0 },
    };
    const manager = new WaveManager(weakHero, 2, makeMetaBonuses({ forgeLevel: 100 }));
    stateOf(manager).equipped.weapon = { defId: 'knights_blade', rarity: 'common' };
    rebuildEngine(manager);

    const events = manager.tick(500);

    const attackEvent = events.find((e) => e.type === 'combat' && e.event.type === 'attack' && e.event.attackerId === 'hero');
    // knights_blade flatDamageBonus=4 at common (x1) rarity; forgeLevel 100 => x(1 + 100*0.01) = x2 => 8
    expect(attackEvent && attackEvent.type === 'combat' && attackEvent.event.type === 'attack' ? attackEvent.event.damage : null).toBe(8);
  });

  it("scales a companion's attack by its meta upgrade rank", () => {
    const weakHero: HeroDefinition = {
      id: 'hero',
      name: 'Hero',
      base: { maxHp: 1000, attack: 0, attackIntervalMs: 999_999 },
      growth: { maxHpPerLevel: 0, attackPerLevel: 0 },
    };
    const manager = new WaveManager(weakHero, 3, makeMetaBonuses({ companionUpgrades: { roguish_blade: 5 } }));
    stateOf(manager).companions = [{ id: 'roguish_blade', hp: 30 }];
    rebuildEngine(manager);

    const events = manager.tick(1000);

    const allyAttack = events.find((e) => e.type === 'combat' && e.event.type === 'attack' && e.event.attackerId === 'roguish_blade');
    // roguish_blade base attack 5, rank 5 * 0.08/rank = +40% => round(5 * 1.4) = 7
    expect(allyAttack && allyAttack.type === 'combat' && allyAttack.event.type === 'attack' ? allyAttack.event.damage : null).toBe(7);
  });
});
