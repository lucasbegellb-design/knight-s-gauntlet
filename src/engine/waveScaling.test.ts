import { describe, expect, it } from 'vitest';
import { BOSS_WAVE_INTERVAL, MINIBOSS_WAVE_INTERVAL, monsterPoolForWave, scaledMonsterStats, tierForWave, zoneForWave } from './waveScaling';
import type { MonsterDefinition } from '../data/monster.types';
import { allZones } from '../data/zones';

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

describe('zoneForWave', () => {
  it('returns the first zone for early waves', () => {
    expect(zoneForWave(1).id).toBe(allZones[0]?.id);
  });

  it('advances to the next zone once its waveStart is reached', () => {
    const secondZone = allZones[1];
    expect(secondZone).toBeDefined();
    if (!secondZone) return;
    expect(zoneForWave(secondZone.waveStart).id).toBe(secondZone.id);
    expect(zoneForWave(secondZone.waveStart - 1).id).toBe(allZones[0]?.id);
  });

  it('stays on the last zone forever past its waveStart', () => {
    const lastZone = allZones[allZones.length - 1];
    expect(lastZone).toBeDefined();
    if (!lastZone) return;
    expect(zoneForWave(lastZone.waveStart + 500).id).toBe(lastZone.id);
  });
});

describe('monsterPoolForWave', () => {
  const monsterA: MonsterDefinition = { id: 'monster_a', name: 'A', tier: 'normal', maxHp: 1, attack: 1, attackIntervalMs: 1, xpReward: 1 };
  const monsterB: MonsterDefinition = { id: 'monster_b', name: 'B', tier: 'normal', maxHp: 1, attack: 1, attackIntervalMs: 1, xpReward: 1 };

  it('falls back to the full tier pool when no monster in it belongs to the active zone', () => {
    const pool = monsterPoolForWave(1, [monsterA, monsterB]);
    expect(pool).toEqual([monsterA, monsterB]);
  });

  it('narrows the pool to monsters the active zone actually lists', () => {
    const zoneMonsterId = allZones[0]?.monsterIds[0];
    expect(zoneMonsterId).toBeDefined();
    if (!zoneMonsterId) return;
    const inZone: MonsterDefinition = { ...monsterA, id: zoneMonsterId };
    const pool = monsterPoolForWave(1, [inZone, monsterB]);
    expect(pool).toEqual([inZone]);
  });
});
