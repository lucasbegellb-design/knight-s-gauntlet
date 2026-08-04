import { Registry } from '../registry';
import type { CompanionDefinition } from '../companion.types';
import { stalwartGuardian } from './stalwartGuardian';
import { roguishBlade } from './roguishBlade';
import { arcaneMarksman } from './arcaneMarksman';
import { wanderingCleric } from './wanderingCleric';
import { campBard } from './campBard';
import { emberWisp } from './emberWisp';
import { crimsonDragoon } from './crimsonDragoon';
import { astralSeraph } from './astralSeraph';

export const companionRegistry = new Registry<CompanionDefinition>();

companionRegistry.registerAll([
  stalwartGuardian,
  roguishBlade,
  arcaneMarksman,
  wanderingCleric,
  campBard,
  emberWisp,
  crimsonDragoon,
  astralSeraph,
]);

export const allCompanions = companionRegistry.all();
/** Companions available from the start, before any Gacha summon — see src/store/metaStore.ts's unlockedCompanionIds default. */
export const STARTER_COMPANION_IDS = [stalwartGuardian.id, roguishBlade.id];
