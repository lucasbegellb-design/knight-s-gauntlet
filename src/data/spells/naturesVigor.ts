import type { PassiveSpellDefinition } from '../spell.types';

export const naturesVigor: PassiveSpellDefinition = {
  id: 'natures_vigor',
  name: "Nature's Vigor",
  rarity: 'epic',
  kind: 'passive',
  school: 'nature',
  stacking: 'unique',
  description: 'Recover more health per wave, and heal for a portion of the damage you deal.',
  modifiers: [
    { kind: 'regenPerWave', value: 0.15 },
    { kind: 'lifestealPercent', value: 0.05 },
  ],
};
