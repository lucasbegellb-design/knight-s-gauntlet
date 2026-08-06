import type { RelicDefinition } from '../relic.types';

export const phoenixHeart: RelicDefinition = {
  id: 'phoenix_heart',
  name: 'Phoenix Heart',
  rarity: 'mythic',
  tags: ['vitality'],
  stacking: 'unique',
  description: 'The first time you would die this run, revive with half health instead.',
  flavor: "One use. It is very clear about this.",
  modifiers: [],
  special: 'phoenixRevive',
};
