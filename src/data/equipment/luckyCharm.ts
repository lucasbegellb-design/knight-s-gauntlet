import type { EquipmentDefinition } from '../equipment.types';

export const luckyCharm: EquipmentDefinition = {
  id: 'lucky_charm',
  name: 'Lucky Charm',
  slot: 'accessory',
  tags: ['crit'],
  description: 'A trinket that favors the bold. Adds critical hit chance.',
  modifier: { kind: 'critChance', value: 0.03 },
};
