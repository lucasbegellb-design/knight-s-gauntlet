import type { ActiveSpellDefinition } from '../spell.types';

export const firebolt: ActiveSpellDefinition = {
  id: 'firebolt',
  name: 'Firebolt',
  rarity: 'common',
  kind: 'active',
  school: 'fire',
  description: 'Automatically hurls a bolt of fire at the enemy on a cooldown.',
  cooldownMs: 1500,
  effect: 'damage',
  power: 6,
};
