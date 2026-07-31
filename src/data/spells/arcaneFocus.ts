import type { PassiveSpellDefinition } from '../spell.types';

export const arcaneFocus: PassiveSpellDefinition = {
  id: 'arcane_focus',
  name: 'Arcane Focus',
  rarity: 'rare',
  kind: 'passive',
  school: 'arcane',
  stacking: 'stackable',
  description: 'Increases critical hit chance.',
  modifiers: [{ kind: 'critChance', value: 0.05 }],
};
