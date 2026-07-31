import type { ActiveSpellDefinition } from '../spell.types';

export const arcaneSpark: ActiveSpellDefinition = {
  id: 'arcane_spark',
  name: 'Arcane Spark',
  rarity: 'rare',
  kind: 'active',
  school: 'arcane',
  description: 'Automatically lances the enemy with raw arcane energy on a cooldown.',
  cooldownMs: 1800,
  effect: 'damage',
  power: 10,
};
