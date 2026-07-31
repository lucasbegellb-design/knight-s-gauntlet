import type { RelicDefinition } from '../relic.types';

export const adrenalineRush: RelicDefinition = {
  id: 'adrenaline_rush',
  name: 'Adrenaline Rush',
  rarity: 'rare',
  tags: ['speed', 'crit'],
  stacking: 'stackable',
  description: 'Attack faster and land more critical hits.',
  modifiers: [
    { kind: 'attackSpeedMultiplier', value: 0.12 },
    { kind: 'critChance', value: 0.05 },
  ],
};
