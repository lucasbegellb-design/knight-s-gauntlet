import type { EquipmentDefinition } from '../equipment.types';

export const knightsPlate: EquipmentDefinition = {
  id: 'knights_plate',
  name: "Knight's Plate",
  slot: 'armor',
  tags: ['vitality'],
  description: 'Sturdy plate armor. Adds maximum health.',
  modifier: { kind: 'maxHpBonusPercent', value: 0.08 },
};
