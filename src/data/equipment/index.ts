import { Registry } from '../registry';
import type { EquipmentDefinition } from '../equipment.types';
import { knightsBlade } from './knightsBlade';
import { flameforgedBlade } from './flameforgedBlade';
import { knightsPlate } from './knightsPlate';
import { guardianPlate } from './guardianPlate';
import { luckyCharm } from './luckyCharm';
import { merchantsRing } from './merchantsRing';

export const equipmentRegistry = new Registry<EquipmentDefinition>();

equipmentRegistry.registerAll([knightsBlade, flameforgedBlade, knightsPlate, guardianPlate, luckyCharm, merchantsRing]);

export const allEquipment = equipmentRegistry.all();
