import type { EquipmentDefinition } from '../equipment.types';

export const guardianPlate: EquipmentDefinition = {
  id: 'guardian_plate',
  name: 'Guardian Plate',
  slot: 'armor',
  tags: ['vitality'],
  description: 'Spiked armor. Reflects a portion of damage taken.',
  modifier: { kind: 'reflectDamagePercent', value: 0.06 },
};
