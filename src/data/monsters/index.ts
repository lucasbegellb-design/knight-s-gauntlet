import { Registry } from '../registry';
import type { MonsterDefinition } from '../monster.types';
import { goblinGrunt } from './goblin';
import { slime } from './slime';
import { wolf } from './wolf';
import { skeleton } from './skeleton';
import { bat } from './bat';
import { orcChieftain } from './orcChieftain';
import { ancientWyrm } from './ancientWyrm';
import { monsterPack2 } from './pack2';

export const monsterRegistry = new Registry<MonsterDefinition>();

monsterRegistry.registerAll([goblinGrunt, slime, wolf, skeleton, bat, orcChieftain, ancientWyrm, ...monsterPack2]);

export const allMonsters = monsterRegistry.all();
export const normalMonsters = allMonsters.filter((m) => m.tier === 'normal');
export const miniBosses = allMonsters.filter((m) => m.tier === 'miniboss');
export const bosses = allMonsters.filter((m) => m.tier === 'boss');

export { goblinGrunt, slime, wolf, skeleton, bat, orcChieftain, ancientWyrm };
