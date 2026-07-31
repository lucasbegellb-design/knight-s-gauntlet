import type { RelicDefinition } from '../relic.types';

export const luckyCoin: RelicDefinition = {
  id: 'lucky_coin',
  name: 'Lucky Coin',
  rarity: 'common',
  tags: ['crit'],
  stacking: 'stackable',
  description: 'Increases critical hit chance.',
  modifiers: [{ kind: 'critChance', value: 0.04 }],
};
