import { describe, expect, it } from 'vitest';
import { Registry } from './registry';

interface Thing {
  id: string;
  value: number;
}

describe('Registry', () => {
  it('registers and retrieves an entry by id', () => {
    const registry = new Registry<Thing>();
    registry.register({ id: 'a', value: 1 });

    expect(registry.get('a')).toEqual({ id: 'a', value: 1 });
  });

  it('throws when registering a duplicate id', () => {
    const registry = new Registry<Thing>();
    registry.register({ id: 'a', value: 1 });

    expect(() => registry.register({ id: 'a', value: 2 })).toThrow(/Duplicate registry id/);
  });

  it('tryGet returns undefined for an unknown id', () => {
    const registry = new Registry<Thing>();

    expect(registry.tryGet('missing')).toBeUndefined();
  });

  it('get throws for an unknown id', () => {
    const registry = new Registry<Thing>();

    expect(() => registry.get('missing')).toThrow(/Unknown id/);
  });

  it('all returns every registered entry', () => {
    const registry = new Registry<Thing>();
    registry.registerAll([
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
    ]);

    expect(registry.all()).toEqual([
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
    ]);
  });
});
