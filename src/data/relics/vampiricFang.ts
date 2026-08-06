import type { RelicDefinition } from '../relic.types';

export const vampiricFang: RelicDefinition = {
  id: 'vampiric_fang',
  name: 'Vampiric Fang',
  rarity: 'common',
  tags: ['blood'],
  stacking: 'stackable',
  description: 'Heal for a portion of the damage you deal.',
  flavor: "Keeps itself. You are simply where it lives now.",
  modifiers: [{ kind: 'lifestealPercent', value: 0.05 }],
};
