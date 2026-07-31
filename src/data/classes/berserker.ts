import type { ClassDefinition } from '../class.types';

export const berserkerClass: ClassDefinition = {
  id: 'berserker',
  name: 'Berserker',
  description: 'Hits hard and heals off the damage, but goes down fast if the fight drags on.',
  statMultiplier: { maxHp: 0.82, attack: 1.3, attackIntervalMs: 0.9 },
  innateModifiers: [{ kind: 'lifestealPercent', value: 0.04 }],
  weaponPool: ['flameforged_blade', 'knights_blade'],
  tint: 0xe74c3c,
};
