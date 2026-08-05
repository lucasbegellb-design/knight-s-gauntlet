import { describe, expect, it } from 'vitest';
import { rollBrokenParts } from './brokenParts';
import { Rng } from './rng';

describe('rollBrokenParts', () => {
  it('always returns a value within the tier bounds (or 0) across many seeds', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rng = new Rng(seed);
      const amount = rollBrokenParts('normal', rng);
      expect(amount === 0 || (amount >= 1 && amount <= 2)).toBe(true);
    }
  });

  it('bosses always drop at least the tier minimum', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const amount = rollBrokenParts('boss', new Rng(seed));
      expect(amount).toBeGreaterThanOrEqual(3);
      expect(amount).toBeLessThanOrEqual(6);
    }
  });

  it('sometimes drops nothing for normal monsters (chance < 1)', () => {
    let sawZero = false;
    for (let seed = 1; seed <= 200; seed++) {
      if (rollBrokenParts('normal', new Rng(seed)) === 0) {
        sawZero = true;
        break;
      }
    }
    expect(sawZero).toBe(true);
  });

  it('megabosses and ultrabosses always drop at least their tier minimum, ultraboss the most of all', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const mega = rollBrokenParts('megaboss', new Rng(seed));
      expect(mega).toBeGreaterThanOrEqual(6);
      expect(mega).toBeLessThanOrEqual(10);

      const ultra = rollBrokenParts('ultraboss', new Rng(seed));
      expect(ultra).toBeGreaterThanOrEqual(15);
      expect(ultra).toBeLessThanOrEqual(25);
    }
  });

  it('minibosses drop more on average than normal monsters', () => {
    let miniTotal = 0;
    let normalTotal = 0;
    const trials = 500;
    for (let seed = 1; seed <= trials; seed++) {
      miniTotal += rollBrokenParts('miniboss', new Rng(seed * 7));
      normalTotal += rollBrokenParts('normal', new Rng(seed * 7));
    }
    expect(miniTotal).toBeGreaterThan(normalTotal);
  });
});
