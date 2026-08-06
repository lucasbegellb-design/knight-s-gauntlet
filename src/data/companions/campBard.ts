import type { CompanionDefinition } from '../companion.types';

export const campBard: CompanionDefinition = {
  id: 'camp_bard',
  element: 'water',
  name: 'Camp Bard',
  rarity: 'epic',
  role: 'support',
  description: 'Their song quickens the whole party’s attacks while they remain standing.',
  maxHp: 24,
  attack: 0,
  attackIntervalMs: 999_999,
  auraModifier: { kind: 'attackSpeedMultiplier', value: 0.15 },
};
