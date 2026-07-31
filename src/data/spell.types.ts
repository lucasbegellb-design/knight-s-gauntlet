import type { Rarity } from './rarity';
import type { RelicModifier } from './relic.types';

export type SpellSchool = 'fire' | 'holy' | 'arcane' | 'nature';
export type SpellEffect = 'damage' | 'heal' | 'burn';

interface SpellBase {
  id: string;
  name: string;
  rarity: Rarity;
  school: SpellSchool;
  description: string;
}

export interface ActiveSpellDefinition extends SpellBase {
  kind: 'active';
  cooldownMs: number;
  effect: SpellEffect;
  power: number;
}

export interface PassiveSpellDefinition extends SpellBase {
  kind: 'passive';
  stacking: 'stackable' | 'unique';
  modifiers: RelicModifier[];
}

export type SpellDefinition = ActiveSpellDefinition | PassiveSpellDefinition;
