import type { RelicDefinition } from '../relic.types';

export const crimsonAegis: RelicDefinition = {
  id: 'crimson_aegis',
  name: 'Crimson Aegis',
  rarity: 'epic',
  tags: ['blood', 'vitality'],
  stacking: 'unique',
  description: 'Heal on hit, and reflect a portion of damage taken back at attackers.',
  modifiers: [
    { kind: 'lifestealPercent', value: 0.1 },
    { kind: 'reflectDamagePercent', value: 0.2 },
  ],
};
