import { Registry } from '../registry';
import type { MonsterDefinition } from '../monster.types';
import { goblinGrunt } from './goblin';

export const monsterRegistry = new Registry<MonsterDefinition>();

monsterRegistry.registerAll([goblinGrunt]);

export { goblinGrunt };
