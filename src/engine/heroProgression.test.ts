import { describe, expect, it } from 'vitest';
import { applyXpGain, scaleHeroDefinition, statsForLevel, xpForNextLevel } from './heroProgression';
import { knight } from '../data/hero';

describe('xpForNextLevel', () => {
  it('increases as level increases', () => {
    expect(xpForNextLevel(2)).toBeGreaterThan(xpForNextLevel(1));
    expect(xpForNextLevel(10)).toBeGreaterThan(xpForNextLevel(5));
  });
});

describe('statsForLevel', () => {
  it('returns base stats at level 1', () => {
    expect(statsForLevel(knight, 1)).toEqual(knight.base);
  });

  it('applies growth per level above 1', () => {
    const stats = statsForLevel(knight, 3);
    expect(stats.maxHp).toBe(knight.base.maxHp + knight.growth.maxHpPerLevel * 2);
    expect(stats.attack).toBe(knight.base.attack + knight.growth.attackPerLevel * 2);
    expect(stats.attackIntervalMs).toBe(knight.base.attackIntervalMs);
  });
});

describe('scaleHeroDefinition', () => {
  it('leaves stats unchanged with a 1x multiplier', () => {
    const scaled = scaleHeroDefinition(knight, { maxHp: 1, attack: 1, attackIntervalMs: 1 });
    expect(scaled.base).toEqual(knight.base);
    expect(scaled.growth).toEqual(knight.growth);
  });

  it('scales base stats and growth independently per stat', () => {
    const scaled = scaleHeroDefinition(knight, { maxHp: 1.5, attack: 0.5, attackIntervalMs: 2 });
    expect(scaled.base.maxHp).toBe(Math.round(knight.base.maxHp * 1.5));
    expect(scaled.base.attack).toBe(Math.round(knight.base.attack * 0.5));
    expect(scaled.base.attackIntervalMs).toBe(Math.round(knight.base.attackIntervalMs * 2));
    expect(scaled.growth.maxHpPerLevel).toBe(Math.round(knight.growth.maxHpPerLevel * 1.5));
    expect(scaled.growth.attackPerLevel).toBe(Math.round(knight.growth.attackPerLevel * 0.5));
  });

  it('does not mutate the original definition', () => {
    const original = structuredClone(knight);
    scaleHeroDefinition(knight, { maxHp: 2, attack: 2, attackIntervalMs: 2 });
    expect(knight).toEqual(original);
  });
});

describe('applyXpGain', () => {
  it('accumulates xp without leveling up when below the threshold', () => {
    const result = applyXpGain({ level: 1, xp: 0 }, 1);
    expect(result.levelsGained).toBe(0);
    expect(result.progress).toEqual({ level: 1, xp: 1 });
  });

  it('levels up once the threshold is crossed, carrying over remainder xp', () => {
    const threshold = xpForNextLevel(1);
    const result = applyXpGain({ level: 1, xp: 0 }, threshold + 5);
    expect(result.levelsGained).toBe(1);
    expect(result.progress.level).toBe(2);
    expect(result.progress.xp).toBe(5);
  });

  it('handles a huge xp gain that crosses multiple levels in one call', () => {
    const massiveGain = xpForNextLevel(1) + xpForNextLevel(2) + xpForNextLevel(3) + 3;
    const result = applyXpGain({ level: 1, xp: 0 }, massiveGain);
    expect(result.levelsGained).toBe(3);
    expect(result.progress.level).toBe(4);
    expect(result.progress.xp).toBe(3);
  });
});
