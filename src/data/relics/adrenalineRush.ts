import type { RelicDefinition } from '../relic.types';

export const adrenalineRush: RelicDefinition = {
  id: 'adrenaline_rush',
  name: 'Adrenaline Rush',
  rarity: 'rare',
  tags: ['speed', 'crit'],
  stacking: 'stackable',
  description: 'Attack faster and land more critical hits.',
  flavor: "Your body's opinion, overruling yours.",
  modifiers: [
    { kind: 'attackSpeedMultiplier', value: 0.12 },
    { kind: 'critChance', value: 0.05 },
  ],
};
