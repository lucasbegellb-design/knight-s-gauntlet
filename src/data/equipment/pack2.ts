import type { EquipmentDefinition } from '../equipment.types';

/** Phase 6 content scale-up: additional equipment, grouped in one file (see DESIGN_NOTES.md). */
export const equipmentPack2: EquipmentDefinition[] = [
  {
    id: 'frostbrand',
    name: 'Frostbrand',
    slot: 'weapon',
    tags: ['crit'],
    description: 'A blade of eternal frost. Adds critical hit damage.',
    modifier: { kind: 'critDamageMultiplier', value: 0.15 },
  },
  {
    id: 'stormblade',
    name: 'Stormblade',
    slot: 'weapon',
    tags: ['speed'],
    description: 'Crackles with speed. Adds attack speed.',
    modifier: { kind: 'attackSpeedMultiplier', value: 0.06 },
  },
  {
    id: 'bulwark_plate',
    name: 'Bulwark Plate',
    slot: 'armor',
    tags: ['vitality'],
    description: 'Unyielding armor. Reflects a portion of damage taken.',
    modifier: { kind: 'reflectDamagePercent', value: 0.05 },
  },
  {
    id: 'vampiric_mail',
    name: 'Vampiric Mail',
    slot: 'armor',
    tags: ['blood'],
    description: 'Woven with hungering thread. Adds lifesteal.',
    modifier: { kind: 'lifestealPercent', value: 0.04 },
  },
  {
    id: 'gamblers_die',
    name: "Gambler's Die",
    slot: 'accessory',
    tags: ['crit'],
    description: 'Fortune favors the bold. Adds critical hit chance.',
    modifier: { kind: 'critChance', value: 0.025 },
  },
  {
    id: 'tacticians_seal',
    name: "Tactician's Seal",
    slot: 'accessory',
    tags: ['economy'],
    description: 'Sharpens the mind in battle. Adds bonus XP from waves.',
    modifier: { kind: 'xpMultiplier', value: 0.08 },
  },
];
