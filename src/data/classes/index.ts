import { Registry } from '../registry';
import type { ClassDefinition } from '../class.types';
import { knightClass } from './knight';
import { berserkerClass } from './berserker';
import { guardianClass } from './guardian';
import { duelistClass } from './duelist';

export const classRegistry = new Registry<ClassDefinition>();

classRegistry.registerAll([knightClass, berserkerClass, guardianClass, duelistClass]);

export const allClasses = classRegistry.all();

export { knightClass, berserkerClass, guardianClass, duelistClass };
