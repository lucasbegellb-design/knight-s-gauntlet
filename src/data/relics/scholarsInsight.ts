import type { RelicDefinition } from '../relic.types';

export const scholarsInsight: RelicDefinition = {
  id: 'scholars_insight',
  name: "Scholar's Insight",
  rarity: 'common',
  tags: ['economy'],
  stacking: 'stackable',
  description: 'Earn more XP from clearing waves.',
  flavor: "The realisation, without the fourteen years.",
  modifiers: [{ kind: 'xpMultiplier', value: 0.15 }],
};
