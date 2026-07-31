import type { PassiveSpellDefinition } from '../spell.types';

export const aegisWard: PassiveSpellDefinition = {
  id: 'aegis_ward',
  name: 'Aegis Ward',
  rarity: 'common',
  kind: 'passive',
  school: 'holy',
  stacking: 'stackable',
  description: 'Increases maximum health.',
  modifiers: [{ kind: 'maxHpBonusPercent', value: 0.06 }],
};
