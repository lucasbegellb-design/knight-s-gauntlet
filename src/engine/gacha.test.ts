import { describe, expect, it } from 'vitest';
import {
  pullGacha,
  pullGachaMulti,
  nextPityState,
  RARE_PITY_THRESHOLD,
  LEGENDARY_PITY_THRESHOLD,
  type GachaPityState,
} from './gacha';
import { Rng } from './rng';
import type { CompanionDefinition } from '../data/companion.types';

const pool: CompanionDefinition[] = [
  { id: 'c1', name: 'Common One', rarity: 'common', role: 'dps', description: '', maxHp: 10, attack: 1, attackIntervalMs: 1000 },
  { id: 'r1', name: 'Rare One', rarity: 'rare', role: 'dps', description: '', maxHp: 10, attack: 1, attackIntervalMs: 1000 },
  { id: 'e1', name: 'Epic One', rarity: 'epic', role: 'dps', description: '', maxHp: 10, attack: 1, attackIntervalMs: 1000 },
  { id: 'l1', name: 'Legendary One', rarity: 'legendary', role: 'dps', description: '', maxHp: 10, attack: 1, attackIntervalMs: 1000 },
  { id: 'm1', name: 'Mythic One', rarity: 'mythic', role: 'dps', description: '', maxHp: 10, attack: 1, attackIntervalMs: 1000 },
];

describe('pullGacha', () => {
  it('always returns a companion from the candidate pool', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const result = pullGacha(new Rng(seed), pool, new Set());
      expect(pool.some((c) => c.id === result.companion.id)).toBe(true);
    }
  });

  it('flags isNew=false when the pulled companion is already owned', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const result = pullGacha(new Rng(seed), pool, new Set(pool.map((c) => c.id)));
      expect(result.isNew).toBe(false);
    }
  });

  it('flags isNew=true when nothing is owned yet', () => {
    let sawNew = false;
    for (let seed = 1; seed <= 50; seed++) {
      if (pullGacha(new Rng(seed), pool, new Set()).isNew) sawNew = true;
    }
    expect(sawNew).toBe(true);
  });

  it('falls back to the full pool when the rolled rarity has no candidates', () => {
    const commonOnly = pool.filter((c) => c.rarity === 'common');
    const result = pullGacha(new Rng(1), commonOnly, new Set());
    expect(result.companion.rarity).toBe('common');
  });

  it('throws on an empty candidate pool', () => {
    expect(() => pullGacha(new Rng(1), [], new Set())).toThrow();
  });
});

describe('pullGachaMulti', () => {
  it('returns exactly `count` results', () => {
    const results = pullGachaMulti(new Rng(1), pool, new Set(), 10);
    expect(results).toHaveLength(10);
  });

  it('marks the first pull of a companion new and any repeat within the same batch as not new', () => {
    const tinyPool = [pool[0] as CompanionDefinition];
    const results = pullGachaMulti(new Rng(1), tinyPool, new Set(), 5);
    expect(results[0]?.isNew).toBe(true);
    expect(results.slice(1).every((r) => r.isNew === false)).toBe(true);
  });

  it('does not mutate the ownedIds set passed in', () => {
    const owned = new Set<string>();
    pullGachaMulti(new Rng(1), pool, owned, 10);
    expect(owned.size).toBe(0);
  });
});

describe('pity', () => {
  it('nextPityState resets pullsSinceRare on any non-common rarity and increments it on common', () => {
    const start: GachaPityState = { pullsSinceRare: 3, pullsSinceLegendary: 3 };
    expect(nextPityState(start, 'common').pullsSinceRare).toBe(4);
    expect(nextPityState(start, 'rare').pullsSinceRare).toBe(0);
    expect(nextPityState(start, 'epic').pullsSinceRare).toBe(0);
  });

  it('nextPityState resets pullsSinceLegendary only on legendary/mythic', () => {
    const start: GachaPityState = { pullsSinceRare: 0, pullsSinceLegendary: 5 };
    expect(nextPityState(start, 'rare').pullsSinceLegendary).toBe(6);
    expect(nextPityState(start, 'legendary').pullsSinceLegendary).toBe(0);
    expect(nextPityState(start, 'mythic').pullsSinceLegendary).toBe(0);
  });

  it('forces at least a rare when pullsSinceRare is one below the threshold', () => {
    const pity: GachaPityState = { pullsSinceRare: RARE_PITY_THRESHOLD - 1, pullsSinceLegendary: 0 };
    for (let seed = 1; seed <= 100; seed++) {
      const result = pullGacha(new Rng(seed), pool, new Set(), pity);
      expect(result.companion.rarity).not.toBe('common');
    }
  });

  it('forces at least a legendary when pullsSinceLegendary is one below the threshold', () => {
    const pity: GachaPityState = { pullsSinceRare: 0, pullsSinceLegendary: LEGENDARY_PITY_THRESHOLD - 1 };
    for (let seed = 1; seed <= 100; seed++) {
      const result = pullGacha(new Rng(seed), pool, new Set(), pity);
      expect(['legendary', 'mythic']).toContain(result.companion.rarity);
    }
  });

  it('a long unlucky streak of pullGachaMulti pulls eventually contains a rare+', () => {
    const results = pullGachaMulti(new Rng(42), pool, new Set(), RARE_PITY_THRESHOLD);
    expect(results.some((r) => r.companion.rarity !== 'common')).toBe(true);
  });
});
