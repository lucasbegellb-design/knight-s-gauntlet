import type { RelicDefinition } from '../relic.types';

export const bloodlustFang: RelicDefinition = {
  id: 'bloodlust_fang',
  name: 'Bloodlust Fang',
  rarity: 'rare',
  tags: ['blood', 'crit'],
  stacking: 'stackable',
  description: 'Heal on hit and strike with a touch more precision.',
  flavor: "Pulled from something that was still using it.",
  modifiers: [
    { kind: 'lifestealPercent', value: 0.06 },
    { kind: 'critChance', value: 0.03 },
  ],
};
