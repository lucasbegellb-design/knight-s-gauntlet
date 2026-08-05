import { Registry } from '../registry';
import type { KingdomLordDefinition, KingdomTerritoryDefinition } from './kingdom.types';
import { territories } from './territories';
import { lords } from './lords';

export const territoryRegistry = new Registry<KingdomTerritoryDefinition>();
territoryRegistry.registerAll(territories);
export const allTerritories = territoryRegistry.all();

export const lordRegistry = new Registry<KingdomLordDefinition>();
lordRegistry.registerAll(lords);
export const allLords = lordRegistry.all();
