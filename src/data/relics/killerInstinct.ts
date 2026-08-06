import type { RelicDefinition } from '../relic.types';

export const killerInstinct: RelicDefinition = {
  id: 'killer_instinct',
  name: "Killer's Instinct",
  rarity: 'rare',
  tags: ['crit'],
  stacking: 'stackable',
  description: 'Increases critical hit damage.',
  flavor: "You had it already. This just stops apologising for it.",
  modifiers: [{ kind: 'critDamageMultiplier', value: 0.2 }],
};
