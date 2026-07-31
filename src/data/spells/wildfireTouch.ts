import type { ActiveSpellDefinition } from '../spell.types';

export const wildfireTouch: ActiveSpellDefinition = {
  id: 'wildfire_touch',
  name: 'Wildfire Touch',
  rarity: 'rare',
  kind: 'active',
  school: 'fire',
  description: 'Automatically sets the enemy ablaze on a cooldown.',
  cooldownMs: 2200,
  effect: 'burn',
  power: 5,
};
