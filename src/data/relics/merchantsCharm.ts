import type { RelicDefinition } from '../relic.types';

export const merchantsCharm: RelicDefinition = {
  id: 'merchants_charm',
  name: "Merchant's Charm",
  rarity: 'common',
  tags: ['economy'],
  stacking: 'stackable',
  description: 'Earn more gold from clearing waves.',
  modifiers: [{ kind: 'goldMultiplier', value: 0.15 }],
};
