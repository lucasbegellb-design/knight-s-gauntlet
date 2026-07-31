import { describe, expect, it } from 'vitest';
import { BOSS_WAVE_INTERVAL, MINIBOSS_WAVE_INTERVAL, scaledMonsterStats, tierForWave } from './waveScaling';
import type { MonsterDefinition } from '../data/monster.types';

describe('tierForWave', () => {
  it('returns normal for waves that are not a multiple of the miniboss/boss interval', () => {
    expect(tierForWave(1)).toBe('normal');
    expect(tierForWave(3)).toBe('normal');
  });

  it('returns miniboss on miniboss-interval waves that are not also boss waves', () => {
    expect(tierForWave(MINIBOSS_WAVE_INTERVAL)).toBe('miniboss');
  });

  it('returns boss on boss-interval waves, taking priority over the miniboss interval', () => {
    expect(BOSS_WAVE_INTERVAL % MINIBOSS_WAVE_INTERVAL).toBe(0);
    expect(tierForWave(BOSS_WAVE_INTERVAL)).toBe('boss');
  });
});

describe('scaledMonsterStats', () => {
  const def: MonsterDefinition = {
    id: 'test_monster',
    name: 'Test Monster',
    tier: 'normal',
    maxHp: 100,
    attack: 10,
    attackIntervalMs: 1000,
    xpReward: 10,
  };

  it('returns stats greater than or equal to the base at wave 1', () => {
    const stats = scaledMonsterStats(def, 1);
    expect(stats.maxHp).toBeGreaterThan(def.maxHp);
    expect(stats.attack).toBeGreaterThan(def.attack);
  });

  it('scales up as the wave number increases', () => {
    const early = scaledMonsterStats(def, 1);
    const late = scaledMonsterStats(def, 20);
    expect(late.maxHp).toBeGreaterThan(early.maxHp);
    expect(late.attack).toBeGreaterThan(early.attack);
  });
});
