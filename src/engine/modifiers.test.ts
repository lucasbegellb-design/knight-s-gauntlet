import { describe, expect, it } from 'vitest';
import { aggregateModifiers, NEUTRAL_MODIFIERS } from './modifiers';

describe('aggregateModifiers', () => {
  it('returns the neutral aggregate for no sources', () => {
    expect(aggregateModifiers([])).toEqual(NEUTRAL_MODIFIERS);
  });

  it('sums a single stackable source by its count', () => {
    const result = aggregateModifiers([{ modifiers: [{ kind: 'critChance', value: 0.04 }], count: 3 }]);
    expect(result.critChanceSum).toBeCloseTo(0.12);
  });

  it('combines multiple sources contributing to the same kind', () => {
    const result = aggregateModifiers([
      { modifiers: [{ kind: 'goldMultiplier', value: 0.15 }], count: 2 },
      { modifiers: [{ kind: 'goldMultiplier', value: 0.75 }], count: 1 },
    ]);
    expect(result.goldMultiplierSum).toBeCloseTo(0.15 * 2 + 0.75);
  });

  it('keeps unrelated modifier kinds independent', () => {
    const result = aggregateModifiers([
      { modifiers: [{ kind: 'lifestealPercent', value: 0.1 }], count: 1 },
      { modifiers: [{ kind: 'reflectDamagePercent', value: 0.2 }], count: 1 },
    ]);
    expect(result.lifestealPercentSum).toBeCloseTo(0.1);
    expect(result.reflectDamagePercentSum).toBeCloseTo(0.2);
    expect(result.critChanceSum).toBe(0);
  });

  it('handles a source contributing multiple modifier kinds at once', () => {
    const result = aggregateModifiers([
      {
        modifiers: [
          { kind: 'lifestealPercent', value: 0.1 },
          { kind: 'reflectDamagePercent', value: 0.2 },
        ],
        count: 1,
      },
    ]);
    expect(result.lifestealPercentSum).toBeCloseTo(0.1);
    expect(result.reflectDamagePercentSum).toBeCloseTo(0.2);
  });
});
