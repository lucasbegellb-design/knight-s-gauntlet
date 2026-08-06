import type { ClassDefinition } from '../class.types';

export const duelistClass: ClassDefinition = {
  id: 'duelist',
  element: 'thunder',
  name: 'Duelist',
  description: "Devoted to Impulse. Struck three times while you were reading this. Fragile, quick, and never once waited to be sure.",
  statMultiplier: { maxHp: 0.88, attack: 1.05, attackIntervalMs: 0.78 },
  innateModifiers: [
    { kind: 'critChance', value: 0.08 },
    { kind: 'critDamageMultiplier', value: 0.1 },
  ],
  weaponPool: ['frostbrand', 'stormblade'],
  /** Neutral — a distinct hero sprite per class carries visual identity now, not a color wash; kept as the graceful-fallback tint if this class's art is ever missing. */
  tint: 0xffffff,
};
