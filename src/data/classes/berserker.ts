import type { ClassDefinition } from '../class.types';

export const berserkerClass: ClassDefinition = {
  id: 'berserker',
  name: 'Berserker',
  description: 'Hits hard and heals off the damage, but goes down fast if the fight drags on.',
  statMultiplier: { maxHp: 0.82, attack: 1.3, attackIntervalMs: 0.9 },
  innateModifiers: [{ kind: 'lifestealPercent', value: 0.04 }],
  weaponPool: ['flameforged_blade', 'knights_blade'],
  /** Neutral — a distinct hero sprite per class carries visual identity now, not a color wash; kept as the graceful-fallback tint if this class's art is ever missing. */
  tint: 0xffffff,
};
