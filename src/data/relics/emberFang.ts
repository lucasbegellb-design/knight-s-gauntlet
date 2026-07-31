import type { RelicDefinition } from '../relic.types';

export const emberFang: RelicDefinition = {
  id: 'ember_fang',
  name: 'Ember Fang',
  rarity: 'common',
  tags: ['fire'],
  stacking: 'stackable',
  description: 'Your attacks have a chance to burn the enemy.',
  modifiers: [{ kind: 'burnChance', value: 0.08 }],
};
