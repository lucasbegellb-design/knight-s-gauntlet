import { describe, expect, it } from 'vitest';
import { MAX_TREASURY_LEVEL, resolveKingdomModifiers, treasuryUpgradeCost } from './kingdom';
import { allLords, allTerritories } from '../data/kingdom';

describe('treasuryUpgradeCost', () => {
  it('increases monotonically with level', () => {
    let previous = 0;
    for (let level = 0; level < MAX_TREASURY_LEVEL; level++) {
      const cost = treasuryUpgradeCost(level);
      expect(cost).toBeGreaterThan(previous);
      previous = cost;
    }
  });
});

describe('resolveKingdomModifiers', () => {
  it('returns an empty list for a fresh save (no territories, lords, or treasury level)', () => {
    expect(resolveKingdomModifiers({ conqueredTerritoryIds: [], recruitedLordIds: [], treasuryLevel: 0 })).toEqual([]);
  });

  it('includes every owned territory and lord modifier, ignoring unknown ids', () => {
    const territory = allTerritories[0];
    const lord = allLords[0];
    expect(territory).toBeDefined();
    expect(lord).toBeDefined();
    if (!territory || !lord) return;

    const modifiers = resolveKingdomModifiers({
      conqueredTerritoryIds: [territory.id, 'unknown_territory'],
      recruitedLordIds: [lord.id],
      treasuryLevel: 0,
    });

    for (const expected of territory.modifiers) expect(modifiers).toContainEqual(expected);
    for (const expected of lord.modifiers) expect(modifiers).toContainEqual(expected);
  });

  it('scales the treasury goldMultiplier/xpMultiplier bonus with level', () => {
    const modifiers = resolveKingdomModifiers({ conqueredTerritoryIds: [], recruitedLordIds: [], treasuryLevel: 10 });
    const gold = modifiers.find((m) => m.kind === 'goldMultiplier');
    const xp = modifiers.find((m) => m.kind === 'xpMultiplier');
    expect(gold?.value).toBeCloseTo(0.05);
    expect(xp?.value).toBeCloseTo(0.05);
  });
});
