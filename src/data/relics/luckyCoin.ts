import type { RelicDefinition } from '../relic.types';

export const luckyCoin: RelicDefinition = {
  id: 'lucky_coin',
  name: 'Lucky Coin',
  rarity: 'common',
  tags: ['crit'],
  stacking: 'stackable',
  description: 'Increases critical hit chance.',
  flavor: "Two-headed. Nobody has ever needed to check.",
  modifiers: [{ kind: 'critChance', value: 0.04 }],
};
