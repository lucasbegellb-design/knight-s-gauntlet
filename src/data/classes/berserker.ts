import type { ClassDefinition } from '../class.types';

export const berserkerClass: ClassDefinition = {
  id: 'berserker',
  element: 'fire',
  name: 'Berserker',
  description: "Devoted to Spite. Remembers everything and forgives none of it \u2014 exhausting to be, extremely effective to fight beside. Hits hardest, folds fastest.",
  statMultiplier: { maxHp: 0.82, attack: 1.3, attackIntervalMs: 0.9 },
  innateModifiers: [{ kind: 'lifestealPercent', value: 0.04 }],
  weaponPool: ['flameforged_blade', 'knights_blade'],
  /** Neutral — a distinct hero sprite per class carries visual identity now, not a color wash; kept as the graceful-fallback tint if this class's art is ever missing. */
  tint: 0xffffff,
};
