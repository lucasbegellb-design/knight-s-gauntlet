import type { ActiveSpellDefinition } from '../spell.types';

export const radiantMend: ActiveSpellDefinition = {
  id: 'radiant_mend',
  name: 'Radiant Mend',
  rarity: 'common',
  kind: 'active',
  school: 'holy',
  description: 'Automatically restores some of your health on a cooldown.',
  cooldownMs: 2000,
  effect: 'heal',
  power: 10,
};
