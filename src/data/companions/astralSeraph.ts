import type { CompanionDefinition } from '../companion.types';

export const astralSeraph: CompanionDefinition = {
  id: 'astral_seraph',
  element: 'light',
  name: 'Astral Seraph',
  rarity: 'mythic',
  role: 'support',
  description: 'A celestial guardian whose radiance sharpens every strike the party lands.',
  maxHp: 36,
  attack: 0,
  attackIntervalMs: 999_999,
  auraModifier: { kind: 'damageMultiplier', value: 0.12 },
};
