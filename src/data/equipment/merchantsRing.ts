import type { EquipmentDefinition } from '../equipment.types';

export const merchantsRing: EquipmentDefinition = {
  id: 'merchants_ring',
  name: "Merchant's Ring",
  slot: 'accessory',
  tags: ['economy'],
  description: 'Favored by traders. Adds bonus gold from waves.',
  modifier: { kind: 'goldMultiplier', value: 0.1 },
};
