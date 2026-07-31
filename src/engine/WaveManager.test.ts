import { describe, expect, it } from 'vitest';
import { WaveManager } from './WaveManager';
import type { HeroDefinition } from '../data/hero.types';
import { BOSS_WAVE_INTERVAL, MINIBOSS_WAVE_INTERVAL } from './waveScaling';

const testHero: HeroDefinition = {
  id: 'hero',
  name: 'Hero',
  base: { maxHp: 10_000, attack: 10_000, attackIntervalMs: 100 },
  growth: { maxHpPerLevel: 10, attackPerLevel: 1 },
};

/** Ticks until the run advances by at least one wave or ends, to avoid depending on exact timing. */
function tickUntilWaveChange(manager: WaveManager, stepMs = 200, maxSteps = 500) {
  const startingWave = manager.getRunState().waveNumber;
  const allEvents = [];
  for (let i = 0; i < maxSteps; i++) {
    const events = manager.tick(stepMs);
    allEvents.push(...events);
    if (manager.getRunState().waveNumber !== startingWave || manager.getRunState().isGameOver) {
      break;
    }
  }
  return allEvents;
}

describe('WaveManager', () => {
  it('starts at wave 1 with a normal-tier monster and level 1', () => {
    const manager = new WaveManager(testHero, 1);
    const state = manager.getRunState();

    expect(state.waveNumber).toBe(1);
    expect(state.monsterTier).toBe('normal');
    expect(state.heroProgress).toEqual({ level: 1, xp: 0 });
    expect(state.isGameOver).toBe(false);
  });

  it('clears waves, awards xp, and advances the wave number using an overwhelmingly strong hero', () => {
    const manager = new WaveManager(testHero, 1);
    const events = tickUntilWaveChange(manager);

    expect(manager.getRunState().waveNumber).toBe(2);
    expect(events.some((e) => e.type === 'waveCleared')).toBe(true);
    expect(events.some((e) => e.type === 'waveStarted')).toBe(true);
    expect(manager.getRunState().heroProgress.xp).toBeGreaterThan(0);
  });

  it('reaches a miniboss-tier wave at the configured interval', () => {
    const manager = new WaveManager(testHero, 2);

    while (manager.getRunState().waveNumber < MINIBOSS_WAVE_INTERVAL && !manager.getRunState().isGameOver) {
      tickUntilWaveChange(manager);
    }

    expect(manager.getRunState().waveNumber).toBe(MINIBOSS_WAVE_INTERVAL);
    expect(manager.getRunState().monsterTier).toBe('miniboss');
  });

  it('reaches a boss-tier wave at the configured interval', () => {
    const manager = new WaveManager(testHero, 3);

    while (manager.getRunState().waveNumber < BOSS_WAVE_INTERVAL && !manager.getRunState().isGameOver) {
      tickUntilWaveChange(manager);
    }

    expect(manager.getRunState().waveNumber).toBe(BOSS_WAVE_INTERVAL);
    expect(manager.getRunState().monsterTier).toBe('boss');
  });

  it('ends the run and stops ticking once the hero dies', () => {
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
});
