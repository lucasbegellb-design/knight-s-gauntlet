import type { EquipmentDefinition } from '../equipment.types';

export const flameforgedBlade: EquipmentDefinition = {
  id: 'flameforged_blade',
  name: 'Flameforged Blade',
  slot: 'weapon',
  tags: ['fire'],
  description: 'Wreathed in flame. Adds a chance to burn on hit.',
  modifier: { kind: 'burnChance', value: 0.05 },
};
