import type { ClassDefinition } from '../class.types';

export const knightClass: ClassDefinition = {
  id: 'knight',
  element: 'light',
  name: 'Knight',
  description: "Devoted to Certainty. Has never seriously considered losing, which is statistically half the work. Balanced, unhurried, entirely unbothered.",
  statMultiplier: { maxHp: 1, attack: 1, attackIntervalMs: 1 },
  innateModifiers: [],
  weaponPool: ['knights_blade', 'flameforged_blade', 'frostbrand', 'stormblade'],
  tint: 0xffffff,
};
