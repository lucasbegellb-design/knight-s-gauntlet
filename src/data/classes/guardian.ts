import type { ClassDefinition } from '../class.types';

export const guardianClass: ClassDefinition = {
  id: 'guardian',
  name: 'Guardian',
  description: 'Slow and hits soft, but shrugs off hits and punishes attackers who get close.',
  statMultiplier: { maxHp: 1.4, attack: 0.82, attackIntervalMs: 1.15 },
  innateModifiers: [{ kind: 'reflectDamagePercent', value: 0.05 }],
  weaponPool: ['knights_blade', 'stormblade'],
  tint: 0x3498db,
};
