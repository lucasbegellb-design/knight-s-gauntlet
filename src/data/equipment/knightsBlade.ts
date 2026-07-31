import type { EquipmentDefinition } from '../equipment.types';

export const knightsBlade: EquipmentDefinition = {
  id: 'knights_blade',
  name: "Knight's Blade",
  slot: 'weapon',
  tags: [],
  description: 'A dependable blade. Adds flat attack power.',
  modifier: { kind: 'flatDamageBonus', value: 4 },
};
