import { describe, expect, it } from 'vitest';
import { costForRank, resolveLootLuckBonus, resolveTalentModifiers } from './talents';

describe('costForRank', () => {
  it('increases as rank increases', () => {
    const first = costForRank(20, 0);
    const second = costForRank(20, 1);
    const third = costForRank(20, 2);
    expect(second).toBeGreaterThan(first);
    expect(third).toBeGreaterThan(second);
  });
});

describe('resolveTalentModifiers', () => {
  it('returns nothing for empty ranks', () => {
    expect(resolveTalentModifiers({})).toEqual([]);
  });

  it('scales a modifier-effect talent by its rank', () => {
    const modifiers = resolveTalentModifiers({ weapon_mastery: 3 });
    expect(modifiers).toEqual([{ kind: 'damageMultiplier', value: 0.05 * 3 }]);
  });

  it('ignores talents at rank 0 and unknown ids', () => {
    const modifiers = resolveTalentModifiers({ weapon_mastery: 0, not_a_real_talent: 5 });
    expect(modifiers).toEqual([]);
  });

  it('excludes lootLuck-effect talents from the modifier list', () => {
    const modifiers = resolveTalentModifiers({ fortunes_favor: 2 });
    expect(modifiers).toEqual([]);
  });
});

describe('resolveLootLuckBonus', () => {
  it('is 0 with no lootLuck talents owned', () => {
    expect(resolveLootLuckBonus({ weapon_mastery: 5 })).toBe(0);
  });

  it('scales by rank', () => {
    expect(resolveLootLuckBonus({ fortunes_favor: 3 })).toBeCloseTo(0.02 * 3);
  });
});
