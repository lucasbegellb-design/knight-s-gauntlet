import { Registry } from '../registry';
import type { SpellDefinition } from '../spell.types';
import { firebolt } from './firebolt';
import { radiantMend } from './radiantMend';
import { arcaneSpark } from './arcaneSpark';
import { wildfireTouch } from './wildfireTouch';
import { emberSigil } from './emberSigil';
import { aegisWard } from './aegisWard';
import { arcaneFocus } from './arcaneFocus';
import { naturesVigor } from './naturesVigor';

export const spellRegistry = new Registry<SpellDefinition>();

spellRegistry.registerAll([
  firebolt,
  radiantMend,
  arcaneSpark,
  wildfireTouch,
  emberSigil,
  aegisWard,
  arcaneFocus,
  naturesVigor,
]);

export const allSpells = spellRegistry.all();
export const allActiveSpells = allSpells.filter((s): s is Extract<SpellDefinition, { kind: 'active' }> => s.kind === 'active');
export const allPassiveSpells = allSpells.filter((s): s is Extract<SpellDefinition, { kind: 'passive' }> => s.kind === 'passive');
