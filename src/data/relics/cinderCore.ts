import type { RelicDefinition } from '../relic.types';

export const cinderCore: RelicDefinition = {
  id: 'cinder_core',
  name: 'Cinder Core',
  rarity: 'rare',
  tags: ['fire'],
  stacking: 'stackable',
  description: 'Burning damage is increased.',
  flavor: "Warm. Has been warm since before anyone alive was born.",
  modifiers: [{ kind: 'burnDamageMultiplier', value: 0.15 }],
};
