import type { RelicDefinition } from '../relic.types';

export const goldenOpportunity: RelicDefinition = {
  id: 'golden_opportunity',
  name: 'Golden Opportunity',
  rarity: 'legendary',
  tags: ['economy'],
  stacking: 'unique',
  description: 'Massively increases gold and XP earned from clearing waves.',
  flavor: "Arrives exactly once and does not wait to be recognised.",
  modifiers: [
    { kind: 'goldMultiplier', value: 0.75 },
    { kind: 'xpMultiplier', value: 0.75 },
  ],
};
