import { describe, expect, it } from 'vitest';
import { Rng } from './rng';

describe('Rng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = new Rng(42);
    const b = new Rng(42);

    const sequenceA = [a.next(), a.next(), a.next()];
    const sequenceB = [b.next(), b.next(), b.next()];

    expect(sequenceA).toEqual(sequenceB);
  });

  it('produces values within [0, 1)', () => {
    const rng = new Rng(1);

    for (let i = 0; i < 50; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('produces different sequences for different seeds', () => {
    const a = new Rng(1);
    const b = new Rng(2);

    expect(a.next()).not.toBe(b.next());
  });
});
