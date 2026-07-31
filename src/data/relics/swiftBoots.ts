import type { RelicDefinition } from '../relic.types';

export const swiftBoots: RelicDefinition = {
  id: 'swift_boots',
  name: 'Swift Boots',
  rarity: 'common',
  tags: ['speed'],
  stacking: 'stackable',
  description: 'Attack faster.',
  modifiers: [{ kind: 'attackSpeedMultiplier', value: 0.08 }],
};
