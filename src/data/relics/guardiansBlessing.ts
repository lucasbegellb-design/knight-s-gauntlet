import type { RelicDefinition } from '../relic.types';

export const guardiansBlessing: RelicDefinition = {
  id: 'guardians_blessing',
  name: "Guardian's Blessing",
  rarity: 'rare',
  tags: ['vitality'],
  stacking: 'stackable',
  description: 'Recover more health when clearing a wave.',
  modifiers: [{ kind: 'regenPerWave', value: 0.1 }],
};
