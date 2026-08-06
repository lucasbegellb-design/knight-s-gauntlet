import type { ClassDefinition } from '../class.types';

export const knightClass: ClassDefinition = {
  id: 'knight',
  element: 'light',
  name: 'Knight',
  description: 'A disciplined all-rounder with no weaknesses. Good starting point for any relic build.',
  statMultiplier: { maxHp: 1, attack: 1, attackIntervalMs: 1 },
  innateModifiers: [],
  weaponPool: ['knights_blade', 'flameforged_blade', 'frostbrand', 'stormblade'],
  tint: 0xffffff,
};
