import { Registry } from '../registry';
import type { CompanionDefinition } from '../companion.types';
import { stalwartGuardian } from './stalwartGuardian';
import { roguishBlade } from './roguishBlade';
import { arcaneMarksman } from './arcaneMarksman';
import { wanderingCleric } from './wanderingCleric';
import { campBard } from './campBard';
import { emberWisp } from './emberWisp';

export const companionRegistry = new Registry<CompanionDefinition>();

companionRegistry.registerAll([stalwartGuardian, roguishBlade, arcaneMarksman, wanderingCleric, campBard, emberWisp]);

export const allCompanions = companionRegistry.all();
