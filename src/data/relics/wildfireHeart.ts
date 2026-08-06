import type { RelicDefinition } from '../relic.types';

export const wildfireHeart: RelicDefinition = {
  id: 'wildfire_heart',
  name: 'Wildfire Heart',
  rarity: 'epic',
  tags: ['fire', 'crit'],
  stacking: 'unique',
  description: 'Critical hits deal much greater burning damage.',
  flavor: "Refuses containment, storage, and most forms of advice.",
  modifiers: [{ kind: 'critBurnBonusMultiplier', value: 0.6 }],
};
