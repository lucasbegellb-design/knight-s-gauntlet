import { Registry } from '../registry';
import type { MonsterDefinition } from '../monster.types';
import { goblinGrunt } from './goblin';
import { slime } from './slime';
import { wolf } from './wolf';
import { skeleton } from './skeleton';
import { bat } from './bat';
import { orcChieftain } from './orcChieftain';
import { ancientWyrm } from './ancientWyrm';

export const monsterRegistry = new Registry<MonsterDefinition>();

monsterRegistry.registerAll([goblinGrunt, slime, wolf, skeleton, bat, orcChieftain, ancientWyrm]);

export const normalMonsters = monsterRegistry.all().filter((m) => m.tier === 'normal');
export const miniBosses = monsterRegistry.all().filter((m) => m.tier === 'miniboss');
export const bosses = monsterRegistry.all().filter((m) => m.tier === 'boss');

export { goblinGrunt, slime, wolf, skeleton, bat, orcChieftain, ancientWyrm };
