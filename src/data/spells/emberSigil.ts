import type { PassiveSpellDefinition } from '../spell.types';

export const emberSigil: PassiveSpellDefinition = {
  id: 'ember_sigil',
  name: 'Ember Sigil',
  rarity: 'common',
  kind: 'passive',
  school: 'fire',
  stacking: 'stackable',
  description: 'Burning damage is increased.',
  modifiers: [{ kind: 'burnDamageMultiplier', value: 0.1 }],
};
