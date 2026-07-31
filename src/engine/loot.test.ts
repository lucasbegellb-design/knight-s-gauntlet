import { describe, expect, it } from 'vitest';
import { Rng } from './rng';
import { generateLootOptions, pickRarity } from './loot';
import { RARITY_ORDER } from '../data/rarity';
import { allRelics } from '../data/relics';

describe('pickRarity', () => {
  it('always returns a valid rarity', () => {
    const rng = new Rng(1);
    for (let i = 0; i < 200; i++) {
      expect(RARITY_ORDER).toContain(pickRarity(rng));
    }
  });

  it('skews toward common over many rolls', () => {
    const rng = new Rng(42);
    const counts: Record<string, number> = {};
    for (let i = 0; i < 2000; i++) {
      const rarity = pickRarity(rng);
      counts[rarity] = (counts[rarity] ?? 0) + 1;
    }
    expect(counts.common ?? 0).toBeGreaterThan(counts.mythic ?? 0);
    expect(counts.common ?? 0).toBeGreaterThan(1000);
  });
});

describe('generateLootOptions', () => {
  it('returns exactly 3 options', () => {
    const rng = new Rng(1);
    const options = generateLootOptions(rng, new Map(), 1, 0);
    expect(options).toHaveLength(3);
  });

  it('never offers the same relic twice in one offering', () => {
    const rng = new Rng(3);
    const options = generateLootOptions(rng, new Map(), 1, 0);
    const relicIds = options.filter((o) => o.kind === 'relic').map((o) => o.relic.id);
    expect(new Set(relicIds).size).toBe(relicIds.length);
  });

  it('never offers a unique relic the player already owns', () => {
    const rng = new Rng(5);
    const uniqueOwned = allRelics.filter((r) => r.stacking === 'unique').map((r) => r.id);
    const owned = new Map(uniqueOwned.map((id) => [id, 1]));

    // Run many offerings to make it likely any owned-unique-relic bug would surface.
    for (let i = 0; i < 50; i++) {
      const options = generateLootOptions(rng, owned, i + 1, 0);
      for (const option of options) {
        if (option.kind === 'relic') {
          expect(owned.has(option.relic.id) && option.relic.stacking === 'unique').toBe(false);
        }
      }
    }
  });

  it('still offers something (falling back to gold) even if the entire relic pool is owned', () => {
    const rng = new Rng(9);
    const allOwned = new Map(allRelics.filter((r) => r.stacking === 'unique').map((r) => [r.id, 1]));
    const options = generateLootOptions(rng, allOwned, 1, 0);
    expect(options).toHaveLength(3);
  });

  it('scales gold amounts up with a higher gold multiplier', () => {
    const rngLow = new Rng(2);
    const rngHigh = new Rng(2);
    let lowTotal = 0;
    let highTotal = 0;
    for (let i = 0; i < 20; i++) {
      for (const option of generateLootOptions(rngLow, new Map(), 5, 0)) {
        if (option.kind === 'gold') lowTotal += option.amount;
      }
      for (const option of generateLootOptions(rngHigh, new Map(), 5, 1)) {
        if (option.kind === 'gold') highTotal += option.amount;
      }
    }
    expect(highTotal).toBeGreaterThan(lowTotal);
  });
});
