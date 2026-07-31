import type { RelicModifier, RelicTag } from './relic.types';

export type EquipmentSlot = 'weapon' | 'armor' | 'accessory';

export interface EquipmentDefinition {
  id: string;
  name: string;
  slot: EquipmentSlot;
  tags: RelicTag[];
  description: string;
  /** Base magnitude at common rarity; scaled by RARITY_POWER_MULTIPLIER at drop time. */
  modifier: RelicModifier;
}
