import type { RelicDefinition } from '../relic.types';

export const executionersEdge: RelicDefinition = {
  id: 'executioners_edge',
  name: "Executioner's Edge",
  rarity: 'epic',
  tags: ['crit'],
  stacking: 'unique',
  description: 'Instantly finish off enemies below 8% health.',
  modifiers: [{ kind: 'executeThreshold', value: 0.08 }],
};
