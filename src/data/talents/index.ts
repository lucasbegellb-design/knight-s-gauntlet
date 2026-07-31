import { Registry } from '../registry';
import type { TalentDefinition } from '../talent.types';
import { offenseTalents } from './offense';
import { defenseTalents } from './defense';
import { utilityTalents } from './utility';
import { economyTalents } from './economy';

export const talentRegistry = new Registry<TalentDefinition>();

talentRegistry.registerAll([...offenseTalents, ...defenseTalents, ...utilityTalents, ...economyTalents]);

export const allTalents = talentRegistry.all();
